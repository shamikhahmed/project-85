import { describe, expect, it } from 'vitest';
import { sumFoodEntries } from './nutrition';
import type { FoodEntry } from '../domain/types';

const base = (over: Partial<FoodEntry>): FoodEntry => ({
  id: '1',
  date: '2026-10-27',
  category: 'lunch',
  name: 'Test',
  calories: 0,
  proteinG: 0,
  carbsG: 0,
  fatG: 0,
  confidence: 'estimated',
  createdAt: '',
  updatedAt: '',
  ...over,
});

describe('sumFoodEntries', () => {
  it('totals after add', () => {
    const t = sumFoodEntries([
      base({ calories: 500, proteinG: 40, carbsG: 40, fatG: 20 }),
      base({ id: '2', calories: 300, proteinG: 20, carbsG: 30, fatG: 10, confidence: 'verified' }),
    ]);
    expect(t.calories).toBe(800);
    expect(t.proteinG).toBe(60);
    expect(t.entryCount).toBe(2);
    expect(t.estimatedCount).toBe(1);
  });

  it('keeps estimated labelling via count', () => {
    const t = sumFoodEntries([base({ confidence: 'estimated', calories: 100 })]);
    expect(t.estimatedCount).toBe(1);
  });
});
