import { describe, expect, it } from 'vitest';
import {
  absChange,
  cmToIn,
  convertLength,
  inToCm,
  parseLengthInput,
  pctChange,
  validateMeasurementCm,
} from './measurementUnits';
import { compareMeasurementDates, historyForType } from './measurementCompare';
import type { BodyMeasurement } from '../domain/types';
import { estimateNavyBodyFatPct, estimateLeanMassKg } from './bodyComposition';

describe('length conversion', () => {
  it('round-trips cm ↔ in', () => {
    expect(cmToIn(2.54)).toBeCloseTo(1, 5);
    expect(inToCm(1)).toBeCloseTo(2.54, 5);
    expect(convertLength(100, 'cm', 'in')).toBeCloseTo(39.37, 1);
  });

  it('parses input by unit', () => {
    expect(parseLengthInput('90', 'cm')).toBe(90);
    expect(parseLengthInput('35.4', 'in')).toBeCloseTo(89.9, 0);
    expect(parseLengthInput('abc', 'cm')).toBeNull();
  });

  it('validates ranges', () => {
    expect(validateMeasurementCm('waist_natural', 90).ok).toBe(true);
    expect(validateMeasurementCm('waist_natural', 10).ok).toBe(false);
  });

  it('computes change', () => {
    expect(absChange(100, 95)).toBe(-5);
    expect(pctChange(100, 95)).toBe(-5);
  });
});

describe('compare + history', () => {
  const rows: BodyMeasurement[] = [
    {
      id: '1',
      type: 'waist_natural',
      valueCm: 100,
      date: '2026-10-01',
      measuredAt: '2026-10-01T08:00:00.000Z',
      condition: 'morning_fasted',
      createdAt: 'a',
      updatedAt: 'a',
    },
    {
      id: '2',
      type: 'waist_natural',
      valueCm: 96,
      date: '2026-10-20',
      measuredAt: '2026-10-20T08:00:00.000Z',
      condition: 'morning_fasted',
      createdAt: 'b',
      updatedAt: 'b',
    },
    {
      id: '3',
      type: 'bicep_left_relaxed',
      valueCm: 35,
      date: '2026-10-20',
      measuredAt: '2026-10-20T08:05:00.000Z',
      condition: 'unspecified',
      createdAt: 'c',
      updatedAt: 'c',
    },
  ];

  it('compares two dates', () => {
    const cmp = compareMeasurementDates(rows, '2026-10-01', '2026-10-20');
    const waist = cmp.find((c) => c.type === 'waist_natural');
    expect(waist?.absCm).toBe(-4);
    expect(waist?.pct).toBe(-4);
  });

  it('preserves left bicep history separately', () => {
    expect(historyForType(rows, 'bicep_left_relaxed')).toHaveLength(1);
    expect(historyForType(rows, 'bicep_right_relaxed')).toHaveLength(0);
  });
});

describe('navy body fat estimate', () => {
  it('returns estimate for male with neck+waist', () => {
    const bf = estimateNavyBodyFatPct({
      sex: 'male',
      heightCm: 185.4,
      neckCm: 40,
      waistCm: 102,
    });
    expect(bf).not.toBeNull();
    expect(bf!).toBeGreaterThan(10);
    expect(bf!).toBeLessThan(45);
  });

  it('requires hips for female', () => {
    expect(
      estimateNavyBodyFatPct({
        sex: 'female',
        heightCm: 165,
        neckCm: 32,
        waistCm: 75,
      }),
    ).toBeNull();
    expect(
      estimateNavyBodyFatPct({
        sex: 'female',
        heightCm: 165,
        neckCm: 32,
        waistCm: 75,
        hipCm: 95,
      }),
    ).not.toBeNull();
  });

  it('lean mass from estimate', () => {
    expect(estimateLeanMassKg(96.5, 25)).toBeCloseTo(72.4, 0);
  });
});
