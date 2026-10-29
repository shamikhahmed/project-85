import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PROVIDER_PRIORITY_FOR_DAY_TOTALS, pickDayTotal } from './dedupe';
import type { HealthMetricRecord } from './types';

function sample(
  over: Partial<HealthMetricRecord> & Pick<HealthMetricRecord, 'id' | 'metricId' | 'provider' | 'value'>,
): HealthMetricRecord {
  return {
    category: 'activity',
    unit: 'count',
    originalValue: over.value,
    originalUnit: 'count',
    startAt: '2026-11-03T00:00:00.000',
    endAt: '2026-11-03T23:59:59.999',
    timeZone: null,
    ingestedAt: '2026-11-03T12:00:00.000Z',
    deviceName: null,
    sourceApp: null,
    sourceRecordId: over.id,
    kind: 'imported',
    quality: 'high',
    deletedAt: null,
    createdAt: '2026-11-03T12:00:00.000Z',
    updatedAt: '2026-11-03T12:00:00.000Z',
    ...over,
  };
}

describe('manual beats synced + no double counting', () => {
  it('pickDayTotal prefers manual over Apple and Google', () => {
    const rows = [
      sample({ id: 'g', metricId: 'steps', provider: 'google_health', value: 4000 }),
      sample({ id: 'a', metricId: 'steps', provider: 'apple_health', value: 8000 }),
      sample({ id: 'm', metricId: 'steps', provider: 'manual', value: 9500, kind: 'manual' }),
    ];
    expect(pickDayTotal(rows, 'steps', '2026-11-03')?.value).toBe(9500);
    expect(PROVIDER_PRIORITY_FOR_DAY_TOTALS[0]).toBe('manual');
  });

  it('never sums Apple + Google step day totals', () => {
    const rows = [
      sample({ id: 'a', metricId: 'steps', provider: 'apple_health', value: 8000 }),
      sample({ id: 'g', metricId: 'steps', provider: 'google_health', value: 4000 }),
    ];
    const pick = pickDayTotal(rows, 'steps', '2026-11-03');
    expect(pick?.value).toBe(8000);
    expect(pick?.value).not.toBe(12000);
  });
});

describe('PWA honesty', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('reports unsupported and never connected on web', async () => {
    vi.doMock('@capacitor/core', () => ({
      Capacitor: {
        isNativePlatform: () => false,
        getPlatform: () => 'web',
      },
    }));
    const { getHealthKitBridgeStatus } = await import('../native/healthKitBridge');
    const status = getHealthKitBridgeStatus();
    expect(status.available).toBe(false);
    expect(status.platform).toBe('web');
    expect(status.reason.toLowerCase()).toMatch(/pwa|browser|unavailable/);
  });
});
