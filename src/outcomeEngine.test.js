import { describe, it, expect } from 'vitest';
import { computeOutcome } from './outcomeEngine';

function makeConfig(questions) {
  return { questions };
}

const locationQuestion = {
  id: 'location',
  text: 'Where is the home you would host in?',
  type: 'select',
  options: ['Washington, DC', 'Maryland', 'Virginia', 'Other'],
  rules: [
    { if: 'Maryland', outcome: 'HOLD', reason: 'Home is in Maryland; Hope Found\'s Maryland provider application is pending' },
    { if: 'Virginia', outcome: 'DISQUALIFY', reason: 'Home is in Virginia; host homes must be in DC' },
    { if: 'Other', outcome: 'DISQUALIFY', reason: 'Home is outside the service area' },
  ],
};

const englishQuestion = {
  id: 'english',
  text: 'Can you read, write, and speak English fluently?',
  type: 'yesno',
  rules: [{ if: 'No', outcome: 'DISQUALIFY', reason: 'Not fluent in English' }],
};

const ageQuestion = {
  id: 'age',
  text: 'Are you 21 or older?',
  type: 'yesno',
  rules: [{ if: 'No', outcome: 'DISQUALIFY', reason: 'Under 21' }],
};

const incomeQuestion = {
  id: 'income',
  text: 'Do you have a stable source of income separate from this program?',
  type: 'yesno',
  rules: [{ if: 'No', outcome: 'HOLD', reason: 'No independent income; needs review' }],
};

const transportQuestion = {
  id: 'transport',
  text: 'Do you have reliable transportation?',
  type: 'yesno',
  rules: [],
};

describe('computeOutcome', () => {
  it('qualifies a clean submission with no triggered rules', () => {
    const config = makeConfig([locationQuestion, englishQuestion, ageQuestion, incomeQuestion, transportQuestion]);
    const answers = {
      location: 'Washington, DC',
      english: 'Yes',
      age: 'Yes',
      income: 'Yes',
      transport: 'Yes',
    };

    const result = computeOutcome(answers, config);

    expect(result.outcome).toBe('QUALIFIED');
    expect(result.reasons).toEqual([]);
  });

  it('disqualifies on a single triggered DISQUALIFY rule', () => {
    const config = makeConfig([locationQuestion, englishQuestion]);
    const answers = { location: 'Washington, DC', english: 'No' };

    const result = computeOutcome(answers, config);

    expect(result.outcome).toBe('DISQUALIFY');
    expect(result.reasons).toHaveLength(1);
    expect(result.reasons[0]).toMatchObject({ questionId: 'english', outcome: 'DISQUALIFY' });
  });

  it('disqualifies and records every triggered DISQUALIFY reason when several fire', () => {
    const config = makeConfig([locationQuestion, englishQuestion, ageQuestion]);
    const answers = { location: 'Virginia', english: 'No', age: 'No' };

    const result = computeOutcome(answers, config);

    expect(result.outcome).toBe('DISQUALIFY');
    expect(result.reasons).toHaveLength(3);
    expect(result.reasons.map((r) => r.questionId)).toEqual(['location', 'english', 'age']);
    expect(result.reasons.every((r) => r.outcome === 'DISQUALIFY')).toBe(true);
  });

  it('holds when only HOLD rules are triggered', () => {
    const config = makeConfig([locationQuestion, incomeQuestion]);
    const answers = { location: 'Maryland', income: 'No' };

    const result = computeOutcome(answers, config);

    expect(result.outcome).toBe('HOLD');
    expect(result.reasons).toHaveLength(2);
    expect(result.reasons.every((r) => r.outcome === 'HOLD')).toBe(true);
  });

  it('lets DISQUALIFY win over HOLD, while still recording both reasons', () => {
    const config = makeConfig([locationQuestion, incomeQuestion, englishQuestion]);
    const answers = { location: 'Maryland', income: 'No', english: 'No' };

    const result = computeOutcome(answers, config);

    expect(result.outcome).toBe('DISQUALIFY');
    expect(result.reasons).toHaveLength(3);
    const outcomesSeen = result.reasons.map((r) => r.outcome).sort();
    expect(outcomesSeen).toEqual(['DISQUALIFY', 'HOLD', 'HOLD']);
  });

  it('ignores a question with no rules regardless of its answer', () => {
    const config = makeConfig([transportQuestion]);

    const withYes = computeOutcome({ transport: 'Yes' }, config);
    const withNo = computeOutcome({ transport: 'No' }, config);

    expect(withYes).toEqual({ outcome: 'QUALIFIED', reasons: [] });
    expect(withNo).toEqual({ outcome: 'QUALIFIED', reasons: [] });
  });

  describe('each location option', () => {
    const config = makeConfig([locationQuestion]);

    it('Washington, DC triggers no rule and qualifies', () => {
      const result = computeOutcome({ location: 'Washington, DC' }, config);
      expect(result).toEqual({ outcome: 'QUALIFIED', reasons: [] });
    });

    it('Maryland holds pending the provider application', () => {
      const result = computeOutcome({ location: 'Maryland' }, config);
      expect(result.outcome).toBe('HOLD');
      expect(result.reasons).toHaveLength(1);
      expect(result.reasons[0].reason).toMatch(/Maryland/);
    });

    it('Virginia disqualifies', () => {
      const result = computeOutcome({ location: 'Virginia' }, config);
      expect(result.outcome).toBe('DISQUALIFY');
      expect(result.reasons).toHaveLength(1);
      expect(result.reasons[0].reason).toMatch(/Virginia/);
    });

    it('Other disqualifies', () => {
      const result = computeOutcome({ location: 'Other' }, config);
      expect(result.outcome).toBe('DISQUALIFY');
      expect(result.reasons).toHaveLength(1);
      expect(result.reasons[0].reason).toMatch(/outside the service area/);
    });
  });
});
