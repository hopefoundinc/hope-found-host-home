import { useMemo, useState } from 'react';
import quizConfig from '../quizConfig.json';
import LandingScreen from './components/LandingScreen';
import ProgressBar from './components/ProgressBar';
import QuestionScreen from './components/QuestionScreen';
import ContactScreen from './components/ContactScreen';
import ThankYouScreen from './components/ThankYouScreen';
import { validateQuestion, validateContact } from './validation';
import { useSourceTag } from './useSourceTag';

function App() {
  const source = useSourceTag(quizConfig.sourceParam);

  const steps = useMemo(
    () => [
      { type: 'landing' },
      ...quizConfig.questions.map((q) => ({ type: 'question', question: q })),
      { type: 'contact' },
      { type: 'thankyou' },
    ],
    [],
  );

  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [contact, setContact] = useState({});
  const [consent, setConsent] = useState(false);
  const [questionError, setQuestionError] = useState(null);
  const [contactErrors, setContactErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const step = steps[stepIndex];
  const totalProgressSteps = quizConfig.questions.length + 1; // + contact screen

  function goTo(index) {
    setStepIndex(index);
    window.scrollTo(0, 0);
  }

  function handleStart() {
    goTo(1);
  }

  function handleQuestionChange(questionId, value) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    if (questionError) setQuestionError(null);
  }

  function handleQuestionSubmit(question) {
    const error = validateQuestion(question, answers[question.id]);
    if (error) {
      setQuestionError(error);
      return;
    }
    setQuestionError(null);
    goTo(stepIndex + 1);
  }

  function handleBack() {
    setQuestionError(null);
    goTo(stepIndex - 1);
  }

  function handleContactFieldChange(field, value) {
    setContact((prev) => ({ ...prev, [field]: value }));
    if (contactErrors[field]) {
      setContactErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  function handleConsentChange(checked) {
    setConsent(checked);
    if (contactErrors.consent) {
      setContactErrors((prev) => {
        const next = { ...prev };
        delete next.consent;
        return next;
      });
    }
  }

  async function handleContactSubmit(fieldRefs) {
    const errors = validateContact(quizConfig.contactFields, contact);
    if (!consent) {
      errors.consent = 'Please check the box to continue.';
    }
    if (Object.keys(errors).length > 0) {
      setContactErrors(errors);
      const firstInvalid = quizConfig.contactFields.find((f) => errors[f]) || (errors.consent ? 'consent' : null);
      const el = fieldRefs.current[firstInvalid];
      if (el) el.focus();
      return;
    }

    setSubmitting(true);
    try {
      await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers,
          contact,
          consent,
          source,
          submittedAt: new Date().toISOString(),
        }),
      });
    } catch (err) {
      console.error('Submission request failed', err);
    } finally {
      setSubmitting(false);
      goTo(stepIndex + 1);
    }
  }

  return (
    <main className="quiz-shell">
      {step.type === 'question' ? (
        <ProgressBar current={stepIndex} total={totalProgressSteps} />
      ) : null}
      {step.type === 'contact' ? (
        <ProgressBar current={totalProgressSteps} total={totalProgressSteps} />
      ) : null}

      {step.type === 'landing' && (
        <LandingScreen orgName={quizConfig.brand.orgName} onStart={handleStart} />
      )}

      {step.type === 'question' && (
        <QuestionScreen
          question={step.question}
          value={answers[step.question.id]}
          error={questionError}
          onChange={(value) => handleQuestionChange(step.question.id, value)}
          onSubmitStep={() => handleQuestionSubmit(step.question)}
          onBack={handleBack}
          showBack={stepIndex > 0}
        />
      )}

      {step.type === 'contact' && (
        <ContactScreen
          contactFields={quizConfig.contactFields}
          consentText={quizConfig.consentText}
          contact={contact}
          consent={consent}
          errors={contactErrors}
          submitting={submitting}
          onFieldChange={handleContactFieldChange}
          onConsentChange={handleConsentChange}
          onSubmit={handleContactSubmit}
          onBack={handleBack}
        />
      )}

      {step.type === 'thankyou' && <ThankYouScreen orgName={quizConfig.brand.orgName} />}
    </main>
  );
}

export default App;
