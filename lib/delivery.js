import { getAccessToken } from './googleAuth.js';
import { uploadRecordPdf } from './drive.js';
import { appendSubmissionRow, buildSubmissionRow } from './sheets.js';
import { findDuplicateFlag } from './duplicateCheck.js';
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
    let duplicateFlag = '';
    try {
      duplicateFlag = await findDuplicateFlag(accessToken, {
        sheetId: process.env.GOOGLE_SHEET_ID,
        email: contact.email,
        submittedAt,
      });
    } catch (err) {
      // A failed duplicate check should never block the row from being
      // written — it's a nice-to-have flag, not a gate.
      logFailure('duplicate_check_failed', { submissionId, error: err.message });
    }

    const row = buildSubmissionRow({
      submissionId,
      submittedAt,
      contact,
      outcome,
      reasons,
      source,
      driveLink: result.driveLink,
      duplicateFlag,
    });
    await appendSubmissionRow(accessToken, { sheetId: process.env.GOOGLE_SHEET_ID, row });
    result.sheetsOk = true;
  } catch (err) {
    result.sheetsError = err.message;
    logFailure('sheets_append_failed', { submissionId, error: err.message });
  }

  return result;
}
