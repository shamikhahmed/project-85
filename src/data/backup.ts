import type { AppSettings, BackupPayload } from '../domain/types';

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
    weights: data.weights ?? [],
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
  };
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

export function backupToCsv(payload: BackupPayload): string {
  const lines = ['type,date,detail,value'];
  for (const w of payload.weights) {
    lines.push(`weight,${w.date},"${w.notes ?? ''}",${w.weightKg}`);
  }
  for (const s of payload.steps) {
    lines.push(`steps,${s.date},total,${s.totalSteps}`);
  }
  for (const f of payload.foods) {
    lines.push(
      `food,${f.date},"${f.name.replace(/"/g, '""')}",${f.calories}|${f.proteinG}`,
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
  return lines.join('\n');
}
