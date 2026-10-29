import { describe, expect, it, vi } from 'vitest';

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => true,
    getPlatform: () => 'ios',
  },
}));

describe('maybeRunAutoHealthSync on throw', () => {
  it('does not set lastAutoSyncAt when runFullHealthSync throws', async () => {
    const updateSettings = vi.fn();
    vi.doMock('../data/repository', () => ({
      getSettings: async () => ({
        autoSyncHealth: true,
        lastAutoSyncAt: null,
      }),
      listHealthConnections: async () => [],
      updateSettings,
    }));
    vi.doMock('./syncEngine', () => ({
      runFullHealthSync: async () => {
        throw new Error('HealthKit unavailable');
      },
    }));

    const { maybeRunAutoHealthSync } = await import('./autoSync');
    await expect(maybeRunAutoHealthSync({ force: true })).rejects.toThrow(/HealthKit unavailable/);
    expect(updateSettings).not.toHaveBeenCalled();
  });
});
