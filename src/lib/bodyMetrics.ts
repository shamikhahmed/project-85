/**
 * Body Intelligence calculations.
 * All outputs are estimates or screening measures — never live metabolism sensors.
 * Default BMR: Mifflin–St Jeor (1990). Documented for transparency.
 */

import type { BiologicalSex } from '../domain/types';
import { estimateLeanMassKg, estimateNavyBodyFatPct } from './bodyComposition';

export type { BiologicalSex };

export type ActivityMultiplierKey =
  | 'sedentary'
  | 'light'
  | 'moderate'
  | 'active'
  | 'very_active';

export const ACTIVITY_MULTIPLIERS: Record<
  ActivityMultiplierKey,
  { factor: number; label: string }
> = {
  sedentary: { factor: 1.2, label: 'Sedentary (little exercise)' },
  light: { factor: 1.375, label: 'Lightly active (1–3 days/week)' },
  moderate: { factor: 1.55, label: 'Moderately active (3–5 days/week)' },
  active: { factor: 1.725, label: 'Very active (6–7 days/week)' },
  very_active: { factor: 1.9, label: 'Extra active (physical job / hard training)' },
};

export interface BodyMetricInputs {
  weightKg: number | null;
  heightCm: number | null;
  biologicalSex: BiologicalSex;
  /** Whole years; null if unknown */
  ageYears: number | null;
  waistCm?: number | null;
  neckCm?: number | null;
  hipCm?: number | null;
  /** Steps today if logged — used only to hint activity factor confidence */
  stepsToday?: number | null;
  stepsTarget?: number;
}

export interface BodyIntelligence {
  bmi: number | null;
  bmiCategory: string | null;
  bmrKcal: number | null;
  bmrFormula: string;
  tdeeKcal: number | null;
  activityKey: ActivityMultiplierKey;
  activityLabel: string;
  activityConfidence: 'profile_default' | 'steps_hint';
  weightToGoalKg: number | null;
  waistToHeight: number | null;
  suggestedCalorieFloor: number | null;
  suggestedProteinG: number | null;
  /** Formula estimate only — never a lab measurement */
  bodyFatPctEstimate: number | null;
  bodyFatFormula: string | null;
  leanMassKgEstimate: number | null;
  notes: string[];
  updatedInputs: {
    weightKg: number | null;
    heightCm: number | null;
    ageYears: number | null;
    biologicalSex: BiologicalSex;
  };
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const round0 = (n: number) => Math.round(n);

/** Age from birth year as of a reference date (local calendar year). */
export function ageFromBirthYear(
  birthYear: number | null | undefined,
  asOf = new Date(),
): number | null {
  if (birthYear == null || !Number.isFinite(birthYear)) return null;
  if (birthYear < 1920 || birthYear > asOf.getFullYear()) return null;
  return asOf.getFullYear() - birthYear;
}

/** BMI = kg / m². Screening measure only — not body fat %. */
export function computeBmi(weightKg: number, heightCm: number): number | null {
  if (!Number.isFinite(weightKg) || !Number.isFinite(heightCm)) return null;
  if (weightKg < 30 || weightKg > 400 || heightCm < 120 || heightCm > 250) return null;
  const m = heightCm / 100;
  return round1(weightKg / (m * m));
}

export function bmiCategory(bmi: number): string {
  if (bmi < 18.5) return 'Underweight (CDC screening bands)';
  if (bmi < 25) return 'Healthy weight (CDC screening bands)';
  if (bmi < 30) return 'Overweight (CDC screening bands)';
  return 'Obesity (CDC screening bands)';
}

/**
 * Mifflin–St Jeor BMR (kcal/day).
 * Male: 10w + 6.25h − 5a + 5
 * Female: 10w + 6.25h − 5a − 161
 * Unspecified: average of male/female estimates (labelled).
 */
export function computeBmrMifflinStJeor(opts: {
  weightKg: number;
  heightCm: number;
  ageYears: number;
  biologicalSex: BiologicalSex;
}): { bmr: number; formula: string } | null {
  const { weightKg, heightCm, ageYears, biologicalSex } = opts;
  if (weightKg < 30 || heightCm < 120 || ageYears < 15 || ageYears > 100) return null;

  const male = 10 * weightKg + 6.25 * heightCm - 5 * ageYears + 5;
  const female = 10 * weightKg + 6.25 * heightCm - 5 * ageYears - 161;

  if (biologicalSex === 'male') {
    return { bmr: round0(male), formula: 'Mifflin–St Jeor (male)' };
  }
  if (biologicalSex === 'female') {
    return { bmr: round0(female), formula: 'Mifflin–St Jeor (female)' };
  }
  return {
    bmr: round0((male + female) / 2),
    formula: 'Mifflin–St Jeor (sex unspecified — mid estimate)',
  };
}

export function suggestActivityKey(stepsToday: number | null | undefined, stepsTarget = 10000): {
  key: ActivityMultiplierKey;
  confidence: 'profile_default' | 'steps_hint';
} {
  if (stepsToday == null || !Number.isFinite(stepsToday)) {
    return { key: 'light', confidence: 'profile_default' };
  }
  const target = Number.isFinite(stepsTarget) && stepsTarget > 0 ? stepsTarget : 10000;
  const ratio = stepsToday / target;
  if (ratio < 0.4) return { key: 'sedentary', confidence: 'steps_hint' };
  if (ratio < 0.8) return { key: 'light', confidence: 'steps_hint' };
  if (ratio < 1.2) return { key: 'moderate', confidence: 'steps_hint' };
  if (ratio < 1.6) return { key: 'active', confidence: 'steps_hint' };
  return { key: 'very_active', confidence: 'steps_hint' };
}

export function computeTdee(bmrKcal: number, key: ActivityMultiplierKey): number {
  return round0(bmrKcal * ACTIVITY_MULTIPLIERS[key].factor);
}

/** Soft floor: never suggest below ~1.2× BMR for deficit guidance in this app. */
export function suggestedCalorieTarget(bmrKcal: number, tdeeKcal: number): number {
  const deficit = tdeeKcal - 500;
  const floor = round0(bmrKcal * 1.2);
  return Math.max(floor, Math.min(tdeeKcal - 200, deficit));
}

/** Rough protein range midpoint: 1.6–2.2 g/kg for fat loss + training; use 1.8. */
export function suggestedProteinG(weightKg: number): number {
  return round0(weightKg * 1.8);
}

export function waistToHeightRatio(waistCm: number, heightCm: number): number | null {
  if (waistCm < 40 || waistCm > 200 || heightCm < 120) return null;
  return round1(waistCm / heightCm);
}

/** Full Body Intelligence bundle from profile + latest weight. */
export function buildBodyIntelligence(
  input: BodyMetricInputs,
  targetWeightKg: number,
): BodyIntelligence {
  const notes: string[] = [];
  const { weightKg, heightCm, biologicalSex, ageYears } = input;

  const bmi =
    weightKg != null && heightCm != null ? computeBmi(weightKg, heightCm) : null;
  const bmiCat = bmi != null ? bmiCategory(bmi) : null;

  let bmrKcal: number | null = null;
  let bmrFormula = 'Mifflin–St Jeor';
  if (weightKg != null && heightCm != null && ageYears != null) {
    const b = computeBmrMifflinStJeor({
      weightKg,
      heightCm,
      ageYears,
      biologicalSex,
    });
    if (b) {
      bmrKcal = b.bmr;
      bmrFormula = b.formula;
    }
  } else {
    notes.push('Add height, age, and sex in Settings to estimate BMR and TDEE.');
  }

  const act = suggestActivityKey(input.stepsToday, input.stepsTarget ?? 10000);
  const activityKey = act.key;
  const activityLabel = ACTIVITY_MULTIPLIERS[activityKey].label;
  const activityConfidence = act.confidence;
  if (activityConfidence === 'profile_default') {
    notes.push('TDEE uses a default activity factor until steps are logged (optional).');
  } else {
    notes.push('Activity factor hinted from today’s logged steps — not a device calorie burn.');
  }

  const tdeeKcal = bmrKcal != null ? computeTdee(bmrKcal, activityKey) : null;
  const weightToGoalKg =
    weightKg != null ? round1(Math.max(0, weightKg - targetWeightKg)) : null;

  const waistToHeight =
    input.waistCm != null && heightCm != null
      ? waistToHeightRatio(input.waistCm, heightCm)
      : null;

  let bodyFatPctEstimate: number | null = null;
  let bodyFatFormula: string | null = null;
  let leanMassKgEstimate: number | null = null;
  if (
    (biologicalSex === 'male' || biologicalSex === 'female') &&
    heightCm != null &&
    input.neckCm != null &&
    input.waistCm != null
  ) {
    bodyFatPctEstimate = estimateNavyBodyFatPct({
      sex: biologicalSex,
      heightCm,
      neckCm: input.neckCm,
      waistCm: input.waistCm,
      hipCm: input.hipCm ?? undefined,
    });
    if (bodyFatPctEstimate != null) {
      bodyFatFormula = 'US Navy circumference method (estimate)';
      notes.push('Body-fat % is a formula estimate — not a DXA or caliper measurement.');
      if (weightKg != null) {
        leanMassKgEstimate = estimateLeanMassKg(weightKg, bodyFatPctEstimate);
      }
    }
  }

  notes.push('BMI is a screening measure, not body-fat percentage.');
  notes.push('BMR/TDEE are estimates — not live metabolic measurements.');

  return {
    bmi,
    bmiCategory: bmiCat,
    bmrKcal,
    bmrFormula,
    tdeeKcal,
    activityKey,
    activityLabel,
    activityConfidence,
    weightToGoalKg,
    waistToHeight,
    suggestedCalorieFloor: bmrKcal != null && tdeeKcal != null ? suggestedCalorieTarget(bmrKcal, tdeeKcal) : null,
    suggestedProteinG: weightKg != null ? suggestedProteinG(weightKg) : null,
    bodyFatPctEstimate,
    bodyFatFormula,
    leanMassKgEstimate,
    notes,
    updatedInputs: { weightKg, heightCm, ageYears, biologicalSex },
  };
}
