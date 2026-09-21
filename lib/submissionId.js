import { randomUUID } from 'node:crypto';

// Full UUID is the canonical ID stored in the Sheet/PDF body. The short form
// (first 8 hex chars, uppercase) is what goes in file names, where a full
// UUID would be unwieldy.
export function generateSubmissionId() {
  const id = randomUUID();
  return { id, shortId: id.split('-')[0].toUpperCase() };
}
