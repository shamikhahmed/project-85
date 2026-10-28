import { createDefaultSettings, SEED_FOOD_LIBRARY } from '../domain/defaults';
import type {
  AppSettings,
  BackupPayload,
  BodyMeasurement,
  BodyMeasurementType,
  CigaretteEntry,
  DailyNotes,
  DayAggregate,
  DayScore,
  FoodEntry,
  FoodLibraryItem,
  JournalEntry,
  MeasurementCondition,
  MotivationItem,
  MotivationKind,
  PersonalLetter,
  PhotoPose,
  ProgressPhoto,
  SleepEntry,
  StepEntry,
  WaterEntry,
  WeightEntry,
  WorkoutEntry,
} from '../domain/types';
import { buildDayAggregate } from '../lib/aggregates';
import { eachISODate } from '../lib/dates';
import { mergeRowsKeepNewer, rowTimestamp, validateBackupPayload } from './backup';
import { db, newId } from './db';

export { backupToCsv, validateBackupPayload } from './backup';

let initPromise: Promise<void> | null = null;

export async function ensureInitialized(): Promise<AppSettings> {
  if (!initPromise) {
    initPromise = (async () => {
      const existing = await db.settings.get('settings');
      if (!existing) {
        await db.settings.put(createDefaultSettings());
      } else {
        await db.settings.put(migrateSettings(existing));
      }
      await ensureSeedFoodLibrary();
      await dedupeFoodLibraryByName();
    })();
  }
  await initPromise;
  const settings = await db.settings.get('settings');
  if (!settings) throw new Error('Settings missing after init');
  return migrateSettings(settings);
}

function migrateSettings(raw: AppSettings): AppSettings {
  const defaults = createDefaultSettings(raw.createdAt);
  return {
    ...defaults,
    ...raw,
    focusMode: raw.focusMode ?? defaults.focusMode,
    shoulderCaution: raw.shoulderCaution ?? defaults.shoulderCaution,
    avoidChai: raw.avoidChai ?? defaults.avoidChai,
    personalRewards: raw.personalRewards ?? [],
    lengthUnit: raw.lengthUnit ?? defaults.lengthUnit,
    heightCm: raw.heightCm ?? defaults.heightCm,
    biologicalSex: raw.biologicalSex ?? defaults.biologicalSex,
    birthYear: raw.birthYear ?? defaults.birthYear,
    motivationalTone: raw.motivationalTone ?? defaults.motivationalTone,
    showDailyEncouragement:
      raw.showDailyEncouragement ?? defaults.showDailyEncouragement,
    measurementRemindersEnabled:
      raw.measurementRemindersEnabled ?? defaults.measurementRemindersEnabled,
    scoreWeights: { ...defaults.scoreWeights, ...raw.scoreWeights },
  };
}

/** Insert any seed foods missing by name so existing installs pick up library updates. */
export async function ensureSeedFoodLibrary(): Promise<number> {
  const now = new Date().toISOString();
  const existing = await db.foodLibrary.toArray();
  const names = new Set(existing.map((i) => i.name.toLowerCase()));
  const missing = SEED_FOOD_LIBRARY.filter((item) => !names.has(item.name.toLowerCase()));
  if (missing.length === 0) return 0;
  await db.foodLibrary.bulkAdd(
    missing.map((item) => ({
      id: newId('lib'),
      ...item,
      useCount: 0,
      updatedAt: now,
    })),
  );
  return missing.length;
}

/**
 * Keep one template per name (case-insensitive). Prefers higher useCount, then newer updatedAt.
 * Does not touch logged food entries — only collapses duplicate library templates.
 */
export async function dedupeFoodLibraryByName(): Promise<number> {
  const all = await db.foodLibrary.toArray();
  const byName = new Map<string, FoodLibraryItem[]>();
  for (const item of all) {
    const key = item.name.trim().toLowerCase();
    const list = byName.get(key) ?? [];
    list.push(item);
    byName.set(key, list);
  }
  const toDelete: string[] = [];
  for (const group of byName.values()) {
    if (group.length < 2) continue;
    group.sort((a, b) => {
      if (b.useCount !== a.useCount) return b.useCount - a.useCount;
      return (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '');
    });
    for (const loser of group.slice(1)) toDelete.push(loser.id);
  }
  if (toDelete.length === 0) return 0;
  await db.foodLibrary.bulkDelete(toDelete);
  return toDelete.length;
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

export async function updateFoodLibraryItem(
  id: string,
  patch: Partial<Omit<FoodLibraryItem, 'id' | 'useCount'>>,
): Promise<FoodLibraryItem> {
  const prev = await db.foodLibrary.get(id);
  if (!prev) throw new Error('Library item not found');
  const next: FoodLibraryItem = {
    ...prev,
    ...patch,
    id,
    useCount: prev.useCount,
    updatedAt: new Date().toISOString(),
  };
  await db.foodLibrary.put(next);
  return next;
}

export async function deleteFoodLibraryItem(id: string): Promise<void> {
  await db.foodLibrary.delete(id);
}

export async function duplicateFoodLibraryItem(id: string): Promise<FoodLibraryItem> {
  const prev = await db.foodLibrary.get(id);
  if (!prev) throw new Error('Library item not found');
  return saveFoodToLibrary({
    name: `${prev.name} (copy)`,
    defaultPortion: prev.defaultPortion,
    calories: prev.calories,
    proteinG: prev.proteinG,
    carbsG: prev.carbsG,
    fatG: prev.fatG,
    fibreG: prev.fibreG,
    confidence: prev.confidence,
    category: prev.category,
  });
}

/* ---------------- Steps (REPLACE TOTAL rule) ---------------- */

/**
 * Documented rule: setStepsForDate REPLACES the day's total.
 * It does not add to previous value. Pass the absolute total from the pedometer/watch.
 * Transactional: collapses any duplicate date rows so aggregates never sum steps.
 */
export async function setStepsForDate(
  date: string,
  totalSteps: number,
  note?: string,
): Promise<StepEntry> {
  const now = new Date().toISOString();
  return db.transaction('rw', db.steps, async () => {
    const existing = await db.steps.where('date').equals(date).toArray();
    if (existing.length > 0) {
      const keep = [...existing].sort((a, b) =>
        (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt),
      )[0]!;
      const drop = existing.filter((r) => r.id !== keep.id);
      if (drop.length) await db.steps.bulkDelete(drop.map((r) => r.id));
      const next: StepEntry = {
        ...keep,
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
  });
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
  const settings = await ensureInitialized();
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    settings,
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
    bodyMeasurements: await db.bodyMeasurements.toArray(),
    motivationItems: await db.motivationItems.toArray(),
    personalLetters: await db.personalLetters.toArray(),
    journalEntries: await db.journalEntries.toArray(),
    progressPhotos: await db.progressPhotos.toArray(),
    healthRecords: await db.healthRecords.toArray(),
    healthConnections: await db.healthConnections.toArray(),
  };
}

export type RestoreMode = 'merge_keep_newer' | 'replace';

export interface RestoreResult {
  mode: RestoreMode;
  keptLocalNewer: number;
  imported: number;
  unchanged: number;
}

/**
 * Merge backup into local DB without silently discarding newer local records.
 * Same id: keep whichever has the later updatedAt/createdAt.
 * Local-only ids are always preserved. Backup-only ids are added.
 */
async function mergeTableKeepNewer<T extends { id: string }>(
  table: { toArray: () => Promise<T[]>; clear: () => Promise<unknown>; bulkPut: (rows: T[]) => Promise<unknown> },
  backupRows: T[],
): Promise<{ keptLocalNewer: number; imported: number; unchanged: number }> {
  const local = await table.toArray();
  const { rows, keptLocalNewer, imported, unchanged } = mergeRowsKeepNewer(local, backupRows);
  await table.clear();
  if (rows.length) await table.bulkPut(rows);
  return { keptLocalNewer, imported, unchanged };
}

export async function restoreBackup(
  payload: unknown,
  options: { mode?: RestoreMode } = {},
): Promise<RestoreResult> {
  const mode: RestoreMode = options.mode ?? 'merge_keep_newer';
  const data = validateBackupPayload(payload);

  let keptLocalNewer = 0;
  let imported = 0;
  let unchanged = 0;

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
      db.bodyMeasurements,
      db.motivationItems,
      db.personalLetters,
      db.journalEntries,
      db.progressPhotos,
      db.healthRecords,
      db.healthConnections,
    ],
    async () => {
      if (mode === 'replace') {
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
          db.bodyMeasurements.clear(),
          db.motivationItems.clear(),
          db.personalLetters.clear(),
          db.journalEntries.clear(),
          db.progressPhotos.clear(),
          db.healthRecords.clear(),
          db.healthConnections.clear(),
        ]);
        await db.settings.put(migrateSettings(data.settings));
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
        if (data.bodyMeasurements?.length)
          await db.bodyMeasurements.bulkAdd(data.bodyMeasurements);
        if (data.motivationItems?.length)
          await db.motivationItems.bulkAdd(data.motivationItems);
        if (data.personalLetters?.length)
          await db.personalLetters.bulkAdd(data.personalLetters);
        if (data.journalEntries?.length)
          await db.journalEntries.bulkAdd(data.journalEntries);
        if (data.progressPhotos?.length)
          await db.progressPhotos.bulkAdd(data.progressPhotos);
        if (data.healthRecords?.length)
          await db.healthRecords.bulkAdd(data.healthRecords);
        if (data.healthConnections?.length)
          await db.healthConnections.bulkAdd(data.healthConnections);
        imported =
          data.weights.length +
          data.foods.length +
          data.foodLibrary.length +
          data.steps.length +
          data.water.length +
          data.workouts.length +
          data.sleep.length +
          data.cigarettes.length +
          data.notes.length +
          data.scores.length +
          data.xp.length +
          data.achievements.length +
          (data.bodyMeasurements?.length ?? 0) +
          (data.motivationItems?.length ?? 0) +
          (data.personalLetters?.length ?? 0) +
          (data.journalEntries?.length ?? 0) +
          (data.progressPhotos?.length ?? 0) +
          (data.healthRecords?.length ?? 0) +
          (data.healthConnections?.length ?? 0);
        return;
      }

      // merge_keep_newer (default)
      const localSettings = await db.settings.get('settings');
      // Same tie-break as mergeRowsKeepNewer: local wins when local timestamp >= backup.
      if (!localSettings || rowTimestamp(localSettings) < rowTimestamp(data.settings)) {
        await db.settings.put(migrateSettings(data.settings));
        imported += 1;
      } else {
        keptLocalNewer += 1;
      }

      const rWeights = await mergeTableKeepNewer(db.weights, data.weights);
      const rFoods = await mergeTableKeepNewer(db.foods, data.foods);
      const rLib = await mergeTableKeepNewer(db.foodLibrary, data.foodLibrary);
      const rSteps = await mergeTableKeepNewer(db.steps, data.steps);
      const rWater = await mergeTableKeepNewer(db.water, data.water);
      const rWork = await mergeTableKeepNewer(db.workouts, data.workouts);
      const rSleep = await mergeTableKeepNewer(db.sleep, data.sleep);
      const rCig = await mergeTableKeepNewer(db.cigarettes, data.cigarettes);
      const rNotes = await mergeTableKeepNewer(db.notes, data.notes);
      const rScores = await mergeTableKeepNewer(db.scores, data.scores);
      const rXp = await mergeTableKeepNewer(db.xp, data.xp);
      const rAch = await mergeTableKeepNewer(db.achievements, data.achievements);
      const rMeas = await mergeTableKeepNewer(
        db.bodyMeasurements,
        data.bodyMeasurements ?? [],
      );
      const rMot = await mergeTableKeepNewer(
        db.motivationItems,
        data.motivationItems ?? [],
      );
      const rLet = await mergeTableKeepNewer(
        db.personalLetters,
        data.personalLetters ?? [],
      );
      const rJour = await mergeTableKeepNewer(
        db.journalEntries,
        data.journalEntries ?? [],
      );
      const rPhoto = await mergeTableKeepNewer(
        db.progressPhotos,
        data.progressPhotos ?? [],
      );
      const rHealth = await mergeTableKeepNewer(
        db.healthRecords,
        data.healthRecords ?? [],
      );
      const rConn = await mergeTableKeepNewer(
        db.healthConnections,
        data.healthConnections ?? [],
      );
      for (const r of [
        rWeights,
        rFoods,
        rLib,
        rSteps,
        rWater,
        rWork,
        rSleep,
        rCig,
        rNotes,
        rScores,
        rXp,
        rAch,
        rMeas,
        rMot,
        rLet,
        rJour,
        rPhoto,
        rHealth,
        rConn,
      ]) {
        keptLocalNewer += r.keptLocalNewer;
        imported += r.imported;
        unchanged += r.unchanged;
      }
    },
  );
  initPromise = null;
  return { mode, keptLocalNewer, imported, unchanged };
}

/** Build day aggregates for an inclusive date range (for weekly review). */
export async function loadAggregatesInRange(
  start: string,
  end: string,
): Promise<DayAggregate[]> {
  const dates = eachISODate(start, end);
  const out: DayAggregate[] = [];
  for (const date of dates) {
    const bundle = await loadDayBundle(date);
    out.push(
      buildDayAggregate({
        date,
        settings: bundle.settings,
        weights: bundle.weights,
        foods: bundle.foods,
        steps: bundle.steps,
        water: bundle.water,
        workouts: bundle.workouts,
        sleep: bundle.sleep,
        cigarettes: bundle.cigarettes,
        notes: bundle.notes,
        score: bundle.score,
      }),
    );
  }
  return out;
}

export async function clearAllData(): Promise<void> {
  await db.delete();
  initPromise = null;
  // Recreate
  await ensureInitialized();
}

/* ─── Body measurements (append-only history; edits update row, never overwrite siblings) ─── */

export async function addBodyMeasurement(input: {
  type: BodyMeasurementType;
  valueCm: number;
  date: string;
  measuredAt?: string;
  note?: string;
  condition?: MeasurementCondition;
  customLabel?: string;
}): Promise<BodyMeasurement> {
  const now = new Date().toISOString();
  const row: BodyMeasurement = {
    id: newId('bm'),
    type: input.type,
    customLabel: input.customLabel,
    valueCm: input.valueCm,
    date: input.date,
    measuredAt: input.measuredAt ?? now,
    note: input.note,
    condition: input.condition ?? 'unspecified',
    createdAt: now,
    updatedAt: now,
  };
  await db.bodyMeasurements.add(row);
  if (input.type === 'height') {
    await updateSettings({ heightCm: input.valueCm });
  }
  return row;
}

export async function updateBodyMeasurement(
  id: string,
  patch: Partial<
    Pick<BodyMeasurement, 'valueCm' | 'date' | 'measuredAt' | 'note' | 'condition' | 'customLabel'>
  >,
): Promise<BodyMeasurement> {
  const existing = await db.bodyMeasurements.get(id);
  if (!existing) throw new Error('Measurement not found');
  const next: BodyMeasurement = {
    ...existing,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  await db.bodyMeasurements.put(next);
  if (next.type === 'height') {
    await updateSettings({ heightCm: next.valueCm });
  }
  return next;
}

export async function deleteBodyMeasurement(id: string): Promise<void> {
  await db.bodyMeasurements.delete(id);
}

export async function getAllBodyMeasurements(): Promise<BodyMeasurement[]> {
  return db.bodyMeasurements.orderBy('date').toArray();
}

export async function getBodyMeasurementsByType(
  type: BodyMeasurementType,
): Promise<BodyMeasurement[]> {
  return db.bodyMeasurements.where('type').equals(type).sortBy('date');
}

export async function getLatestMeasurement(
  type: BodyMeasurementType,
): Promise<BodyMeasurement | undefined> {
  const rows = await getBodyMeasurementsByType(type);
  return rows.at(-1);
}

/* ─── Motivation / letters / journal ─── */

export async function listMotivationItems(): Promise<MotivationItem[]> {
  return db.motivationItems.orderBy('createdAt').reverse().toArray();
}

export async function upsertMotivationItem(input: {
  id?: string;
  kind: MotivationKind;
  source?: 'user' | 'suggested';
  title: string;
  body: string;
  pinned?: boolean;
  hidden?: boolean;
  showOnDashboard?: boolean;
}): Promise<MotivationItem> {
  const now = new Date().toISOString();
  if (input.id) {
    const existing = await db.motivationItems.get(input.id);
    if (!existing) throw new Error('Motivation item not found');
    const next: MotivationItem = {
      ...existing,
      kind: input.kind,
      title: input.title,
      body: input.body,
      pinned: input.pinned ?? existing.pinned,
      hidden: input.hidden ?? existing.hidden,
      showOnDashboard: input.showOnDashboard ?? existing.showOnDashboard,
      updatedAt: now,
    };
    await db.motivationItems.put(next);
    return next;
  }
  const row: MotivationItem = {
    id: newId('mot'),
    kind: input.kind,
    source: input.source ?? 'user',
    title: input.title,
    body: input.body,
    pinned: input.pinned ?? false,
    hidden: input.hidden ?? false,
    showOnDashboard: input.showOnDashboard ?? false,
    createdAt: now,
    updatedAt: now,
  };
  await db.motivationItems.add(row);
  return row;
}

export async function deleteMotivationItem(id: string): Promise<void> {
  await db.motivationItems.delete(id);
}

export async function listPersonalLetters(): Promise<PersonalLetter[]> {
  return db.personalLetters.orderBy('openOn').toArray();
}

export async function upsertPersonalLetter(input: {
  id?: string;
  title: string;
  body: string;
  openOn: string;
  hidden?: boolean;
}): Promise<PersonalLetter> {
  const now = new Date().toISOString();
  if (input.id) {
    const existing = await db.personalLetters.get(input.id);
    if (!existing) throw new Error('Letter not found');
    const next: PersonalLetter = {
      ...existing,
      title: input.title,
      body: input.body,
      openOn: input.openOn,
      hidden: input.hidden ?? existing.hidden,
      updatedAt: now,
    };
    await db.personalLetters.put(next);
    return next;
  }
  const row: PersonalLetter = {
    id: newId('ltr'),
    title: input.title,
    body: input.body,
    openOn: input.openOn,
    openedAt: null,
    hidden: false,
    createdAt: now,
    updatedAt: now,
  };
  await db.personalLetters.add(row);
  return row;
}

export async function openPersonalLetter(id: string): Promise<PersonalLetter> {
  const existing = await db.personalLetters.get(id);
  if (!existing) throw new Error('Letter not found');
  const next: PersonalLetter = {
    ...existing,
    openedAt: existing.openedAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await db.personalLetters.put(next);
  return next;
}

export async function deletePersonalLetter(id: string): Promise<void> {
  await db.personalLetters.delete(id);
}

export async function listJournalEntries(): Promise<JournalEntry[]> {
  return db.journalEntries.orderBy('date').reverse().toArray();
}

export async function upsertJournalEntry(input: {
  id?: string;
  date: string;
  body: string;
  prompt?: string;
  fromVoice?: boolean;
  hidden?: boolean;
}): Promise<JournalEntry> {
  const now = new Date().toISOString();
  if (input.id) {
    const existing = await db.journalEntries.get(input.id);
    if (!existing) throw new Error('Journal entry not found');
    const next: JournalEntry = {
      ...existing,
      date: input.date,
      body: input.body,
      prompt: input.prompt ?? existing.prompt,
      fromVoice: input.fromVoice ?? existing.fromVoice,
      hidden: input.hidden ?? existing.hidden,
      updatedAt: now,
    };
    await db.journalEntries.put(next);
    return next;
  }
  const row: JournalEntry = {
    id: newId('jou'),
    date: input.date,
    body: input.body,
    prompt: input.prompt,
    fromVoice: input.fromVoice ?? false,
    hidden: false,
    createdAt: now,
    updatedAt: now,
  };
  await db.journalEntries.add(row);
  return row;
}

export async function deleteJournalEntry(id: string): Promise<void> {
  await db.journalEntries.delete(id);
}

/* ─── Progress photos (local data URLs only) ─── */

export async function listProgressPhotos(): Promise<ProgressPhoto[]> {
  return db.progressPhotos.orderBy('date').reverse().toArray();
}

export async function addProgressPhoto(input: {
  date: string;
  pose: PhotoPose;
  dataUrl: string;
  mimeType: string;
  note?: string;
  consentExternalAnalysis?: boolean;
}): Promise<ProgressPhoto> {
  if (!input.dataUrl.startsWith('data:')) {
    throw new Error('Photos must stay local (data URL only)');
  }
  const now = new Date().toISOString();
  const row: ProgressPhoto = {
    id: newId('pho'),
    date: input.date,
    pose: input.pose,
    note: input.note,
    dataUrl: input.dataUrl,
    mimeType: input.mimeType,
    consentExternalAnalysis: input.consentExternalAnalysis ?? false,
    createdAt: now,
    updatedAt: now,
  };
  await db.progressPhotos.add(row);
  return row;
}

export async function updateProgressPhotoConsent(
  id: string,
  consentExternalAnalysis: boolean,
): Promise<ProgressPhoto> {
  const existing = await db.progressPhotos.get(id);
  if (!existing) throw new Error('Photo not found');
  const next: ProgressPhoto = {
    ...existing,
    consentExternalAnalysis,
    updatedAt: new Date().toISOString(),
  };
  await db.progressPhotos.put(next);
  return next;
}

export async function deleteProgressPhoto(id: string): Promise<void> {
  await db.progressPhotos.delete(id);
}

/* ─── Health intelligence (canonical records + connection diagnostics) ─── */

export async function listHealthRecords(): Promise<
  import('../health/types').HealthMetricRecord[]
> {
  return db.healthRecords.toArray();
}

export async function refreshHealthConnectionDiagnostics(): Promise<
  import('../health/types').HealthConnectionState[]
> {
  const { diagnoseAllConnections, mergeConnectionDiagnostics } = await import(
    '../health/adapters'
  );
  const existing = await db.healthConnections.toArray();
  const states = mergeConnectionDiagnostics(diagnoseAllConnections(), existing);
  await db.healthConnections.bulkPut(states);
  return states;
}

export async function listHealthConnections(): Promise<
  import('../health/types').HealthConnectionState[]
> {
  const existing = await db.healthConnections.toArray();
  if (existing.length === 0) return refreshHealthConnectionDiagnostics();
  return existing;
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
