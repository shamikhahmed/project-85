import type {
  AppSettings,
  DayAggregate,
  DayScore,
  DayScoreBreakdown,
  DayStatus,
  GoalOutcome,
  ScoreWeights,
} from '../domain/types';
import { CONSEQUENCE_CATALOG } from '../domain/defaults';
import { calorieTargetFor } from '../domain/plan';

/** Minimum logging completeness before calorie/protein can score as achieved */
const MACRO_SUCCESS_LOGGING_MIN = 0.6;

export interface ScoreInput {
  date: string;
  settings: AppSettings;
  agg: DayAggregate;
  /** Planned rest day marked intentionally */
  plannedRest?: boolean;
}

/**
 * Deterministic daily score out of 100.
 *
 * Formula:
 *   For each category with weight W:
 *     achieved        → W points
 *     missed_honest   → floor(W * 0.35)  (honesty credit, not full credit)
 *     not_entered     → 0  (missing ≠ success, missing ≠ zero consumption)
 *     not_applicable  → W points redistributed? No — awarded as full W so rest days don't punish
 *
 * Anti-starvation: calorie "achieved" requires logging completeness ≥ 0.6
 * and calories within a sensible band (not under 60% of target while claiming success).
 * Very low calories with incomplete logging → not_entered or missed, never bonus.
 */
export function computeDayScore(input: ScoreInput): DayScore {
  const { settings, agg, date } = input;
  const w = settings.scoreWeights;
  const breakdown: DayScoreBreakdown = {
    steps: scoreSteps(agg, settings),
    nutritionLogging: scoreNutritionLogging(agg),
    calories: scoreCalories(agg, settings),
    protein: scoreProtein(agg, settings),
    hydration: scoreHydration(agg, settings),
    training: scoreTraining(agg, input.plannedRest),
    sleep: scoreSleep(agg, settings),
    smoking: scoreSmoking(agg, settings),
    reflection: scoreReflection(agg),
  };

  const points = {} as Record<keyof DayScoreBreakdown, number>;
  let total = 0;
  (Object.keys(breakdown) as (keyof DayScoreBreakdown)[]).forEach((key) => {
    const pts = pointsFor(breakdown[key], w[key]);
    points[key] = pts;
    total += pts;
  });

  total = Math.round(Math.min(100, Math.max(0, total)));
  const status = deriveStatus(breakdown, agg, total);
  const consequenceIds = pickConsequences(breakdown);
  const xpEarned = computeXp(breakdown, agg, total);

  return {
    id: `score-${date}`,
    date,
    total,
    breakdown,
    points,
    status,
    xpEarned,
    consequenceIds,
    computedAt: new Date().toISOString(),
  };
}

export function pointsFor(outcome: GoalOutcome, weight: number): number {
  switch (outcome) {
    case 'achieved':
    case 'not_applicable':
      return weight;
    case 'missed_honest':
      return Math.floor(weight * 0.35);
    case 'not_entered':
      return 0;
  }
}

function scoreSteps(agg: DayAggregate, s: AppSettings): GoalOutcome {
  if (agg.steps === null) return 'not_entered';
  return agg.steps >= s.stepsTarget ? 'achieved' : 'missed_honest';
}

function scoreNutritionLogging(agg: DayAggregate): GoalOutcome {
  if (agg.foodEntryCount === 0 && !agg.honestyAnswered) return 'not_entered';
  if (agg.loggingCompleteness >= 0.7 && agg.honestyAnswered) return 'achieved';
  if (agg.foodEntryCount > 0 || agg.honestyAnswered) return 'missed_honest';
  return 'not_entered';
}

function scoreCalories(agg: DayAggregate, s: AppSettings): GoalOutcome {
  if (agg.foodEntryCount === 0) return 'not_entered';
  // Incomplete log: cannot claim calorie success
  if (agg.loggingCompleteness < MACRO_SUCCESS_LOGGING_MIN || !agg.honestyAnswered) {
    return agg.foodEntryCount > 0 ? 'missed_honest' : 'not_entered';
  }
  const ratio = agg.calories / calorieTargetFor(s, agg.date);
  // Starvation guard: under 60% of target with "complete" log is NOT success
  if (ratio < 0.6) return 'missed_honest';
  if (ratio <= 1.1) return 'achieved';
  return 'missed_honest';
}

function scoreProtein(agg: DayAggregate, s: AppSettings): GoalOutcome {
  if (agg.foodEntryCount === 0) return 'not_entered';
  if (agg.loggingCompleteness < MACRO_SUCCESS_LOGGING_MIN || !agg.honestyAnswered) {
    return 'missed_honest';
  }
  if (agg.proteinG >= s.proteinTargetG * 0.9) return 'achieved';
  return 'missed_honest';
}

function scoreHydration(agg: DayAggregate, s: AppSettings): GoalOutcome {
  if (agg.waterMl === 0) return 'not_entered';
  return agg.waterMl >= s.waterTargetMl ? 'achieved' : 'missed_honest';
}

function scoreTraining(agg: DayAggregate, plannedRest?: boolean): GoalOutcome {
  if (agg.workoutTypes.length === 0) return 'not_entered';
  if (agg.workoutTypes.includes('rest') || plannedRest) return 'achieved';
  return 'achieved';
}

function scoreSleep(agg: DayAggregate, s: AppSettings): GoalOutcome {
  if (agg.sleepHours === null) return 'not_entered';
  return agg.sleepHours >= s.sleepTargetHours * 0.85 ? 'achieved' : 'missed_honest';
}

function scoreSmoking(agg: DayAggregate, s: AppSettings): GoalOutcome {
  if (!agg.cigarettesLogged) return 'not_entered';
  return agg.cigaretteCount <= s.cigaretteTarget ? 'achieved' : 'missed_honest';
}

function scoreReflection(agg: DayAggregate): GoalOutcome {
  if (agg.reviewCompleted) return 'achieved';
  if (agg.honestyAnswered) return 'missed_honest';
  return 'not_entered';
}

export function deriveStatus(
  breakdown: DayScoreBreakdown,
  agg: DayAggregate,
  total: number,
): DayStatus {
  const keys = Object.keys(breakdown) as (keyof DayScoreBreakdown)[];
  const notEntered = keys.filter((k) => breakdown[k] === 'not_entered').length;
  const criticalMissing =
    breakdown.steps === 'not_entered' ||
    breakdown.nutritionLogging === 'not_entered' ||
    !agg.honestyAnswered;

  if (criticalMissing || notEntered >= 4) return 'INCOMPLETE_LOG';
  if (agg.reviewCompleted && total >= 75) return 'DAY_COMPLETED';
  if (total >= 70 && notEntered <= 1) return 'ON_TRACK';
  return 'NEEDS_ATTENTION';
}

function pickConsequences(breakdown: DayScoreBreakdown): string[] {
  const ids: string[] = [];
  for (const c of CONSEQUENCE_CATALOG) {
    const outcome = breakdown[c.trigger as keyof DayScoreBreakdown];
    if (outcome === 'missed_honest' || outcome === 'not_entered') {
      ids.push(c.id);
    }
  }
  return ids.slice(0, 3);
}

function computeXp(
  breakdown: DayScoreBreakdown,
  agg: DayAggregate,
  total: number,
): number {
  let xp = Math.floor(total / 5);
  if (agg.honestyAnswered) xp += 5;
  if (breakdown.steps === 'achieved') xp += 3;
  if (breakdown.nutritionLogging === 'achieved') xp += 3;
  // Recovery credit: honest miss still earns small XP
  const honestMisses = Object.values(breakdown).filter((o) => o === 'missed_honest').length;
  if (honestMisses > 0 && agg.honestyAnswered) xp += 2;
  return xp;
}

export function normalizeWeights(w: ScoreWeights): ScoreWeights {
  const sum = Object.values(w).reduce((a, b) => a + b, 0);
  if (sum === 100) return w;
  // Keep as-is; scoring still caps at 100 via Math.min
  return w;
}

export function nextActions(agg: DayAggregate, settings: AppSettings): string[] {
  const actions: string[] = [];
  if (agg.steps === null) {
    actions.push('Log today’s steps (manual entry).');
  } else if (agg.steps < settings.stepsTarget) {
    actions.push(
      `${settings.stepsTarget - agg.steps} steps remaining — walk when it fits; don’t sacrifice sleep.`,
    );
  }
  if (agg.foodEntryCount === 0) {
    actions.push('Start food log — honesty matters more than a perfect day.');
  } else {
    if (agg.proteinG < settings.proteinTargetG) {
      actions.push(
        `${Math.round(settings.proteinTargetG - agg.proteinG)} g protein remaining — prioritize protein foods.`,
      );
    }
    if (!agg.honestyAnswered) {
      actions.push('Answer the honesty checklist before closing the day.');
    }
  }
  if (agg.waterMl < settings.waterTargetMl) {
    actions.push(
      `${settings.waterTargetMl - agg.waterMl} ml water remaining — sip steadily.`,
    );
  }
  if (agg.calories >= calorieTargetFor(settings, agg.date)) {
    // Do NOT encourage filling remaining calories
    actions.push('Calorie target reached — no need to “use up” remaining allowance.');
  }
  if (agg.workoutTypes.length === 0) {
    actions.push('Log training or mark a planned recovery day.');
  }
  if (actions.length === 0) {
    actions.push('Day looks solid — finish the evening review when ready.');
  }
  return actions.slice(0, 5);
}
