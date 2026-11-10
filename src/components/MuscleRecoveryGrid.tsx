import { useMemo } from 'react';
import { muscleRecovery } from '../domain/muscleRecovery';
import { LIBRARY_MUSCLE_INDEX } from '../domain/exerciseLibrary';
import type { WorkoutEntry } from '../domain/types';

/** 10-cell grid: how recovered each muscle group is since it was last trained. */
export function MuscleRecoveryGrid({ workouts }: { workouts: WorkoutEntry[] }) {
  const rows = useMemo(() => muscleRecovery(workouts, new Date(), LIBRARY_MUSCLE_INDEX), [workouts]);
  const trained = rows.some((r) => r.pct != null);

  return (
    <section className="panel stack" aria-labelledby="recovery-grid-title">
      <div className="section-head">
        <h2 id="recovery-grid-title" style={{ fontSize: 'var(--text-lg)' }}>
          Muscle recovery
        </h2>
        <span className="dim" style={{ fontSize: 'var(--text-caption)' }}>
          72 h big · 48 h small groups
        </span>
      </div>
      {!trained ? (
        <p className="muted" style={{ margin: 0 }}>
          Log a top set and each muscle it works shows up here with its recovery.
        </p>
      ) : (
        <ul className="recovery-grid">
          {rows.map((r) => {
            const tone = r.pct == null ? 'fresh' : r.pct >= 100 ? 'ready' : r.pct >= 50 ? 'mid' : 'low';
            return (
              <li key={r.id} className={`recovery-cell ${tone}`}>
                <span className="recovery-label">{r.label}</span>
                <span className="recovery-pct mono">{r.pct == null ? '—' : `${r.pct}%`}</span>
                <span className="recovery-bar" aria-hidden>
                  <span style={{ width: `${r.pct ?? 0}%` }} />
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
