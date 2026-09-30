import { describe, it, expect, beforeEach } from 'vitest';
import handler from './submit.js';
import { _resetForTests as resetRateLimit } from '../lib/rateLimit.js';

function makeReqRes(body, ip) {
  const req = { method: 'POST', body, headers: { 'x-forwarded-for': ip } };
  const res = {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    setHeader() {},
  };
  return { req, res };
}

const validAnswers = {
  location: 'Washington, DC',
  english: 'Yes',
  age: 'Yes',
  room: 'Yes',
  room_ready: 'Now',
  screening: 'Yes',
  income: 'Yes',
  household: 'Yes',
  transport: 'Yes',
  experience: 'Yes',
  adaptability: 'Yes',
  autonomy_respect: 'Yes',
  why: 'I want to open my home because I have room and time to help someone find a safe place to live.',
};

const validContact = {
  fullName: 'Jamie Test',
  phone: '2025550100',
  email: 'jamie@example.com',
  streetAddress: '1 Main St',
  city: 'Washington',
  state: 'DC',
  zip: '20001',
  bestTimeToCall: 'Evenings',
};

function validBody(overrides = {}) {
  return {
    answers: validAnswers,
    contact: validContact,
    consent: true,
    source: 'test',
    startedAt: new Date(Date.now() - 30_000).toISOString(),
    honeypot: '',
    ...overrides,
  };
}

beforeEach(() => {
  resetRateLimit();
});

describe('POST /api/submit hardening', () => {
  it('rejects a submission with the honeypot field filled in', async () => {
    const { req, res } = makeReqRes(validBody({ honeypot: 'I am a bot' }), '10.0.0.2');
    await handler(req, res);
    expect(res.statusCode).toBe(400);
  });

  it('rejects a submission completed in under 20 seconds', async () => {
    const { req, res } = makeReqRes(validBody({ startedAt: new Date(Date.now() - 5000).toISOString() }), '10.0.0.3');
    await handler(req, res);
    expect(res.statusCode).toBe(400);
  });

  it('rejects a submission with a missing startedAt', async () => {
    const { req, res } = makeReqRes(validBody({ startedAt: undefined }), '10.0.0.4');
    await handler(req, res);
    expect(res.statusCode).toBe(400);
  });

  it('accepts a well-formed, well-timed submission', async () => {
    const { req, res } = makeReqRes(validBody(), '10.0.0.5');
    await handler(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('rate-limits a 6th submission from the same IP within an hour', async () => {
    const ip = '10.0.0.6';
    for (let i = 0; i < 5; i++) {
      const { req, res } = makeReqRes(validBody(), ip);
      await handler(req, res);
      expect(res.statusCode).toBe(200);
    }
    const { req, res } = makeReqRes(validBody(), ip);
    await handler(req, res);
    expect(res.statusCode).toBe(429);
  });

  it('does not count a different IP against another IP\'s rate limit', async () => {
    for (let i = 0; i < 5; i++) {
      const { req, res } = makeReqRes(validBody(), '10.0.0.7');
      await handler(req, res);
    }
    const { req, res } = makeReqRes(validBody(), '10.0.0.8');
    await handler(req, res);
    expect(res.statusCode).toBe(200);
  });

  it('still enforces field validation independent of the hardening checks', async () => {
    const { req, res } = makeReqRes(validBody({ contact: { ...validContact, email: 'not-an-email' } }), '10.0.0.9');
    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.fields.email).toBeTruthy();
  });
});
