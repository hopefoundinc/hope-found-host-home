import { geocodeAddress } from './geocode.js';
import { haversineMiles } from './distance.js';
import { PRECEDENCE } from '../src/outcomeEngine.js';
import { logFailure } from './logger.js';

function upgrade(current, candidate) {
  if ((PRECEDENCE[candidate] || 0) > (PRECEDENCE[current] || 0)) return candidate;
  return current;
}

/**
 * Runs after the pure outcome engine. Maryland homes are already held pending
 * Hope Found's provider application (see quizConfig.json); this adds a hard
 * distance cutoff on top of that, since Maryland coverage is limited to a
 * radius around the DC DDS office regardless of the application's status.
 *
 * Not part of computeOutcome because it requires a network geocode call —
 * computeOutcome must stay pure and synchronous.
 */
export async function applyMarylandDistanceCheck({ answers, contact, config, outcome, reasons, submissionId }) {
  const check = config.marylandDistanceCheck;
  if (!check || answers[check.triggerQuestionId] !== check.triggerValue) {
    return { outcome, reasons };
  }

  const questionText = `Distance from ${check.officeName}`;
  const addressLine = `${contact.streetAddress}, ${contact.city}, ${contact.state} ${contact.zip}`;

  let applicantCoords = null;
  try {
    applicantCoords = await geocodeAddress(addressLine);
  } catch (err) {
    logFailure('maryland_geocode_failed', { submissionId, address: addressLine, error: err.message });
  }

  if (!applicantCoords) {
    return {
      outcome: upgrade(outcome, 'HOLD'),
      reasons: [
        ...reasons,
        {
          questionId: check.triggerQuestionId,
          questionText,
          answer: addressLine,
          outcome: 'HOLD',
          reason: `Could not automatically verify the home's distance from ${check.officeName} (${check.officeAddress}) — check manually`,
        },
      ],
    };
  }

  const distanceMiles = haversineMiles(applicantCoords, { lat: check.officeLat, lng: check.officeLng });
  if (distanceMiles <= check.maxMiles) {
    return { outcome, reasons };
  }

  return {
    outcome: upgrade(outcome, 'DISQUALIFY'),
    reasons: [
      ...reasons,
      {
        questionId: check.triggerQuestionId,
        questionText,
        answer: addressLine,
        outcome: 'DISQUALIFY',
        reason: `Home is approximately ${distanceMiles.toFixed(1)} miles from ${check.officeName} (${check.officeAddress}), beyond the ${check.maxMiles}-mile limit`,
      },
    ],
  };
}
