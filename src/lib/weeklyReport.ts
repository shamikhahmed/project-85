/**
 * Sunday auto-report: the closed Mon–Sun week vs the week before and vs the plan line,
 * with one fix for next week. Built from logged days only; missing days are never invented.
 */
import { format, getDay } from 'date-fns';
import { planWeek, sessionFor, targetWeightOn, withPlanTargets } from '../domain/plan';
import type { AppSettings, DayAggregate, ISODate } from '../domain/types';
import { addLocalCalendarDays, eachISODate, parseLocalDate } from './dates';
import { buildWeeklyReview } from './weeklyReview';

export interface ReportWeek {
  weekStart: ISODate;
  weekEnd: ISODate;
}

/** Latest Mon–Sun week whose Sunday is on or before `date` (on a Sunday, that week). */
export function reportWeek(date: ISODate): ReportWeek {
  const wd = getDay(parseLocalDate(date)); // 0 Sun
  const weekEnd = addLocalCalendarDays(date, -wd);
  return { weekStart: addLocalCalendarDays(weekEnd, -6), weekEnd };
}

/** Show on Today from Sunday to Tuesday until dismissed, once the plan has started. */
export function reportDue(date: ISODate, settings: AppSettings): boolean {
  const wd = getDay(parseLocalDate(date));
  if (wd > 2) return false;
  const { weekEnd } = reportWeek(date);
  if (weekEnd < settings.startDate) return false;
  return settings.weeklyReportSeen !== weekEnd;
}

export type Trend = 'better' | 'worse' | 'same' | null;

export interface ReportRow {
  id: 'weight' | 'steps' | 'protein' | 'sleep' | 'sessions' | 'logged';
  label: string;
  value: string;
  previous: string | null;
  trend: Trend;
}

export interface WeeklyReport extends ReportWeek {
  planWeek: number;
  avgWeightKg: number | null;
  lineKg: number;
  verdict: 'ahead' | 'on-line' | 'behind' | 'no-weight';
  sessionsDone: number;
  sessionsPlanned: number;
  rows: ReportRow[];
  wins: string[];
  fix: string;
  shareText: string;
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);
const r1 = (x: number) => Math.round(x * 10) / 10;

function trend(now: number | null, prev: number | null, higherIsBetter: boolean, tol = 0): Trend {
  if (now == null || prev == null) return null;
  if (Math.abs(now - prev) <= tol) return 'same';
  return now > prev === higherIsBetter ? 'better' : 'worse';
}

export function buildWeeklyReport(days: DayAggregate[], settings: AppSettings, week: ReportWeek): WeeklyReport {
  const { weekStart, weekEnd } = week;
  const prevStart = addLocalCalendarDays(weekStart, -7);
  const prevEnd = addLocalCalendarDays(weekStart, -1);
  const s = withPlanTargets(settings, weekEnd);
  const now = buildWeeklyReview(days, s, weekStart, weekEnd);
  const prev = buildWeeklyReview(days, withPlanTargets(settings, prevEnd), prevStart, prevEnd);

  const weightIn = (a: ISODate, b: ISODate) =>
    avg(days.filter((d) => d.date >= a && d.date <= b && d.primaryWeightKg != null).map((d) => d.primaryWeightKg!));
  const w = weightIn(weekStart, weekEnd);
  const wPrev = weightIn(prevStart, prevEnd);
  const avgWeightKg = w == null ? null : r1(w);
  const lineKg = targetWeightOn(settings, addLocalCalendarDays(weekEnd, -3));
  const diff = avgWeightKg == null ? null : r1(avgWeightKg - lineKg);
  const verdict: WeeklyReport['verdict'] =
    diff == null ? 'no-weight' : diff < -0.3 ? 'ahead' : diff > 0.3 ? 'behind' : 'on-line';

  const lifted = new Set(days.filter((d) => d.workoutTypes.length > 0).map((d) => d.date));
  const liftDays = (a: ISODate, b: ISODate) => eachISODate(a, b).filter((d) => sessionFor(d).kind === 'lift');
  const sessionsPlanned = liftDays(weekStart, weekEnd).length;
  const sessionsDone = Math.min(sessionsPlanned, eachISODate(weekStart, weekEnd).filter((d) => lifted.has(d)).length);
  const prevDone = eachISODate(prevStart, prevEnd).filter((d) => lifted.has(d)).length;

  const fmt = (x: number | null, unit = '') => (x == null ? '—' : `${x.toLocaleString()}${unit}`);
  const rows: ReportRow[] = [
    {
      id: 'weight',
      label: 'Avg weight',
      value: fmt(avgWeightKg, ' kg'),
      previous: wPrev == null ? null : fmt(r1(wPrev), ' kg'),
      trend: trend(w, wPrev, false, 0.1),
    },
    {
      id: 'steps',
      label: 'Avg steps',
      value: fmt(now.avgSteps),
      previous: now.avgSteps == null || prev.avgSteps == null ? null : fmt(prev.avgSteps),
      trend: trend(now.avgSteps, prev.avgSteps, true, 250),
    },
    {
      id: 'protein',
      label: 'Avg protein',
      value: fmt(now.avgProtein, ' g'),
      previous: prev.avgProtein == null ? null : fmt(prev.avgProtein, ' g'),
      trend: trend(now.avgProtein, prev.avgProtein, true, 5),
    },
    {
      id: 'sleep',
      label: 'Avg sleep',
      value: fmt(now.avgSleepHours, ' h'),
      previous: prev.avgSleepHours == null ? null : fmt(prev.avgSleepHours, ' h'),
      trend: trend(now.avgSleepHours, prev.avgSleepHours, true, 0.2),
    },
    {
      id: 'sessions',
      label: 'Sessions',
      value: `${sessionsDone}/${sessionsPlanned}`,
      previous: prevStart < settings.startDate ? null : String(prevDone),
      trend: prevStart < settings.startDate ? null : trend(sessionsDone, prevDone, true),
    },
    {
      id: 'logged',
      label: 'Days logged',
      value: `${now.daysWithAnyLog}/7`,
      previous: prevStart < settings.startDate ? null : `${prev.daysWithAnyLog}/7`,
      trend: prevStart < settings.startDate ? null : trend(now.daysWithAnyLog, prev.daysWithAnyLog, true),
    },
  ];

  const wins: string[] = [];
  if (verdict === 'ahead' || verdict === 'on-line') wins.push(`7-day average ${verdict === 'ahead' ? 'ahead of' : 'on'} the plan line.`);
  if (sessionsPlanned > 0 && sessionsDone === sessionsPlanned) wins.push(`All ${sessionsPlanned} sessions done.`);
  if ((now.stepHitRate ?? 0) >= 80) wins.push(`Steps target hit on ${now.stepHitRate}% of synced days.`);
  if (now.avgProtein != null && now.avgProtein >= s.proteinTargetG) wins.push('Protein at or above target on average.');
  if ((now.avgSleepHours ?? 0) >= 7) wins.push(`Sleep averaged ${now.avgSleepHours} h.`);

  let fix: string;
  if (now.daysWithAnyLog < 4) fix = 'Log at least 5 days next week. A weigh-in and Quick Log after lunch is enough.';
  else if (sessionsPlanned - sessionsDone >= 2)
    fix = `You did ${sessionsDone} of ${sessionsPlanned} sessions. Book the gym time like a meeting; use the skip coach instead of missing silently.`;
  else if (now.avgProtein != null && now.avgProtein < s.proteinTargetG * 0.85)
    fix = `Protein averaged ${now.avgProtein} g vs ${s.proteinTargetG} g. Add one fixed protein item at breakfast (eggs, whey or dahi).`;
  else if (now.stepHitRate != null && now.stepHitRate < 70)
    fix = `Steps hit target on only ${now.stepHitRate}% of days. Add a 20-minute walk after dinner.`;
  else if (now.avgSleepHours != null && now.avgSleepHours < 6.5)
    fix = `Sleep averaged ${now.avgSleepHours} h. Set a fixed lights-out 30 minutes earlier.`;
  else if (verdict === 'behind')
    fix = `Average is ${diff} kg above the line with habits on track. Tighten evening snacks; don't cut protein.`;
  else fix = 'Repeat this week. Same habits, same honesty.';

  const pw = planWeek(weekEnd);
  const title = pw > 0 ? `Project 85 · week ${pw} report` : 'Project 85 · weekly report';
  const shareText = [
    `${title} (${format(parseLocalDate(weekStart), 'd MMM')} → ${format(parseLocalDate(weekEnd), 'd MMM')})`,
    avgWeightKg != null ? `Avg weight ${avgWeightKg} kg (line ${lineKg} kg)` : 'No weigh-ins this week',
    ...rows.filter((r) => r.id !== 'weight').map((r) => `${r.label}: ${r.value}`),
    ...wins.slice(0, 2).map((x) => `✓ ${x}`),
    `Next week: ${fix}`,
  ].join('\n');

  return {
    weekStart,
    weekEnd,
    planWeek: pw,
    avgWeightKg,
    lineKg,
    verdict,
    sessionsDone,
    sessionsPlanned,
    rows,
    wins: wins.slice(0, 2),
    fix,
    shareText,
  };
}
