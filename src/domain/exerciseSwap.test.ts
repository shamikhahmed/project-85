import { describe, expect, it } from 'vitest';
import plan from './trainingPlan.json';
import {
  fallbackFor,
  orderedAlternatives,
  resolveDisplayName,
  swapKey,
  swapsForDate,
} from './exerciseSwap';

const allMuscles = () => {
  const days = plan.days as Record<string, { muscle: string }[]>;
  return [...new Set(Object.values(days).flatMap((list) => list.map((e) => e.muscle)))];
};

describe('fallbackFor', () => {
  it('covers every muscle string in trainingPlan.json (never undefined/empty)', () => {
    for (const muscle of allMuscles()) {
      const fb = fallbackFor(muscle, true);
      expect(fb, muscle).toBeTruthy();
      expect(typeof fb).toBe('string');
    }
  });

  it('excludes dips and behind-neck suggestions when shoulderCaution is on', () => {
    for (const muscle of allMuscles()) {
      const fb = fallbackFor(muscle, true).toLowerCase();
      expect(fb, muscle).not.toMatch(/\bdip\b/);
      expect(fb, muscle).not.toMatch(/behind.?neck/);
    }
    expect(fallbackFor('Triceps', false).toLowerCase()).toMatch(/dip/);
  });
});

describe('resolveDisplayName', () => {
  const ex = { name: 'Smith incline press', blockB: 'DB incline press', code: '1' };

  it('priority: swap > blockB > name', () => {
    expect(
      resolveDisplayName(ex, { day: 'push', swaps: {}, useBlockB: false }),
    ).toBe('Smith incline press');
    expect(
      resolveDisplayName(ex, { day: 'push', swaps: {}, useBlockB: true }),
    ).toBe('DB incline press');
    expect(
      resolveDisplayName(ex, {
        day: 'push',
        swaps: { [swapKey('push', '1')]: { name: 'Push-ups', reason: 'busy' } },
        useBlockB: true,
      }),
    ).toBe('Push-ups');
  });
});

describe('swapsForDate', () => {
  it('resets when the calendar date changes', () => {
    const stored = {
      date: '2026-11-03',
      map: { 'push:1': { name: 'Push-ups', reason: 'busy' as const } },
    };
    expect(swapsForDate(stored, '2026-11-03')['push:1']?.name).toBe('Push-ups');
    expect(swapsForDate(stored, '2026-11-04')).toEqual({});
    expect(swapsForDate(null, '2026-11-03')).toEqual({});
  });
});

describe('last-log separation via display names', () => {
  it('orderedAlternatives puts fallback first for pain', () => {
    const alts = orderedAlternatives(['Cable fly', 'Machine press'], 'Push-ups', 'pain');
    expect(alts[0]).toBe('Push-ups');
    const busy = orderedAlternatives(['Cable fly', 'Machine press'], 'Push-ups', 'busy');
    expect(busy[0]).toBe('Cable fly');
  });
});

describe('lastLogsByName separation', () => {
  it('keeps history under the real exercise name after a swap', async () => {
    const { lastLogsByName } = await import('../lib/trainingLog');
    const workouts = [
      {
        id: 'w1',
        date: '2026-11-02',
        type: 'strength' as const,
        notes: 'Plan: Push',
        exercises: [{ name: 'Push-ups', weightKg: 0, reps: 15 }],
        createdAt: '2026-11-02T12:00:00.000Z',
        updatedAt: '2026-11-02T12:00:00.000Z',
      },
      {
        id: 'w2',
        date: '2026-11-01',
        type: 'strength' as const,
        notes: 'Plan: Push',
        exercises: [{ name: 'Smith incline press', weightKg: 60, reps: 8 }],
        createdAt: '2026-11-01T12:00:00.000Z',
        updatedAt: '2026-11-01T12:00:00.000Z',
      },
    ];
    const logs = lastLogsByName(
      workouts,
      ['Push-ups', 'Smith incline press'],
      '2026-11-03',
    );
    expect(logs['Push-ups']?.reps).toBe(15);
    expect(logs['Smith incline press']?.weightKg).toBe(60);
  });
});
