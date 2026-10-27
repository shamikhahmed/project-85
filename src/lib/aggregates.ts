import type {
  AppSettings,
  CigaretteEntry,
  DailyNotes,
  DayAggregate,
  DayScore,
  FoodEntry,
  SleepEntry,
  StepEntry,
  WaterEntry,
  WeightEntry,
  WorkoutEntry,
} from '../domain/types';
import { sleepDurationHours } from './dates';
import { sumFoodEntries } from './nutrition';

export interface DaySources {
  date: string;
  settings: AppSettings;
  weights: WeightEntry[];
  foods: FoodEntry[];
  steps: StepEntry[];
  water: WaterEntry[];
  workouts: WorkoutEntry[];
  sleep: SleepEntry[];
  cigarettes: CigaretteEntry[];
  notes: DailyNotes | undefined;
  score: DayScore | undefined;
}

export function buildDayAggregate(src: DaySources): DayAggregate {
  const primary =
    src.weights.find((w) => w.isPrimaryMorning) ??
    [...src.weights].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

  const macros = sumFoodEntries(src.foods);
  // Replace-total rule (see repository.setStepsForDate): one row per day; use latest save, never sum.
  const latestSteps = [...src.steps].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  )[0];
  const waterMl = src.water.reduce((s, w) => s + w.amountMl, 0);
  const sleepHours =
    src.sleep.length === 0
      ? null
      : src.sleep.reduce(
          (sum, s) => sum + sleepDurationHours(s.bedtime, s.wakeTime),
          0,
        );
  const cigaretteCount = src.cigarettes.reduce((s, c) => s + c.count, 0);
  const cigarettesLogged = src.cigarettes.length > 0;

  const honestyAnswered = src.notes?.loggedEverythingHonestly != null;
  const reviewCompleted = Boolean(src.notes?.dailyReviewCompleted);

  // Logging completeness: weight optional morning; require food honesty, steps, water, workout/rest, sleep signal
  const checks = [
    src.foods.length > 0,
    honestyAnswered,
    latestSteps != null,
    waterMl > 0,
    src.workouts.length > 0,
    sleepHours != null,
    cigarettesLogged,
  ];
  const loggingCompleteness = checks.filter(Boolean).length / checks.length;

  return {
    date: src.date,
    primaryWeightKg: primary?.weightKg ?? null,
    waistCm: primary?.waistCm ?? null,
    steps: latestSteps?.totalSteps ?? null,
    calories: macros.calories,
    proteinG: macros.proteinG,
    carbsG: macros.carbsG,
    fatG: macros.fatG,
    fibreG: macros.fibreG,
    waterMl,
    foodEntryCount: macros.entryCount,
    hasEstimatedFood: macros.estimatedCount > 0,
    workoutTypes: src.workouts.map((w) => w.type),
    sleepHours,
    cigaretteCount,
    cigarettesLogged,
    honestyAnswered,
    reviewCompleted,
    score: src.score?.total ?? null,
    status: src.score?.status ?? null,
    loggingCompleteness,
  };
}

export function computeStreak(
  datesAscending: string[],
  isSuccess: (date: string) => boolean,
): number {
  let streak = 0;
  for (let i = datesAscending.length - 1; i >= 0; i--) {
    if (isSuccess(datesAscending[i])) streak += 1;
    else break;
  }
  return streak;
}
