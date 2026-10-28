import { describe, expect, it } from 'vitest';
import { createDefaultSettings } from './defaults';
import { macrosFor, missionFor, planPhase, planWeek, sessionFor, sundayCheckpoints, targetWeightOn } from './plan';
import { applyPlanV2 } from '../data/repository';

const S = createDefaultSettings('2026-11-01T00:00:00.000Z');

describe('plan sessions', () => {
  it('week 1 starts on Tuesday 3 Nov with Push', () => {
    expect(sessionFor('2026-11-03').key).toBe('push');
    expect(sessionFor('2026-11-04').key).toBe('pull');
    expect(sessionFor('2026-11-07').key).toBe('lower');
    expect(sessionFor('2026-11-08').key).toBe('rest');
  });
  it('from 9 Nov runs Mon-Fri PPL/UL, Saturday option, Sunday rest', () => {
    expect(sessionFor('2026-11-09').key).toBe('push');
    expect(sessionFor('2026-11-12').key).toBe('upper');
    expect(sessionFor('2026-11-14').key).toBe('saturday');
    expect(sessionFor('2026-11-15').kind).toBe('rest');
  });
  it('flags the deload week and birthday week', () => {
    expect(sessionFor('2026-12-01').note).toMatch(/Deload/);
    expect(sessionFor('2027-01-14').kind).toBe('rest');
    expect(sessionFor('2027-01-15').note).toMatch(/Birthday/);
  });
  it('is rest outside the window', () => {
    expect(sessionFor('2026-10-29').key).toBe('rest');
    expect(sessionFor('2027-01-20').key).toBe('rest');
  });
});

describe('phases and missions', () => {
  it('maps weeks to modes', () => {
    expect(planWeek('2026-11-03')).toBe(1);
    expect(planWeek('2026-11-09')).toBe(2);
    expect(planPhase('2026-11-10').mode).toBe('Basic');
    expect(planPhase('2026-11-17').mode).toBe('Advanced');
    expect(planPhase('2026-12-02').mode).toBe('Deload');
    expect(planPhase('2026-12-08').mode).toBe('Block B · Basic');
    expect(planPhase('2026-12-22').mode).toBe('Block B · Advanced');
    expect(planPhase('2027-01-12').mode).toBe('Reveal');
  });
  it('gives one mission per week', () => {
    expect(missionFor('2026-11-03').week).toBe(1);
    expect(missionFor('2026-11-18').text).toMatch(/sugar/i);
    expect(missionFor('2027-01-15').phase).toBe('Reveal');
  });
});

describe('targets', () => {
  it('draws a straight line from start to target', () => {
    expect(targetWeightOn(S, S.startDate)).toBe(96);
    expect(targetWeightOn(S, S.deadline)).toBe(85);
    const mid = targetWeightOn(S, '2026-12-09');
    expect(mid).toBeGreaterThan(85);
    expect(mid).toBeLessThan(96);
  });
  it('lists Sunday checkpoints with decreasing targets', () => {
    const cps = sundayCheckpoints(S);
    expect(cps[0].sunday).toBe('2026-11-08');
    expect(cps).toHaveLength(10);
    for (let i = 1; i < cps.length; i++) expect(cps[i].targetKg).toBeLessThan(cps[i - 1].targetKg);
  });
  it('uses day-specific calories with constant protein and fat', () => {
    const lift = macrosFor(S, '2026-11-09');
    const sat = macrosFor(S, '2026-11-14');
    const sun = macrosFor(S, '2026-11-15');
    expect(lift.calories).toBe(2150);
    expect(sat.calories).toBe(2100);
    expect(sun.calories).toBe(1750);
    expect(sun.carbsG).toBe(51);
    expect(new Set([lift.proteinG, sat.proteinG, sun.proteinG])).toEqual(new Set([240]));
    expect(macrosFor({ ...S, dayTypeCalories: false }, '2026-11-15').calories).toBe(2150);
  });
});

describe('plan v2 migration', () => {
  it('moves old installs to the new plan once', () => {
    const old = { ...S, planVersion: undefined, startDate: '2026-10-27', startingWeightKg: 96.5, proteinTargetG: 160, calorieTarget: 2200 };
    const m = applyPlanV2(old);
    expect(m.startDate).toBe('2026-11-03');
    expect(m.startingWeightKg).toBe(96);
    expect(m.proteinTargetG).toBe(240);
    expect(m.planVersion).toBe(2);
    const edited = { ...m, proteinTargetG: 230 };
    expect(applyPlanV2(edited).proteinTargetG).toBe(230);
  });
});
