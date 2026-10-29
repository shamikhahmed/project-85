import { beforeEach, describe, expect, it, vi } from 'vitest';

const pullSpy = vi.fn(async () => []);
const hasPerm = vi.fn(async () => false);

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => true,
    getPlatform: () => 'ios',
  },
}));

vi.mock('../native/healthKitBridge', () => ({
  checkNativeHealthAvailability: async () => ({
    available: true,
    platform: 'ios',
    pluginPresent: true,
    reason: 'ok',
  }),
  hasHealthReadPermission: () => hasPerm(),
  pullCommonHealthMetrics: (...args: Parameters<typeof pullSpy>) => pullSpy(...args),
}));

vi.mock('./adapters', async () => {
  const actual = await vi.importActual<typeof import('./adapters')>('./adapters');
  return {
    ...actual,
    diagnoseAllConnections: () => [
      {
        id: 'conn_apple_health',
        provider: 'apple_health',
        displayName: 'Apple Health',
        status: 'permission_needed',
        lastSuccessAt: null,
        lastAttemptAt: null,
        lastError: null,
        scopesGranted: [],
        notes: '',
        updatedAt: new Date().toISOString(),
      },
    ],
  };
});

describe('runFullHealthSync permission gate', () => {
  beforeEach(() => {
    pullSpy.mockClear();
    hasPerm.mockResolvedValue(false);
    vi.resetModules();
  });

  it('returns permission_needed and makes no read calls when never granted', async () => {
    // Avoid Dexie: stub syncManual + db paths by testing syncAppleHealthIfAvailable via dynamic import
    // after mocking db lightly.
    vi.doMock('../data/db', () => {
      const connections: unknown[] = [];
      return {
        db: {
          transaction: async (_m: string, _t: unknown, fn: () => Promise<void>) => fn(),
          healthRecords: {
            toArray: async () => [],
            clear: async () => undefined,
            bulkPut: async () => undefined,
          },
          healthConnections: {
            toArray: async () => connections,
            bulkPut: async (rows: unknown[]) => {
              connections.splice(0, connections.length, ...rows);
            },
          },
          weights: { toArray: async () => [] },
          steps: { toArray: async () => [] },
          sleep: { toArray: async () => [] },
          water: { toArray: async () => [] },
        },
        newId: (p: string) => `${p}_1`,
      };
    });

    const { syncAppleHealthIfAvailable } = await import('./syncEngine');
    const result = await syncAppleHealthIfAvailable();
    expect(result.status).toBe('permission_needed');
    expect(result.imported).toBe(0);
    expect(pullSpy).not.toHaveBeenCalled();
  });
});
