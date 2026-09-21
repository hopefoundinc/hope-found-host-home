function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
  ));
}

// The "why" question is whichever textarea question exists in the config —
// the current quizConfig.json has exactly one (id "why"), and the brief
// treats it as the one open-ended field, so we don't hardcode its id.
function findWhyAnswer(config, answers) {
  const whyQuestion = config.questions.find((q) => q.type === 'textarea');
  return whyQuestion ? answers[whyQuestion.id] : '';
}

export function buildRecruitmentEmail({ config, contact, answers, source, driveLink }) {
  const why = findWhyAnswer(config, answers) || '(not provided)';
  const subject = `Qualified host-home applicant: ${contact.fullName}`;

  const facts = [
    ['Name', contact.fullName],
    ['Phone', contact.phone],
    ['Email', contact.email],
    ['City', contact.city],
    ['Best time to call', contact.bestTimeToCall],
    ['Source', source || '(none)'],
  ];

  const driveLine = driveLink ? `Full record: ${driveLink}` : 'Full record: Drive upload failed — see the admin backup email for the record.';

  const text = [
    ...facts.map(([label, value]) => `${label}: ${value}`),
    '',
    "Why they want to host:",
    why,
    '',
    driveLine,
    '',
    'Please contact this applicant within 48 hours.',
  ].join('\n');

  const html = `
    <p>${facts.map(([label, value]) => `<strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}`).join('<br>')}</p>
    <p><strong>Why they want to host:</strong><br>${escapeHtml(why)}</p>
    <p>${driveLink
      ? `<a href="${escapeHtml(driveLink)}">Full record</a>`
      : 'Full record: Drive upload failed — see the admin backup email for the record.'}</p>
    <p><strong>Please contact this applicant within 48 hours.</strong></p>
  `;

  return { to: config.recipients.recruitment, cc: config.recipients.cc, subject, text, html };
}

export function buildApplicantConfirmationEmail({ config }) {
  const subject = `Thanks for your interest in ${config.brand.orgName}`;
  const text = [
    'Thank you for taking the time to complete our host-home quiz.',
    '',
    "We've received your information, and a member of our team will follow up with you soon.",
    '',
    "We're grateful you're considering opening your home.",
    '',
    config.brand.orgName,
  ].join('\n');
  const html = `
    <p>Thank you for taking the time to complete our host-home quiz.</p>
    <p>We've received your information, and a member of our team will follow up with you soon.</p>
    <p>We're grateful you're considering opening your home.</p>
    <p>${escapeHtml(config.brand.orgName)}</p>
  `;
  return { subject, text, html };
}

export function buildAdminBackupEmail({ submissionId, outcome, delivery }) {
  const subject = `Backup record: submission ${submissionId} (${outcome}) — delivery failed`;
  const failures = [];
  if (!delivery.driveOk) failures.push(`Drive upload failed: ${delivery.driveError}`);
  if (!delivery.sheetsOk) failures.push(`Sheet append failed: ${delivery.sheetsError}`);

  const text = [
    `The record for submission ${submissionId} could not be fully saved.`,
    ...failures,
    '',
    'The full record is attached to this email so nothing is lost.',
  ].join('\n');

  const html = `
    <p>The record for submission ${escapeHtml(submissionId)} could not be fully saved.</p>
    <ul>${failures.map((f) => `<li>${escapeHtml(f)}</li>`).join('')}</ul>
    <p>The full record is attached to this email so nothing is lost.</p>
  `;

  return { subject, text, html };
}
