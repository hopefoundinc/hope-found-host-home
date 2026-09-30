const SHEETS_BASE_URL = 'https://sheets.googleapis.com/v4/spreadsheets';
const WINDOW_MS = 24 * 60 * 60 * 1000;
const DUPLICATE_FLAG_TEXT = 'Possible duplicate — same email submitted within the last 24 hours';

// Column B is Timestamp, column E is Email — see buildSubmissionRow / the
// README's "Where records land" header row. Reads existing rows rather than
// rejecting, per the brief: flag it, don't block a real re-applicant.
export async function findDuplicateFlag(accessToken, { sheetId, email, submittedAt }) {
  if (!email) return '';

  const res = await fetch(`${SHEETS_BASE_URL}/${sheetId}/values/A2:E`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Sheets API read failed: ${res.status} ${body}`);
  }

  const data = await res.json();
  const rows = data.values || [];
  const cutoff = new Date(submittedAt).getTime() - WINDOW_MS;
  const normalizedEmail = email.trim().toLowerCase();

  const isDuplicate = rows.some((row) => {
    const rowEmail = (row[4] || '').trim().toLowerCase();
    if (rowEmail !== normalizedEmail) return false;
    const rowTime = new Date(row[1]).getTime();
    return !Number.isNaN(rowTime) && rowTime >= cutoff;
  });

  return isDuplicate ? DUPLICATE_FLAG_TEXT : '';
}
