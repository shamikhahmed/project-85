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

/** Pick one day-total for a metric without summing providers. */
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
  for (const p of PROVIDER_PRIORITY_FOR_DAY_TOTALS) {
    const hit = dayRows
      .filter((r) => r.provider === p)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
    if (hit) return hit;
  }
  return dayRows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ?? null;
}
