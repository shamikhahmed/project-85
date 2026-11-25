import { describe, expect, it } from 'vitest';
import {
  burstMs,
  fadeUpItem,
  motionDurations,
  pageReveal,
  playerViewMotion,
  restTimerMotion,
  setCompletePop,
  softPop,
  staggerChildren,
  weeklyStreakEarned,
} from './motion';

describe('motionDurations', () => {
  it('returns zeros when reduced motion is preferred', () => {
    expect(motionDurations(true)).toEqual({ fast: 0, base: 0, hero: 0 });
  });

  it('returns craft timings when motion is allowed', () => {
    expect(motionDurations(false)).toEqual({ fast: 0.14, base: 0.22, hero: 0.4 });
  });
});

describe('pageReveal', () => {
  it('skips travel under reduced motion', () => {
    const v = pageReveal(true);
    expect(v.initial).toBe(false);
    expect(v.transition.duration).toBe(0);
  });

  it('rises slightly when motion is on', () => {
    const v = pageReveal(false);
    expect(v.initial).toEqual({ opacity: 0, y: 10 });
    expect(v.animate).toEqual({ opacity: 1, y: 0 });
  });
});

describe('stagger + fadeUp', () => {
  it('collapses stagger under reduced motion', () => {
    const s = staggerChildren(true);
    expect(s.show.transition.staggerChildren).toBe(0);
  });

  it('keeps items visible under reduced motion', () => {
    const item = fadeUpItem(true);
    expect(item.hidden).toEqual({ opacity: 1, y: 0 });
  });
});

describe('rest + player views', () => {
  it('rest timer has no exit travel when reduced', () => {
    expect(restTimerMotion(true).transition.duration).toBe(0);
  });

  it('player view crossfade is instant when reduced', () => {
    expect(playerViewMotion(true).transition.duration).toBe(0);
  });

  it('player view uses opacity only (no form parallax)', () => {
    const v = playerViewMotion(false);
    expect(v.initial).toEqual({ opacity: 0 });
    expect(v.animate).toEqual({ opacity: 1 });
    expect('y' in (v.initial as object)).toBe(false);
  });
});

describe('setCompletePop + softPop + burst + weeklyStreakEarned', () => {
  it('set pop is scale-only when motion is on', () => {
    const v = setCompletePop(false);
    expect(v).toHaveProperty('scale');
    expect(v).not.toHaveProperty('y');
  });

  it('set pop is instant under reduced motion', () => {
    expect(setCompletePop(true).transition.duration).toBe(0);
  });

  it('softPop collapses under reduced motion', () => {
    expect(softPop(true).transition.duration).toBe(0);
  });

  it('burst duration is zero under reduced motion', () => {
    expect(burstMs(true)).toBe(0);
    expect(burstMs(false, true)).toBeGreaterThan(burstMs(false, false));
  });

  it('streak is earned when all planned sessions are done', () => {
    expect(weeklyStreakEarned(2, 4)).toBe(false);
    expect(weeklyStreakEarned(4, 4)).toBe(true);
  });

  it('falls back to min threshold when planned is unknown', () => {
    expect(weeklyStreakEarned(2)).toBe(false);
    expect(weeklyStreakEarned(3)).toBe(true);
    expect(weeklyStreakEarned(5, undefined, 4)).toBe(true);
  });
});
