import { getAccessToken } from './googleAuth.js';
import { uploadRecordPdf } from './drive.js';
import { appendSubmissionRow, buildSubmissionRow } from './sheets.js';
import { logFailure } from './logger.js';

/**
 * Writes the PDF to Drive and the row to the Sheet. Each write is independent:
 * a failure in one is logged and does not prevent the other from completing.
 * Returns per-write status so the caller (Phase 5 email) can decide whether an
 * admin-backup email is needed.
 */
export async function deliverSubmission({ submissionId, submittedAt, outcome, reasons, contact, source, pdfBuffer, fileName }) {
  const result = { driveOk: false, sheetsOk: false, driveLink: '', driveError: null, sheetsError: null };

  let accessToken;
  try {
    accessToken = await getAccessToken();
  } catch (err) {
    result.driveError = err.message;
    result.sheetsError = err.message;
    logFailure('google_auth_failed', { submissionId, error: err.message });
    return result;
  }

  try {
    const uploaded = await uploadRecordPdf(accessToken, {
      rootFolderId: process.env.GOOGLE_DRIVE_FOLDER_ID,
      outcome,
      fileName,
      buffer: pdfBuffer,
    });
    result.driveOk = true;
    result.driveLink = uploaded.webViewLink || '';
  } catch (err) {
    result.driveError = err.message;
    logFailure('drive_upload_failed', { submissionId, error: err.message });
  }

  try {
    const row = buildSubmissionRow({
      submissionId,
      submittedAt,
      contact,
      outcome,
      reasons,
      source,
      driveLink: result.driveLink,
    });
    await appendSubmissionRow(accessToken, { sheetId: process.env.GOOGLE_SHEET_ID, row });
    result.sheetsOk = true;
  } catch (err) {
    result.sheetsError = err.message;
    logFailure('sheets_append_failed', { submissionId, error: err.message });
  }

  return result;
}
