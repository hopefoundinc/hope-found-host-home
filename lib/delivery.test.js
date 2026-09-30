import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./googleAuth.js', () => ({
  getAccessToken: vi.fn().mockResolvedValue('fake-token'),
}));

import { deliverSubmission } from './delivery.js';

function jsonResponse(body, ok = true) {
  return { ok, status: ok ? 200 : 500, json: async () => body, text: async () => JSON.stringify(body) };
}

const baseInput = {
  submissionId: 'sub-1',
  submittedAt: '2026-09-21T12:00:00.000Z',
  outcome: 'QUALIFIED',
  reasons: [],
  contact: { fullName: 'Jordan Rivera', phone: '2025550134', email: 'j@example.com', city: 'Washington', state: 'DC' },
  source: 'test',
  pdfBuffer: Buffer.from('%PDF-fake'),
  fileName: '2026-09-21_Rivera-Jordan_QUALIFIED_ABCD1234.pdf',
};

beforeEach(() => {
  process.env.GOOGLE_DRIVE_FOLDER_ID = 'root-folder';
  process.env.GOOGLE_SHEET_ID = 'sheet-1';
});

describe('deliverSubmission', () => {
  it('writes to both Drive and Sheets when both succeed', async () => {
    global.fetch = vi.fn(async (url) => {
      if (url.includes('drive/v3/files?q=')) return jsonResponse({ files: [{ id: 'folder-qualified' }] });
      if (url.includes('upload/drive/v3/files')) return jsonResponse({ id: 'file-1', webViewLink: 'https://drive.google.com/file-1' });
      if (url.includes('values/A2:E')) return jsonResponse({ values: [] });
      if (url.includes('sheets.googleapis.com')) return jsonResponse({ updates: {} });
      throw new Error(`Unexpected URL: ${url}`);
    });

    const result = await deliverSubmission(baseInput);

    expect(result.driveOk).toBe(true);
    expect(result.sheetsOk).toBe(true);
    expect(result.driveLink).toBe('https://drive.google.com/file-1');

    const sheetsCall = global.fetch.mock.calls.find(([url]) => url.includes(':append'));
    const sheetsBody = JSON.parse(sheetsCall[1].body);
    expect(sheetsBody.values[0]).toContain('https://drive.google.com/file-1');
  });

  it('still appends to Sheets when the Drive upload fails, and logs the failure', async () => {
    global.fetch = vi.fn(async (url) => {
      if (url.includes('drive/v3/files?q=')) return jsonResponse({ files: [{ id: 'folder-qualified' }] });
      if (url.includes('upload/drive/v3/files')) return jsonResponse({ error: 'boom' }, false);
      if (url.includes('values/A2:E')) return jsonResponse({ values: [] });
      if (url.includes('sheets.googleapis.com')) return jsonResponse({ updates: {} });
      throw new Error(`Unexpected URL: ${url}`);
    });

    const result = await deliverSubmission(baseInput);

    expect(result.driveOk).toBe(false);
    expect(result.driveError).toBeTruthy();
    expect(result.sheetsOk).toBe(true);

    const sheetsCall = global.fetch.mock.calls.find(([url]) => url.includes(':append'));
    expect(sheetsCall).toBeTruthy();
    const sheetsBody = JSON.parse(sheetsCall[1].body);
    expect(sheetsBody.values[0][10]).toBe(''); // Drive link column blank since upload failed
  });

  it('still uploads to Drive when the Sheets append fails, and logs the failure', async () => {
    global.fetch = vi.fn(async (url) => {
      if (url.includes('drive/v3/files?q=')) return jsonResponse({ files: [{ id: 'folder-qualified' }] });
      if (url.includes('upload/drive/v3/files')) return jsonResponse({ id: 'file-1', webViewLink: 'https://drive.google.com/file-1' });
      if (url.includes('values/A2:E')) return jsonResponse({ values: [] });
      if (url.includes('sheets.googleapis.com')) return jsonResponse({ error: 'boom' }, false);
      throw new Error(`Unexpected URL: ${url}`);
    });

    const result = await deliverSubmission(baseInput);

    expect(result.driveOk).toBe(true);
    expect(result.sheetsOk).toBe(false);
    expect(result.sheetsError).toBeTruthy();
  });

  it('routes the PDF to the folder matching the outcome', async () => {
    const calls = [];
    global.fetch = vi.fn(async (url) => {
      calls.push(url);
      if (url.includes('drive/v3/files?q=')) return jsonResponse({ files: [{ id: 'folder-hold' }] });
      if (url.includes('upload/drive/v3/files')) return jsonResponse({ id: 'file-1', webViewLink: 'https://drive.google.com/file-1' });
      if (url.includes('values/A2:E')) return jsonResponse({ values: [] });
      if (url.includes('sheets.googleapis.com')) return jsonResponse({ updates: {} });
      throw new Error(`Unexpected URL: ${url}`);
    });

    await deliverSubmission({ ...baseInput, outcome: 'HOLD' });

    const folderLookup = decodeURIComponent(calls.find((u) => u.includes('drive/v3/files?q=')));
    expect(folderLookup).toContain("name = 'Hold'");
  });

  it('flags the row as a possible duplicate when the Sheet has a recent match on email', async () => {
    global.fetch = vi.fn(async (url) => {
      if (url.includes('drive/v3/files?q=')) return jsonResponse({ files: [{ id: 'folder-qualified' }] });
      if (url.includes('upload/drive/v3/files')) return jsonResponse({ id: 'file-1', webViewLink: 'https://drive.google.com/file-1' });
      if (url.includes('values/A2:E')) {
        return jsonResponse({ values: [['prior-id', '2026-09-21T06:00:00.000Z', 'Jordan Rivera', '555', 'j@example.com']] });
      }
      if (url.includes('sheets.googleapis.com')) return jsonResponse({ updates: {} });
      throw new Error(`Unexpected URL: ${url}`);
    });

    await deliverSubmission(baseInput);

    const sheetsCall = global.fetch.mock.calls.find(([url]) => url.includes(':append'));
    const sheetsBody = JSON.parse(sheetsCall[1].body);
    expect(sheetsBody.values[0][12]).toMatch(/possible duplicate/i);
  });

  it('does not block the Sheets write when the duplicate check itself fails', async () => {
    global.fetch = vi.fn(async (url) => {
      if (url.includes('drive/v3/files?q=')) return jsonResponse({ files: [{ id: 'folder-qualified' }] });
      if (url.includes('upload/drive/v3/files')) return jsonResponse({ id: 'file-1', webViewLink: 'https://drive.google.com/file-1' });
      if (url.includes('values/A2:E')) return jsonResponse({ error: 'boom' }, false);
      if (url.includes('sheets.googleapis.com')) return jsonResponse({ updates: {} });
      throw new Error(`Unexpected URL: ${url}`);
    });

    const result = await deliverSubmission(baseInput);

    expect(result.sheetsOk).toBe(true);
    const sheetsCall = global.fetch.mock.calls.find(([url]) => url.includes(':append'));
    const sheetsBody = JSON.parse(sheetsCall[1].body);
    expect(sheetsBody.values[0][12]).toBe('');
  });
});
