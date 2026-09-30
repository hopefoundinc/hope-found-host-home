import { describe, it, expect, vi, beforeEach } from 'vitest';
import { applyMarylandDistanceCheck } from './marylandDistanceCheck.js';

const config = {
  marylandDistanceCheck: {
    triggerQuestionId: 'location',
    triggerValue: 'Maryland',
    maxMiles: 25,
    officeName: "DC's DDS main office",
    officeAddress: '250 E Street SW, Washington, DC 20024',
    officeLat: 38.883183920976,
    officeLng: -77.014896371756,
  },
};

const contact = { streetAddress: '1 Main St', city: 'Silver Spring', state: 'MD', zip: '20910' };

function censusResponse(coords) {
  return {
    ok: true,
    json: async () => ({
      result: { addressMatches: coords ? [{ coordinates: { x: coords.lng, y: coords.lat } }] : [] },
    }),
  };
}

beforeEach(() => {
  global.fetch = vi.fn();
});

describe('applyMarylandDistanceCheck', () => {
  it('does nothing when the location answer is not Maryland', async () => {
    const result = await applyMarylandDistanceCheck({
      answers: { location: 'Washington, DC' },
      contact,
      config,
      outcome: 'QUALIFIED',
      reasons: [],
    });

    expect(result).toEqual({ outcome: 'QUALIFIED', reasons: [] });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('leaves the outcome unchanged when the home is within the mile limit', async () => {
    // Silver Spring, MD — a few miles from the DC office, well within 25 miles.
    global.fetch.mockResolvedValue(censusResponse({ lat: 38.9907, lng: -77.0261 }));

    const result = await applyMarylandDistanceCheck({
      answers: { location: 'Maryland' },
      contact,
      config,
      outcome: 'HOLD',
      reasons: [{ questionId: 'location', questionText: 'Where...', answer: 'Maryland', outcome: 'HOLD', reason: 'pending application' }],
    });

    expect(result.outcome).toBe('HOLD');
    expect(result.reasons).toHaveLength(1);
  });

  it('escalates to DISQUALIFY and records the distance when beyond the mile limit', async () => {
    // Baltimore, MD — roughly 35 miles from the DC office, beyond 25.
    global.fetch.mockResolvedValue(censusResponse({ lat: 39.2904, lng: -76.6122 }));

    const result = await applyMarylandDistanceCheck({
      answers: { location: 'Maryland' },
      contact,
      config,
      outcome: 'HOLD',
      reasons: [{ questionId: 'location', questionText: 'Where...', answer: 'Maryland', outcome: 'HOLD', reason: 'pending application' }],
    });

    expect(result.outcome).toBe('DISQUALIFY');
    expect(result.reasons).toHaveLength(2);
    const distanceReason = result.reasons.find((r) => r.questionId === 'location' && r.outcome === 'DISQUALIFY');
    expect(distanceReason.reason).toMatch(/beyond the 25-mile limit/);
    expect(distanceReason.reason).toMatch(/\d+\.\d miles/);
  });

  it('holds for manual review when the address cannot be geocoded, without crashing', async () => {
    global.fetch.mockResolvedValue(censusResponse(null));

    const result = await applyMarylandDistanceCheck({
      answers: { location: 'Maryland' },
      contact,
      config,
      outcome: 'QUALIFIED',
      reasons: [],
    });

    expect(result.outcome).toBe('HOLD');
    expect(result.reasons).toHaveLength(1);
    expect(result.reasons[0].reason).toMatch(/check manually/);
  });

  it('keeps DISQUALIFY precedence while still recording the distance reason', async () => {
    global.fetch.mockResolvedValue(censusResponse({ lat: 39.2904, lng: -76.6122 })); // Baltimore, beyond limit

    const result = await applyMarylandDistanceCheck({
      answers: { location: 'Maryland' },
      contact,
      config,
      outcome: 'DISQUALIFY',
      reasons: [{ questionId: 'english', questionText: 'English?', answer: 'No', outcome: 'DISQUALIFY', reason: 'Not fluent' }],
    });

    expect(result.outcome).toBe('DISQUALIFY');
    expect(result.reasons).toHaveLength(2);
  });

  it('does not throw when the geocoder request itself fails', async () => {
    global.fetch.mockRejectedValue(new Error('network down'));

    const result = await applyMarylandDistanceCheck({
      answers: { location: 'Maryland' },
      contact,
      config,
      outcome: 'HOLD',
      reasons: [],
    });

    expect(result.outcome).toBe('HOLD');
    expect(result.reasons).toHaveLength(1);
    expect(result.reasons[0].reason).toMatch(/check manually/);
  });
});
