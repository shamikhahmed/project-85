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
import { assessWeightTrend, dailyWeightVsTrendMessage } from '../lib/weightTrend';
import { WeeklyReviewCard } from '../components/WeeklyReviewCard';
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
    targetWeightKg: settings.targetWeightKg,
  });
  const trend = assessWeightTrend(weights);
  const latestKg = weights.at(-1)?.weightKg ?? null;
  const previousKg = weights.length >= 2 ? weights[weights.length - 2]!.weightKg : null;
  const truthLine = dailyWeightVsTrendMessage({
    todayKg: latestKg,
    previousKg,
    trend,
  });

  return (
    <div className="stack">
      <header className="panel page-header">
        <h1>Progress proof</h1>
        <p className="muted">
          Longer-term evidence for days when the scale is noisy. Missing dates stay missing —
          never fabricated as zero.
        </p>
      </header>

      <section className="panel stack" aria-labelledby="truth-engine-title">
        <h2 id="truth-engine-title">Weight trend truth</h2>
        <p style={{ margin: 0, fontWeight: 650 }}>{trend.message}</p>
        {truthLine && (
          <p className="proof-win" style={{ margin: 0, fontSize: 'var(--text-sm)' }}>
            {truthLine}
          </p>
        )}
        <p className="dim" style={{ margin: 0, fontSize: 'var(--text-footnote)' }}>
          Status: {trend.status.replace(/_/g, ' ')}
          {trend.sampleSize > 0 ? ` · ${trend.sampleSize} weigh-ins` : ''}
          {trend.avg7ChangeKg != null ? ` · Δ7d avg ${trend.avg7ChangeKg > 0 ? '+' : ''}${trend.avg7ChangeKg} kg` : ''}
          . Single mornings do not rewrite the plan.
        </p>
      </section>

      <WeeklyReviewCard />

      <section className="panel stack" aria-labelledby="milestones-title">
        <h2 id="milestones-title">Milestones & consistency</h2>
        <div className="stack" style={{ gap: 12 }}>
          {habits.foodDays >= 7 && (
            <div className="proof-win">
              <strong>Honest tracking week</strong>
              <p className="muted" style={{ margin: '4px 0 0', fontSize: 'var(--text-sm)' }}>
                {habits.foodDays} days with food logged in the recent window — effort that
                compounds.
              </p>
            </div>
          )}
          {habits.workoutDays >= 3 && (
            <div className="proof-win">
              <strong>Training consistency</strong>
              <p className="muted" style={{ margin: '4px 0 0', fontSize: 'var(--text-sm)' }}>
                {habits.workoutDays} training or recovery sessions logged recently.
              </p>
            </div>
          )}
          {waists.length >= 2 && (
            <div className="proof-win">
              <strong>Waist trend started</strong>
              <p className="muted" style={{ margin: '4px 0 0', fontSize: 'var(--text-sm)' }}>
                {waists.length} waist measurements — useful when weight alone is noisy.
              </p>
            </div>
          )}
          {habits.foodDays < 7 && habits.workoutDays < 3 && waists.length < 2 && (
            <p className="muted" style={{ margin: 0 }}>
              Milestones appear as you collect honest logs — returning after a hard week counts
              too.
            </p>
          )}
        </div>
      </section>

      <section className="panel chart-panel">
        <h2>Weight</h2>
        <p className="dim" style={{ fontSize: 'var(--text-footnote)', margin: '0 0 12px' }}>
          Daily weigh-ins vs 7-day average (average only when enough points exist).
        </p>
        <div style={{ width: '100%', height: 280 }}>
          {chartData.length === 0 ? (
            <p className="empty-state">Log morning weights to see the chart.</p>
          ) : (
            <ResponsiveContainer>
              <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" stroke="var(--text-dim)" fontSize={11} tickLine={false} />
                <YAxis
                  domain={['auto', 'auto']}
                  stroke="var(--text-dim)"
                  fontSize={11}
                  unit=" kg"
                  width={48}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-panel)',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    fontFamily:
                      '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                  }}
                  labelStyle={{ color: 'var(--text-muted)' }}
                />
                <ReferenceLine
                  y={settings.targetWeightKg}
                  stroke="var(--accent)"
                  strokeDasharray="4 4"
                  label={{
                    value: String(settings.targetWeightKg),
                    fill: 'var(--accent)',
                    fontSize: 11,
                  }}
                />
                <ReferenceLine
                  y={settings.startingWeightKg}
                  stroke="var(--text-dim)"
                  strokeDasharray="2 4"
                />
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke="var(--text-muted)"
                  strokeWidth={1.5}
                  dot={{ r: 2.5, fill: 'var(--text-dim)' }}
                  name="Daily"
                />
                <Line
                  type="monotone"
                  dataKey="avg7"
                  stroke="var(--accent)"
                  strokeWidth={2.5}
                  dot={false}
                  name="7-day avg"
                />
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
            <div className="label">Step target hit</div>
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
        <h2 style={{ fontSize: '1.05rem' }}>Birthday forecast</h2>
        <p className="muted" style={{ margin: 0 }}>
          Required average weekly loss to hit {settings.targetWeightKg} kg by{' '}
          {settings.deadline}:{' '}
          <strong className="mono">
            {weekly == null ? 'n/a' : `${weekly} kg/week`}
          </strong>
          . Informational — never an instruction to crash diet.
        </p>
        <p className="dim" style={{ fontSize: '0.85rem', margin: 0 }}>
          {projection.confidence === 'insufficient_data'
            ? projection.paceNote
            : `At recent pace, estimate ~${projection.projectedKg} kg by deadline${
                projection.estimatedArrivalDate
                  ? ` · ~${projection.estimatedArrivalDate} to target (linear estimate)`
                  : ''
              }.`}
        </p>
        {projection.confidence === 'estimate' && (
          <p className="dim" style={{ fontSize: 'var(--text-footnote)', margin: 0 }}>
            {projection.paceNote}
          </p>
        )}
      </section>
    </div>
  );
}
