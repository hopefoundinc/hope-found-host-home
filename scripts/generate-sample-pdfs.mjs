import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeOutcome } from '../src/outcomeEngine.js';
import { buildRecordPdf } from '../lib/pdf.js';
import { buildFileName } from '../lib/filename.js';
import { generateSubmissionId } from '../lib/submissionId.js';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const config = JSON.parse(await import('node:fs').then((fs) => fs.readFileSync(path.join(root, 'quizConfig.json'), 'utf8')));
const outDir = path.join(root, 'samples');
mkdirSync(outDir, { recursive: true });

const baseContact = {
  fullName: '',
  phone: '(202) 555-0134',
  email: 'applicant@example.com',
  streetAddress: '123 Elm St NW',
  city: 'Washington',
  state: 'DC',
  zip: '20001',
  bestTimeToCall: 'Weekday evenings',
};

const whyText =
  "I want to open my home because I have a spare room and a lot of love to give. My kids are grown and I have the time, patience, and space to welcome someone into our daily life. I believe everyone deserves a safe, warm place to live and a family that shows up for them.";

const samples = [
  {
    label: 'QUALIFIED',
    contact: { ...baseContact, fullName: 'Jordan Rivera' },
    answers: {
      location: 'Washington, DC',
      english: 'Yes',
      age: 'Yes',
      room: 'Yes',
      room_ready: 'Now',
      screening: 'Yes',
      income: 'Yes',
      household: 'Yes',
      transport: 'Yes',
      experience: 'Yes',
      adaptability: 'Yes',
      autonomy_respect: 'Yes',
      why: whyText,
    },
  },
  {
    label: 'HOLD',
    contact: { ...baseContact, fullName: 'Pat Okafor' },
    answers: {
      location: 'Maryland',
      english: 'Yes',
      age: 'Yes',
      room: 'Yes',
      room_ready: 'More than 45 days',
      screening: 'Yes',
      income: 'No',
      household: 'Yes',
      transport: 'Yes',
      experience: 'No',
      adaptability: 'Yes',
      autonomy_respect: 'Yes',
      why: whyText,
    },
  },
  {
    label: 'DISQUALIFY',
    contact: { ...baseContact, fullName: 'Sam Whitfield' },
    answers: {
      location: 'Virginia',
      english: 'No',
      age: 'Yes',
      room: 'Yes',
      room_ready: 'More than 45 days',
      screening: 'Yes',
      income: 'Yes',
      household: 'No',
      transport: 'Yes',
      experience: 'No',
      adaptability: 'Yes',
      autonomy_respect: 'Yes',
      why: whyText,
    },
  },
];

for (const sample of samples) {
  const { outcome, reasons } = computeOutcome(sample.answers, config);
  const { id, shortId } = generateSubmissionId();
  const submittedAt = new Date().toISOString();
  const source = 'test';

  const pdfBuffer = await buildRecordPdf({
    config,
    answers: sample.answers,
    contact: sample.contact,
    source,
    outcome,
    reasons,
    submissionId: id,
    submittedAt,
  });

  const fileName = buildFileName({ contact: sample.contact, outcome, shortId, submittedAt });
  writeFileSync(path.join(outDir, fileName), pdfBuffer);
  console.log(`${sample.label} -> ${fileName} (computed outcome: ${outcome}, ${reasons.length} reason(s))`);
}
