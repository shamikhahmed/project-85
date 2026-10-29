import { describe, expect, it } from 'vitest';
import { groupSleepNights } from './sleepNights';

describe('groupSleepNights', () => {
  it('merges fragmented stages and excludes awake from total', () => {
    const provider = 'apple';
    const segments = [
      {
        startAt: '2026-10-27T23:00:00',
        endAt: '2026-10-28T00:30:00',
        metricId: 'sleep_asleep',
        value: 0,
        provider,
      },
      {
        startAt: '2026-10-28T00:30:00',
        endAt: '2026-10-28T00:45:00',
        metricId: 'sleep_awake',
        value: 0,
        provider,
      },
      {
        startAt: '2026-10-28T00:45:00',
        endAt: '2026-10-28T02:00:00',
        metricId: 'sleep_asleep',
        value: 0,
        provider,
      },
      {
        startAt: '2026-10-28T02:00:00',
        endAt: '2026-10-28T02:20:00',
        metricId: 'sleep_awake',
        value: 0,
        provider,
      },
      {
        startAt: '2026-10-28T02:20:00',
        endAt: '2026-10-28T06:30:00',
        metricId: 'sleep_asleep',
        value: 0,
        provider,
      },
      {
        startAt: '2026-10-28T06:30:00',
        endAt: '2026-10-28T07:00:00',
        metricId: 'sleep_asleep',
        value: 0,
        provider,
      },
    ];
    const nights = groupSleepNights(segments);
    expect(nights).toHaveLength(1);
    expect(nights[0]!.bedtime).toBe('2026-10-27T23:00:00');
    expect(nights[0]!.wake).toBe('2026-10-28T07:00:00');
    // 90 + 75 + 250 + 30 = 445 asleep minutes (awake gaps excluded)
    expect(nights[0]!.asleepMinutes).toBe(445);
  });

  it('splits when gap exceeds 90 minutes', () => {
    const provider = 'apple';
    const nights = groupSleepNights([
      {
        startAt: '2026-10-27T23:00:00',
        endAt: '2026-10-28T06:00:00',
        metricId: 'sleep_asleep',
        value: 0,
        provider,
      },
      {
        startAt: '2026-10-28T20:00:00',
        endAt: '2026-10-29T05:00:00',
        metricId: 'sleep_asleep',
        value: 0,
        provider,
      },
    ]);
    expect(nights).toHaveLength(2);
    expect(nights.map((n) => n.wakeDay).sort()).toEqual(['2026-10-28', '2026-10-29']);
  });

  it('keeps longest night per wake day', () => {
    const provider = 'apple';
    const nights = groupSleepNights([
      {
        startAt: '2026-10-27T22:00:00',
        endAt: '2026-10-28T07:00:00',
        metricId: 'sleep_asleep',
        value: 0,
        provider,
      },
      {
        startAt: '2026-10-28T13:00:00',
        endAt: '2026-10-28T17:00:00',
        metricId: 'sleep_asleep',
        value: 0,
        provider,
      },
    ]);
    expect(nights).toHaveLength(1);
    expect(nights[0]!.asleepMinutes).toBe(540);
  });
});
