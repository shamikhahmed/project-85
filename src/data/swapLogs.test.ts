import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import { getExerciseSwapLogs } from './repository';
import type { ExerciseSwapLog } from '../domain/types';

const log = (id: string, createdAt: string): ExerciseSwapLog => ({
  id,
  date: '2026-11-10',
  dayKey: 'mon',
  code: 'A1',
  planName: 'Bench press',
  swappedName: 'Push-up',
  reason: 'busy',
  createdAt,
});

describe('exercise swap logs', () => {
  beforeEach(async () => {
    db.close();
    await Dexie.delete('project85');
    await db.open();
  });

  it('reads back newest first (createdAt is not an index)', async () => {
    await db.exerciseSwaps.bulkAdd([log('a', '2026-11-09T08:00:00.000Z'), log('b', '2026-11-10T08:00:00.000Z'), log('c', '2026-11-08T08:00:00.000Z')]);
    expect((await getExerciseSwapLogs()).map((s) => s.id)).toEqual(['b', 'a', 'c']);
  });
});
