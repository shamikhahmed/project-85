import { Capacitor } from '@capacitor/core';
import { WidgetBridgePlugin } from 'capacitor-widget-bridge';
import * as repo from '../data/repository';
import { toLocalISODate } from '../lib/dates';
import { useAppStore } from '../store/useAppStore';
import { buildWidgetSnapshot } from './buildWidgetSnapshot';
import { WIDGET_APP_GROUP, WIDGET_SNAPSHOT_KEY } from './widgetSnapshot';

let syncing = false;

/**
 * Push a validated snapshot into the App Group for WidgetKit.
 * No-op on web/PWA — widgets are native-only.
 */
export async function syncWidgetSnapshot(): Promise<{ ok: boolean; reason?: string }> {
  if (!Capacitor.isNativePlatform()) {
    return { ok: false, reason: 'Widgets require the native iOS app (not Safari PWA).' };
  }
  if (Capacitor.getPlatform() !== 'ios') {
    return { ok: false, reason: 'iOS widgets only in this release.' };
  }
  if (syncing) return { ok: false, reason: 'Sync already in progress.' };
  syncing = true;
  try {
    const state = useAppStore.getState();
    if (!state.settings || !state.todayAgg) {
      return { ok: false, reason: 'App data not ready.' };
    }
    const all = await repo.getAllWeights();
    const weightSeries = all
      .filter((w) => w.isPrimaryMorning)
      .map((w) => ({ date: w.date, weightKg: w.weightKg }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const snapshot = buildWidgetSnapshot({
      settings: state.settings,
      agg: state.todayAgg,
      score: state.todayScore,
      latestWeightKg: state.latestWeightKg,
      weightSeries,
      today: toLocalISODate(),
    });

    await WidgetBridgePlugin.setItem({
      key: WIDGET_SNAPSHOT_KEY,
      group: WIDGET_APP_GROUP,
      value: JSON.stringify(snapshot),
    });
    await WidgetBridgePlugin.reloadAllTimelines();
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Widget sync failed';
    console.warn('[widgets]', msg);
    return { ok: false, reason: msg };
  } finally {
    syncing = false;
  }
}

/** Safe fire-and-forget after logging / day refresh. */
export function scheduleWidgetSnapshotSync(): void {
  if (!Capacitor.isNativePlatform()) return;
  void syncWidgetSnapshot();
}
