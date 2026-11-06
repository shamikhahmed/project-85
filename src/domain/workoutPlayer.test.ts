import { describe, expect, it } from 'vitest';
import { buildPlayerSteps, stepAnnouncement } from './workoutPlayer';

const ex = (name: string, rest = '90 sec.') => ({
  name,
  media: null,
  muscle: 'Chest',
  rest,
  cue: 'Slow down',
  sets: [
    ['Set 1', '10-12', 'Light'],
    ['Top set', '10-12, 2 short', 'Heaviest'],
  ],
});

describe('buildPlayerSteps', () => {
  it('flattens sets in order and marks the logged set', () => {
    const steps = buildPlayerSteps([ex('Chest press'), ex('Pushdown', '60 sec.')]);
    expect(steps.map((s) => `${s.name}:${s.setNo}`)).toEqual(['Chest press:1', 'Chest press:2', 'Pushdown:1', 'Pushdown:2']);
    expect(steps.map((s) => s.logs)).toEqual([false, true, false, true]);
  });

  it('uses each exercise rest and ends with no rest', () => {
    const steps = buildPlayerSteps([ex('Chest press'), ex('Pushdown', '60 sec.')]);
    expect(steps.map((s) => s.restSec)).toEqual([90, 90, 60, 0]);
  });

  it('falls back to 60 sec when rest is not parseable', () => {
    expect(buildPlayerSteps([ex('Plank', 'Straight into next')])[0].restSec).toBe(60);
  });

  it('builds a readable announcement', () => {
    const [first] = buildPlayerSteps([ex('Chest press')]);
    expect(stepAnnouncement(first)).toBe('Chest press. Set 1, 1 of 2. 10 to 12 reps.');
  });
});
