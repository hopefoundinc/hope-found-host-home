import { describe, it, expect, vi, beforeEach } from 'vitest';
import { findDuplicateFlag } from './duplicateCheck.js';

function valuesResponse(rows, ok = true) {
  return { ok, status: ok ? 200 : 500, json: async () => ({ values: rows }), text: async () => 'error' };
}

beforeEach(() => {
  global.fetch = vi.fn();
});

describe('findDuplicateFlag', () => {
  it('returns empty string and skips the request when no email is given', async () => {
    const flag = await findDuplicateFlag('token', { sheetId: 's1', email: '', submittedAt: new Date().toISOString() });
    expect(flag).toBe('');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('flags a match within the last 24 hours, case-insensitively', async () => {
    const now = new Date('2026-09-22T12:00:00.000Z');
    global.fetch.mockResolvedValue(
      valuesResponse([['id-1', '2026-09-22T10:00:00.000Z', 'Jane Doe', '555', 'Jane@Example.com']]),
    );

    const flag = await findDuplicateFlag('token', { sheetId: 's1', email: 'jane@example.com', submittedAt: now.toISOString() });
    expect(flag).toMatch(/possible duplicate/i);
  });

  it('does not flag a match older than 24 hours', async () => {
    const now = new Date('2026-09-22T12:00:00.000Z');
    global.fetch.mockResolvedValue(
      valuesResponse([['id-1', '2026-09-21T10:00:00.000Z', 'Jane Doe', '555', 'jane@example.com']]),
    );

    const flag = await findDuplicateFlag('token', { sheetId: 's1', email: 'jane@example.com', submittedAt: now.toISOString() });
    expect(flag).toBe('');
  });

  it('does not flag a different email', async () => {
    const now = new Date('2026-09-22T12:00:00.000Z');
    global.fetch.mockResolvedValue(
      valuesResponse([['id-1', '2026-09-22T10:00:00.000Z', 'Jane Doe', '555', 'someone-else@example.com']]),
    );

    const flag = await findDuplicateFlag('token', { sheetId: 's1', email: 'jane@example.com', submittedAt: now.toISOString() });
    expect(flag).toBe('');
  });

  it('propagates a read failure rather than silently returning no flag', async () => {
    global.fetch.mockResolvedValue(valuesResponse([], false));

    await expect(
      findDuplicateFlag('token', { sheetId: 's1', email: 'jane@example.com', submittedAt: new Date().toISOString() }),
    ).rejects.toThrow();
  });
});
