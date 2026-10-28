import type { HealthMetricRecord } from './types';

/**
 * Deduplication / conflict rules:
 * 1. Same sourceRecordId + provider → keep newer updatedAt (correction).
 * 2. Same metricId + overlapping time window from different providers → keep both
 *    originals; for *day totals* (steps, active_energy) prefer a single priority chain
 *    when computing aggregates — never sum them.
 * 3. Calculated/estimated never overwrite imported/manual originals.
 */

export const PROVIDER_PRIORITY_FOR_DAY_TOTALS: HealthMetricRecord['provider'][] = [
  'manual',
  'apple_health',
  'zepp_via_apple',
  'google_health',
  'unknown',
  'project85_estimate',
];

export function sameSourceKey(a: HealthMetricRecord, b: HealthMetricRecord): boolean {
  if (!a.sourceRecordId || !b.sourceRecordId) return false;
  return a.provider === b.provider && a.sourceRecordId === b.sourceRecordId;
}

/** Merge incoming into existing set without summing day totals. */
export function mergeHealthRecords(
  existing: HealthMetricRecord[],
  incoming: HealthMetricRecord[],
): HealthMetricRecord[] {
  const byId = new Map(existing.map((r) => [r.id, r]));
  const bySource = new Map<string, HealthMetricRecord>();
  for (const r of existing) {
    if (r.sourceRecordId) bySource.set(`${r.provider}:${r.sourceRecordId}`, r);
  }

  for (const row of incoming) {
    if (row.kind === 'calculated' || row.kind === 'estimated') {
      // Only insert calculated rows that don't collide with an imported original id
      if (!byId.has(row.id)) byId.set(row.id, row);
      continue;
    }
    if (row.sourceRecordId) {
      const key = `${row.provider}:${row.sourceRecordId}`;
      const prev = bySource.get(key);
      if (prev) {
        if (row.updatedAt >= prev.updatedAt) {
          byId.delete(prev.id);
          byId.set(row.id, row);
          bySource.set(key, row);
        }
        continue;
      }
      bySource.set(key, row);
    }
    byId.set(row.id, row);
  }

  return [...byId.values()].filter((r) => !r.deletedAt);
}

/** Metrics where same-provider interval samples should be summed for a calendar day. */
const CUMULATIVE_DAY_METRICS = new Set(['steps', 'active_energy', 'hydration', 'distance']);

/**
 * Heuristic: full-day aggregate (do not sum with interval samples).
 * Matches PROJECT 85 manual mirrors (T00:00–T23:59) and long single windows (≥20h).
 */
export function isLikelyDayTotal(r: HealthMetricRecord, dayIso: string): boolean {
  const startDay = r.startAt.slice(0, 10);
  const endDay = (r.endAt ?? r.startAt).slice(0, 10);
  if (startDay !== dayIso || endDay !== dayIso) return false;
  if (r.startAt.includes('T00:00:00') && (r.endAt?.includes('T23:59:') ?? false)) {
    return true;
  }
  const startMs = Date.parse(r.startAt);
  const endMs = Date.parse(r.endAt ?? r.startAt);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return false;
  return endMs - startMs >= 20 * 60 * 60 * 1000;
}

/** Pick one day-total for a metric without summing across providers. */
export function pickDayTotal(
  rows: HealthMetricRecord[],
  metricId: string,
  dayIso: string,
): HealthMetricRecord | null {
  const dayRows = rows.filter(
    (r) =>
      r.metricId === metricId &&
      !r.deletedAt &&
      r.startAt.slice(0, 10) <= dayIso &&
      (r.endAt ?? r.startAt).slice(0, 10) >= dayIso,
  );
  if (dayRows.length === 0) return null;

  const cumulative = CUMULATIVE_DAY_METRICS.has(metricId);

  for (const p of PROVIDER_PRIORITY_FOR_DAY_TOTALS) {
    const providerRows = dayRows.filter((r) => r.provider === p);
    if (providerRows.length === 0) continue;
    if (!cumulative) {
      return providerRows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ?? null;
    }
    const dayTotals = providerRows.filter((r) => isLikelyDayTotal(r, dayIso));
    if (dayTotals.length > 0) {
      return dayTotals.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ?? null;
    }
    const sum = providerRows.reduce((acc, r) => acc + r.value, 0);
    const newest = providerRows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]!;
    return { ...newest, value: sum, originalValue: sum };
  }
  return dayRows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ?? null;
}
