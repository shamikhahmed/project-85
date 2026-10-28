import type { AppSettings, DayAggregate, DayScore } from '../domain/types';
import type { WeightTrendAssessment } from './weightTrend';
import { dailyWeightVsTrendMessage } from './weightTrend';
import { calorieTargetFor } from '../domain/plan';

export interface BriefingInput {
  settings: AppSettings;
  agg: DayAggregate;
  score: DayScore | null;
  weightTrend?: WeightTrendAssessment | null;
  hour?: number;
  /** Yesterday’s logged sleep hours, if known — never invent */
  yesterdaySleepHours?: number | null;
  /** Previous primary morning weight for daily-vs-trend copy */
  previousWeightKg?: number | null;
}

export type QuickActionKind = 'meal' | 'water' | 'steps' | 'weight' | 'workout' | 'nightly' | 'shake';

export type MissionDayKind =
  | 'morning_setup'
  | 'fuel_day'
  | 'train_window'
  | 'recover'
  | 'evening_close'
  | 'steady';

export interface DailyBriefing {
  /** Short mission headline for Today */
  missionTitle: string;
  dayKind: MissionDayKind;
  dayKindLabel: string;
  primaryAction: string;
  narrative: string;
  bullets: string[];
  quickAction: QuickActionKind;
  caloriesRemaining: number | null;
  proteinRemaining: number | null;
  stepsRemaining: number | null;
  waterRemaining: number;
  foodProvisional: boolean;
  /** Present only when daily scale vs weekly trend disagree usefully */
  trendTruth: string | null;
}

const DAY_KIND_LABEL: Record<MissionDayKind, string> = {
  morning_setup: 'Morning setup',
  fuel_day: 'Fuel & log',
  train_window: 'Train or recover',
  recover: 'Softer day',
  evening_close: 'Evening close',
  steady: 'Steady day',
};

/**
 * Daily Mission from real aggregates only.
 * Never invent history. Never advise exercise to “burn off” food or sacrifice sleep.
 */
export function buildDailyBriefing(input: BriefingInput): DailyBriefing {
  const { settings, agg, score, weightTrend } = input;
  const hour = input.hour ?? new Date().getHours();
  const softRecovery =
    input.yesterdaySleepHours != null &&
    Number.isFinite(input.yesterdaySleepHours) &&
    input.yesterdaySleepHours < 6.5;

  const bullets: string[] = [];
  const foodProvisional =
    agg.foodEntryCount > 0 && (!agg.honestyAnswered || agg.loggingCompleteness < 0.6);

  const caloriesRemaining =
    agg.foodEntryCount === 0
      ? null
      : Math.round(calorieTargetFor(settings, agg.date) - agg.calories);
  const proteinRemaining =
    agg.foodEntryCount === 0
      ? null
      : Math.round(settings.proteinTargetG - agg.proteinG);
  const stepsRemaining =
    agg.steps == null ? null : Math.max(0, settings.stepsTarget - agg.steps);
  const waterRemaining = Math.max(0, settings.waterTargetMl - agg.waterMl);

  if (softRecovery) {
    bullets.push(
      `Yesterday’s sleep was ~${input.yesterdaySleepHours} h — keep today’s effort manageable.`,
    );
  }

  if (agg.primaryWeightKg == null) {
    bullets.push(
      hour < 12
        ? 'No morning weight yet — add it when you’re ready.'
        : 'No measurement yet for today.',
    );
  } else {
    bullets.push(`Morning weight ${agg.primaryWeightKg} kg.`);
  }

  if (agg.foodEntryCount === 0) {
    bullets.push('Food not logged — calorie totals are unknown, not zero.');
  } else if (foodProvisional) {
    bullets.push(
      `Food total may be incomplete (${Math.round(agg.calories)} kcal logged). Oil, sauces and bites count.`,
    );
  } else {
    bullets.push(
      `Calories ${Math.round(agg.calories)} / ${calorieTargetFor(settings, agg.date)}${
        caloriesRemaining != null && caloriesRemaining > 0
          ? ` · ~${caloriesRemaining} remaining (estimate)`
          : ''
      }.`,
    );
  }

  if (agg.foodEntryCount > 0 && proteinRemaining != null && proteinRemaining > 0) {
    bullets.push(`About ${proteinRemaining} g protein left toward ${settings.proteinTargetG} g.`);
  }

  if (agg.steps == null) {
    bullets.push(`Steps not logged (target ${settings.stepsTarget.toLocaleString()}).`);
  } else if (stepsRemaining != null && stepsRemaining > 0) {
    bullets.push(
      `${agg.steps.toLocaleString()} steps · ~${stepsRemaining.toLocaleString()} to go — finish when it fits; don’t sacrifice sleep.`,
    );
  } else if (agg.steps != null) {
    bullets.push(`Step target met (${agg.steps.toLocaleString()}).`);
  }

  if (agg.waterMl === 0) {
    bullets.push('Water not logged yet.');
  } else if (waterRemaining > 0) {
    bullets.push(`Water ${agg.waterMl} / ${settings.waterTargetMl} ml — sip steadily.`);
  }

  if (agg.workoutTypes.length > 0) {
    bullets.push(`Logged: ${agg.workoutTypes.join(', ')}.`);
  } else if (hour >= 17) {
    bullets.push('No workout or recovery day logged yet.');
  }

  if (weightTrend) {
    bullets.push(weightTrend.message);
  }

  if (score) {
    bullets.push(`Score so far ${score.total}/100.`);
  }

  const trendTruth =
    weightTrend != null
      ? dailyWeightVsTrendMessage({
          todayKg: agg.primaryWeightKg,
          previousKg: input.previousWeightKg ?? null,
          trend: weightTrend,
        })
      : null;
  if (trendTruth) bullets.unshift(trendTruth);

  const chosen = choosePrimary(
    settings,
    agg,
    hour,
    proteinRemaining,
    stepsRemaining,
    softRecovery,
  );

  const dayKind = resolveDayKind(hour, agg, softRecovery, chosen.quickAction);
  const missionTitle = softRecovery
    ? `Win today: ${chosen.primaryAction} (keep it light)`
    : `Win today: ${chosen.primaryAction}`;

  return {
    missionTitle,
    dayKind,
    dayKindLabel: DAY_KIND_LABEL[dayKind],
    primaryAction: chosen.primaryAction,
    narrative: chosen.narrative,
    bullets: bullets.slice(0, 6),
    quickAction: chosen.quickAction,
    caloriesRemaining,
    proteinRemaining,
    stepsRemaining,
    waterRemaining,
    foodProvisional,
    trendTruth,
  };
}

function resolveDayKind(
  hour: number,
  agg: DayAggregate,
  softRecovery: boolean,
  quick: QuickActionKind,
): MissionDayKind {
  if (softRecovery && agg.workoutTypes.length === 0) return 'recover';
  if (hour < 11 && agg.primaryWeightKg == null) return 'morning_setup';
  if (quick === 'workout' || (hour >= 17 && hour < 21 && agg.workoutTypes.length === 0)) {
    return softRecovery ? 'recover' : 'train_window';
  }
  if (hour >= 20 || quick === 'nightly') return 'evening_close';
  if (agg.foodEntryCount === 0 || quick === 'meal' || quick === 'shake') return 'fuel_day';
  return 'steady';
}

function choosePrimary(
  settings: AppSettings,
  agg: DayAggregate,
  hour: number,
  proteinRemaining: number | null,
  stepsRemaining: number | null,
  softRecovery: boolean,
): { primaryAction: string; quickAction: QuickActionKind; narrative: string } {
  if (hour < 11 && agg.primaryWeightKg == null) {
    return {
      primaryAction: 'Record this morning’s weight',
      quickAction: 'weight',
      narrative: 'A single number starts today’s trend — estimates are fine if labelled.',
    };
  }

  if (agg.foodEntryCount === 0 && hour >= 11 && hour < 16) {
    return {
      primaryAction: 'Log lunch (or your first meal)',
      quickAction: 'meal',
      narrative: 'You don’t need a perfect day — an honest estimate beats a blank page.',
    };
  }

  if (agg.foodEntryCount === 0) {
    return {
      primaryAction: 'Log your first meal',
      quickAction: 'meal',
      narrative: 'Open Quick Log and tap a saved or recent meal — usually two to four taps.',
    };
  }

  if (!agg.honestyAnswered && hour >= 18) {
    return {
      primaryAction: 'Close the food honesty checklist',
      quickAction: 'nightly',
      narrative: 'Oil, sauces, drinks and unplanned bites — then tomorrow’s briefing is trustworthy.',
    };
  }

  if (hour >= 18 && hour < 21 && agg.workoutTypes.length === 0) {
    if (softRecovery) {
      return {
        primaryAction: 'Log a recovery or light movement day',
        quickAction: 'workout',
        narrative: settings.shoulderCaution
          ? 'Short sleep — train lighter (stop 2-3 reps short) or do Saturday option 2. Skip anything that hurts the shoulder.'
          : 'Short sleep — prefer recovery or an easy session over forcing intensity.',
      };
    }
    return {
      primaryAction: 'Log tonight’s session in Train, or a recovery day',
      quickAction: 'workout',
      narrative: settings.shoulderCaution
        ? 'Protect the shoulder — skip anything painful; machine and cable work still counts.'
        : 'Mark what you did so consistency shows up on Progress.',
    };
  }

  if (proteinRemaining != null && proteinRemaining >= 25 && hour >= 16 && hour < 22) {
    return {
      primaryAction: `Cover ~${proteinRemaining} g protein still open`,
      quickAction: 'shake',
      narrative:
        'A short walk and a protein-focused dinner (tikka, boti, whey) would make a useful difference.',
    };
  }

  if (stepsRemaining != null && stepsRemaining > 1500 && hour >= 12) {
    return {
      primaryAction: `Close ~${stepsRemaining.toLocaleString()} steps when it fits`,
      quickAction: 'steps',
      narrative: softRecovery
        ? 'If you’re tired, take an easy walk — don’t trade more sleep for steps.'
        : 'Karachi heat: walk early, late, or indoors — don’t trade sleep for steps.',
    };
  }

  if (agg.waterMl < settings.waterTargetMl * 0.4) {
    return {
      primaryAction: 'Add a glass of water',
      quickAction: 'water',
      narrative: 'Sip across the day — no chugging to hit a number.',
    };
  }

  if (!agg.reviewCompleted && hour >= 20) {
    return {
      primaryAction: 'Finish tonight’s Truth Check',
      quickAction: 'nightly',
      narrative: 'Under a minute: what went well, what was hard, one easier step for tomorrow.',
    };
  }

  if (agg.workoutTypes.length === 0 && hour >= 12) {
    return {
      primaryAction: softRecovery
        ? 'Name today as recovery if you’re not training'
        : 'Log training or a planned recovery day',
      quickAction: 'workout',
      narrative: 'Rest days count when you name them honestly.',
    };
  }

  return {
    primaryAction: 'Day looks solid — protect sleep',
    quickAction: 'nightly',
    narrative: 'Stay consistent tomorrow. No need to open the app twenty times.',
  };
}
