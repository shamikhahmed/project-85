import { describe, expect, it } from 'vitest';
import {
  CARDIO_MINUTES,
  CARDIO_MODES,
  cardioDose,
  cardioEffect,
  cardioImpact,
  cardioMuscles,
  defaultCardio,
  isWarmupCardio,
  loggedCardio,
  sanitizeCardio,
  type CardioBlock,
} from './cardioLoad';
import catalog from '../../scripts/gif-library.json';

const block = (b: Partial<CardioBlock>): CardioBlock => ({ when: 'before', mode: 'bike', minutes: 20, effort: 'moderate', ...b });

describe('cardio dose', () => {
  it('grows with minutes and effort, and flattens on long blocks', () => {
    expect(cardioDose(block({ minutes: 10 }))).toBeLessThan(cardioDose(block({ minutes: 30 })));
    expect(cardioDose(block({ effort: 'easy' }))).toBeLessThan(cardioDose(block({ effort: 'moderate' })));
    expect(cardioDose(block({ effort: 'moderate' }))).toBeLessThan(cardioDose(block({ effort: 'hard' })));
    const gain = (a: number, b: number) => cardioDose(block({ minutes: b })) - cardioDose(block({ minutes: a }));
    expect(gain(60, 90)).toBeLessThan(gain(10, 40));
    expect(cardioDose(block({ minutes: 120, effort: 'hard' }))).toBeLessThanOrEqual(1);
  });

  it('treats easy and short cardio before lifting as a warm-up that costs nothing', () => {
    const warm = block({ effort: 'easy', minutes: 10 });
    expect(isWarmupCardio(warm)).toBe(true);
    expect(isWarmupCardio(block({ effort: 'easy', minutes: 25 }))).toBe(false);
    expect(isWarmupCardio(block({ effort: 'moderate', minutes: 5 }))).toBe(false);
    expect(isWarmupCardio(block({ when: 'after', effort: 'easy', minutes: 5 }))).toBe(false);
    const fx = cardioEffect([warm]);
    expect(fx.fast).toEqual({});
    expect(fx.slow).toEqual({});
    expect(fx.global).toBe(0);
    expect(fx.minutes).toBe(10);
  });
});

describe('what cardio does to the lifting', () => {
  it('tires the muscles the machine drives, not the rest (bench press held up after cycling)', () => {
    const fx = cardioEffect([block({ mode: 'bike', minutes: 30, effort: 'hard' })]);
    expect(fx.fast.quads!).toBeGreaterThan(fx.fast.calves!);
    expect(fx.fast.chest ?? 0).toBe(0);
    expect(fx.slow.quads!).toBeGreaterThan(0);
    expect(fx.slow.quads!).toBeLessThan(fx.fast.quads!);
    expect(fx.global).toBeGreaterThan(0);
    // A swim tires the back and shoulders instead.
    const swim = cardioEffect([block({ mode: 'swim', minutes: 30, effort: 'hard' })]);
    expect(swim.fast.back!).toBeGreaterThan(swim.fast.quads!);
  });

  it('leaves only the lasting part when the cardio was hours earlier', () => {
    const now = cardioEffect([block({ when: 'before', minutes: 36 })]);
    const earlier = cardioEffect([block({ when: 'earlier', minutes: 36 })]);
    expect(earlier.fast).toEqual({});
    expect(earlier.global).toBe(0);
    expect(earlier.slow.quads).toBeCloseTo(now.slow.quads!, 10);
    expect(earlier.minutes).toBe(0);
  });

  it('holds back for cardio still to come, less when it is hours later', () => {
    const after = cardioEffect([block({ when: 'after', mode: 'run', minutes: 30, effort: 'hard' })]);
    const later = cardioEffect([block({ when: 'later', mode: 'run', minutes: 30, effort: 'hard' })]);
    expect(after.fast).toEqual({});
    expect(after.reserve.calves!).toBeGreaterThan(after.reserve.quads!);
    expect(later.reserve.calves!).toBeLessThan(after.reserve.calves!);
    expect(later.reserve.calves!).toBeGreaterThan(0);
    expect(after.minutes).toBe(30);
    expect(later.minutes).toBe(0);
  });

  it('says in one line what a block will change', () => {
    expect(cardioImpact(block({ effort: 'easy', minutes: 5 }), 3)).toMatch(/warm-up/i);
    expect(cardioImpact(block({ when: 'after', mode: 'incline', minutes: 12 }), 3)).toMatch(/light/i);
    expect(cardioImpact(block({ when: 'after', mode: 'bike', minutes: 20, effort: 'hard' }), 3)).toMatch(/set fewer/);
    expect(cardioImpact(block({ when: 'after', mode: 'bike', minutes: 20, effort: 'hard' }), 2)).not.toMatch(/set fewer/);
    expect(cardioImpact(block({ when: 'after', mode: 'run', minutes: 40, effort: 'hard' }), 3)).toMatch(/Every exercise/);
    expect(cardioImpact(block({ when: 'before', mode: 'run', minutes: 30, effort: 'hard' }), 3)).toMatch(/part-tired/);
  });

  it('names the muscles each machine mainly drives', () => {
    expect(cardioMuscles('bike')).toBe('legs');
    expect(cardioMuscles('rower')).toBe('legs and back');
    expect(cardioMuscles('swim')).toBe('back and shoulders');
  });
});

describe('cardio blocks in saved state', () => {
  it('keeps one block per timing, in day order, with sane minutes', () => {
    const out = sanitizeCardio([
      { when: 'after', mode: 'incline', minutes: 12, effort: 'moderate' },
      { when: 'before', mode: 'bike', minutes: 2, effort: 'easy' },
      { when: 'after', mode: 'run', minutes: 30, effort: 'hard' },
      { when: 'later', mode: 'jetpack', minutes: 30, effort: 'hard' },
      { when: 'earlier', mode: 'walk', minutes: 999, effort: 'moderate' },
      { when: 'earlier', mode: 'walk', minutes: 'x', effort: 'moderate' },
      null,
      'run',
    ]);
    expect(out).toEqual([
      { when: 'earlier', mode: 'walk', minutes: 120, effort: 'moderate' },
      { when: 'before', mode: 'bike', minutes: 5, effort: 'easy' },
      { when: 'after', mode: 'incline', minutes: 12, effort: 'moderate' },
    ]);
    expect(sanitizeCardio('nope')).toEqual([]);
  });

  it('starts new blocks the way the plan does them', () => {
    expect(defaultCardio('before')).toMatchObject({ effort: 'easy', minutes: 5 });
    expect(isWarmupCardio(defaultCardio('before'))).toBe(true);
    expect(defaultCardio('after')).toMatchObject({ mode: 'incline', minutes: 12 });
    expect(CARDIO_MINUTES).toContain(defaultCardio('after').minutes);
  });

  it('offers cardio logged today, with the effort from its 1–10 rating', () => {
    const w = (type: string, durationMin?: number, perceivedEffort?: number, date = '2026-11-11') => ({ date, type, durationMin, perceivedEffort });
    expect(loggedCardio([w('running', 30, 8)], '2026-11-11')).toEqual({ when: 'earlier', mode: 'run', minutes: 30, effort: 'hard' });
    expect(loggedCardio([w('walking', 45, 2)], '2026-11-11')?.effort).toBe('easy');
    expect(loggedCardio([w('swimming', 40)], '2026-11-11')).toMatchObject({ mode: 'swim', effort: 'moderate' });
    expect(loggedCardio([w('running', 30, 8, '2026-11-10')], '2026-11-11')).toBeNull();
    expect(loggedCardio([w('strength', 60)], '2026-11-11')).toBeNull();
    expect(loggedCardio([w('walking', 3)], '2026-11-11')).toBeNull();
  });

  it('points every machine animation at a cardio clip that exists', () => {
    const known = new Map((catalog as [string, string, string][]).map(([name, id, group]) => [id, { name, group }]));
    for (const m of CARDIO_MODES) {
      if (!m.media) continue;
      expect(known.get(m.media)?.group, m.id).toBe('cardio');
    }
  });
});
