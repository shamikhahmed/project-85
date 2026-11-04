import { describe, expect, it } from 'vitest';
import { createDefaultSettings } from '../domain/defaults';
import type { AppSettings, DayAggregate } from '../domain/types';
import { eachISODate } from './dates';
import { buildWeeklyReport, reportDue, reportWeek } from './weeklyReport';

const day = (date: string, over: Partial<DayAggregate> = {}): DayAggregate => ({
  date,
  primaryWeightKg: null,
  waistCm: null,
  steps: null,
  calories: 0,
  proteinG: 0,
  carbsG: 0,
  fatG: 0,
  fibreG: 0,
  waterMl: 0,
  foodEntryCount: 0,
  hasEstimatedFood: false,
  workoutTypes: [],
  sleepHours: null,
  cigaretteCount: 0,
  cigarettesLogged: false,
  honestyAnswered: false,
  reviewCompleted: false,
  score: null,
  status: null,
  loggingCompleteness: 0,
  ...over,
});

const settings = (over: Partial<AppSettings> = {}): AppSettings => ({
  ...createDefaultSettings(),
  startDate: '2026-11-03',
  deadline: '2027-01-15',
  startingWeightKg: 96,
  targetWeightKg: 85,
  proteinTargetG: 160,
  ...over,
});

describe('reportWeek', () => {
  it('uses the week ending on Sunday, or the last Sunday', () => {
    expect(reportWeek('2026-11-15')).toEqual({ weekStart: '2026-11-09', weekEnd: '2026-11-15' });
    expect(reportWeek('2026-11-17')).toEqual({ weekStart: '2026-11-09', weekEnd: '2026-11-15' });
  });
});

describe('reportDue', () => {
  it('shows Sunday to Tuesday until dismissed, never before the plan', () => {
    const s = settings();
    expect(reportDue('2026-11-15', s)).toBe(true); // Sun
    expect(reportDue('2026-11-17', s)).toBe(true); // Tue
    expect(reportDue('2026-11-18', s)).toBe(false); // Wed
    expect(reportDue('2026-11-15', settings({ weeklyReportSeen: '2026-11-15' }))).toBe(false);
    expect(reportDue('2026-11-01', s)).toBe(false); // week ends before start
  });
});

describe('buildWeeklyReport', () => {
  const week = reportWeek('2026-11-15');

  it('compares against the previous week and the plan line', () => {
    const prev = eachISODate('2026-11-03', '2026-11-08').map((d) =>
      day(d, { primaryWeightKg: 95.6, steps: 7000, workoutTypes: ['strength'] }),
    );
    const now = eachISODate(week.weekStart, week.weekEnd).map((d) =>
      day(d, {
        primaryWeightKg: 94.6,
        steps: 11000,
        sleepHours: 7.2,
        foodEntryCount: 3,
        honestyAnswered: true,
        proteinG: 165,
        workoutTypes: d === '2026-11-15' ? [] : ['strength'],
      }),
    );
    const r = buildWeeklyReport([...prev, ...now], settings(), week);
    expect(r.planWeek).toBe(2);
    expect(r.sessionsPlanned).toBe(5);
    expect(r.sessionsDone).toBe(5);
    expect(r.avgWeightKg).toBe(94.6);
    expect(r.verdict).toBe('on-line'); // line on 12 Nov ≈ 94.7
    expect(r.rows.find((x) => x.id === 'weight')?.trend).toBe('better');
    expect(r.rows.find((x) => x.id === 'steps')?.trend).toBe('better');
    expect(r.wins).toContain('All 5 sessions done.');
    expect(r.fix).toMatch(/Repeat this week/);
    expect(r.shareText).toMatch(/week 2 report/);
  });

  it('asks for logging first when the week is thin, and never invents weight', () => {
    const r = buildWeeklyReport([day('2026-11-10', { steps: 4000 })], settings(), week);
    expect(r.avgWeightKg).toBeNull();
    expect(r.verdict).toBe('no-weight');
    expect(r.fix).toMatch(/Log at least 5 days/);
    expect(r.sessionsDone).toBe(0);
  });

  it('flags missed sessions before protein or steps', () => {
    const now = eachISODate(week.weekStart, week.weekEnd).map((d) =>
      day(d, { steps: 3000, foodEntryCount: 2, honestyAnswered: true, proteinG: 80, workoutTypes: d === '2026-11-09' ? ['strength'] : [] }),
    );
    const r = buildWeeklyReport(now, settings(), week);
    expect(r.fix).toMatch(/1 of 5 sessions/);
  });
});
