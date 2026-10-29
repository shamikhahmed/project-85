import type {
  AppSettings,
  BackupPayload,
  ProgressPhoto,
  WeightEntry,
} from '../domain/types';

const BACKUP_ARRAY_KEYS = [
  'weights',
  'foods',
  'foodLibrary',
  'steps',
  'water',
  'workouts',
  'sleep',
  'cigarettes',
  'notes',
  'scores',
  'xp',
  'achievements',
  'bodyMeasurements',
  'motivationItems',
  'personalLetters',
  'journalEntries',
  'progressPhotos',
  'healthRecords',
  'healthConnections',
  'exerciseSwaps',
  'labPanels',
  'dailyScores',
  'journalTags',
] as const satisfies ReadonlyArray<keyof BackupPayload>;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidSettings(value: unknown): value is AppSettings {
  if (!isPlainObject(value)) return false;
  return value.id === 'settings';
}

/**
 * Validates a parsed JSON backup before restore. Pure — safe to run in Node/Vitest.
 */
export function validateBackupPayload(payload: unknown): BackupPayload {
  if (!isPlainObject(payload)) {
    throw new Error('Invalid backup: not an object');
  }

  if (payload.version !== 1 || !isValidSettings(payload.settings)) {
    throw new Error('Invalid or unsupported backup file');
  }

  for (const key of BACKUP_ARRAY_KEYS) {
    const value = payload[key];
    if (value !== undefined && !Array.isArray(value)) {
      throw new Error('Invalid backup: corrupted data');
    }
  }

  const data = payload as unknown as BackupPayload;
  return {
    version: 1,
    exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : '',
    settings: data.settings,
    weights: sanitizePrimaryWeights(data.weights ?? []),
    foods: data.foods ?? [],
    foodLibrary: data.foodLibrary ?? [],
    steps: data.steps ?? [],
    water: data.water ?? [],
    workouts: data.workouts ?? [],
    sleep: data.sleep ?? [],
    cigarettes: data.cigarettes ?? [],
    notes: data.notes ?? [],
    scores: data.scores ?? [],
    xp: data.xp ?? [],
    achievements: data.achievements ?? [],
    bodyMeasurements: data.bodyMeasurements ?? [],
    motivationItems: data.motivationItems ?? [],
    personalLetters: data.personalLetters ?? [],
    journalEntries: data.journalEntries ?? [],
    progressPhotos: sanitizeProgressPhotos(data.progressPhotos ?? []),
    healthRecords: data.healthRecords ?? [],
    healthConnections: data.healthConnections ?? [],
    exerciseSwaps: data.exerciseSwaps ?? [],
    labPanels: data.labPanels ?? [],
    dailyScores: data.dailyScores ?? [],
    journalTags: data.journalTags ?? [],
  };
}

/** Reject non–data-URL photos so restore cannot inject remote or script URLs. */
export function sanitizeProgressPhotos(photos: ProgressPhoto[]): ProgressPhoto[] {
  return photos.filter(
    (p) =>
      typeof p?.dataUrl === 'string' &&
      p.dataUrl.startsWith('data:image/') &&
      typeof p.id === 'string' &&
      typeof p.date === 'string',
  );
}

/**
 * At most one primary morning weight per calendar date (newest updatedAt wins).
 * Corrections stay; extras are demoted so restore cannot invent dual primaries.
 */
export function sanitizePrimaryWeights(weights: WeightEntry[]): WeightEntry[] {
  const byDate = new Map<string, WeightEntry[]>();
  for (const w of weights) {
    if (!w || typeof w.id !== 'string' || typeof w.date !== 'string') continue;
    const list = byDate.get(w.date) ?? [];
    list.push(w);
    byDate.set(w.date, list);
  }
  const out: WeightEntry[] = [];
  for (const list of byDate.values()) {
    const primaries = list
      .filter((w) => w.isPrimaryMorning)
      .sort((a, b) =>
        (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt),
      );
    const keepPrimaryId = primaries[0]?.id;
    for (const w of list) {
      if (!w.isPrimaryMorning) {
        out.push(w);
        continue;
      }
      out.push(
        w.id === keepPrimaryId ? w : { ...w, isPrimaryMorning: false },
      );
    }
  }
  return out;
}

export type TimedRow = {
  id: string;
  updatedAt?: string;
  createdAt?: string;
  unlockedAt?: string;
};

export function rowTimestamp(row: TimedRow): string {
  return row.updatedAt ?? row.createdAt ?? row.unlockedAt ?? '';
}

/**
 * Pure merge: same id keeps the newer timestamp; local-only preserved; backup-only imported.
 */
export function mergeRowsKeepNewer<T extends TimedRow>(
  localRows: T[],
  backupRows: T[],
): { rows: T[]; keptLocalNewer: number; imported: number; unchanged: number } {
  const localMap = new Map(localRows.map((r) => [r.id, r]));
  const backupMap = new Map(backupRows.map((r) => [r.id, r]));
  const merged = new Map<string, T>();
  let keptLocalNewer = 0;
  let imported = 0;
  let unchanged = 0;

  for (const [id, loc] of localMap) {
    const bak = backupMap.get(id);
    if (!bak) {
      merged.set(id, loc);
      unchanged += 1;
      continue;
    }
    if (rowTimestamp(loc) >= rowTimestamp(bak)) {
      merged.set(id, loc);
      keptLocalNewer += 1;
    } else {
      merged.set(id, bak);
      imported += 1;
    }
  }
  for (const [id, bak] of backupMap) {
    if (!merged.has(id)) {
      merged.set(id, bak);
      imported += 1;
    }
  }

  return {
    rows: [...merged.values()],
    keptLocalNewer,
    imported,
    unchanged,
  };
}

/**
 * RFC-4180-ish quoted field. Flattens CR/LF so one logical row stays one line
 * (our exporter is line-oriented). Escapes embedded quotes by doubling.
 */
export function csvQuoted(value: string): string {
  const flat = String(value).replace(/[\r\n]+/g, ' ').replace(/"/g, '""');
  return `"${flat}"`;
}

export function backupToCsv(payload: BackupPayload): string {
  const lines = ['type,date,detail,value'];
  for (const w of payload.weights) {
    lines.push(`weight,${w.date},${csvQuoted(w.notes ?? '')},${w.weightKg}`);
  }
  for (const s of payload.steps) {
    lines.push(`steps,${s.date},total,${s.totalSteps}`);
  }
  for (const f of payload.foods) {
    lines.push(
      `food,${f.date},${csvQuoted(f.name)},${f.calories}|${f.proteinG}`,
    );
  }
  for (const w of payload.water) {
    lines.push(`water,${w.date},ml,${w.amountMl}`);
  }
  for (const c of payload.cigarettes) {
    lines.push(`cigarette,${c.date},${c.substance},${c.count}`);
  }
  for (const sc of payload.scores) {
    lines.push(`score,${sc.date},${sc.status},${sc.total}`);
  }
  for (const m of payload.bodyMeasurements ?? []) {
    lines.push(`measurement,${m.date},${m.type},${m.valueCm}`);
  }
  return lines.join('\n');
}
