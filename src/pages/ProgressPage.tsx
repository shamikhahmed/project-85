import { useEffect, useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts';
import * as repo from '../data/repository';
import { calendarDaysRemaining, eachISODate, toLocalISODate } from '../lib/dates';
import {
  projectWeightAtDeadline,
  requiredWeeklyLossKg,
  sevenDayRollingAverage,
  computeWeightProgress,
} from '../lib/weightProgress';
import { useAppStore } from '../store/useAppStore';

export function ProgressPage() {
  const settings = useAppStore((s) => s.settings);
  const [weights, setWeights] = useState<{ date: string; weightKg: number }[]>([]);
  const [waists, setWaists] = useState<{ date: string; waistCm: number }[]>([]);
  const [steps, setSteps] = useState<{ date: string; steps: number | null }[]>([]);
  const [nutrition, setNutrition] = useState<
    { date: string; calories: number | null; protein: number | null }[]
  >([]);
  const [habits, setHabits] = useState({
    stepDays: 0,
    stepHit: 0,
    foodDays: 0,
    workoutDays: 0,
    sleepHit: 0,
    sleepDays: 0,
    cigTotal: 0,
  });

  useEffect(() => {
    if (!settings) return;
    void (async () => {
      const allW = await repo.getAllWeights();
      const primaries = allW
        .filter((w) => w.isPrimaryMorning)
        .map((w) => ({ date: w.date, weightKg: w.weightKg }));
      setWeights(primaries);
      setWaists(
        allW
          .filter((w) => w.isPrimaryMorning && w.waistCm != null)
          .map((w) => ({ date: w.date, waistCm: w.waistCm! })),
      );

      const days = eachISODate(settings.startDate, toLocalISODate());
      const stepRows = await repo.getStepsInRange(settings.startDate, toLocalISODate());
      const stepMap = new Map(stepRows.map((s) => [s.date, s.totalSteps]));
      setSteps(days.map((d) => ({ date: d, steps: stepMap.get(d) ?? null })));

      let stepDays = 0;
      let stepHit = 0;
      let foodDays = 0;
      let workoutDays = 0;
      let sleepHit = 0;
      let sleepDays = 0;
      let cigTotal = 0;
      const nut: { date: string; calories: number | null; protein: number | null }[] = [];

      for (const d of days.slice(-28)) {
        const foods = await repo.getFoodsByDate(d);
        const cals = foods.length ? foods.reduce((s, f) => s + f.calories, 0) : null;
        const pro = foods.length ? foods.reduce((s, f) => s + f.proteinG, 0) : null;
        nut.push({ date: d, calories: cals, protein: pro });
        if (foods.length) foodDays += 1;
        const st = stepMap.get(d);
        if (st != null) {
          stepDays += 1;
          if (st >= settings.stepsTarget) stepHit += 1;
        }
        const wos = await repo.getWorkoutsByDate(d);
        if (wos.length) workoutDays += 1;
        const sleep = await repo.getSleepByDate(d);
        if (sleep) {
          sleepDays += 1;
          const hrs =
            (new Date(sleep.wakeTime).getTime() - new Date(sleep.bedtime).getTime()) /
            3600000;
          const adj = hrs < 0 ? hrs + 24 : hrs;
          if (adj >= settings.sleepTargetHours * 0.85) sleepHit += 1;
        }
        const cigs = await repo.getCigarettesByDate(d);
        cigTotal += cigs.reduce((s, c) => s + c.count, 0);
      }
      setNutrition(nut);
      setHabits({ stepDays, stepHit, foodDays, workoutDays, sleepHit, sleepDays, cigTotal });
    })();
  }, [settings]);

  const rolling = useMemo(() => sevenDayRollingAverage(weights), [weights]);
  const chartData = useMemo(() => {
    const map = new Map(rolling.map((r) => [r.date, r.avgKg]));
    return weights.map((w) => ({
      date: w.date.slice(5),
      weight: w.weightKg,
      avg7: map.get(w.date),
    }));
  }, [weights, rolling]);

  if (!settings) return null;

  const progress = computeWeightProgress({
    startingWeightKg: settings.startingWeightKg,
    targetWeightKg: settings.targetWeightKg,
    currentWeightKg: weights.at(-1)?.weightKg ?? null,
  });
  const daysLeft = calendarDaysRemaining(settings.deadline);
  const weekly = requiredWeeklyLossKg(progress.remainingKg, daysLeft);
  const projection = projectWeightAtDeadline({
    weights,
    deadline: settings.deadline,
    startDate: settings.startDate,
  });

  return (
    <div className="stack">
      <header className="panel">
        <h1 style={{ fontSize: '1.4rem' }}>Progress</h1>
        <p className="muted" style={{ margin: 0 }}>
          Missing dates stay missing — never fabricated as zero.
        </p>
      </header>

      <section className="panel">
        <h2 style={{ fontSize: '1.05rem' }}>Weight</h2>
        <div style={{ width: '100%', height: 260 }}>
          {chartData.length === 0 ? (
            <p className="empty-state">Log morning weights to see the chart.</p>
          ) : (
            <ResponsiveContainer>
              <LineChart data={chartData}>
                <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke="var(--text-dim)" fontSize={11} />
                <YAxis domain={['auto', 'auto']} stroke="var(--text-dim)" fontSize={11} unit=" kg" />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                  }}
                />
                <ReferenceLine
                  y={settings.targetWeightKg}
                  stroke="var(--accent)"
                  strokeDasharray="4 4"
                  label={{ value: '85', fill: 'var(--accent)', fontSize: 11 }}
                />
                <ReferenceLine
                  y={settings.startingWeightKg}
                  stroke="var(--text-dim)"
                  strokeDasharray="2 4"
                />
                <Line type="monotone" dataKey="weight" stroke="var(--text)" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="avg7" stroke="var(--info)" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      {waists.length > 0 && (
        <section className="panel">
          <h2 style={{ fontSize: '1.05rem' }}>Waist (cm)</h2>
          <div style={{ width: '100%', height: 200 }}>
            <ResponsiveContainer>
              <LineChart data={waists.map((w) => ({ date: w.date.slice(5), waist: w.waistCm }))}>
                <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke="var(--text-dim)" fontSize={11} />
                <YAxis stroke="var(--text-dim)" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                  }}
                />
                <Line type="monotone" dataKey="waist" stroke="var(--accent)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      <section className="panel">
        <h2 style={{ fontSize: '1.05rem' }}>Steps (recent)</h2>
        <div style={{ width: '100%', height: 220 }}>
          <ResponsiveContainer>
            <BarChart
              data={steps.slice(-14).map((s) => ({
                date: s.date.slice(5),
                steps: s.steps,
                missing: s.steps == null ? settings.stepsTarget * 0.05 : 0,
              }))}
            >
              <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="3 3" />
              <XAxis dataKey="date" stroke="var(--text-dim)" fontSize={11} />
              <YAxis stroke="var(--text-dim)" fontSize={11} />
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                }}
              />
              <ReferenceLine y={settings.stepsTarget} stroke="var(--accent)" strokeDasharray="4 4" />
              <Bar dataKey="steps" fill="var(--accent)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="panel">
        <h2 style={{ fontSize: '1.05rem' }}>Nutrition trends (28d)</h2>
        <p className="dim" style={{ fontSize: '0.8rem' }}>
          Gaps = no log (not zero intake).
        </p>
        <div style={{ width: '100%', height: 220 }}>
          <ResponsiveContainer>
            <LineChart
              data={nutrition.map((n) => ({
                date: n.date.slice(5),
                calories: n.calories,
                protein: n.protein,
              }))}
            >
              <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="3 3" />
              <XAxis dataKey="date" stroke="var(--text-dim)" fontSize={11} />
              <YAxis stroke="var(--text-dim)" fontSize={11} />
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                }}
              />
              <Line
                type="monotone"
                dataKey="calories"
                stroke="var(--warning)"
                strokeWidth={2}
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="protein"
                stroke="var(--success)"
                strokeWidth={2}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="panel">
        <h2 style={{ fontSize: '1.05rem' }}>Habit consistency</h2>
        <div className="grid-metrics">
          <div className="metric">
            <div className="label">10k steps hit</div>
            <div className="value">
              {habits.stepDays
                ? `${Math.round((habits.stepHit / habits.stepDays) * 100)}%`
                : '—'}
            </div>
          </div>
          <div className="metric">
            <div className="label">Food log days</div>
            <div className="value">{habits.foodDays}</div>
          </div>
          <div className="metric">
            <div className="label">Workout days</div>
            <div className="value">{habits.workoutDays}</div>
          </div>
          <div className="metric">
            <div className="label">Sleep target</div>
            <div className="value">
              {habits.sleepDays
                ? `${Math.round((habits.sleepHit / habits.sleepDays) * 100)}%`
                : '—'}
            </div>
          </div>
          <div className="metric">
            <div className="label">Cigarettes (period)</div>
            <div className="value">{habits.cigTotal}</div>
          </div>
        </div>
      </section>

      <section className="panel stack">
        <h2 style={{ fontSize: '1.05rem' }}>Goal projection</h2>
        <p className="muted" style={{ margin: 0 }}>
          Required average weekly loss to hit {settings.targetWeightKg} kg:{' '}
          <strong className="mono">
            {weekly == null ? 'n/a' : `${weekly} kg/week`}
          </strong>
          . This is informational — never an instruction to crash diet.
        </p>
        <p className="dim" style={{ fontSize: '0.85rem' }}>
          Trajectory estimate:{' '}
          {projection.confidence === 'insufficient_data'
            ? 'Insufficient data (need ≥3 weigh-ins spanning ≥7 days).'
            : `${projection.projectedKg} kg by deadline (estimate only — not a promise).`}
        </p>
      </section>
    </div>
  );
}
