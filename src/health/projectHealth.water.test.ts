import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../data/db';
import { addWater, applyHealthWaterIfAllowed, getWaterByDate } from '../data/repository';

describe('applyHealthWaterIfAllowed', () => {
  beforeEach(async () => {
    await db.water.clear();
  });

  it('seeds then replaces the synced water row; never touches manual', async () => {
    expect(await applyHealthWaterIfAllowed('2026-11-03', 500, 'apple_health')).toBe('applied');
    expect(await applyHealthWaterIfAllowed('2026-11-03', 1200, 'apple_health')).toBe('applied');
    const synced = await getWaterByDate('2026-11-03');
    expect(synced).toHaveLength(1);
    expect(synced[0]!.amountMl).toBe(1200);
    expect(synced[0]!.source).toBe('apple_health');

    await addWater('2026-11-04', 250, 'manual');
    expect(await applyHealthWaterIfAllowed('2026-11-04', 900, 'apple_health')).toBe(
      'skipped_manual',
    );
    const manualDay = await getWaterByDate('2026-11-04');
    expect(manualDay).toHaveLength(1);
    expect(manualDay[0]!.amountMl).toBe(250);
  });
});
