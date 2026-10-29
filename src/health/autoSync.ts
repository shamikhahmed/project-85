/**
 * Native-only auto health sync — launch + resume, 15-minute throttle.
 * Reuses syncEngine single-flight; never fakes connected in the PWA.
 */

import { Capacitor } from '@capacitor/core';
import * as repo from '../data/repository';
import { runFullHealthSync } from './syncEngine';

export const AUTO_SYNC_THROTTLE_MS = 15 * 60 * 1000;
export const AUTO_SYNC_OVERLAP_DAYS = 2;
export const AUTO_SYNC_FIRST_WINDOW_DAYS = 30;

export function isNativeHealthShell(): boolean {
  return Capacitor.isNativePlatform();
}

export function shouldAutoSyncNow(opts: {
  autoSyncEnabled: boolean;
  lastAutoSyncAt: string | null | undefined;
  nowMs?: number;
  throttleMs?: number;
}): boolean {
  if (!opts.autoSyncEnabled) return false;
  if (!isNativeHealthShell()) return false;
  const now = opts.nowMs ?? Date.now();
  const throttle = opts.throttleMs ?? AUTO_SYNC_THROTTLE_MS;
  if (!opts.lastAutoSyncAt) return true;
  const last = Date.parse(opts.lastAutoSyncAt);
  if (!Number.isFinite(last)) return true;
  return now - last >= throttle;
}

/** Pull window: first run 30d; else since last success − 2d overlap. */
export function autoSyncWindow(opts: {
  lastSuccessAt: string | null | undefined;
  nowMs?: number;
}): { from: string; to: string; days: number } {
  const now = opts.nowMs ?? Date.now();
  const to = new Date(now).toISOString();
  if (!opts.lastSuccessAt) {
    const fromMs = now - AUTO_SYNC_FIRST_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    return { from: new Date(fromMs).toISOString(), to, days: AUTO_SYNC_FIRST_WINDOW_DAYS };
  }
  const last = Date.parse(opts.lastSuccessAt);
  const fromMs = (Number.isFinite(last) ? last : now) - AUTO_SYNC_OVERLAP_DAYS * 24 * 60 * 60 * 1000;
  const days = Math.max(
    AUTO_SYNC_OVERLAP_DAYS,
    Math.ceil((now - fromMs) / (24 * 60 * 60 * 1000)),
  );
  return { from: new Date(fromMs).toISOString(), to, days };
}

export type AutoSyncResult =
  | { ran: false; reason: string }
  | { ran: true; manualMirrored: number; apple: { imported: number; status: string } };

/**
 * Throttled auto sync. Persists lastAutoSyncAt only when a run is attempted
 * (success or empty) so failures inside the engine keep prior connection status.
 */
export async function maybeRunAutoHealthSync(opts?: {
  force?: boolean;
  nowMs?: number;
}): Promise<AutoSyncResult> {
  if (!isNativeHealthShell()) {
    return { ran: false, reason: 'Auto-sync needs the installed iPhone/Android app' };
  }
  const settings = await repo.getSettings();
  const enabled = settings.autoSyncHealth !== false;
  if (
    !opts?.force &&
    !shouldAutoSyncNow({
      autoSyncEnabled: enabled,
      lastAutoSyncAt: settings.lastAutoSyncAt,
      nowMs: opts?.nowMs,
    })
  ) {
    return { ran: false, reason: 'Throttled (already synced within 15 minutes)' };
  }
  if (!enabled && !opts?.force) {
    return { ran: false, reason: 'Auto-sync off in Settings' };
  }

  const connections = await repo.listHealthConnections();
  const apple = connections.find((c) => c.provider === 'apple_health');
  const window = autoSyncWindow({
    lastSuccessAt: apple?.lastSuccessAt,
    nowMs: opts?.nowMs,
  });

  const result = await runFullHealthSync({ from: window.from, to: window.to });
  await repo.updateSettings({ lastAutoSyncAt: new Date(opts?.nowMs ?? Date.now()).toISOString() });
  return { ran: true, ...result };
}
