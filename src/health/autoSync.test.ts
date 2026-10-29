import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AUTO_SYNC_FIRST_WINDOW_DAYS,
  AUTO_SYNC_OVERLAP_DAYS,
  AUTO_SYNC_THROTTLE_MS,
  autoSyncWindow,
  shouldAutoSyncNow,
} from './autoSync';

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => true,
    getPlatform: () => 'ios',
  },
}));

describe('shouldAutoSyncNow', () => {
  it('throttles a second run within 15 minutes', () => {
    const now = Date.parse('2026-11-03T12:00:00.000Z');
    expect(
      shouldAutoSyncNow({
        autoSyncEnabled: true,
        lastAutoSyncAt: new Date(now - AUTO_SYNC_THROTTLE_MS + 60_000).toISOString(),
        nowMs: now,
      }),
    ).toBe(false);
    expect(
      shouldAutoSyncNow({
        autoSyncEnabled: true,
        lastAutoSyncAt: new Date(now - AUTO_SYNC_THROTTLE_MS - 1).toISOString(),
        nowMs: now,
      }),
    ).toBe(true);
  });

  it('skips when auto-sync is disabled', () => {
    expect(
      shouldAutoSyncNow({
        autoSyncEnabled: false,
        lastAutoSyncAt: null,
        nowMs: Date.now(),
      }),
    ).toBe(false);
  });
});

describe('autoSyncWindow', () => {
  it('uses 30 days on first run and overlap after success', () => {
    const now = Date.parse('2026-11-10T08:00:00.000Z');
    const first = autoSyncWindow({ lastSuccessAt: null, nowMs: now });
    expect(first.days).toBe(AUTO_SYNC_FIRST_WINDOW_DAYS);

    const lastSuccess = new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString();
    const next = autoSyncWindow({ lastSuccessAt: lastSuccess, nowMs: now });
    const fromMs = Date.parse(next.from);
    const expectedFrom = Date.parse(lastSuccess) - AUTO_SYNC_OVERLAP_DAYS * 24 * 60 * 60 * 1000;
    expect(Math.abs(fromMs - expectedFrom)).toBeLessThan(2000);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});
