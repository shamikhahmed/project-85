import { createDefaultSettings, SEED_FOOD_LIBRARY } from '../domain/defaults';
import type {
  AppSettings,
  BackupPayload,
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
} from '../domain/types';
import { validateBackupPayload } from './backup';
import { db, newId } from './db';

export { backupToCsv, validateBackupPayload } from './backup';

let initPromise: Promise<void> | null = null;

export async function ensureInitialized(): Promise<AppSettings> {
  if (!initPromise) {
    initPromise = (async () => {
      const existing = await db.settings.get('settings');
      if (!existing) {
        await db.settings.put(createDefaultSettings());
      }
      const libCount = await db.foodLibrary.count();
      if (libCount === 0) {
        const now = new Date().toISOString();
        await db.foodLibrary.bulkAdd(
          SEED_FOOD_LIBRARY.map((item) => ({
            id: newId('lib'),
            ...item,
            useCount: 0,
            updatedAt: now,
          })),
        );
      }
    })();
  }
  await initPromise;
  const settings = await db.settings.get('settings');
  if (!settings) throw new Error('Settings missing after init');
  return settings;
}

export async function getSettings(): Promise<AppSettings> {
  return ensureInitialized();
}

export async function updateSettings(
  patch: Partial<Omit<AppSettings, 'id'>>,
): Promise<AppSettings> {
  const current = await getSettings();
  const next: AppSettings = {
    ...current,
    ...patch,
    id: 'settings',
    updatedAt: new Date().toISOString(),
  };
  await db.settings.put(next);
  return next;
}

/* ---------------- Weight ---------------- */

export async function upsertPrimaryWeight(
  entry: Omit<WeightEntry, 'id' | 'createdAt' | 'updatedAt' | 'isPrimaryMorning'> & {
    id?: string;
  },
): Promise<WeightEntry> {
  const now = new Date().toISOString();
  return db.transaction('rw', db.weights, async () => {
    const dayWeights = await db.weights.where('date').equals(entry.date).toArray();
    for (const w of dayWeights) {
      if (w.isPrimaryMorning && w.id !== entry.id) {
        await db.weights.update(w.id, { isPrimaryMorning: false, updatedAt: now });
      }
    }

    if (entry.id) {
      const prev = await db.weights.get(entry.id);
      const next: WeightEntry = {
        ...(prev as WeightEntry),
        ...entry,
        id: entry.id,
        isPrimaryMorning: true,
        updatedAt: now,
        createdAt: prev?.createdAt ?? now,
      };
      await db.weights.put(next);
      return next;
    }

    const next: WeightEntry = {
      id: newId('wt'),
      date: entry.date,
      weightKg: entry.weightKg,
      waistCm: entry.waistCm,
      notes: entry.notes,
      isEstimate: entry.isEstimate,
      isPrimaryMorning: true,
      enteredLate: entry.enteredLate,
      createdAt: now,
      updatedAt: now,
    };
    await db.weights.add(next);
    return next;
  });
}

export async function deleteWeight(id: string): Promise<void> {
  await db.weights.delete(id);
}

export async function getWeightsByDate(date: string): Promise<WeightEntry[]> {
  return db.weights.where('date').equals(date).toArray();
}

export async function getAllWeights(): Promise<WeightEntry[]> {
  return db.weights.orderBy('date').toArray();
}

/* ---------------- Food ---------------- */

export async function addFood(
  entry: Omit<FoodEntry, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<FoodEntry> {
  const now = new Date().toISOString();
  const next: FoodEntry = { ...entry, id: newId('food'), createdAt: now, updatedAt: now };
  await db.foods.add(next);
  if (entry.libraryItemId) {
    const lib = await db.foodLibrary.get(entry.libraryItemId);
    if (lib) {
      await db.foodLibrary.update(lib.id, {
        useCount: lib.useCount + 1,
        updatedAt: now,
      });
    }
  }
  return next;
}

export async function updateFood(
  id: string,
  patch: Partial<FoodEntry>,
): Promise<FoodEntry> {
  const prev = await db.foods.get(id);
  if (!prev) throw new Error('Food not found');
  const next = { ...prev, ...patch, id, updatedAt: new Date().toISOString() };
  await db.foods.put(next);
  return next;
}

export async function deleteFood(id: string): Promise<void> {
  await db.foods.delete(id);
}

export async function getFoodsByDate(date: string): Promise<FoodEntry[]> {
  return db.foods.where('date').equals(date).toArray();
}

export async function getFoodLibrary(): Promise<FoodLibraryItem[]> {
  return db.foodLibrary.orderBy('useCount').reverse().toArray();
}

export async function saveFoodToLibrary(
  item: Omit<FoodLibraryItem, 'id' | 'useCount' | 'updatedAt'>,
): Promise<FoodLibraryItem> {
  const next: FoodLibraryItem = {
    ...item,
    id: newId('lib'),
    useCount: 0,
    updatedAt: new Date().toISOString(),
  };
  await db.foodLibrary.add(next);
  return next;
}

/* ---------------- Steps (REPLACE TOTAL rule) ---------------- */

/**
 * Documented rule: setStepsForDate REPLACES the day's total.
 * It does not add to previous value. Pass the absolute total from the pedometer/watch.
 */
export async function setStepsForDate(
  date: string,
  totalSteps: number,
  note?: string,
): Promise<StepEntry> {
  const now = new Date().toISOString();
  const existing = await db.steps.where('date').equals(date).first();
  if (existing) {
    const next: StepEntry = {
      ...existing,
      totalSteps,
      note,
      source: 'manual',
      updatedAt: now,
    };
    await db.steps.put(next);
    return next;
  }
  const next: StepEntry = {
    id: newId('steps'),
    date,
    totalSteps,
    source: 'manual',
    note,
    createdAt: now,
    updatedAt: now,
  };
  await db.steps.add(next);
  return next;
}

export async function getStepsByDate(date: string): Promise<StepEntry | undefined> {
  return db.steps.where('date').equals(date).first();
}

export async function getStepsInRange(start: string, end: string): Promise<StepEntry[]> {
  return db.steps.where('date').between(start, end, true, true).toArray();
}

/* ---------------- Water ---------------- */

export async function addWater(date: string, amountMl: number): Promise<WaterEntry> {
  const entry: WaterEntry = {
    id: newId('h2o'),
    date,
    amountMl,
    createdAt: new Date().toISOString(),
  };
  await db.water.add(entry);
  return entry;
}

export async function undoLastWater(date: string): Promise<WaterEntry | null> {
  const entries = await db.water.where('date').equals(date).sortBy('createdAt');
  const last = entries.at(-1);
  if (!last) return null;
  await db.water.delete(last.id);
  return last;
}

export async function deleteWater(id: string): Promise<void> {
  await db.water.delete(id);
}

export async function getWaterByDate(date: string): Promise<WaterEntry[]> {
  return db.water.where('date').equals(date).sortBy('createdAt');
}

/* ---------------- Workout / Sleep / Cigarettes / Notes ---------------- */

export async function upsertWorkout(
  entry: Omit<WorkoutEntry, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
): Promise<WorkoutEntry> {
  const now = new Date().toISOString();
  if (entry.id) {
    const prev = await db.workouts.get(entry.id);
    const next = { ...(prev as WorkoutEntry), ...entry, id: entry.id, updatedAt: now };
    await db.workouts.put(next);
    return next;
  }
  const next: WorkoutEntry = {
    id: newId('wo'),
    date: entry.date,
    type: entry.type,
    durationMin: entry.durationMin,
    perceivedEffort: entry.perceivedEffort,
    exercises: entry.exercises,
    notes: entry.notes,
    createdAt: now,
    updatedAt: now,
  };
  await db.workouts.add(next);
  return next;
}

export async function deleteWorkout(id: string): Promise<void> {
  await db.workouts.delete(id);
}

export async function getWorkoutsByDate(date: string): Promise<WorkoutEntry[]> {
  return db.workouts.where('date').equals(date).toArray();
}

export async function upsertSleep(
  entry: Omit<SleepEntry, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
): Promise<SleepEntry> {
  const now = new Date().toISOString();
  const existing = entry.id
    ? await db.sleep.get(entry.id)
    : await db.sleep.where('date').equals(entry.date).first();
  if (existing) {
    const next = { ...existing, ...entry, id: existing.id, updatedAt: now };
    await db.sleep.put(next);
    return next;
  }
  const next: SleepEntry = {
    id: newId('sleep'),
    date: entry.date,
    bedtime: entry.bedtime,
    wakeTime: entry.wakeTime,
    quality: entry.quality,
    notes: entry.notes,
    createdAt: now,
    updatedAt: now,
  };
  await db.sleep.add(next);
  return next;
}

export async function getSleepByDate(date: string): Promise<SleepEntry | undefined> {
  return db.sleep.where('date').equals(date).first();
}

export async function addCigarette(
  entry: Omit<CigaretteEntry, 'id' | 'createdAt'>,
): Promise<CigaretteEntry> {
  const next: CigaretteEntry = {
    ...entry,
    id: newId('cig'),
    createdAt: new Date().toISOString(),
  };
  await db.cigarettes.add(next);
  return next;
}

/** Explicit zero-cigarette day marker */
export async function logZeroCigarettes(date: string): Promise<CigaretteEntry> {
  const existing = await db.cigarettes.where('date').equals(date).toArray();
  if (existing.length === 1 && existing[0].count === 0) return existing[0];
  for (const e of existing) await db.cigarettes.delete(e.id);
  return addCigarette({ date, count: 0, substance: 'tobacco' });
}

export async function deleteCigarette(id: string): Promise<void> {
  await db.cigarettes.delete(id);
}

export async function getCigarettesByDate(date: string): Promise<CigaretteEntry[]> {
  return db.cigarettes.where('date').equals(date).toArray();
}

export async function upsertNotes(
  date: string,
  patch: Partial<Omit<DailyNotes, 'id' | 'date' | 'createdAt'>>,
): Promise<DailyNotes> {
  const now = new Date().toISOString();
  const existing = await db.notes.where('date').equals(date).first();
  if (existing) {
    const next = { ...existing, ...patch, updatedAt: now };
    await db.notes.put(next);
    return next;
  }
  const next: DailyNotes = {
    id: newId('notes'),
    date,
    ...patch,
    createdAt: now,
    updatedAt: now,
  };
  await db.notes.add(next);
  return next;
}

export async function getNotesByDate(date: string): Promise<DailyNotes | undefined> {
  return db.notes.where('date').equals(date).first();
}

export async function saveDayScore(score: DayScore): Promise<void> {
  await db.scores.put(score);
}

export async function getScoreByDate(date: string): Promise<DayScore | undefined> {
  return db.scores.where('date').equals(date).first();
}

/* ---------------- Backup / Export ---------------- */

export async function createBackup(): Promise<BackupPayload> {
  await ensureInitialized();
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: (await db.settings.get('settings'))!,
    weights: await db.weights.toArray(),
    foods: await db.foods.toArray(),
    foodLibrary: await db.foodLibrary.toArray(),
    steps: await db.steps.toArray(),
    water: await db.water.toArray(),
    workouts: await db.workouts.toArray(),
    sleep: await db.sleep.toArray(),
    cigarettes: await db.cigarettes.toArray(),
    notes: await db.notes.toArray(),
    scores: await db.scores.toArray(),
    xp: await db.xp.toArray(),
    achievements: await db.achievements.toArray(),
  };
}

export async function restoreBackup(payload: unknown): Promise<void> {
  const data = validateBackupPayload(payload);

  await db.transaction(
    'rw',
    [
      db.settings,
      db.weights,
      db.foods,
      db.foodLibrary,
      db.steps,
      db.water,
      db.workouts,
      db.sleep,
      db.cigarettes,
      db.notes,
      db.scores,
      db.xp,
      db.achievements,
    ],
    async () => {
      await Promise.all([
        db.settings.clear(),
        db.weights.clear(),
        db.foods.clear(),
        db.foodLibrary.clear(),
        db.steps.clear(),
        db.water.clear(),
        db.workouts.clear(),
        db.sleep.clear(),
        db.cigarettes.clear(),
        db.notes.clear(),
        db.scores.clear(),
        db.xp.clear(),
        db.achievements.clear(),
      ]);
      await db.settings.put(data.settings);
      if (data.weights.length) await db.weights.bulkAdd(data.weights);
      if (data.foods.length) await db.foods.bulkAdd(data.foods);
      if (data.foodLibrary.length) await db.foodLibrary.bulkAdd(data.foodLibrary);
      if (data.steps.length) await db.steps.bulkAdd(data.steps);
      if (data.water.length) await db.water.bulkAdd(data.water);
      if (data.workouts.length) await db.workouts.bulkAdd(data.workouts);
      if (data.sleep.length) await db.sleep.bulkAdd(data.sleep);
      if (data.cigarettes.length) await db.cigarettes.bulkAdd(data.cigarettes);
      if (data.notes.length) await db.notes.bulkAdd(data.notes);
      if (data.scores.length) await db.scores.bulkAdd(data.scores);
      if (data.xp.length) await db.xp.bulkAdd(data.xp);
      if (data.achievements.length) await db.achievements.bulkAdd(data.achievements);
    },
  );
  initPromise = null;
}

export async function clearAllData(): Promise<void> {
  await db.delete();
  initPromise = null;
  // Recreate
  await ensureInitialized();
}

export async function loadDayBundle(date: string) {
  const [
    settings,
    weights,
    foods,
    steps,
    water,
    workouts,
    sleep,
    cigarettes,
    notes,
    score,
  ] = await Promise.all([
    getSettings(),
    getWeightsByDate(date),
    getFoodsByDate(date),
    getStepsByDate(date),
    getWaterByDate(date),
    getWorkoutsByDate(date),
    getSleepByDate(date),
    getCigarettesByDate(date),
    getNotesByDate(date),
    getScoreByDate(date),
  ]);
  return {
    settings,
    weights,
    foods,
    steps: steps ? [steps] : [],
    water,
    workouts,
    sleep: sleep ? [sleep] : [],
    cigarettes,
    notes,
    score,
  };
}
