import { useEffect, useState } from 'react';
import { eachISODate, toLocalISODate } from '../lib/dates';
import { buildDayAggregate } from '../lib/aggregates';
import type { DayAggregate, ExerciseSwapLog } from '../domain/types';
import { reasonLabel } from '../domain/exerciseSwap';
import * as repo from '../data/repository';
import { useAppStore } from '../store/useAppStore';
import { useNavigate } from 'react-router-dom';

export function HistoryPage() {
  const settings = useAppStore((s) => s.settings);
  const setDate = useAppStore((s) => s.setDate);
  const navigate = useNavigate();
  const [days, setDays] = useState<DayAggregate[]>([]);
  const [selected, setSelected] = useState<DayAggregate | null>(null);
  const [swaps, setSwaps] = useState<ExerciseSwapLog[]>([]);

  useEffect(() => {
    if (!settings) return;
    void (async () => {
      const end = toLocalISODate() > settings.deadline ? settings.deadline : toLocalISODate();
      const range = eachISODate(settings.startDate, settings.deadline);
      // Load mission window but only compute aggregates up to today for performance hint;
      // still show full calendar grid.
      const aggs: DayAggregate[] = [];
      for (const date of range) {
        if (date > end) {
          aggs.push({
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
          });
          continue;
        }
        const bundle = await repo.loadDayBundle(date);
        aggs.push(
          buildDayAggregate({
            date,
            settings: bundle.settings,
            weights: bundle.weights,
            foods: bundle.foods,
            steps: bundle.steps,
            water: bundle.water,
            workouts: bundle.workouts,
            sleep: bundle.sleep,
            cigarettes: bundle.cigarettes,
            notes: bundle.notes,
            score: bundle.score,
          }),
        );
      }
      setDays(aggs);
      setSwaps(await repo.getExerciseSwapLogs());
    })();
  }, [settings]);

  if (!settings) return null;

  const swapInsights = (() => {
    const byPlan = new Map<string, { count: number; reasons: Record<string, number> }>();
    for (const s of swaps) {
      const row = byPlan.get(s.planName) ?? { count: 0, reasons: {} };
      row.count += 1;
      row.reasons[s.reason] = (row.reasons[s.reason] ?? 0) + 1;
      byPlan.set(s.planName, row);
    }
    return [...byPlan.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 8);
  })();

  const byMonth = days.reduce<Record<string, DayAggregate[]>>((acc, d) => {
    const key = d.date.slice(0, 7);
    (acc[key] ??= []).push(d);
    return acc;
  }, {});

  return (
    <div className="stack page">
      <header className="panel page-header">
        <h1>History</h1>
        <p className="muted" style={{ margin: 0 }}>
          {settings.startDate} → {settings.deadline}. Tap a day to inspect or edit.
        </p>
      </header>

      {swapInsights.length > 0 && (
        <section className="panel stack">
          <h2 style={{ fontSize: '1rem' }}>Machine swaps</h2>
          <p className="muted" style={{ margin: 0, fontSize: 'var(--text-sm)' }}>
            How often each planned machine was swapped and why.
          </p>
          <ul className="train-list" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {swapInsights.map(([name, info]) => (
              <li
                key={name}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '10px 0',
                  borderBottom: '1px solid var(--border-subtle)',
                  fontSize: 'var(--text-sm)',
                }}
              >
                <span>
                  <strong>{name}</strong>
                  <br />
                  <span className="dim">
                    {Object.entries(info.reasons)
                      .map(([r, n]) => `${reasonLabel(r as 'busy')} ×${n}`)
                      .join(' · ')}
                  </span>
                </span>
                <span className="dim">{info.count}×</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {Object.entries(byMonth).map(([month, list]) => (
        <section key={month} className="panel">
          <h2 style={{ fontSize: '1rem', marginBottom: 12 }}>{month}</h2>
          <div className="cal-grid">
            {list.map((d) => {
              const tone =
                d.loggingCompleteness === 0
                  ? 'empty'
                  : d.loggingCompleteness >= 0.7 && (d.score ?? 0) >= 70
                    ? 'good'
                    : d.steps != null && d.steps >= settings.stepsTarget
                      ? 'mid'
                      : 'miss';
              return (
                <button
                  key={d.date}
                  type="button"
                  className={`cal-cell ${tone}`}
                  onClick={() => setSelected(d)}
                  aria-label={`Open ${d.date}`}
                >
                  <span className="cal-day">{Number(d.date.slice(8))}</span>
                  <span className="cal-meta mono">
                    {d.steps != null ? `${Math.round(d.steps / 1000)}k` : '·'}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ))}

      {selected && (
        <section className="panel stack" aria-live="polite">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: '1.1rem' }}>{selected.date}</h2>
            <button type="button" className="btn" onClick={() => setSelected(null)}>
              Close
            </button>
          </div>
          <div className="grid-metrics">
            <div className="metric">
              <div className="label">Weight</div>
              <div className="value" style={{ fontSize: '1rem' }}>
                {selected.primaryWeightKg ?? '—'}
              </div>
            </div>
            <div className="metric">
              <div className="label">Steps</div>
              <div className="value" style={{ fontSize: '1rem' }}>
                {selected.steps ?? 'unlogged'}
              </div>
            </div>
            <div className="metric">
              <div className="label">Calories</div>
              <div className="value" style={{ fontSize: '1rem' }}>
                {selected.foodEntryCount ? selected.calories : 'unlogged'}
              </div>
            </div>
            <div className="metric">
              <div className="label">Protein</div>
              <div className="value" style={{ fontSize: '1rem' }}>
                {selected.foodEntryCount ? `${selected.proteinG} g` : '—'}
              </div>
            </div>
            <div className="metric">
              <div className="label">Water</div>
              <div className="value" style={{ fontSize: '1rem' }}>
                {selected.waterMl || 'unlogged'}
              </div>
            </div>
            <div className="metric">
              <div className="label">Workout</div>
              <div className="value" style={{ fontSize: '1rem' }}>
                {selected.workoutTypes.join(', ') || 'unlogged'}
              </div>
            </div>
            <div className="metric">
              <div className="label">Sleep</div>
              <div className="value" style={{ fontSize: '1rem' }}>
                {selected.sleepHours ?? 'unlogged'}
              </div>
            </div>
            <div className="metric">
              <div className="label">Cigarettes</div>
              <div className="value" style={{ fontSize: '1rem' }}>
                {selected.cigarettesLogged ? selected.cigaretteCount : 'unlogged'}
              </div>
            </div>
            <div className="metric">
              <div className="label">Score</div>
              <div className="value" style={{ fontSize: '1rem' }}>
                {selected.score ?? '—'}
              </div>
            </div>
            <div className="metric">
              <div className="label">Completeness</div>
              <div className="value" style={{ fontSize: '1rem' }}>
                {Math.round(selected.loggingCompleteness * 100)}%
              </div>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={async () => {
              await setDate(selected.date);
              navigate('/log');
            }}
          >
            Edit this day
          </button>
        </section>
      )}

    </div>
  );
}
