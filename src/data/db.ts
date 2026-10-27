import Dexie, { type Table } from 'dexie';
import type {
  Achievement,
  AppSettings,
  CigaretteEntry,
  DailyNotes,
  DayScore,
  FoodEntry,
  FoodLibraryItem,
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
  }
}

export const db = new Project85DB();

export function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}
