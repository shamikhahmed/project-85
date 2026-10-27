import type { AppSettings, DayAggregate, DayScore } from '../domain/types';
import type { WeightTrendAssessment } from './weightTrend';

export interface BriefingInput {
  settings: AppSettings;
  agg: DayAggregate;
  score: DayScore | null;
  weightTrend?: WeightTrendAssessment | null;
}

export interface DailyBriefing {
  primaryAction: string;
  bullets: string[];
}

/**
 * Data-driven mission briefing. Every bullet must come from real aggregates.
 * Never invent history. Never advise compensating for food with exercise or
 * sacrificing sleep for steps.
 */
export function buildDailyBriefing(input: BriefingInput): DailyBriefing {
  const { settings, agg, score, weightTrend } = input;
  const bullets: string[] = [];

  if (agg.primaryWeightKg == null) {
    bullets.push('You have not recorded a morning weight yet.');
  } else {
    bullets.push(`Morning weight logged at ${agg.primaryWeightKg} kg.`);
  }

  if (agg.steps == null) {
    bullets.push(`Steps not logged yet (target ${settings.stepsTarget.toLocaleString()}).`);
  } else if (agg.steps < settings.stepsTarget) {
    bullets.push(
      `You have logged ${agg.steps.toLocaleString()} of ${settings.stepsTarget.toLocaleString()} steps — finish when it fits; do not sacrifice sleep.`,
    );
  } else {
    bullets.push(`Step target met (${agg.steps.toLocaleString()}).`);
  }

  if (agg.foodEntryCount === 0) {
    bullets.push('Food logging has not started — calorie totals are unknown, not zero.');
  } else if (!agg.honestyAnswered || agg.loggingCompleteness < 0.6) {
    bullets.push(
      `Food logging is incomplete (${agg.foodEntryCount} entries), so today’s ${Math.round(agg.calories)} kcal total is provisional.`,
    );
  } else {
    bullets.push(
      `Calories logged: ${Math.round(agg.calories)} / ${settings.calorieTarget} (honesty check answered).`,
    );
  }

  if (agg.foodEntryCount > 0 && agg.proteinG < settings.proteinTargetG) {
    const gap = Math.round(settings.proteinTargetG - agg.proteinG);
    bullets.push(`Protein is about ${gap} g below your ${settings.proteinTargetG} g target.`);
  }

  if (agg.waterMl === 0) {
    bullets.push('Water not logged yet.');
  } else if (agg.waterMl < settings.waterTargetMl) {
    bullets.push(
      `Water ${agg.waterMl} / ${settings.waterTargetMl} ml — sip steadily; no chugging.`,
    );
  }

  if (agg.workoutTypes.length === 0) {
    bullets.push('No workout or recovery day logged.');
  }

  if (weightTrend && weightTrend.status !== 'insufficient_data') {
    bullets.push(weightTrend.message);
  } else if (weightTrend?.status === 'insufficient_data') {
    bullets.push(weightTrend.message);
  }

  if (score) {
    bullets.push(`Accountability score so far: ${score.total}/100 (${score.status.replace(/_/g, ' ').toLowerCase()}).`);
  }

  return {
    primaryAction: choosePrimaryAction(settings, agg),
    bullets: bullets.slice(0, 6),
  };
}

function choosePrimaryAction(settings: AppSettings, agg: DayAggregate): string {
  if (agg.foodEntryCount === 0) {
    return 'Log your first meal — honesty beats a blank day.';
  }
  if (!agg.honestyAnswered) {
    return 'Complete the food honesty checklist so today’s totals are trustworthy.';
  }
  if (agg.primaryWeightKg == null) {
    return 'Record this morning’s weight (or mark an estimate).';
  }
  if (agg.steps == null) {
    return `Log today’s steps (manual total — target ${settings.stepsTarget.toLocaleString()}).`;
  }
  if (agg.steps < settings.stepsTarget) {
    const left = settings.stepsTarget - agg.steps;
    return `Take a short walk when you can — about ${left.toLocaleString()} steps remaining.`;
  }
  if (agg.proteinG < settings.proteinTargetG * 0.9 && agg.foodEntryCount > 0) {
    return 'Add a protein-forward meal or shake next.';
  }
  if (agg.waterMl < settings.waterTargetMl * 0.5) {
    return 'Add a glass of water and keep sipping.';
  }
  if (agg.workoutTypes.length === 0) {
    return 'Log training or mark a planned recovery day.';
  }
  if (!agg.reviewCompleted) {
    return 'Finish the evening review or Nightly Truth Check.';
  }
  return 'Day looks solid — protect sleep and stay consistent tomorrow.';
}
