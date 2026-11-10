import { useMemo, useState } from 'react';
import { ExerciseGif } from './ExerciseGif';
import { demoUrl } from '../domain/exerciseMedia';
import {
  EQUIP_LABEL,
  LIBRARY,
  MUSCLES,
  MUSCLE_BY_ID,
  SETTING_LABEL,
  fitsSetting,
  muscleLabel,
  type LibExercise,
  type MuscleId,
  type Setting,
} from '../domain/exerciseLibrary';
import { SHOULDER_RISK } from '../domain/workoutBuilder';
import './WorkoutBuilder.css';

const SETTINGS: Setting[] = ['gym', 'dumbbells', 'home'];

function searchText(e: LibExercise): string {
  const info = MUSCLE_BY_ID.get(e.primary)!;
  return [
    e.name,
    info.label,
    EQUIP_LABEL[e.equip],
    e.kind,
    ...Object.keys(e.facets).map((f) => info.facets[f] ?? ''),
    ...(Object.keys(e.inv) as MuscleId[]).map((m) => muscleLabel(m)),
  ]
    .join(' ')
    .toLowerCase();
}

const INDEX = new Map(LIBRARY.map((e) => [e.id, searchText(e)]));

/** Train → Library: every exercise the builder knows, searchable, with cues and an "Add to build". */
export function ExerciseLibrary({
  onAdd,
  shoulderCaution,
}: {
  onAdd: (id: string) => void;
  shoulderCaution: boolean;
}) {
  const [q, setQ] = useState('');
  const [muscle, setMuscle] = useState<MuscleId | 'all'>('all');
  const [where, setWhere] = useState<Setting | 'all'>('all');

  const groups = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    const hits = LIBRARY.filter(
      (e) =>
        (muscle === 'all' || e.primary === muscle) &&
        (where === 'all' || fitsSetting(e, where)) &&
        words.every((w) => INDEX.get(e.id)!.includes(w)),
    );
    return MUSCLES.map((m) => ({
      m,
      items: hits
        .filter((e) => e.primary === m.id)
        .sort((a, b) => Number(b.kind === 'compound') - Number(a.kind === 'compound') || a.name.localeCompare(b.name)),
    })).filter((g) => g.items.length > 0);
  }, [q, muscle, where]);
  const total = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <div className="stack">
      <section className="panel stack">
        <div>
          <h1 className="wb-title">Exercise library</h1>
          <p className="muted wb-sub">
            {LIBRARY.length} exercises, each with an animation, form cues and what it works. Add any of them to a build.
          </p>
        </div>
        <input
          className="input"
          type="search"
          inputMode="search"
          placeholder="Search: incline, cable, hamstrings…"
          aria-label="Search exercises"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="wb-chips" role="radiogroup" aria-label="Muscle">
          {(['all', ...MUSCLES.map((m) => m.id)] as const).map((id) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={muscle === id}
              className={muscle === id ? 'on' : ''}
              onClick={() => setMuscle(id)}
            >
              {id === 'all' ? 'All' : muscleLabel(id)}
            </button>
          ))}
        </div>
        <div className="seg-control wb-seg" role="radiogroup" aria-label="Equipment">
          {(['all', ...SETTINGS] as const).map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={where === s}
              className={where === s ? 'active' : ''}
              onClick={() => setWhere(s)}
            >
              {s === 'all' ? 'Any' : SETTING_LABEL[s]}
            </button>
          ))}
        </div>
        <p className="dim wb-caption" aria-live="polite">
          {total === LIBRARY.length ? `${total} exercises` : `${total} of ${LIBRARY.length} exercises`}
        </p>
      </section>

      {groups.map(({ m, items }) => (
        <section key={m.id} className="panel stack" aria-labelledby={`lib-${m.id}`}>
          <div className="section-head">
            <h2 id={`lib-${m.id}`} className="wb-h2">
              {m.label}
            </h2>
            <span className="dim wb-caption">{items.length}</span>
          </div>
          <div className="wb-lib">
            {items.map((e) => (
              <LibRow key={e.id} e={e} onAdd={onAdd} risky={shoulderCaution && SHOULDER_RISK.has(e.id)} />
            ))}
          </div>
        </section>
      ))}
      {total === 0 && (
        <p className="muted" style={{ margin: '0 4px' }}>
          Nothing matches. Try one word, or set the filters back to All and Any.
        </p>
      )}
    </div>
  );
}

function LibRow({ e, onAdd, risky }: { e: LibExercise; onAdd: (id: string) => void; risky: boolean }) {
  const [open, setOpen] = useState(false);
  const info = MUSCLE_BY_ID.get(e.primary)!;
  const works = Object.entries(e.facets)
    .filter(([, v]) => v >= 0.3)
    .sort((a, b) => b[1] - a[1])
    .map(([f, v]) => (v >= 0.6 ? info.facets[f] : `some ${info.facets[f].toLowerCase()}`));
  const helpers = (Object.entries(e.inv) as [MuscleId, number][])
    .filter(([, v]) => v >= 0.3)
    .sort((a, b) => b[1] - a[1])
    .map(([m]) => muscleLabel(m));
  const fits = SETTINGS.filter((s) => fitsSetting(e, s)).map((s) => SETTING_LABEL[s]);

  return (
    <details className="wb-lib-row" onToggle={(ev) => setOpen(ev.currentTarget.open)}>
      <summary>
        <ExerciseGif name={e.name} media={e.media} size="sm" />
        <span className="wb-lib-text">
          <span className="ex-name">{e.name}</span>
          <span className="ex-muscle">
            {EQUIP_LABEL[e.equip]} · {e.kind}
            {e.uni ? ' · one side' : ''}
          </span>
        </span>
        <span className="ex-chev" aria-hidden>
          ›
        </span>
      </summary>
      {open && (
        <div className="ex-body">
          <ExerciseGif name={e.name} media={e.media} />
          <dl className="wb-facts">
            <div>
              <dt>Works</dt>
              <dd>{works.join(' · ') || info.label}</dd>
            </div>
            {helpers.length > 0 && (
              <div>
                <dt>Helpers</dt>
                <dd>{helpers.join(', ')}</dd>
              </div>
            )}
            <div>
              <dt>Where</dt>
              <dd>{fits.join(' · ')}</dd>
            </div>
            {e.stretch >= 0.8 && (
              <div>
                <dt>Stretch</dt>
                <dd>Hard at long muscle length — a strong growth signal</dd>
              </div>
            )}
          </dl>
          <ul className="ex-cues">
            {e.cues.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          {risky && (
            <p className="ex-pain">Left out of builds while shoulder caution is on (Settings).</p>
          )}
          <div className="wb-ex-actions">
            <button type="button" className="btn btn-primary" disabled={risky} onClick={() => onAdd(e.id)}>
              Add to build
            </button>
            <a className="btn btn-ghost" href={demoUrl(e.name)} target="_blank" rel="noopener">
              Demo video
            </a>
          </div>
        </div>
      )}
    </details>
  );
}
