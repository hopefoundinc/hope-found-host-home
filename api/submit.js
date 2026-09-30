import { createRequire } from 'node:module';
import { validateQuestion, validateContact } from '../src/validation.js';
import { computeOutcome } from '../src/outcomeEngine.js';
import { applyMarylandDistanceCheck } from '../lib/marylandDistanceCheck.js';
import { buildRecordPdf } from '../lib/pdf.js';
import { buildFileName } from '../lib/filename.js';
import { generateSubmissionId } from '../lib/submissionId.js';
import { deliverSubmission } from '../lib/delivery.js';
import { sendNotifications } from '../lib/notify.js';
import { checkRateLimit, getClientIp } from '../lib/rateLimit.js';
import { logInfo, logFailure } from '../lib/logger.js';

const require = createRequire(import.meta.url);
const quizConfig = require('../quizConfig.json');

const MIN_SUBMIT_SECONDS = 20;

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

  const ip = getClientIp(req);
  const { allowed: withinRateLimit } = checkRateLimit(ip);
  if (!withinRateLimit) {
    logFailure('rate_limit_exceeded', { ip });
    res.status(429).json({ error: 'Too many submissions. Please try again later.' });
    return;
  }

  const body = req.body || {};

  // Honeypot: a real applicant's browser never fills this hidden field in.
  if (body.honeypot) {
    logFailure('honeypot_triggered', { ip });
    res.status(400).json({ error: 'Invalid submission' });
    return;
  }

  // A human takes more than 20 seconds to read the landing screen and answer
  // 13 questions. Missing or unparseable startedAt is treated the same as
  // too-fast, since our own frontend always sends it — its absence means
  // something is posting to this endpoint directly.
  const startedAtMs = Date.parse(body.startedAt);
  if (Number.isNaN(startedAtMs) || Date.now() - startedAtMs < MIN_SUBMIT_SECONDS * 1000) {
    logFailure('submission_too_fast', { ip, startedAt: body.startedAt || null });
    res.status(400).json({ error: 'Invalid submission' });
    return;
  }

  const errors = validateSubmission(body);
  if (Object.keys(errors).length > 0) {
    res.status(400).json({ error: 'Invalid submission', fields: errors });
    return;
  }

  const { answers, contact, source } = body;
  const submittedAt = new Date().toISOString();
  const { id: submissionId, shortId } = generateSubmissionId();
  const base = computeOutcome(answers, quizConfig);
  const { outcome, reasons } = await applyMarylandDistanceCheck({
    answers,
    contact,
    config: quizConfig,
    outcome: base.outcome,
    reasons: base.reasons,
    submissionId,
  });
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
    ip,
    driveOk: delivery.driveOk,
    sheetsOk: delivery.sheetsOk,
    confirmationOk: notifications.confirmationOk,
    recruitmentOk: notifications.recruitmentOk,
    adminBackupOk: notifications.adminBackupOk,
  });

  res.status(200).json({ ok: true, submissionId });
}
