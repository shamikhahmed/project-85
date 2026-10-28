import { describe, expect, it } from 'vitest';
import { pickLatestStepEntry } from './repository';
import type { StepEntry } from '../domain/types';

const row = (over: Partial<StepEntry> & Pick<StepEntry, 'id' | 'totalSteps' | 'updatedAt'>): StepEntry => ({
  date: '2026-10-28',
  source: 'manual',
  createdAt: over.updatedAt,
  ...over,
});

describe('pickLatestStepEntry', () => {
  it('returns undefined for empty', () => {
    expect(pickLatestStepEntry([])).toBeUndefined();
  });

  it('prefers newest updatedAt and never sums', () => {
    const pick = pickLatestStepEntry([
      row({
        id: 'old',
        totalSteps: 5000,
        updatedAt: '2026-10-28T08:00:00.000Z',
      }),
      row({
        id: 'new',
        totalSteps: 10450,
        updatedAt: '2026-10-28T20:00:00.000Z',
      }),
    ]);
    expect(pick?.id).toBe('new');
    expect(pick?.totalSteps).toBe(10450);
  });
});
