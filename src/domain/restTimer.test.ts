import { describe, expect, it } from 'vitest';
import plan from './trainingPlan.json';
import { formatClock, parseRestSeconds, secondsLeft } from './restTimer';

describe('parseRestSeconds', () => {
  it('reads minutes, ranges and seconds', () => {
    expect(parseRestSeconds('2 min.')).toBe(120);
    expect(parseRestSeconds('2-3 min.')).toBe(120);
    expect(parseRestSeconds('90 sec.')).toBe(90);
    expect(parseRestSeconds('45 sec, then 1B.')).toBe(45);
  });

  it('returns null when the plan says no rest', () => {
    expect(parseRestSeconds('No rest, then 4B.')).toBeNull();
    expect(parseRestSeconds('Straight to 3B.')).toBeNull();
  });

  it('understands every rest string in the plan', () => {
    const rests = Object.values(plan.days).flat().map((e) => e.rest);
    for (const r of rests) {
      const v = parseRestSeconds(r);
      const noRest = /^(no rest|straight)/i.test(r);
      expect(noRest ? v === null : v != null && v > 0, r).toBe(true);
    }
  });
});

describe('clock', () => {
  it('counts down from wall-clock end time', () => {
    expect(secondsLeft(10_000, 0)).toBe(10);
    expect(secondsLeft(10_000, 9_001)).toBe(1);
    expect(secondsLeft(10_000, 12_000)).toBe(0);
  });

  it('formats m:ss', () => {
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(75)).toBe('1:15');
    expect(formatClock(180)).toBe('3:00');
  });
});
