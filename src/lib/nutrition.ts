import type { FoodEntry } from '../domain/types';

export interface MacroTotals {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fibreG: number;
  entryCount: number;
  estimatedCount: number;
  macroDerivedCalories: number;
  calorieMismatch: boolean;
}

/** Sum food entries. Declared calories are source of truth for targets. */
export function sumFoodEntries(entries: FoodEntry[]): MacroTotals {
  let calories = 0;
  let proteinG = 0;
  let carbsG = 0;
  let fatG = 0;
  let fibreG = 0;
  let estimatedCount = 0;

  for (const e of entries) {
    calories += e.calories;
    proteinG += e.proteinG;
    carbsG += e.carbsG;
    fatG += e.fatG;
    fibreG += e.fibreG ?? 0;
    if (e.confidence !== 'verified') estimatedCount += 1;
  }

  const macroDerivedCalories = Math.round(proteinG * 4 + carbsG * 4 + fatG * 9);
  const calorieMismatch = Math.abs(macroDerivedCalories - Math.round(calories)) > 25;

  return {
    calories: round1(calories),
    proteinG: round1(proteinG),
    carbsG: round1(carbsG),
    fatG: round1(fatG),
    fibreG: round1(fibreG),
    entryCount: entries.length,
    estimatedCount,
    macroDerivedCalories,
    calorieMismatch,
  };
}

export function remainingTowardTarget(consumed: number, target: number): number {
  return Math.max(0, round1(target - consumed));
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}
