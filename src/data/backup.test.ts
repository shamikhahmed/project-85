import { describe, expect, it } from 'vitest';
import { createDefaultSettings } from '../domain/defaults';
import type { BackupPayload, DayScoreBreakdown } from '../domain/types';
import { backupToCsv, mergeRowsKeepNewer, validateBackupPayload } from './backup';
import { restoreBackup } from './repository';

const ISO = '2026-10-27T12:00:00.000Z';

const emptyBreakdown: DayScoreBreakdown = {
  steps: 'not_entered',
  nutritionLogging: 'not_entered',
  calories: 'not_entered',
  protein: 'not_entered',
  hydration: 'not_entered',
  training: 'not_entered',
  sleep: 'not_entered',
  smoking: 'not_applicable',
  reflection: 'not_entered',
};

function backupPayloadFixture(
  over: Partial<BackupPayload> = {},
): BackupPayload {
  return {
    version: 1,
    exportedAt: ISO,
    settings: createDefaultSettings(ISO),
    weights: [
      {
        id: 'w1',
        date: '2026-10-27',
        weightKg: 96.5,
        notes: 'morning',
        isEstimate: false,
        isPrimaryMorning: true,
        createdAt: ISO,
        updatedAt: ISO,
      },
    ],
    foods: [
      {
        id: 'f1',
        date: '2026-10-27',
        category: 'lunch',
        name: 'Chicken "tikka"',
        calories: 350,
        proteinG: 35,
        carbsG: 8,
        fatG: 18,
        confidence: 'estimated',
        createdAt: ISO,
        updatedAt: ISO,
      },
    ],
    foodLibrary: [],
    steps: [
      {
        id: 's1',
        date: '2026-10-27',
        totalSteps: 8500,
        source: 'manual',
        createdAt: ISO,
        updatedAt: ISO,
      },
    ],
    water: [
      {
        id: 'wa1',
        date: '2026-10-27',
        amountMl: 500,
        createdAt: ISO,
      },
    ],
    workouts: [],
    sleep: [],
    cigarettes: [
      {
        id: 'c1',
        date: '2026-10-27',
        count: 0,
        substance: 'tobacco',
        createdAt: ISO,
      },
    ],
    notes: [],
    scores: [
      {
        id: 'sc1',
        date: '2026-10-27',
        total: 72,
        breakdown: emptyBreakdown,
        points: {
          steps: 10,
          nutritionLogging: 12,
          calories: 8,
          protein: 10,
          hydration: 8,
          training: 0,
          sleep: 0,
          smoking: 8,
          reflection: 0,
        },
        status: 'NEEDS_ATTENTION',
        xpEarned: 15,
        consequenceIds: [],
        computedAt: ISO,
      },
    ],
    xp: [],
    achievements: [],
    ...over,
  };
}

describe('backupToCsv', () => {
  it('emits header and one row per exportable record', () => {
    const csv = backupToCsv(backupPayloadFixture());
    const lines = csv.split('\n');

    expect(lines[0]).toBe('type,date,detail,value');
    expect(lines).toContain('weight,2026-10-27,"morning",96.5');
    expect(lines).toContain('steps,2026-10-27,total,8500');
    expect(lines).toContain('food,2026-10-27,"Chicken ""tikka""",350|35');
    expect(lines).toContain('water,2026-10-27,ml,500');
    expect(lines).toContain('cigarette,2026-10-27,tobacco,0');
    expect(lines).toContain('score,2026-10-27,NEEDS_ATTENTION,72');
    expect(lines).toHaveLength(7);
  });

  it('escapes empty weight notes', () => {
    const csv = backupToCsv(
      backupPayloadFixture({
        weights: [
          {
            id: 'w2',
            date: '2026-10-28',
            weightKg: 96.2,
            isEstimate: false,
            isPrimaryMorning: true,
            createdAt: ISO,
            updatedAt: ISO,
          },
        ],
        foods: [],
        steps: [],
        water: [],
        cigarettes: [],
        scores: [],
      }),
    );
    expect(csv).toBe('type,date,detail,value\nweight,2026-10-28,"",96.2');
  });
});

describe('validateBackupPayload', () => {
  it('accepts a well-formed backup', () => {
    const fixture = backupPayloadFixture();
    const validated = validateBackupPayload(fixture);
    expect(validated.version).toBe(1);
    expect(validated.settings.startingWeightKg).toBe(96.5);
    expect(validated.weights).toHaveLength(1);
  });

  it('rejects non-objects', () => {
    expect(() => validateBackupPayload(null)).toThrow('Invalid backup: not an object');
    expect(() => validateBackupPayload(undefined)).toThrow('Invalid backup: not an object');
    expect(() => validateBackupPayload('{}')).toThrow('Invalid backup: not an object');
    expect(() => validateBackupPayload([])).toThrow('Invalid backup: not an object');
  });

  it('rejects wrong version or missing settings', () => {
    expect(() => validateBackupPayload({})).toThrow('Invalid or unsupported backup file');
    expect(() => validateBackupPayload({ version: 2, settings: { id: 'settings' } })).toThrow(
      'Invalid or unsupported backup file',
    );
    expect(() =>
      validateBackupPayload({ version: 1, settings: { id: 'wrong' } }),
    ).toThrow('Invalid or unsupported backup file');
  });

  it('rejects corrupted array fields', () => {
    const base = backupPayloadFixture();
    expect(() =>
      validateBackupPayload({ ...base, weights: 'not-an-array' }),
    ).toThrow('Invalid backup: corrupted data');
  });
});

describe('restoreBackup', () => {
  it('rejects invalid payloads before touching the database', async () => {
    await expect(restoreBackup(null)).rejects.toThrow('Invalid backup: not an object');
    await expect(restoreBackup({ version: 1 })).rejects.toThrow(
      'Invalid or unsupported backup file',
    );
  });

});

describe('mergeRowsKeepNewer', () => {
  it('keeps newer local row instead of silently overwriting', () => {
    const local = [
      { id: 'w1', weightKg: 95, updatedAt: '2026-10-28T10:00:00.000Z' },
      { id: 'w2', weightKg: 94, updatedAt: '2026-10-27T10:00:00.000Z' },
    ];
    const backup = [
      { id: 'w1', weightKg: 96.5, updatedAt: '2026-10-27T12:00:00.000Z' },
      { id: 'w3', weightKg: 97, updatedAt: '2026-10-26T12:00:00.000Z' },
    ];
    const result = mergeRowsKeepNewer(local, backup);
    const byId = Object.fromEntries(result.rows.map((r) => [r.id, r]));
    expect(byId.w1.weightKg).toBe(95);
    expect(byId.w2.weightKg).toBe(94);
    expect(byId.w3.weightKg).toBe(97);
    expect(result.keptLocalNewer).toBe(1);
    expect(result.imported).toBe(1);
    expect(result.unchanged).toBe(1);
  });
});
