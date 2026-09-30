const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_PER_WINDOW = 5;

// In-memory, per warm serverless instance. Vercel Fluid Compute reuses
// instances across requests, so this catches real abuse in practice even
// though the count isn't shared across every concurrent instance. That's an
// acceptable trade-off at this project's expected volume (a lead form behind
// church flyers, not a high-value bot target). If traffic ever grows enough
// that a determined bot spreading requests across instances becomes a real
// concern, swap this module for a client against a shared store (e.g.
// Upstash Redis via the Vercel Marketplace) — the checkRateLimit(ip) call
// site in api/submit.js wouldn't need to change.
const hits = new Map();

export function checkRateLimit(ip, now = Date.now()) {
  const entry = hits.get(ip);
  if (!entry || now - entry.windowStart >= WINDOW_MS) {
    hits.set(ip, { windowStart: now, count: 1 });
    return { allowed: true, count: 1 };
  }
  entry.count += 1;
  return { allowed: entry.count <= MAX_PER_WINDOW, count: entry.count };
}

export function getClientIp(req) {
  const forwardedFor = req.headers?.['x-forwarded-for'];
  if (forwardedFor) return forwardedFor.split(',')[0].trim();
  return req.headers?.['x-real-ip'] || req.socket?.remoteAddress || 'unknown';
}

export function _resetForTests() {
  hits.clear();
}
