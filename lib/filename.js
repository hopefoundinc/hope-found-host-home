function sanitize(part) {
  return part.replace(/[^a-zA-Z0-9]/g, '');
}

function splitFullName(fullName) {
  const words = (fullName || '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return { firstName: 'Unknown', lastName: 'Unknown' };
  if (words.length === 1) return { firstName: words[0], lastName: '' };
  const lastName = words[words.length - 1];
  const firstName = words.slice(0, -1).join('');
  return { firstName: sanitize(firstName) || 'Unknown', lastName: sanitize(lastName) || 'Unknown' };
}

// YYYY-MM-DD_LastName-FirstName_OUTCOME_ID.pdf
export function buildFileName({ contact, outcome, shortId, submittedAt }) {
  const datePart = submittedAt.slice(0, 10);
  const { firstName, lastName } = splitFullName(contact.fullName);
  return `${datePart}_${lastName}-${firstName}_${outcome}_${shortId}.pdf`;
}
