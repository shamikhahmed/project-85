import { describe, expect, it } from 'vitest';
import {
  diagnoseAllConnections,
  markProviderSyncSuccess,
  mergeConnectionDiagnostics,
} from './adapters';
import type { HealthConnectionState } from './types';

function appleOk(at: string): HealthConnectionState {
  return {
    id: 'conn_apple_health',
    provider: 'apple_health',
    displayName: 'Apple Health',
    status: 'ok',
    lastSuccessAt: at,
    lastAttemptAt: at,
    lastError: null,
    scopesGranted: ['steps'],
    notes: 'Imported 3 samples',
    updatedAt: at,
  };
}

describe('mergeConnectionDiagnostics', () => {
  it('preserves prior Apple ok + lastSuccessAt across diagnose refresh', () => {
    // Simulate native diagnose (permission_needed) without requiring Capacitor.
    const diagnosed = diagnoseAllConnections().map((c) =>
      c.provider === 'apple_health'
        ? { ...c, status: 'permission_needed' as const, lastSuccessAt: null }
        : c,
    );
    const successAt = '2026-10-28T10:00:00.000Z';
    const merged = mergeConnectionDiagnostics(diagnosed, [appleOk(successAt)]);
    const apple = merged.find((c) => c.provider === 'apple_health');
    expect(apple?.status).toBe('ok');
    expect(apple?.lastSuccessAt).toBe(successAt);
  });

  it('does not invent ok when there was never a successful sync', () => {
    const diagnosed = diagnoseAllConnections();
    const merged = mergeConnectionDiagnostics(diagnosed, []);
    const apple = merged.find((c) => c.provider === 'apple_health');
    expect(apple?.status).not.toBe('ok');
    expect(apple?.lastSuccessAt).toBeNull();
  });

  it('does not keep ok when platform is unsupported', () => {
    const diagnosed = diagnoseAllConnections().map((c) =>
      c.provider === 'apple_health' ? { ...c, status: 'unsupported' as const } : c,
    );
    const merged = mergeConnectionDiagnostics(diagnosed, [
      appleOk('2026-10-28T10:00:00.000Z'),
    ]);
    const apple = merged.find((c) => c.provider === 'apple_health');
    expect(apple?.status).toBe('unsupported');
    expect(apple?.lastSuccessAt).toBe('2026-10-28T10:00:00.000Z');
  });
});

describe('markProviderSyncSuccess', () => {
  it('marks apple ok only when called after a real import', () => {
    const next = markProviderSyncSuccess([], 'apple_health', 'Imported 2 samples');
    const apple = next.find((c) => c.provider === 'apple_health');
    expect(apple?.status).toBe('ok');
    expect(apple?.lastSuccessAt).toBeTruthy();
    expect(apple?.notes).toMatch(/Imported 2/);
  });
});
