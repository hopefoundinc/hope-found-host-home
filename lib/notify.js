import { sendEmail } from './email.js';
import { buildRecruitmentEmail, buildApplicantConfirmationEmail, buildAdminBackupEmail } from './emailTemplates.js';
import { logFailure } from './logger.js';

/**
 * Sends every email a submission can trigger. Each send is independent —
 * one failing (e.g. Resend is down) never prevents another from being tried,
 * and every failure is logged rather than thrown.
 */
export async function sendNotifications({ config, submissionId, outcome, contact, answers, source, delivery, pdfBuffer, fileName }) {
  const result = { confirmationOk: false, recruitmentOk: false, adminBackupOk: false };

  try {
    const { subject, text, html } = buildApplicantConfirmationEmail({ config });
    await sendEmail({ to: [contact.email], subject, text, html });
    result.confirmationOk = true;
  } catch (err) {
    logFailure('confirmation_email_failed', { submissionId, error: err.message });
  }

  if (outcome === 'QUALIFIED') {
    try {
      const { to, cc, subject, text, html } = buildRecruitmentEmail({
        config,
        contact,
        answers,
        source,
        driveLink: delivery.driveLink,
      });
      await sendEmail({ to, cc, subject, text, html });
      result.recruitmentOk = true;
    } catch (err) {
      logFailure('recruitment_email_failed', { submissionId, error: err.message });
    }
  }

  if (!delivery.driveOk || !delivery.sheetsOk) {
    try {
      const { subject, text, html } = buildAdminBackupEmail({ submissionId, outcome, delivery });
      await sendEmail({
        to: [config.recipients.adminBackup],
        subject,
        text,
        html,
        attachments: [{ filename: fileName, content: pdfBuffer.toString('base64') }],
      });
      result.adminBackupOk = true;
    } catch (err) {
      logFailure('admin_backup_email_failed', { submissionId, error: err.message });
    }
  }

  return result;
}
