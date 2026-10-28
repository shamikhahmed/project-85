import type {
  Achievement,
  BodyMeasurement,
  JournalEntry,
  MotivationItem,
  ProgressPhoto,
  WeightEntry,
  WorkoutEntry,
} from '../domain/types';

export type TimelineKind =
  | 'weight'
  | 'measurement'
  | 'photo'
  | 'workout'
  | 'achievement'
  | 'journal'
  | 'milestone';

export interface TimelineEvent {
  id: string;
  date: string;
  kind: TimelineKind;
  title: string;
  detail: string;
  estimated?: boolean;
}

export function buildTransformationTimeline(input: {
  weights: WeightEntry[];
  measurements: BodyMeasurement[];
  photos: ProgressPhoto[];
  workouts: WorkoutEntry[];
  achievements: Achievement[];
  journals: JournalEntry[];
  milestones: MotivationItem[];
}): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  for (const w of input.weights) {
    if (!w.isPrimaryMorning) continue;
    events.push({
      id: w.id,
      date: w.date,
      kind: 'weight',
      title: `${w.weightKg} kg`,
      detail: w.isEstimate ? 'Estimated weigh-in' : 'Morning weigh-in',
      estimated: w.isEstimate,
    });
  }

  const byDateType = new Map<string, BodyMeasurement>();
  for (const m of [...input.measurements].sort((a, b) =>
    a.measuredAt.localeCompare(b.measuredAt),
  )) {
    byDateType.set(`${m.date}:${m.type}`, m);
  }
  const measureDays = new Map<string, number>();
  for (const m of byDateType.values()) {
    measureDays.set(m.date, (measureDays.get(m.date) ?? 0) + 1);
  }
  for (const [date, count] of measureDays) {
    events.push({
      id: `meas_${date}`,
      date,
      kind: 'measurement',
      title: 'Body measurements',
      detail: `${count} site${count === 1 ? '' : 's'} recorded`,
    });
  }

  for (const p of input.photos) {
    events.push({
      id: p.id,
      date: p.date,
      kind: 'photo',
      title: `${p.pose} photo`,
      detail: p.note?.trim() || 'Progress photo (original preserved locally)',
    });
  }

  for (const w of input.workouts) {
    events.push({
      id: w.id,
      date: w.date,
      kind: 'workout',
      title: w.type,
      detail: w.notes?.trim() || (w.durationMin ? `${w.durationMin} min` : 'Session logged'),
    });
  }

  for (const a of input.achievements) {
    const date = a.unlockedAt.slice(0, 10);
    events.push({
      id: a.id,
      date,
      kind: 'achievement',
      title: a.title,
      detail: a.description,
    });
  }

  for (const j of input.journals) {
    if (j.hidden) continue;
    events.push({
      id: j.id,
      date: j.date,
      kind: 'journal',
      title: 'Journal',
      detail: j.body.slice(0, 120) + (j.body.length > 120 ? '…' : ''),
    });
  }

  for (const m of input.milestones) {
    if (m.hidden || m.kind !== 'milestone') continue;
    events.push({
      id: m.id,
      date: m.createdAt.slice(0, 10),
      kind: 'milestone',
      title: m.title,
      detail: m.body.slice(0, 120),
    });
  }

  return events.sort((a, b) => b.date.localeCompare(a.date) || a.kind.localeCompare(b.kind));
}

export function monthlySummary(events: TimelineEvent[]): {
  month: string;
  weightEvents: number;
  measureEvents: number;
  photoEvents: number;
  workoutEvents: number;
}[] {
  const map = new Map<
    string,
    {
      month: string;
      weightEvents: number;
      measureEvents: number;
      photoEvents: number;
      workoutEvents: number;
    }
  >();
  for (const e of events) {
    const month = e.date.slice(0, 7);
    const row = map.get(month) ?? {
      month,
      weightEvents: 0,
      measureEvents: 0,
      photoEvents: 0,
      workoutEvents: 0,
    };
    if (e.kind === 'weight') row.weightEvents += 1;
    if (e.kind === 'measurement') row.measureEvents += 1;
    if (e.kind === 'photo') row.photoEvents += 1;
    if (e.kind === 'workout') row.workoutEvents += 1;
    map.set(month, row);
  }
  return [...map.values()].sort((a, b) => b.month.localeCompare(a.month));
}
