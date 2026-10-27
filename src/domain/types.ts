/** Local calendar date as YYYY-MM-DD */
export type ISODate = string;

export type MealCategory =
  | 'breakfast'
  | 'lunch'
  | 'dinner'
  | 'snacks'
  | 'pre_workout'
  | 'post_workout'
  | 'drinks'
  | 'other';

export type NutritionConfidence = 'verified' | 'estimated' | 'range';

export type WorkoutType =
  | 'strength'
  | 'swimming'
  | 'walking'
  | 'running'
  | 'cardio'
  | 'rest'
  | 'other';

export type DayStatus =
  | 'ON_TRACK'
  | 'NEEDS_ATTENTION'
  | 'DAY_COMPLETED'
  | 'INCOMPLETE_LOG';

export type GoalOutcome =
  | 'achieved'
  | 'missed_honest'
  | 'not_entered'
  | 'not_applicable';

export type ThemeMode = 'dark' | 'light' | 'system';

export interface AppSettings {
  id: 'settings';
  startDate: ISODate;
  deadline: ISODate;
  startingWeightKg: number;
  targetWeightKg: number;
  calorieTarget: number;
  proteinTargetG: number;
  carbsTargetG: number | null;
  fatTargetG: number | null;
  fibreTargetG: number;
  waterTargetMl: number;
  stepsTarget: number;
  sleepTargetHours: number;
  cigaretteTarget: number;
  theme: ThemeMode;
  units: 'metric';
  remindersEnabled: boolean;
  reminderTimes: string[];
  accountabilityEnabled: boolean;
  rewardsEnabled: boolean;
  scoreWeights: ScoreWeights;
  personalRewards: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ScoreWeights {
  steps: number;
  nutritionLogging: number;
  calories: number;
  protein: number;
  hydration: number;
  training: number;
  sleep: number;
  smoking: number;
  reflection: number;
}

export interface WeightEntry {
  id: string;
  date: ISODate;
  weightKg: number;
  waistCm?: number;
  notes?: string;
  isEstimate: boolean;
  isPrimaryMorning: boolean;
  createdAt: string;
  updatedAt: string;
  enteredLate?: boolean;
}

export interface FoodEntry {
  id: string;
  date: ISODate;
  category: MealCategory;
  name: string;
  portion?: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fibreG?: number;
  confidence: NutritionConfidence;
  calorieRangeMin?: number;
  calorieRangeMax?: number;
  notes?: string;
  timeConsumed?: string;
  libraryItemId?: string;
  createdAt: string;
  updatedAt: string;
  enteredLate?: boolean;
}

export interface FoodLibraryItem {
  id: string;
  name: string;
  defaultPortion?: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fibreG?: number;
  confidence: NutritionConfidence;
  category: MealCategory;
  useCount: number;
  updatedAt: string;
}

export interface StepEntry {
  id: string;
  date: ISODate;
  /** Documented rule: each update REPLACES the day's total (not cumulative add). */
  totalSteps: number;
  source: 'manual' | 'health_future';
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WaterEntry {
  id: string;
  date: ISODate;
  amountMl: number;
  createdAt: string;
}

export interface WorkoutExercise {
  name: string;
  sets?: number;
  reps?: number;
  weightKg?: number;
  notes?: string;
}

export interface WorkoutEntry {
  id: string;
  date: ISODate;
  type: WorkoutType;
  durationMin?: number;
  perceivedEffort?: number;
  exercises?: WorkoutExercise[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SleepEntry {
  id: string;
  date: ISODate;
  /** ISO datetime bedtime */
  bedtime: string;
  /** ISO datetime wake */
  wakeTime: string;
  quality?: 1 | 2 | 3 | 4 | 5;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CigaretteEntry {
  id: string;
  date: ISODate;
  count: number;
  timestamp?: string;
  cravingNote?: string;
  substance: 'tobacco' | 'cannabis' | 'mixed' | 'other';
  createdAt: string;
}

export interface DailyNotes {
  id: string;
  date: ISODate;
  mood?: string;
  hunger?: string;
  energy?: string;
  stress?: string;
  workoutQuality?: string;
  cravings?: string;
  wentWell?: string;
  improveTomorrow?: string;
  eveningReview?: string;
  nextDayIntention?: string;
  honestyChecklist?: HonestyChecklist;
  loggedEverythingHonestly?: boolean | null;
  dailyReviewCompleted?: boolean;
  nightlyTruthCompleted?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface HonestyChecklist {
  cookingOilGhee: boolean;
  saucesChutneys: boolean;
  snacksBites: boolean;
  sugaryDrinks: boolean;
  restaurantPortions: boolean;
  unplannedMeals: boolean;
}

export interface DayScoreBreakdown {
  steps: GoalOutcome;
  nutritionLogging: GoalOutcome;
  calories: GoalOutcome;
  protein: GoalOutcome;
  hydration: GoalOutcome;
  training: GoalOutcome;
  sleep: GoalOutcome;
  smoking: GoalOutcome;
  reflection: GoalOutcome;
}

export interface DayScore {
  id: string;
  date: ISODate;
  total: number;
  breakdown: DayScoreBreakdown;
  points: Record<keyof DayScoreBreakdown, number>;
  status: DayStatus;
  xpEarned: number;
  consequenceIds: string[];
  computedAt: string;
}

export interface XpEvent {
  id: string;
  date: ISODate;
  reason: string;
  amount: number;
  createdAt: string;
}

export interface Achievement {
  id: string;
  key: string;
  title: string;
  description: string;
  unlockedAt: string;
}

export interface BackupPayload {
  version: 1;
  exportedAt: string;
  settings: AppSettings;
  weights: WeightEntry[];
  foods: FoodEntry[];
  foodLibrary: FoodLibraryItem[];
  steps: StepEntry[];
  water: WaterEntry[];
  workouts: WorkoutEntry[];
  sleep: SleepEntry[];
  cigarettes: CigaretteEntry[];
  notes: DailyNotes[];
  scores: DayScore[];
  xp: XpEvent[];
  achievements: Achievement[];
}

export interface DayAggregate {
  date: ISODate;
  primaryWeightKg: number | null;
  waistCm: number | null;
  steps: number | null;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fibreG: number;
  waterMl: number;
  foodEntryCount: number;
  hasEstimatedFood: boolean;
  workoutTypes: WorkoutType[];
  sleepHours: number | null;
  /** Sum of logged cigarette entries; meaningful only when cigarettesLogged */
  cigaretteCount: number;
  cigarettesLogged: boolean;
  honestyAnswered: boolean;
  reviewCompleted: boolean;
  score: number | null;
  status: DayStatus | null;
  loggingCompleteness: number;
}
