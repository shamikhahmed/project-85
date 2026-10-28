import type { BodyMeasurement, BodyMeasurementType, ISODate } from '../domain/types';
import { absChange, pctChange } from './measurementUnits';

export interface MeasurementSnapshot {
  type: BodyMeasurementType;
  valueCm: number;
  date: ISODate;
  measuredAt: string;
  id: string;
}

/** Latest value per type on or before date (inclusive). */
export function latestByTypeOnOrBefore(
  rows: BodyMeasurement[],
  asOf: ISODate,
): Map<BodyMeasurementType, MeasurementSnapshot> {
  const map = new Map<BodyMeasurementType, MeasurementSnapshot>();
  const sorted = [...rows]
    .filter((r) => r.date <= asOf)
    .sort((a, b) => {
      const d = a.date.localeCompare(b.date);
      if (d !== 0) return d;
      return a.measuredAt.localeCompare(b.measuredAt);
    });
  for (const r of sorted) {
    map.set(r.type, {
      type: r.type,
      valueCm: r.valueCm,
      date: r.date,
      measuredAt: r.measuredAt,
      id: r.id,
    });
  }
  return map;
}

export interface TypeCompare {
  type: BodyMeasurementType;
  earlier: MeasurementSnapshot | null;
  later: MeasurementSnapshot | null;
  absCm: number | null;
  pct: number | null;
}

export function compareMeasurementDates(
  rows: BodyMeasurement[],
  earlierDate: ISODate,
  laterDate: ISODate,
): TypeCompare[] {
  const a = latestByTypeOnOrBefore(rows, earlierDate);
  const b = latestByTypeOnOrBefore(rows, laterDate);
  const types = new Set<BodyMeasurementType>([...a.keys(), ...b.keys()]);
  const out: TypeCompare[] = [];
  for (const type of types) {
    const earlier = a.get(type) ?? null;
    const later = b.get(type) ?? null;
    const absCm =
      earlier && later ? absChange(earlier.valueCm, later.valueCm) : null;
    const pct =
      earlier && later ? pctChange(earlier.valueCm, later.valueCm) : null;
    out.push({ type, earlier, later, absCm, pct });
  }
  return out.sort((x, y) => x.type.localeCompare(y.type));
}

export function historyForType(
  rows: BodyMeasurement[],
  type: BodyMeasurementType,
): { date: ISODate; valueCm: number; id: string }[] {
  return rows
    .filter((r) => r.type === type)
    .sort((a, b) => a.date.localeCompare(b.date) || a.measuredAt.localeCompare(b.measuredAt))
    .map((r) => ({ date: r.date, valueCm: r.valueCm, id: r.id }));
}

export function distinctMeasurementDates(rows: BodyMeasurement[]): ISODate[] {
  return [...new Set(rows.map((r) => r.date))].sort();
}
