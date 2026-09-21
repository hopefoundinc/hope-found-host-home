const DRIVE_FILES_URL = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files';

export const OUTCOME_FOLDER_NAMES = {
  QUALIFIED: 'Qualified',
  HOLD: 'Hold',
  DISQUALIFY: 'Did-Not-Qualify',
};

async function driveRequest(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Drive API ${options.method || 'GET'} ${url} failed: ${res.status} ${body}`);
  }
  return res.json();
}

export async function findOrCreateFolder(accessToken, parentId, name) {
  const q = encodeURIComponent(
    `'${parentId}' in parents and name = '${name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
  );
  const listResult = await driveRequest(`${DRIVE_FILES_URL}?q=${q}&fields=files(id,name)`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (listResult.files && listResult.files.length > 0) {
    return listResult.files[0].id;
  }

  const created = await driveRequest(`${DRIVE_FILES_URL}?fields=id`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] }),
  });
  return created.id;
}

export async function uploadPdf(accessToken, { fileName, parentId, buffer }) {
  const boundary = `hf-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const metadata = JSON.stringify({ name: fileName, parents: [parentId], mimeType: 'application/pdf' });

  const parts = [
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`,
    `--${boundary}\r\nContent-Type: application/pdf\r\n\r\n`,
  ];
  const body = Buffer.concat([Buffer.from(parts[0]), Buffer.from(parts[1]), buffer, Buffer.from(`\r\n--${boundary}--`)]);

  return driveRequest(`${DRIVE_UPLOAD_URL}?uploadType=multipart&fields=id,webViewLink`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  });
}

export async function uploadRecordPdf(accessToken, { rootFolderId, outcome, fileName, buffer }) {
  const folderName = OUTCOME_FOLDER_NAMES[outcome];
  const folderId = await findOrCreateFolder(accessToken, rootFolderId, folderName);
  return uploadPdf(accessToken, { fileName, parentId: folderId, buffer });
}
