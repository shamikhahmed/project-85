import { describe, expect, it } from 'vitest';
import { mergeHealthRecords, pickDayTotal } from './dedupe';
import type { HealthMetricRecord } from './types';

function row(over: Partial<HealthMetricRecord> & Pick<HealthMetricRecord, 'id' | 'provider' | 'value'>): HealthMetricRecord {
  const now = '2026-10-28T12:00:00.000Z';
  return {
    metricId: 'steps',
    category: 'activity',
    unit: 'count',
    originalValue: over.value,
    originalUnit: 'count',
    startAt: '2026-10-28T00:00:00.000Z',
    endAt: '2026-10-28T23:59:59.000Z',
    timeZone: null,
    ingestedAt: now,
    deviceName: null,
    sourceApp: null,
    sourceRecordId: null,
    kind: 'imported',
    quality: 'high',
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
    ...over,
  };
}

describe('mergeHealthRecords', () => {
  it('updates same sourceRecordId with newer row', () => {
    const a = row({
      id: '1',
      provider: 'google_health',
      value: 8000,
      sourceRecordId: 'gh_1',
      updatedAt: '2026-10-28T10:00:00.000Z',
    });
    const b = row({
      id: '2',
      provider: 'google_health',
      value: 9000,
      sourceRecordId: 'gh_1',
      updatedAt: '2026-10-28T11:00:00.000Z',
    });
    const merged = mergeHealthRecords([a], [b]);
    expect(merged).toHaveLength(1);
    expect(merged[0].value).toBe(9000);
  });

  it('keeps both providers without summing', () => {
    const a = row({ id: '1', provider: 'apple_health', value: 10000, sourceRecordId: 'a1' });
    const b = row({ id: '2', provider: 'google_health', value: 9500, sourceRecordId: 'g1' });
    const merged = mergeHealthRecords([a], [b]);
    expect(merged).toHaveLength(2);
  });
});

describe('pickDayTotal', () => {
  it('prefers manual over device totals', () => {
    const rows = [
      row({ id: '1', provider: 'google_health', value: 12000, sourceRecordId: 'g' }),
      row({ id: '2', provider: 'manual', value: 10000, kind: 'manual', sourceRecordId: 'm' }),
    ];
    const pick = pickDayTotal(rows, 'steps', '2026-10-28');
    expect(pick?.provider).toBe('manual');
    expect(pick?.value).toBe(10000);
  });
});
