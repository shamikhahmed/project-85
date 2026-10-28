import { addDays, differenceInCalendarDays, getDay } from 'date-fns';
import type { AppSettings, ISODate } from './types';
import { parseLocalDate, toLocalISODate } from '../lib/dates';

/**
 * Project New Me training + nutrition plan (3 Nov 2026 → 15 Jan 2027).
 * Pure functions only — no storage. Dates are local ISO (YYYY-MM-DD).
 */
export const PLAN_START: ISODate = '2026-11-03';
export const PLAN_END: ISODate = '2027-01-15';
/** Week 2 is the first full Monday-start week. */
const WEEK2_START: ISODate = '2026-11-09';
const DELOAD_START: ISODate = '2026-11-30';
const DELOAD_END: ISODate = '2026-12-06';
const REVEAL_START: ISODate = '2027-01-11';

export type SessionKey = 'push' | 'pull' | 'legs' | 'upper' | 'lower' | 'saturday' | 'rest';
export type DayKind = 'lift' | 'saturday' | 'rest';

export interface PlannedSession {
  key: SessionKey;
  label: string;
  kind: DayKind;
  /** Short qualifier, e.g. "Deload 60%" or "Birthday pump" */
  note: string | null;
}

export interface PlanPhase {
  week: number;
  phase: 'Before start' | 'Foundation' | 'Deload' | 'Sharpen' | 'Reveal' | 'Complete';
  mode: 'Basic' | 'Advanced' | 'Deload' | 'Block B · Basic' | 'Block B · Advanced' | 'Reveal' | '—';
  /** Show the Block B swap as the main exercise */
  blockB: boolean;
  /** Apply the purple advanced technique on the last set */
  advanced: boolean;
}

export const MISSIONS: readonly { phase: string; text: string }[] = [
  { phase: 'Foundation', text: 'Weigh every day. 8k steps. No dinner carbs from night 1.' },
  { phase: 'Foundation', text: '10k steps every single day, from now to your birthday.' },
  { phase: 'Foundation', text: 'Zero sugar: chai, drinks, sweets. Diet drinks are fine.' },
  { phase: 'Foundation', text: 'Measure the oil: 1 tablespoon per dish per person.' },
  { phase: 'Deload', text: 'Sleep 7+ hours. Train at 60%. Food stays the same.' },
  { phase: 'Sharpen', text: 'Protein first at every meal. 240 g, every day.' },
  { phase: 'Sharpen', text: 'No eating after 11 pm. Kitchen closed.' },
  { phase: 'Sharpen', text: '25 Dec is a day off work, not a day off the plan.' },
  { phase: 'Sharpen', text: "New Year's Eve: wedding plate rules. Weigh in on 1 Jan anyway." },
  { phase: 'Sharpen', text: '12k steps every day. Final full training week.' },
  { phase: 'Reveal', text: 'Normal food, no crash diet, no water cutting. Photos on the 15th.' },
];

const LABELS: Record<SessionKey, string> = {
  push: 'Push',
  pull: 'Pull',
  legs: 'Legs',
  upper: 'Upper',
  lower: 'Lower',
  saturday: 'Saturday option',
  rest: 'Rest',
};

function days(a: ISODate, b: ISODate): number {
  return differenceInCalendarDays(parseLocalDate(b), parseLocalDate(a));
}

/** 1-based plan week (week 1 = 3-8 Nov). 0 before start. Capped at 11 (birthday week). */
export function planWeek(date: ISODate): number {
  if (date < PLAN_START) return 0;
  if (date < WEEK2_START) return 1;
  return Math.min(11, 2 + Math.floor(days(WEEK2_START, date) / 7));
}

export function planPhase(date: ISODate): PlanPhase {
  const week = planWeek(date);
  if (week === 0) return { week, phase: 'Before start', mode: '—', blockB: false, advanced: false };
  if (date > PLAN_END) return { week, phase: 'Complete', mode: '—', blockB: false, advanced: false };
  if (date >= REVEAL_START) return { week, phase: 'Reveal', mode: 'Reveal', blockB: true, advanced: false };
  if (week <= 2) return { week, phase: 'Foundation', mode: 'Basic', blockB: false, advanced: false };
  if (week <= 4) return { week, phase: 'Foundation', mode: 'Advanced', blockB: false, advanced: true };
  if (week === 5) return { week, phase: 'Deload', mode: 'Deload', blockB: false, advanced: false };
  if (week <= 7) return { week, phase: 'Sharpen', mode: 'Block B · Basic', blockB: true, advanced: false };
  return { week, phase: 'Sharpen', mode: 'Block B · Advanced', blockB: true, advanced: true };
}

export function missionFor(date: ISODate): { week: number; phase: string; text: string } {
  const w = Math.max(1, planWeek(date));
  const m = MISSIONS[Math.min(MISSIONS.length, w) - 1];
  return { week: w, ...m };
}

/** Which session is planned on a date. Week 1 starts on Tuesday 3 Nov with Push. */
export function sessionFor(date: ISODate): PlannedSession {
  const mk = (key: SessionKey, note: string | null = null, kind?: DayKind): PlannedSession => ({
    key,
    label: LABELS[key],
    kind: kind ?? (key === 'rest' ? 'rest' : key === 'saturday' ? 'saturday' : 'lift'),
    note,
  });
  if (date < PLAN_START || date > PLAN_END) return mk('rest', date < PLAN_START ? 'Before day 1' : 'Plan complete');
  const wd = getDay(parseLocalDate(date)); // 0 Sun .. 6 Sat
  if (date < WEEK2_START) {
    const wk1: Record<number, SessionKey> = { 2: 'push', 3: 'pull', 4: 'legs', 5: 'upper', 6: 'lower', 0: 'rest' };
    return mk(wk1[wd] ?? 'rest');
  }
  if (date >= REVEAL_START) {
    if (wd === 1) return mk('push');
    if (wd === 2) return mk('pull');
    if (wd === 3) return mk('legs', 'Lighter, 70%');
    if (wd === 4) return mk('rest', 'Normal carbs, water, sleep early', 'rest');
    if (wd === 5) return mk('upper', 'Birthday pump, 30 min', 'saturday');
    return mk('rest');
  }
  const map: Record<number, SessionKey> = { 1: 'push', 2: 'pull', 3: 'legs', 4: 'upper', 5: 'lower', 6: 'saturday', 0: 'rest' };
  const key = map[wd];
  const deload = date >= DELOAD_START && date <= DELOAD_END && key !== 'rest' && key !== 'saturday';
  return mk(key, deload ? 'Deload: 60% weight, half the sets' : null);
}

/** Straight line from the mission start weight to the target on the deadline. */
export function targetWeightOn(settings: AppSettings, date: ISODate): number {
  const total = days(settings.startDate, settings.deadline);
  if (total <= 0) return settings.targetWeightKg;
  const t = Math.min(total, Math.max(0, days(settings.startDate, date)));
  const kg = settings.startingWeightKg - ((settings.startingWeightKg - settings.targetWeightKg) * t) / total;
  return Math.round(kg * 10) / 10;
}

/** Sunday checkpoints: target 7-day average is the line value 3 days before (the window centre). */
export function sundayCheckpoints(settings: AppSettings): { week: number; sunday: ISODate; targetKg: number }[] {
  const out: { week: number; sunday: ISODate; targetKg: number }[] = [];
  let sun = parseLocalDate(settings.startDate);
  while (getDay(sun) !== 0) sun = addDays(sun, 1);
  let week = 1;
  while (toLocalISODate(sun) < settings.deadline) {
    const iso = toLocalISODate(sun);
    out.push({ week, sunday: iso, targetKg: targetWeightOn(settings, toLocalISODate(addDays(sun, -3))) });
    sun = addDays(sun, 7);
    week += 1;
  }
  return out;
}

export interface DayMacros {
  kind: DayKind;
  calories: number;
  proteinG: number;
  carbsG: number | null;
  fatG: number | null;
}

/**
 * Day-specific targets. Training days use the Settings values; Saturday is 50 kcal lower,
 * rest days 400 kcal lower (carbs carry the difference — protein and fat stay constant).
 */
export function macrosFor(settings: AppSettings, date: ISODate): DayMacros {
  const base: DayMacros = {
    kind: 'lift',
    calories: settings.calorieTarget,
    proteinG: settings.proteinTargetG,
    carbsG: settings.carbsTargetG,
    fatG: settings.fatTargetG,
  };
  if (settings.dayTypeCalories === false) return base;
  const kind = sessionFor(date).kind;
  if (date < PLAN_START || date > PLAN_END) {
    // Outside the plan window, fall back to weekday pattern
    const wd = getDay(parseLocalDate(date));
    const k: DayKind = wd === 0 ? 'rest' : wd === 6 ? 'saturday' : 'lift';
    return shift(base, k);
  }
  return shift(base, kind);
}

function shift(base: DayMacros, kind: DayKind): DayMacros {
  if (kind === 'lift') return base;
  const delta = kind === 'saturday' ? 50 : 400;
  return {
    ...base,
    kind,
    calories: base.calories - delta,
    carbsG: base.carbsG == null ? null : Math.max(0, base.carbsG - Math.round(delta / 4)),
  };
}

export function calorieTargetFor(settings: AppSettings, date: ISODate): number {
  return macrosFor(settings, date).calories;
}
