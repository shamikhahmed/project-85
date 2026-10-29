import Dexie, { type Table } from 'dexie';
import type {
  HealthConnectionState,
  HealthMetricRecord,
} from '../health/types';
import type {
  Achievement,
  AppSettings,
  BodyMeasurement,
  CigaretteEntry,
  DailyNotes,
  DayScore,
  ExerciseSwapLog,
  FoodEntry,
  FoodLibraryItem,
  JournalEntry,
  MotivationItem,
  PersonalLetter,
  ProgressPhoto,
  SleepEntry,
  StepEntry,
  WaterEntry,
  WeightEntry,
  WorkoutEntry,
  XpEvent,
} from '../domain/types';

export class Project85DB extends Dexie {
  settings!: Table<AppSettings, string>;
  weights!: Table<WeightEntry, string>;
  foods!: Table<FoodEntry, string>;
  foodLibrary!: Table<FoodLibraryItem, string>;
  steps!: Table<StepEntry, string>;
  water!: Table<WaterEntry, string>;
  workouts!: Table<WorkoutEntry, string>;
  sleep!: Table<SleepEntry, string>;
  cigarettes!: Table<CigaretteEntry, string>;
  notes!: Table<DailyNotes, string>;
  scores!: Table<DayScore, string>;
  xp!: Table<XpEvent, string>;
  achievements!: Table<Achievement, string>;
  bodyMeasurements!: Table<BodyMeasurement, string>;
  motivationItems!: Table<MotivationItem, string>;
  personalLetters!: Table<PersonalLetter, string>;
  journalEntries!: Table<JournalEntry, string>;
  progressPhotos!: Table<ProgressPhoto, string>;
  healthRecords!: Table<HealthMetricRecord, string>;
  healthConnections!: Table<HealthConnectionState, string>;
  exerciseSwaps!: Table<ExerciseSwapLog, string>;

  constructor() {
    super('project85');
    this.version(1).stores({
      settings: 'id',
      weights: 'id, date, isPrimaryMorning',
      foods: 'id, date, category, name',
      foodLibrary: 'id, name, useCount',
      steps: 'id, date',
      water: 'id, date, createdAt',
      workouts: 'id, date, type',
      sleep: 'id, date',
      cigarettes: 'id, date',
      notes: 'id, date',
      scores: 'id, date',
      xp: 'id, date, createdAt',
      achievements: 'id, key, unlockedAt',
    });
    this.version(2).stores({
      settings: 'id',
      weights: 'id, date, isPrimaryMorning',
      foods: 'id, date, category, name',
      foodLibrary: 'id, name, useCount',
      steps: 'id, date',
      water: 'id, date, createdAt',
      workouts: 'id, date, type',
      sleep: 'id, date',
      cigarettes: 'id, date',
      notes: 'id, date',
      scores: 'id, date',
      xp: 'id, date, createdAt',
      achievements: 'id, key, unlockedAt',
      bodyMeasurements: 'id, type, date, measuredAt',
      motivationItems: 'id, kind, createdAt',
      personalLetters: 'id, openOn, createdAt',
      journalEntries: 'id, date, createdAt',
      progressPhotos: 'id, date, pose, createdAt',
    });
    this.version(3).stores({
      settings: 'id',
      weights: 'id, date, isPrimaryMorning',
      foods: 'id, date, category, name',
      foodLibrary: 'id, name, useCount',
      steps: 'id, date',
      water: 'id, date, createdAt',
      workouts: 'id, date, type',
      sleep: 'id, date',
      cigarettes: 'id, date',
      notes: 'id, date',
      scores: 'id, date',
      xp: 'id, date, createdAt',
      achievements: 'id, key, unlockedAt',
      bodyMeasurements: 'id, type, date, measuredAt',
      motivationItems: 'id, kind, createdAt',
      personalLetters: 'id, openOn, createdAt',
      journalEntries: 'id, date, createdAt',
      progressPhotos: 'id, date, pose, createdAt',
      healthRecords: 'id, metricId, category, startAt, provider, sourceRecordId',
      healthConnections: 'id, provider, status',
    });
    this.version(4).stores({
      settings: 'id',
      weights: 'id, date, isPrimaryMorning',
      foods: 'id, date, category, name',
      foodLibrary: 'id, name, useCount',
      steps: 'id, date',
      water: 'id, date, createdAt',
      workouts: 'id, date, type',
      sleep: 'id, date',
      cigarettes: 'id, date',
      notes: 'id, date',
      scores: 'id, date',
      xp: 'id, date, createdAt',
      achievements: 'id, key, unlockedAt',
      bodyMeasurements: 'id, type, date, measuredAt',
      motivationItems: 'id, kind, createdAt',
      personalLetters: 'id, openOn, createdAt',
      journalEntries: 'id, date, createdAt',
      progressPhotos: 'id, date, pose, createdAt',
      healthRecords: 'id, metricId, category, startAt, provider, sourceRecordId',
      healthConnections: 'id, provider, status',
      exerciseSwaps: 'id, date, dayKey, code',
    });
  }
}

export const db = new Project85DB();

export function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}
