import { differenceInMinutes, parseISO } from 'date-fns';
import { localCalendarDay } from './localDay';

export type SleepSegment = {
  startAt: string;
  endAt: string;
  metricId: 'sleep_asleep' | 'sleep_awake' | string;
  value: number;
  provider: string;
};

export type SleepNight = {
  bedtime: string;
  wake: string;
  wakeDay: string;
  asleepMinutes: number;
};

const GAP_MAX_MIN = 90;

function segmentMinutes(seg: SleepSegment): number {
  const start = parseISO(seg.startAt);
  const end = parseISO(seg.endAt);
  return Math.max(0, differenceInMinutes(end, start));
}

function isSleepMetric(metricId: string): boolean {
  return metricId === 'sleep_asleep' || metricId === 'sleep_awake';
}

function buildNight(segments: SleepSegment[]): SleepNight {
  const sorted = [...segments].sort(
    (a, b) => parseISO(a.startAt).getTime() - parseISO(b.startAt).getTime(),
  );
  const bedtime = sorted[0]!.startAt;
  const wake = sorted.reduce(
    (latest, s) => (parseISO(s.endAt) > parseISO(latest) ? s.endAt : latest),
    sorted[0]!.endAt,
  );
  const asleepMinutes = sorted
    .filter((s) => s.metricId === 'sleep_asleep')
    .reduce((sum, s) => sum + segmentMinutes(s), 0);
  return {
    bedtime,
    wake,
    wakeDay: localCalendarDay(wake),
    asleepMinutes,
  };
}

/** Group stage segments into nights; keep longest night per local wake day. */
export function groupSleepNights(segments: SleepSegment[]): SleepNight[] {
  const relevant = segments.filter((s) => isSleepMetric(s.metricId));
  if (relevant.length === 0) return [];

  const sorted = [...relevant].sort(
    (a, b) => parseISO(a.startAt).getTime() - parseISO(b.startAt).getTime(),
  );

  const clusters: SleepSegment[][] = [];
  let current: SleepSegment[] = [sorted[0]!];

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!;
    const seg = sorted[i]!;
    const gap = differenceInMinutes(parseISO(seg.startAt), parseISO(prev.endAt));
    if (gap <= GAP_MAX_MIN) {
      current.push(seg);
    } else {
      clusters.push(current);
      current = [seg];
    }
  }
  clusters.push(current);

  const nights = clusters.map(buildNight);
  const byWakeDay = new Map<string, SleepNight>();
  for (const night of nights) {
    const existing = byWakeDay.get(night.wakeDay);
    if (!existing || night.asleepMinutes > existing.asleepMinutes) {
      byWakeDay.set(night.wakeDay, night);
    }
  }
  return [...byWakeDay.values()].sort((a, b) => a.wakeDay.localeCompare(b.wakeDay));
}
