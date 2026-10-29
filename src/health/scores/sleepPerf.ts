import { addMinutes, format, parseISO } from 'date-fns';

export type NightSleep = {
  wakeDay: string;
  asleepMinutes: number;
};

export type BedWakeLog = {
  wakeDay: string;
  bedtime: string;
  wake: string;
};

export type SleepPerfInput = {
  baselineNeedMinutes?: number;
  lastNights: NightSleep[];
  tonightAsleepMinutes: number;
  strain: number;
  wakeTargetIso: string;
  bedWakeLogs?: BedWakeLog[];
};

export type SleepPerfResult = {
  needMinutes: number;
  performance: number;
  goToBedBy: string;
  consistencyMinutes: number | null;
};

const DEFAULT_NEED_MIN = 8 * 60;
const DEBT_CAP_MIN = 60;
const STRAIN_THRESHOLD = 10;
const STRAIN_BONUS_PER_POINT_MIN = 5;

export function sleepNeedMinutes(
  baselineNeedMinutes: number = DEFAULT_NEED_MIN,
  lastNights: NightSleep[],
  strain: number,
): number {
  const recent = lastNights.slice(-3);
  let debt = 0;
  for (const n of recent) {
    const shortfall = Math.max(0, baselineNeedMinutes - n.asleepMinutes);
    debt += shortfall * 0.5;
  }
  debt = Math.min(debt, DEBT_CAP_MIN);
  const strainAdj =
    strain > STRAIN_THRESHOLD ? (strain - STRAIN_THRESHOLD) * STRAIN_BONUS_PER_POINT_MIN : 0;
  return Math.round(baselineNeedMinutes + debt + strainAdj);
}

function minutesFromMidnight(iso: string): number {
  const d = parseISO(iso);
  return d.getHours() * 60 + d.getMinutes();
}

function stdDevMinutes(values: number[]): number {
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((s, x) => s + (x - avg) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

/** Mean of bed-time and wake-time std-dev (minutes from midnight). */
export function bedtimeWakeConsistency(logs: BedWakeLog[]): number | null {
  if (logs.length < 2) return null;
  const bedMins = logs.map((l) => minutesFromMidnight(l.bedtime));
  const wakeMins = logs.map((l) => minutesFromMidnight(l.wake));
  return (stdDevMinutes(bedMins) + stdDevMinutes(wakeMins)) / 2;
}

export function goToBedBy(wakeTargetIso: string, needMinutes: number): string {
  const wake = parseISO(wakeTargetIso);
  const bed = addMinutes(wake, -needMinutes);
  return format(bed, 'HH:mm');
}

export function computeSleepPerf(input: SleepPerfInput): SleepPerfResult {
  const baseline = input.baselineNeedMinutes ?? DEFAULT_NEED_MIN;
  const needMinutes = sleepNeedMinutes(baseline, input.lastNights, input.strain);
  const performance = Math.min(
    100,
    Math.round((input.tonightAsleepMinutes / needMinutes) * 1000) / 10,
  );
  const logs = input.bedWakeLogs ?? [];
  return {
    needMinutes,
    performance,
    goToBedBy: goToBedBy(input.wakeTargetIso, needMinutes),
    consistencyMinutes: logs.length >= 2 ? bedtimeWakeConsistency(logs) : null,
  };
}
