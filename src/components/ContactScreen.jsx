import { useRef } from 'react';
import { contactFieldLabel } from '../validation';

const INPUT_TYPES = {
  email: 'email',
  phone: 'tel',
};

function ContactScreen({
  contactFields,
  consentText,
  contact,
  consent,
  errors,
  submitting,
  onFieldChange,
  onConsentChange,
  onSubmit,
  onBack,
}) {
  const fieldRefs = useRef({});

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit(fieldRefs);
  }

  return (
    <form onSubmit={handleSubmit} noValidate aria-labelledby="contact-heading">
      <h1 id="contact-heading">Your contact information</h1>
      <p>We'll use this to follow up with you about the host-home program.</p>

      {contactFields.map((field) => {
        const errorId = `${field}-error`;
        return (
          <div className="field" key={field}>
            <label htmlFor={field}>{contactFieldLabel(field)}</label>
            <input
              id={field}
              name={field}
              type={INPUT_TYPES[field] || 'text'}
              value={contact[field] || ''}
              onChange={(e) => onFieldChange(field, e.target.value)}
              aria-describedby={errors[field] ? errorId : undefined}
              aria-invalid={errors[field] ? 'true' : undefined}
              ref={(el) => {
                fieldRefs.current[field] = el;
              }}
            />
            {errors[field] ? (
              <p className="field-error" id={errorId} role="alert">
                {errors[field]}
              </p>
            ) : null}
          </div>
        );
      })}

      <div className="field">
        <label className="option-label option-label-checkbox">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => onConsentChange(e.target.checked)}
            aria-describedby={errors.consent ? 'consent-error' : undefined}
            ref={(el) => {
              fieldRefs.current.consent = el;
            }}
          />
          <span>{consentText}</span>
        </label>
        {errors.consent ? (
          <p className="field-error" id="consent-error" role="alert">
            {errors.consent}
          </p>
        ) : null}
      </div>

      <div className="step-nav">
        <button type="button" className="btn btn-secondary" onClick={onBack}>
          Back
        </button>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit'}
        </button>
      </div>
    </form>
  );
}

export default ContactScreen;
