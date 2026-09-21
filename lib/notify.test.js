import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./email.js', () => ({ sendEmail: vi.fn().mockResolvedValue({ id: 'email-1' }) }));

import { sendEmail } from './email.js';
import { sendNotifications } from './notify.js';

const config = {
  brand: { orgName: 'Hope Found, Inc.' },
  recipients: {
    recruitment: ['recruitment@hopefoundinc.com'],
    cc: ['zuleema@example.com'],
    adminBackup: 'admin@hopefoundinc.com',
  },
  questions: [{ id: 'why', text: 'Why do you want to host?', type: 'textarea', minLength: 40, rules: [] }],
};

const contact = {
  fullName: 'Jordan Rivera',
  phone: '(202) 555-0134',
  email: 'jordan@example.com',
  city: 'Washington',
  bestTimeToCall: 'Evenings',
};

const answers = { why: 'Because I have a spare room and want to help.' };

const okDelivery = { driveOk: true, sheetsOk: true, driveLink: 'https://drive.google.com/file-1' };
const failedDriveDelivery = { driveOk: false, sheetsOk: true, driveLink: '', driveError: 'boom' };

beforeEach(() => {
  sendEmail.mockClear();
});

describe('sendNotifications', () => {
  it('always sends the applicant confirmation email', async () => {
    await sendNotifications({
      config,
      submissionId: 'sub-1',
      outcome: 'DISQUALIFY',
      contact,
      answers,
      source: 'test',
      delivery: okDelivery,
      pdfBuffer: Buffer.from('x'),
      fileName: 'record.pdf',
    });

    const confirmationCall = sendEmail.mock.calls.find(([args]) => args.to?.[0] === contact.email);
    expect(confirmationCall).toBeTruthy();
  });

  it('sends the recruitment email only when QUALIFIED, with the right recipients and content', async () => {
    const result = await sendNotifications({
      config,
      submissionId: 'sub-2',
      outcome: 'QUALIFIED',
      contact,
      answers,
      source: 'dc-test-church',
      delivery: okDelivery,
      pdfBuffer: Buffer.from('x'),
      fileName: 'record.pdf',
    });

    expect(result.recruitmentOk).toBe(true);
    const recruitmentCall = sendEmail.mock.calls.find(([args]) => args.to?.includes('recruitment@hopefoundinc.com'));
    expect(recruitmentCall).toBeTruthy();
    const [args] = recruitmentCall;
    expect(args.cc).toEqual(['zuleema@example.com']);
    expect(args.subject).toBe('Qualified host-home applicant: Jordan Rivera');
    expect(args.text).toContain('Because I have a spare room');
    expect(args.text).toContain('https://drive.google.com/file-1');
    expect(args.text).toContain('within 48 hours');
  });

  it('does not send the recruitment email for HOLD or DISQUALIFY', async () => {
    for (const outcome of ['HOLD', 'DISQUALIFY']) {
      sendEmail.mockClear();
      const result = await sendNotifications({
        config,
        submissionId: 'sub-3',
        outcome,
        contact,
        answers,
        source: 'test',
        delivery: okDelivery,
        pdfBuffer: Buffer.from('x'),
        fileName: 'record.pdf',
      });
      expect(result.recruitmentOk).toBe(false);
      const recruitmentCall = sendEmail.mock.calls.find(([args]) => args.to?.includes('recruitment@hopefoundinc.com'));
      expect(recruitmentCall).toBeUndefined();
    }
  });

  it('sends the admin backup email with the PDF attached only when Drive or Sheets failed', async () => {
    const okResult = await sendNotifications({
      config,
      submissionId: 'sub-4',
      outcome: 'QUALIFIED',
      contact,
      answers,
      source: 'test',
      delivery: okDelivery,
      pdfBuffer: Buffer.from('x'),
      fileName: 'record.pdf',
    });
    expect(okResult.adminBackupOk).toBe(false);

    sendEmail.mockClear();
    const failResult = await sendNotifications({
      config,
      submissionId: 'sub-5',
      outcome: 'QUALIFIED',
      contact,
      answers,
      source: 'test',
      delivery: failedDriveDelivery,
      pdfBuffer: Buffer.from('fake-pdf-bytes'),
      fileName: 'record.pdf',
    });
    expect(failResult.adminBackupOk).toBe(true);
    const adminCall = sendEmail.mock.calls.find(([args]) => args.to?.includes('admin@hopefoundinc.com'));
    expect(adminCall).toBeTruthy();
    const [args] = adminCall;
    expect(args.attachments[0].filename).toBe('record.pdf');
    expect(args.attachments[0].content).toBe(Buffer.from('fake-pdf-bytes').toString('base64'));
  });

  it('keeps trying the other emails when one send fails', async () => {
    sendEmail.mockImplementationOnce(() => Promise.reject(new Error('confirmation send failed')));

    const result = await sendNotifications({
      config,
      submissionId: 'sub-6',
      outcome: 'QUALIFIED',
      contact,
      answers,
      source: 'test',
      delivery: okDelivery,
      pdfBuffer: Buffer.from('x'),
      fileName: 'record.pdf',
    });

    expect(result.confirmationOk).toBe(false);
    expect(result.recruitmentOk).toBe(true);
  });
});
