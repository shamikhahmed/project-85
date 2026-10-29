export type HrvKind = 'sdnn' | 'rmssd';

export type RecoveryDayInput = {
  date: string;
  hrv?: { value: number; kind: HrvKind };
  rhr?: number;
  sleepPerf?: number;
};

export type RecoveryBand = 'green' | 'amber' | 'red';

export type RecoveryResult =
  | {
      status: 'calibrating';
      day: number;
      needed: 7;
    }
  | {
      status: 'ready';
      score: number;
      band: RecoveryBand;
      weightedZ: number;
      drag: RecoveryDrag | null;
      components: {
        hrvZ: number | null;
        rhrZ: number | null;
        sleepZ: number | null;
      };
    };

export type RecoveryDrag = {
  input: 'hrv' | 'rhr' | 'sleep';
  message: string;
};

const BASELINE_MIN_DAYS = 7;
const BASELINE_WINDOW_DAYS = 30;
const LOGISTIC_K = 1.2;

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stdDev(values: number[], avg: number): number {
  if (values.length < 2) return 0;
  const v = values.reduce((s, x) => s + (x - avg) ** 2, 0) / (values.length - 1);
  return Math.sqrt(v);
}

function zScore(value: number, avg: number, sd: number): number {
  if (sd <= 1e-6) return 0;
  return (value - avg) / sd;
}

function logisticScore(weightedZ: number): number {
  const raw = 100 / (1 + Math.exp(-LOGISTIC_K * weightedZ));
  return Math.min(100, Math.max(0, Math.round(raw)));
}

function bandForScore(score: number): RecoveryBand {
  if (score >= 67) return 'green';
  if (score >= 34) return 'amber';
  return 'red';
}

function daysInWindow(history: RecoveryDayInput[], today: RecoveryDayInput): RecoveryDayInput[] {
  const end = new Date(today.date).getTime();
  const start = end - BASELINE_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  return history.filter((d) => {
    const t = new Date(d.date).getTime();
    return t >= start && t < end && d.date !== today.date;
  });
}

function baselineDaysWithKind(history: RecoveryDayInput[], kind: HrvKind): RecoveryDayInput[] {
  return history.filter((d) => d.hrv?.kind === kind && d.hrv.value > 0);
}

/** PROJECT 85 recovery score (not medical). Requires ≥7 baseline days in the 30d window. */
export function computeRecovery(
  today: RecoveryDayInput,
  history: RecoveryDayInput[],
): RecoveryResult {
  const window = daysInWindow(history, today);
  const kind = today.hrv?.kind;
  const hrvHistory = kind ? baselineDaysWithKind(window, kind) : [];

  const rhrHistory = window.filter((d) => d.rhr != null && d.rhr > 0);
  const sleepHistory = window.filter((d) => d.sleepPerf != null);

  const needsHrv = today.hrv != null;
  const effectiveBaseline = needsHrv
    ? Math.min(hrvHistory.length, rhrHistory.length, sleepHistory.length)
    : Math.min(rhrHistory.length, sleepHistory.length);

  if (effectiveBaseline < BASELINE_MIN_DAYS) {
    return {
      status: 'calibrating',
      day: effectiveBaseline,
      needed: BASELINE_MIN_DAYS,
    };
  }

  let hrvZ: number | null = null;
  if (today.hrv && kind) {
    const lnValues = hrvHistory.map((d) => Math.log(d.hrv!.value));
    const lnToday = Math.log(today.hrv.value);
    const avg = mean(lnValues);
    hrvZ = zScore(lnToday, avg, stdDev(lnValues, avg));
  }

  let rhrZ: number | null = null;
  if (today.rhr != null) {
    const values = rhrHistory.map((d) => d.rhr!);
    const avg = mean(values);
    rhrZ = -zScore(today.rhr, avg, stdDev(values, avg));
  }

  let sleepZ: number | null = null;
  if (today.sleepPerf != null) {
    const values = sleepHistory.map((d) => d.sleepPerf!);
    const avg = mean(values);
    sleepZ = zScore(today.sleepPerf, avg, stdDev(values, avg));
  }

  const parts: { key: RecoveryDrag['input']; z: number; weight: number }[] = [];
  if (hrvZ != null) parts.push({ key: 'hrv', z: hrvZ, weight: 0.5 });
  if (rhrZ != null) parts.push({ key: 'rhr', z: rhrZ, weight: 0.25 });
  if (sleepZ != null) parts.push({ key: 'sleep', z: sleepZ, weight: 0.25 });

  const weightSum = parts.reduce((s, p) => s + p.weight, 0);
  const weightedZ =
    weightSum > 0 ? parts.reduce((s, p) => s + p.z * (p.weight / weightSum), 0) : 0;

  const score = logisticScore(weightedZ);
  const band = bandForScore(score);

  const worst = parts.reduce<(typeof parts)[0] | null>((acc, p) => {
    if (!acc || p.z < acc.z) return p;
    return acc;
  }, null);

  let drag: RecoveryDrag | null = null;
  if (worst && worst.z < -0.05) {
    const pct = Math.round(Math.abs(worst.z) * 10);
    if (worst.key === 'hrv') {
      drag = { input: 'hrv', message: `HRV ${pct}% below your normal` };
    } else if (worst.key === 'rhr') {
      drag = { input: 'rhr', message: `Resting HR ${pct}% above your normal` };
    } else {
      drag = { input: 'sleep', message: `Sleep performance ${pct}% below your normal` };
    }
  }

  return {
    status: 'ready',
    score,
    band,
    weightedZ,
    drag,
    components: { hrvZ, rhrZ, sleepZ },
  };
}

/** Reject baselines that mix SDNN and RMSSD. */
export function assertSingleHrvKind(history: RecoveryDayInput[]): boolean {
  const kinds = new Set(history.map((d) => d.hrv?.kind).filter(Boolean));
  return kinds.size <= 1;
}
