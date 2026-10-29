import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { beforeEach, describe, expect, it } from 'vitest';
import { Project85DB } from './db';

describe('Dexie v5 schema', () => {
  beforeEach(async () => {
    await Dexie.delete('project85');
  });

  it('opens with labPanels, dailyScores, and journalTags tables', async () => {
    const database = new Project85DB();
    await database.open();
    expect(database.verno).toBe(5);
    expect(database.tables.some((t) => t.name === 'labPanels')).toBe(true);
    expect(database.tables.some((t) => t.name === 'dailyScores')).toBe(true);
    expect(database.tables.some((t) => t.name === 'journalTags')).toBe(true);
    await database.close();
  });
});
