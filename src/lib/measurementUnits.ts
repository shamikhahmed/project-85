import type { LengthUnit } from '../domain/types';
import { defFor } from './measurementCatalogue';
import type { BodyMeasurementType } from '../domain/types';

const CM_PER_IN = 2.54;

export function cmToIn(cm: number): number {
  return cm / CM_PER_IN;
}

export function inToCm(inches: number): number {
  return inches * CM_PER_IN;
}

export function convertLength(value: number, from: LengthUnit, to: LengthUnit): number {
  if (from === to) return value;
  return from === 'cm' ? cmToIn(value) : inToCm(value);
}

export function roundLength(valueCm: number, unit: LengthUnit, type?: BodyMeasurementType): number {
  const prec = type ? (defFor(type)?.precisionCm ?? 1) : 1;
  if (unit === 'cm') {
    const f = 10 ** prec;
    return Math.round(valueCm * f) / f;
  }
  // inches: one decimal typical for tape
  return Math.round(cmToIn(valueCm) * 10) / 10;
}

export function formatLength(valueCm: number, unit: LengthUnit, type?: BodyMeasurementType): string {
  const v = roundLength(valueCm, unit, type);
  return unit === 'cm' ? `${v} cm` : `${v} in`;
}

export function parseLengthInput(raw: string, unit: LengthUnit): number | null {
  const n = Number(String(raw).trim().replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0) return null;
  return unit === 'cm' ? n : inToCm(n);
}

export function validateMeasurementCm(
  type: BodyMeasurementType,
  valueCm: number,
): { ok: true } | { ok: false; error: string } {
  const def = defFor(type);
  if (!def && type !== 'custom') {
    return { ok: false, error: 'Unknown measurement type' };
  }
  const min = def?.minCm ?? 5;
  const max = def?.maxCm ?? 300;
  if (valueCm < min || valueCm > max) {
    return {
      ok: false,
      error: `Value must be between ${min}–${max} cm for ${def?.label ?? 'this measurement'}`,
    };
  }
  return { ok: true };
}

export function pctChange(from: number, to: number): number | null {
  if (!Number.isFinite(from) || from === 0) return null;
  return Math.round(((to - from) / from) * 1000) / 10;
}

export function absChange(from: number, to: number): number {
  return Math.round((to - from) * 10) / 10;
}
