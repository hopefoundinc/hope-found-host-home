import { useEffect, useRef } from 'react';

function QuestionScreen({ question, value, error, onChange, onSubmitStep, onBack, showBack }) {
  const errorRef = useRef(null);

  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.focus();
    }
  }, [error]);

  const errorId = `${question.id}-error`;

  function handleSubmit(e) {
    e.preventDefault();
    onSubmitStep();
  }

  let control;
  if (question.type === 'yesno') {
    control = (
      <fieldset className="option-group">
        <legend>{question.text}</legend>
        {['Yes', 'No'].map((option) => (
          <label className="option-label" key={option}>
            <input
              type="radio"
              name={question.id}
              value={option}
              checked={value === option}
              onChange={() => onChange(option)}
              aria-describedby={error ? errorId : undefined}
            />
            <span>{option}</span>
          </label>
        ))}
      </fieldset>
    );
  } else if (question.type === 'select') {
    control = (
      <fieldset className="option-group">
        <legend>{question.text}</legend>
        {question.options.map((option) => (
          <label className="option-label" key={option}>
            <input
              type="radio"
              name={question.id}
              value={option}
              checked={value === option}
              onChange={() => onChange(option)}
              aria-describedby={error ? errorId : undefined}
            />
            <span>{option}</span>
          </label>
        ))}
      </fieldset>
    );
  } else {
    control = (
      <div className="field">
        <label htmlFor={question.id}>{question.text}</label>
        <textarea
          id={question.id}
          name={question.id}
          rows={6}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          aria-describedby={error ? errorId : undefined}
          aria-invalid={error ? 'true' : undefined}
        />
        {question.minLength ? (
          <p className="field-hint">Minimum {question.minLength} characters.</p>
        ) : null}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {control}
      {error ? (
        <p className="field-error" id={errorId} role="alert" tabIndex={-1} ref={errorRef}>
          {error}
        </p>
      ) : null}
      <div className="step-nav">
        {showBack ? (
          <button type="button" className="btn btn-secondary" onClick={onBack}>
            Back
          </button>
        ) : (
          <span />
        )}
        <button type="submit" className="btn btn-primary">
          Continue
        </button>
      </div>
    </form>
  );
}

export default QuestionScreen;
