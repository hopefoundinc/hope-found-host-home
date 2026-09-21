const SHEETS_BASE_URL = 'https://sheets.googleapis.com/v4/spreadsheets';

// Appends to the sheet's first tab. Column order matches the header row the
// README asks Hope Found to set up: see README "Where records land".
export async function appendSubmissionRow(accessToken, { sheetId, row }) {
  const url = `${SHEETS_BASE_URL}/${sheetId}/values/A1:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: [row] }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Sheets API append failed: ${res.status} ${body}`);
  }
  return res.json();
}

export function buildSubmissionRow({ submissionId, submittedAt, contact, outcome, reasons, source, driveLink }) {
  const reasonsText = reasons.map((r) => `[${r.outcome}] ${r.questionText}: ${r.reason}`).join(' | ');
  return [
    submissionId,
    submittedAt,
    contact.fullName || '',
    contact.phone || '',
    contact.email || '',
    contact.city || '',
    contact.state || '',
    outcome,
    reasonsText,
    source || '',
    driveLink || '',
    '', // follow-up status — blank, the team fills this in
  ];
}
