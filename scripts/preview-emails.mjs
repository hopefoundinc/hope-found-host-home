import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildRecruitmentEmail, buildApplicantConfirmationEmail, buildAdminBackupEmail } from '../lib/emailTemplates.js';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const config = JSON.parse(readFileSync(path.join(root, 'quizConfig.json'), 'utf8'));
const outDir = path.join(root, 'samples', 'emails');
mkdirSync(outDir, { recursive: true });

function wrap(subject, html) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${subject}</title></head><body style="font-family: sans-serif; max-width: 600px; margin: 40px auto;"><p><strong>Subject:</strong> ${subject}</p><hr>${html}</body></html>`;
}

function write(name, subject, html) {
  writeFileSync(path.join(outDir, `${name}.html`), wrap(subject, html));
  console.log(`${name}: ${subject}`);
}

const contact = {
  fullName: 'Jordan Rivera',
  phone: '(202) 555-0134',
  email: 'jordan.rivera@example.com',
  city: 'Washington',
  bestTimeToCall: 'Weekday evenings',
};

const answers = {
  why: "I want to open my home because I have a spare room and a lot of love to give. My kids are grown and I have the time, patience, and space to welcome someone into our daily life.",
};

const confirmation = buildApplicantConfirmationEmail({ config });
write('applicant-confirmation', confirmation.subject, confirmation.html);

const recruitment = buildRecruitmentEmail({
  config,
  contact,
  answers,
  source: 'dc-test-church',
  driveLink: 'https://drive.google.com/file/d/EXAMPLE/view',
});
write('recruitment-qualified', recruitment.subject, recruitment.html);

const adminBackup = buildAdminBackupEmail({
  submissionId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  outcome: 'QUALIFIED',
  delivery: { driveOk: false, sheetsOk: true, driveError: 'Drive API upload failed: 403 insufficient permissions' },
});
write('admin-backup', adminBackup.subject, adminBackup.html);
