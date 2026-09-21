import { createRequire } from 'node:module';
import { validateQuestion, validateContact } from '../src/validation.js';
import { computeOutcome } from '../src/outcomeEngine.js';
import { buildRecordPdf } from '../lib/pdf.js';
import { buildFileName } from '../lib/filename.js';
import { generateSubmissionId } from '../lib/submissionId.js';
import { deliverSubmission } from '../lib/delivery.js';
import { sendNotifications } from '../lib/notify.js';
import { logInfo, logFailure } from '../lib/logger.js';

const require = createRequire(import.meta.url);
const quizConfig = require('../quizConfig.json');

function validateSubmission(body) {
  const errors = {};

  for (const question of quizConfig.questions) {
    const error = validateQuestion(question, body.answers?.[question.id]);
    if (error) errors[question.id] = error;
  }

  Object.assign(errors, validateContact(quizConfig.contactFields, body.contact || {}));

  if (!body.consent) {
    errors.consent = 'Consent is required.';
  }

  return errors;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const body = req.body || {};
  const errors = validateSubmission(body);
  if (Object.keys(errors).length > 0) {
    res.status(400).json({ error: 'Invalid submission', fields: errors });
    return;
  }

  const { answers, contact, source } = body;
  const submittedAt = new Date().toISOString();
  const { id: submissionId, shortId } = generateSubmissionId();
  const { outcome, reasons } = computeOutcome(answers, quizConfig);
  const fileName = buildFileName({ contact, outcome, shortId, submittedAt });

  let pdfBuffer;
  try {
    pdfBuffer = await buildRecordPdf({
      config: quizConfig,
      answers,
      contact,
      source,
      outcome,
      reasons,
      submissionId,
      submittedAt,
    });
  } catch (err) {
    logFailure('pdf_generation_failed', { submissionId, error: err.message });
    res.status(500).json({ error: 'Could not process submission' });
    return;
  }

  const delivery = await deliverSubmission({
    submissionId,
    submittedAt,
    outcome,
    reasons,
    contact,
    source,
    pdfBuffer,
    fileName,
  });

  const notifications = await sendNotifications({
    config: quizConfig,
    submissionId,
    outcome,
    contact,
    answers,
    source,
    delivery,
    pdfBuffer,
    fileName,
  });

  logInfo('submission_processed', {
    submissionId,
    outcome,
    source: source || null,
    driveOk: delivery.driveOk,
    sheetsOk: delivery.sheetsOk,
    confirmationOk: notifications.confirmationOk,
    recruitmentOk: notifications.recruitmentOk,
    adminBackupOk: notifications.adminBackupOk,
  });

  res.status(200).json({ ok: true, submissionId });
}
