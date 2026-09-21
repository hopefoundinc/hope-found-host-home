const PRECEDENCE = { DISQUALIFY: 2, HOLD: 1 };

/**
 * Pure function: derives the internal outcome from a submission's answers and the
 * live quizConfig. No side effects — callers own persistence, email, etc.
 *
 * Precedence: any triggered DISQUALIFY rule wins over HOLD; any triggered HOLD rule
 * wins over QUALIFIED. Every triggered rule's reason is returned, not just the one
 * that decided the outcome, so the record and the PDF can show the full picture.
 */
export function computeOutcome(answers, config) {
  const reasons = [];
  let outcome = 'QUALIFIED';

  for (const question of config.questions) {
    if (!question.rules || question.rules.length === 0) continue;
    const answer = answers[question.id];
    for (const rule of question.rules) {
      if (rule.if !== answer) continue;
      reasons.push({
        questionId: question.id,
        questionText: question.text,
        answer,
        outcome: rule.outcome,
        reason: rule.reason,
      });
      if (PRECEDENCE[rule.outcome] > (PRECEDENCE[outcome] || 0)) {
        outcome = rule.outcome;
      }
    }
  }

  return { outcome, reasons };
}
