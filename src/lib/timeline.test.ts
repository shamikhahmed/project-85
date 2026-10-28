import { describe, expect, it } from 'vitest';
import { buildTransformationTimeline, monthlySummary } from './timeline';

describe('timeline', () => {
  it('merges kinds and marks estimated weights', () => {
    const events = buildTransformationTimeline({
      weights: [
        {
          id: 'w1',
          date: '2026-10-27',
          weightKg: 96.5,
          isEstimate: true,
          isPrimaryMorning: true,
          createdAt: 'a',
          updatedAt: 'a',
        },
      ],
      measurements: [],
      photos: [],
      workouts: [],
      achievements: [],
      journals: [],
      milestones: [],
    });
    expect(events[0].kind).toBe('weight');
    expect(events[0].estimated).toBe(true);
    expect(monthlySummary(events)[0].weightEvents).toBe(1);
  });
});
