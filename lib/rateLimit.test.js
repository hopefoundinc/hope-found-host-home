import { describe, it, expect, beforeEach } from 'vitest';
import { checkRateLimit, _resetForTests } from './rateLimit.js';

beforeEach(() => {
  _resetForTests();
});

describe('checkRateLimit', () => {
  it('allows up to 5 requests per IP within the window', () => {
    const ip = '1.2.3.4';
    for (let i = 1; i <= 5; i++) {
      const result = checkRateLimit(ip, 1000);
      expect(result.allowed).toBe(true);
      expect(result.count).toBe(i);
    }
  });

  it('blocks the 6th request within the window', () => {
    const ip = '1.2.3.4';
    for (let i = 0; i < 5; i++) checkRateLimit(ip, 1000);
    const result = checkRateLimit(ip, 1000);
    expect(result.allowed).toBe(false);
    expect(result.count).toBe(6);
  });

  it('resets the count once the window elapses', () => {
    const ip = '5.6.7.8';
    for (let i = 0; i < 5; i++) checkRateLimit(ip, 0);
    expect(checkRateLimit(ip, 0).allowed).toBe(false);

    const afterWindow = checkRateLimit(ip, 60 * 60 * 1000 + 1);
    expect(afterWindow.allowed).toBe(true);
    expect(afterWindow.count).toBe(1);
  });

  it('tracks each IP independently', () => {
    for (let i = 0; i < 5; i++) checkRateLimit('1.1.1.1', 1000);
    const other = checkRateLimit('2.2.2.2', 1000);
    expect(other.allowed).toBe(true);
    expect(other.count).toBe(1);
  });
});
