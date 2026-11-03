import { describe, expect, it } from 'vitest';
import plan from './trainingPlan.json';
import { groupsForMuscle, muscleRecovery } from './muscleRecovery';
import { sessionFor } from './plan';
import { carryOver, keyLifts, nextDate, skipOptions } from './skipDay';
import type { WorkoutEntry } from './types';

describe('muscle recovery', () => {
  it('maps every plan muscle string except grip/forearm-only ones', () => {
    const muscles = new Set(Object.values(plan.days).flat().map((e) => e.muscle));
    for (const m of muscles) {
      if (/^(forearms|brachialis, forearm|grip)/i.test(m)) continue;
      expect(groupsForMuscle(m).length, m).toBeGreaterThan(0);
    }
    expect(groupsForMuscle('Chest, triceps')).toEqual(['chest', 'triceps']);
  });

  it('scores hours since training against the group window', () => {
    const first = plan.days.push[0]!; // upper chest + front delts
    const w = { id: 'a', date: '2026-11-03', updatedAt: '', exercises: [{ name: first.name, sets: 1 }] } as unknown as WorkoutEntry;
    const now = new Date(2026, 10, 4, 18, 0, 0); // 24 h after 6 pm on 3 Nov
    const rows = muscleRecovery([w], now);
    expect(rows.find((r) => r.id === 'chest')?.pct).toBe(33); // 24 / 72
    expect(rows.find((r) => r.id === 'shoulders')?.pct).toBe(50); // 24 / 48
    expect(rows.find((r) => r.id === 'quads')?.pct).toBeNull();
  });
});

describe('skip-day coach', () => {
  it('has no options on a rest day', () => {
    const rest = ['2026-11-08', '2026-11-15'].find((d) => sessionFor(d).key === 'rest')!;
    expect(skipOptions(rest)).toBeNull();
  });

  it('recommends moving to tomorrow when tomorrow is free, else merging', () => {
    for (const d of ['2026-11-04', '2026-11-07', '2026-11-13', '2026-11-14']) {
      const opts = skipOptions(d);
      if (!opts) continue;
      const free = ['rest', 'saturday'].includes(sessionFor(nextDate(d)).key);
      expect(opts.find((o) => o.recommended)?.choice, d).toBe(free ? 'tomorrow' : 'merge');
    }
  });

  it('carries a skip into the next day, but not a drop', () => {
    expect(carryOver('2026-11-05', { '2026-11-04': { session: 'pull', choice: 'merge' } })).toEqual({
      session: 'pull',
      choice: 'merge',
      lifts: keyLifts('pull'),
    });
    expect(carryOver('2026-11-05', { '2026-11-04': { session: 'pull', choice: 'drop' } })).toBeNull();
    expect(carryOver('2026-11-05', undefined)).toBeNull();
  });
});

describe('muscle recovery timing', () => {
  it('uses the save time when it falls on the workout date', () => {
    const first = plan.days.push[0]!;
    const saved = new Date(2026, 10, 3, 8, 0, 0); // 8 am on 3 Nov
    const w = { id: 'b', date: '2026-11-03', updatedAt: saved.toISOString(), exercises: [{ name: first.name, sets: 1 }] } as unknown as WorkoutEntry;
    const rows = muscleRecovery([w], new Date(2026, 10, 3, 20, 0, 0)); // 12 h later
    expect(rows.find((r) => r.id === 'shoulders')?.pct).toBe(25); // 12 / 48
  });
});
