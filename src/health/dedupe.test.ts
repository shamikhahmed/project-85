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
  it('updates estimated rows by id when corrected', () => {
    const a = row({
      id: 'manual_weight_1',
      provider: 'manual',
      value: 97,
      kind: 'estimated',
      sourceRecordId: 'w1',
      updatedAt: '2026-10-28T08:00:00.000Z',
    });
    const b = row({
      id: 'manual_weight_1',
      provider: 'manual',
      value: 96.2,
      kind: 'estimated',
      sourceRecordId: 'w1',
      updatedAt: '2026-10-28T09:00:00.000Z',
    });
    const merged = mergeHealthRecords([a], [b]);
    expect(merged).toHaveLength(1);
    expect(merged[0].value).toBe(96.2);
  });

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

  it('never sums steps across providers', () => {
    const rows = [
      row({ id: '1', provider: 'apple_health', value: 8000, sourceRecordId: 'a' }),
      row({ id: '2', provider: 'google_health', value: 7000, sourceRecordId: 'g' }),
    ];
    const pick = pickDayTotal(rows, 'steps', '2026-10-28');
    expect(pick?.provider).toBe('apple_health');
    expect(pick?.value).toBe(8000);
  });

  it('sums same-provider cumulative samples for a day', () => {
    const rows = [
      row({
        id: '1',
        provider: 'apple_health',
        value: 3000,
        sourceRecordId: 'a1',
        startAt: '2026-10-28T08:00:00.000Z',
        endAt: '2026-10-28T12:00:00.000Z',
      }),
      row({
        id: '2',
        provider: 'apple_health',
        value: 5000,
        sourceRecordId: 'a2',
        startAt: '2026-10-28T12:00:00.000Z',
        endAt: '2026-10-28T20:00:00.000Z',
      }),
    ];
    const pick = pickDayTotal(rows, 'steps', '2026-10-28');
    expect(pick?.value).toBe(8000);
  });

  it('prefers a day-total over summing samples from the same provider', () => {
    const rows = [
      row({
        id: 'day',
        provider: 'apple_health',
        value: 10000,
        sourceRecordId: 'day',
        startAt: '2026-10-28T00:00:00.000Z',
        endAt: '2026-10-28T23:59:59.000Z',
        updatedAt: '2026-10-28T22:00:00.000Z',
      }),
      row({
        id: 's1',
        provider: 'apple_health',
        value: 3000,
        sourceRecordId: 'a1',
        startAt: '2026-10-28T08:00:00.000Z',
        endAt: '2026-10-28T12:00:00.000Z',
        updatedAt: '2026-10-28T12:00:00.000Z',
      }),
    ];
    const pick = pickDayTotal(rows, 'steps', '2026-10-28');
    expect(pick?.value).toBe(10000);
    expect(pick?.id).toBe('day');
  });
});
