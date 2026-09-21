export function validateQuestion(question, value) {
  if (question.type === 'textarea') {
    const trimmed = (value || '').trim();
    if (trimmed.length === 0) return 'This field is required.';
    if (question.minLength && trimmed.length < question.minLength) {
      return `Please write at least ${question.minLength} characters (${trimmed.length}/${question.minLength} so far).`;
    }
    return null;
  }
  // yesno or select
  if (!value) return 'Please choose an option to continue.';
  return null;
}

const CONTACT_LABELS = {
  fullName: 'Full name',
  phone: 'Phone number',
  email: 'Email address',
  streetAddress: 'Street address',
  city: 'City',
  state: 'State',
  zip: 'ZIP code',
  bestTimeToCall: 'Best time to call',
};

export function contactFieldLabel(field) {
  return CONTACT_LABELS[field] || field;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateContact(contactFields, contact) {
  const errors = {};
  for (const field of contactFields) {
    const value = (contact[field] || '').trim();
    if (!value) {
      errors[field] = `${contactFieldLabel(field)} is required.`;
      continue;
    }
    if (field === 'email' && !EMAIL_RE.test(value)) {
      errors[field] = 'Enter a valid email address.';
    }
    if (field === 'phone' && value.replace(/\D/g, '').length < 10) {
      errors[field] = 'Enter a valid phone number.';
    }
  }
  return errors;
}
