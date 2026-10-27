import { describe, expect, it } from 'vitest';
import { SEED_FOOD_LIBRARY } from '../domain/defaults';

describe('SEED_FOOD_LIBRARY', () => {
  it('includes expanded desi meals as estimated', () => {
    const names = SEED_FOOD_LIBRARY.map((f) => f.name.toLowerCase());
    expect(names.some((n) => n.includes('boti') || n.includes('chicken boti'))).toBe(true);
    expect(names.some((n) => n.includes('shami'))).toBe(true);
    expect(names.some((n) => n.includes('karahi'))).toBe(true);
    expect(names.some((n) => n.includes('daal'))).toBe(true);
    expect(names.some((n) => n.includes('green tea'))).toBe(true);
    const estimated = SEED_FOOD_LIBRARY.filter((f) =>
      /boti|shami|karahi|daal|raita|biryani|pulao|tikka/i.test(f.name),
    );
    expect(estimated.every((f) => f.confidence === 'estimated')).toBe(true);
    expect(SEED_FOOD_LIBRARY.every((f) => !/\bchai\b/i.test(f.name))).toBe(true);
  });

  it('has unique seed names for top-up matching', () => {
    const names = SEED_FOOD_LIBRARY.map((f) => f.name.toLowerCase());
    expect(new Set(names).size).toBe(names.length);
  });
});
