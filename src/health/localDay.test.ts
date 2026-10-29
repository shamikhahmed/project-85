import { afterEach, describe, expect, it, vi } from 'vitest';
import { localCalendarDay } from '../lib/dates';
import { isLikelyDayTotal, pickDayTotal } from './dedupe';
import type { HealthMetricRecord } from './types';

function sample(
  over: Partial<HealthMetricRecord> &
    Pick<HealthMetricRecord, 'id' | 'metricId' | 'provider' | 'value' | 'startAt' | 'endAt'>,
): HealthMetricRecord {
  return {
    category: 'activity',
    unit: 'count',
    originalValue: over.value,
    originalUnit: 'count',
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

describe('localCalendarDay timezone', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('maps early-morning Z samples to local day in Asia/Karachi', () => {
    vi.stubEnv('TZ', 'Asia/Karachi');
    expect(localCalendarDay('2026-11-02T22:30:00.000Z')).toBe('2026-11-03');
  });

  it('maps early-morning Z samples to local day in America/Toronto', () => {
    vi.stubEnv('TZ', 'America/Toronto');
    expect(localCalendarDay('2026-11-03T04:30:00.000Z')).toBe('2026-11-02');
  });

  it('pickDayTotal uses local calendar day not UTC slice', () => {
    vi.stubEnv('TZ', 'Asia/Karachi');
    const rows = [
      sample({
        id: 's1',
        metricId: 'steps',
        provider: 'apple_health',
        value: 1200,
        startAt: '2026-11-02T20:00:00.000Z',
        endAt: '2026-11-02T20:30:00.000Z',
      }),
    ];
    expect(pickDayTotal(rows, 'steps', '2026-11-03')?.value).toBe(1200);
    expect(pickDayTotal(rows, 'steps', '2026-11-02')).toBeNull();
  });

  it('isLikelyDayTotal uses local days', () => {
    vi.stubEnv('TZ', 'Asia/Karachi');
    const r = sample({
      id: 'd',
      metricId: 'steps',
      provider: 'apple_health',
      value: 9000,
      startAt: '2026-11-02T19:00:00.000Z',
      endAt: '2026-11-02T19:01:00.000Z',
    });
    expect(isLikelyDayTotal(r, '2026-11-03')).toBe(false);
  });
});
