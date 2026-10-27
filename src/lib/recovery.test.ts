import { describe, expect, it } from 'vitest';
import { createDefaultSettings } from '../domain/defaults';
import type { DayScoreBreakdown } from '../domain/types';
import { buildRecoveryPlan } from './recovery';

describe('buildRecoveryPlan', () => {
  it('returns constructive actions for misses', () => {
    const breakdown: DayScoreBreakdown = {
      steps: 'missed_honest',
      nutritionLogging: 'not_entered',
      calories: 'not_entered',
      protein: 'not_entered',
      hydration: 'achieved',
      training: 'achieved',
      sleep: 'achieved',
      smoking: 'achieved',
      reflection: 'not_entered',
    };
    const plan = buildRecoveryPlan(breakdown, createDefaultSettings());
    expect(plan.length).toBeGreaterThan(0);
    expect(plan.length).toBeLessThanOrEqual(3);
    expect(plan.every((p) => !/punish|starve|dehydrat|skip meal/i.test(p.description))).toBe(
      true,
    );
  });
});
