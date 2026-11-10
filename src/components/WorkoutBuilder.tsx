import { useMemo, useState, type FormEvent } from 'react';
import { format } from 'date-fns';
import * as repo from '../data/repository';
import { useAppStore } from '../store/useAppStore';
import { ExerciseGif } from './ExerciseGif';
import { RestTimer, type RestState } from './RestTimer';
import { WorkoutPlayer } from './WorkoutPlayer';
import { demoUrl } from '../domain/exerciseMedia';
import {
  EQUIP_LABEL,
  EXERCISE_BY_ID,
  MUSCLES,
  MUSCLE_BY_ID,
  SETTING_LABEL,
  muscleLabel,
  type LibExercise,
  type MuscleId,
  type Setting,
} from '../domain/exerciseLibrary';
import {
  BAND_LABEL,
  MAX_COUNT,
  MAX_MUSCLES,
  TIER_LABEL,
  sessionTitle,
  suggestReady,
  swapOptions,
  toPlayerExercises,
  type BuildResult,
  type BuiltExercise,
} from '../domain/workoutBuilder';
import {
  MAX_SETS,
  MIN_SETS,
  buildNow,
  editSetup,
  fromTemplate,
  moveUp,
  refreshRecovery,
  removeAt,
  setAllCounts,
  setCount,
  setFocus,
  setMuscles,
  setSets,
  setSetting,
  setSupersets,
  shuffle,
  swapAt,
  templateSummary,
  toTemplate,
  toggleMuscle,
  type BuilderState,
} from '../domain/builderState';
import type { SavedWorkout, WorkoutExercise } from '../domain/types';
import { parseLocalDate } from '../lib/dates';
import { CUSTOM_NOTE_PREFIX, isNewBest, lastLogsByName, progressionHint, type LastLog } from '../lib/trainingLog';
import type { BuilderApi } from './useWorkoutBuilder';
import './WorkoutBuilder.css';

const SETTINGS: Setting[] = ['gym', 'dumbbells', 'home'];
const SETTING_HINT: Record<Setting, string> = {
  gym: 'Everything: barbells, machines, cables, dumbbells.',
  dumbbells: 'Dumbbells and a bench — no bars or machines.',
  home: 'Bodyweight and a resistance band — no bar, no bench.',
};
const fmtDay = (iso: string) => format(parseLocalDate(iso), 'd MMM');
const toTop = () => window.scrollTo({ top: 0 });

export function WorkoutBuilder({ api, onOpenLibrary }: { api: BuilderApi; onOpenLibrary: () => void }) {
  const { state, setState, result, liveReadiness, history, reload, today, shoulderCaution } = api;
  const settings = useAppStore((s) => s.settings);
  const setToast = useAppStore((s) => s.setToast);
  const refreshDay = useAppStore((s) => s.refreshDay);
  const refreshSettings = useAppStore((s) => s.refreshSettings);
  const [playing, setPlaying] = useState(false);
  const [rest, setRest] = useState<RestState>(null);
  const [saveName, setSaveName] = useState<string | null>(null);

  const list = useMemo(() => result?.exercises ?? [], [result]);
  const title = sessionTitle(state.picks);
  const templates = settings?.customWorkouts ?? [];
  const todaySession = history.find((w) => w.date === today && w.notes === `${CUSTOM_NOTE_PREFIX}${title}`);
  const lastLogs = useMemo(() => lastLogsByName(history, list.map((b) => b.ex.name), today), [history, list, today]);
  const lastKg = useMemo(
    () => Object.fromEntries(Object.entries(lastLogs).map(([k, v]) => [k, v?.weightKg])),
    [lastLogs],
  );
  const players = useMemo(() => toPlayerExercises(list), [list]);
  const codes = useMemo(() => exerciseCodes(list), [list]);
  const trained = Object.values(liveReadiness).some((v) => v != null);

  const saveSet = async (name: string, weightKg: number | undefined, reps: number | undefined) => {
    const ex: WorkoutExercise = { name, weightKg, reps, sets: 1, notes: 'top set' };
    const best = isNewBest(history, name, today, weightKg, reps);
    await repo.logCustomExercise(today, title, ex);
    await Promise.all([reload(), refreshDay()]);
    setToast(best ? `🏆 New best on ${name}: ${weightKg} kg${reps != null ? ` × ${reps}` : ''}` : `${name} logged`);
  };

  const saveTemplate = async (e: FormEvent) => {
    e.preventDefault();
    if (saveName == null || !list.length) return;
    const id = globalThis.crypto?.randomUUID?.() ?? `w-${Date.now()}`;
    const t = toTemplate(state, list, saveName, id, new Date().toISOString());
    await repo.updateSettings({ customWorkouts: [t, ...templates.filter((x) => x.name !== t.name)].slice(0, 30) });
    await refreshSettings();
    setSaveName(null);
    setToast(`Saved “${t.name}” — open it any time from Edit`);
  };

  const deleteTemplate = async (t: SavedWorkout) => {
    if (!window.confirm(`Delete the saved workout “${t.name}”?`)) return;
    await repo.updateSettings({ customWorkouts: templates.filter((x) => x.id !== t.id) });
    await refreshSettings();
    setToast(`Deleted “${t.name}”`);
  };

  const startRest = (b: BuiltExercise) => {
    setRest({ endsAt: Date.now() + b.restSec * 1000, total: b.restSec, label: b.ex.name });
  };

  if (!state.built || !result || !list.length) {
    return (
      <div className="stack">
        <BuilderSetup
          state={state}
          setState={setState}
          result={result}
          readiness={liveReadiness}
          trained={trained}
          onBuild={() => {
            setState(buildNow(state, liveReadiness, today));
            toTop();
          }}
        />
        {templates.length > 0 && (
          <section className="panel stack" aria-labelledby="wb-saved-title">
            <h2 id="wb-saved-title" className="wb-h2">
              Saved workouts
            </h2>
            <ul className="wb-saved">
              {templates.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    className="wb-saved-open"
                    onClick={() => {
                      setState(fromTemplate(t, liveReadiness, today));
                      toTop();
                    }}
                  >
                    <strong>{t.name}</strong>
                    <span>{templateSummary(t)}</span>
                  </button>
                  <button type="button" className="wb-icon" aria-label={`Delete ${t.name}`} onClick={() => void deleteTemplate(t)}>
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
        <button type="button" className="btn btn-ghost wb-link" onClick={onOpenLibrary}>
          Browse all exercises in the library ›
        </button>
      </div>
    );
  }

  const workSets = list.reduce((n, b) => n + b.workSets, 0);
  const pairs = new Set(list.map((b) => b.group).filter(Boolean)).size;
  const loggedCount = todaySession?.exercises?.length ?? 0;
  const stale = state.builtOn != null && state.builtOn !== today;
  const used = new Set(list.map((b) => b.ex.id));

  return (
    <div className="stack">
      <RestTimer rest={rest} onChange={setRest} />
      <section className="panel stack">
        <div>
          <p className="briefing-kicker">Custom session · {SETTING_LABEL[state.setting]}</p>
          <h1 className="wb-title">{title}</h1>
          <p className="muted wb-sub">
            {list.length} exercises · {workSets} working sets · about {result.minutes} min
            {pairs > 0 ? ` · ${pairs} superset${pairs > 1 ? 's' : ''}` : ''}
          </p>
        </div>
        <div className="wb-actions">
          <button
            type="button"
            className="btn"
            onClick={() => {
              setState(editSetup(state));
              toTop();
            }}
          >
            Edit
          </button>
          <button type="button" className="btn" onClick={() => setState(shuffle(state, list))}>
            Shuffle
          </button>
          <button type="button" className="btn" aria-expanded={saveName != null} onClick={() => setSaveName((n) => (n == null ? title : null))}>
            Save
          </button>
        </div>
        {saveName != null && (
          <form className="wb-save" onSubmit={(e) => void saveTemplate(e)}>
            <label htmlFor="wb-save-name">Name this workout</label>
            <div className="wb-save-row">
              <input
                id="wb-save-name"
                className="input"
                value={saveName}
                maxLength={60}
                autoFocus
                onChange={(e) => setSaveName(e.target.value)}
              />
              <button type="submit" className="btn btn-primary">
                Save
              </button>
            </div>
          </form>
        )}
        {stale && (
          <div className="train-banner warn" role="status">
            Built on {fmtDay(state.builtOn!)}. Recovery has changed since.{' '}
            <button type="button" className="btn btn-ghost wb-inline" onClick={() => setState(refreshRecovery(state, list, liveReadiness, today))}>
              Re-order for today
            </button>
          </div>
        )}
      </section>

      <button type="button" className="btn btn-primary train-play" onClick={() => setPlaying(true)}>
        ▶ Start workout
        <span>{loggedCount > 0 ? `${loggedCount} of ${list.length} logged` : `${list.length} exercises`}</span>
      </button>
      {playing && (
        <WorkoutPlayer
          title={title}
          exercises={players}
          lastKg={lastKg}
          doneNames={(todaySession?.exercises ?? []).map((e) => e.name)}
          onLog={saveSet}
          onClose={() => setPlaying(false)}
        />
      )}

      {result.notes.length > 0 && (
        <div className="wb-notes" role="status">
          {result.notes.map((n) => (
            <p key={n} className="train-banner">
              {n}
            </p>
          ))}
        </div>
      )}

      <VolumePanel result={result} />

      <section className="stack" aria-label="Exercises">
        {list.map((b, i) => (
          <BuiltCard
            key={b.ex.id}
            b={b}
            code={codes[i]}
            defaultOpen={i === 0}
            last={lastLogs[b.ex.name]}
            todayLog={todaySession?.exercises?.find((e) => e.name.toLowerCase() === b.ex.name.toLowerCase())}
            swaps={() => swapOptions(b, state.setting, used, shoulderCaution)}
            onSave={saveSet}
            onRest={() => startRest(b)}
            onSwap={(id) => {
              setState(swapAt(state, list, i, id));
              setToast(`Swapped in ${nameOf(id)}`);
            }}
            onRemove={() => {
              setState(removeAt(state, list, i));
              setToast(`${b.ex.name} removed`);
            }}
          />
        ))}
      </section>

      <p className="dim wb-foot">
        Order comes from a fatigue simulation: helpers that limit a lift (triceps for presses, grip for rows, core for
        squats) are trained after it, and your first muscle gets the freshest slot. The % on each card is the predicted
        strength left when you get there.
      </p>
    </div>
  );
}

/** "1, 2, A1, A2, 5 …" — superset partners share a letter. */
function exerciseCodes(list: BuiltExercise[]): string[] {
  const seen = new Map<string, number>();
  return list.map((b, i) => {
    if (!b.group) return String(i + 1);
    const n = (seen.get(b.group) ?? 0) + 1;
    seen.set(b.group, n);
    return `${b.group}${n}`;
  });
}

const nameOf = (id: string) => EXERCISE_BY_ID.get(id)?.name ?? id;

function BuilderSetup({
  state,
  setState,
  result,
  readiness,
  trained,
  onBuild,
}: {
  state: BuilderState;
  setState: (s: BuilderState) => void;
  result: BuildResult | null;
  readiness: Partial<Record<MuscleId, number | null>>;
  trained: boolean;
  onBuild: () => void;
}) {
  const full = state.picks.length >= MAX_MUSCLES;
  const exCount = result?.exercises.length ?? 0;
  const workSets = result?.exercises.reduce((n, b) => n + b.workSets, 0) ?? 0;

  return (
    <>
      <section className="panel stack">
        <div>
          <h1 className="wb-title">Build a workout</h1>
          <p className="muted wb-sub">
            Pick the muscles you want to train, in order of priority. The app chooses the exercises, puts them in the
            right order and sets the reps and rest.
          </p>
        </div>
        <div className="seg-control wb-seg" role="radiogroup" aria-label="Where are you training?">
          {SETTINGS.map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={state.setting === s}
              className={state.setting === s ? 'active' : ''}
              onClick={() => setState(setSetting(state, s))}
            >
              {SETTING_LABEL[s]}
            </button>
          ))}
        </div>
        <p className="dim wb-caption">{SETTING_HINT[state.setting]}</p>
      </section>

      <section className="panel stack" aria-labelledby="wb-muscles-title">
        <div className="section-head">
          <h2 id="wb-muscles-title" className="wb-h2">
            Muscles <span className="dim">{state.picks.length}/{MAX_MUSCLES}</span>
          </h2>
          {trained && (
            <button
              type="button"
              className="btn btn-ghost wb-mini"
              onClick={() => setState(setMuscles(state, suggestReady(readiness, 3)))}
            >
              Pick what's ready
            </button>
          )}
        </div>
        <div className="wb-muscles">
          {MUSCLES.map((m) => {
            const i = state.picks.findIndex((p) => p.muscle === m.id);
            const pct = readiness[m.id];
            const tone = pct == null ? 'fresh' : pct >= 100 ? 'ready' : pct >= 60 ? 'mid' : 'low';
            return (
              <button
                key={m.id}
                type="button"
                className={`wb-muscle${i >= 0 ? ' on' : ''}`}
                aria-pressed={i >= 0}
                aria-label={`${m.label}${i >= 0 ? `, priority ${i + 1}` : ''}${
                  m.recovery ? `, ${pct == null ? 'fresh' : pct >= 100 ? 'recovered' : `${pct}% recovered`}` : ''
                }`}
                disabled={i < 0 && full}
                onClick={() => setState(toggleMuscle(state, m.id))}
              >
                <span className="wb-muscle-top">
                  <span className="wb-muscle-name">{m.label}</span>
                  {i >= 0 && <span className="wb-order">{i + 1}</span>}
                </span>
                {m.recovery && (
                  <>
                    <span className={`wb-ready ${tone}`} aria-hidden>
                      <span style={{ width: `${pct ?? 100}%` }} />
                    </span>
                    <span className="wb-ready-txt">
                      {pct == null ? 'Fresh' : pct >= 100 ? 'Recovered' : `${pct}% recovered`}
                    </span>
                  </>
                )}
              </button>
            );
          })}
        </div>
        {state.picks.length === 0 && <p className="muted wb-caption">Tap one muscle or up to six. The first one you tap counts most.</p>}
      </section>

      {state.picks.length > 0 && (
        <section className="panel stack" aria-labelledby="wb-plan-title">
          <div className="section-head">
            <h2 id="wb-plan-title" className="wb-h2">
              Exercises per muscle
            </h2>
            <div className="wb-presets" role="group" aria-label="Same number for all">
              {[2, 3, 4].map((n) => (
                <button key={n} type="button" onClick={() => setState(setAllCounts(state, n))}>
                  All {n}
                </button>
              ))}
            </div>
          </div>
          <ol className="wb-picks">
            {state.picks.map((p, i) => {
              const info = MUSCLE_BY_ID.get(p.muscle)!;
              return (
                <li key={p.muscle} className="wb-pick">
                  <div className="wb-pick-head">
                    <span className="wb-order">{i + 1}</span>
                    <strong>{info.label}</strong>
                    {i > 0 && (
                      <button type="button" className="wb-icon" aria-label={`Move ${info.label} up`} onClick={() => setState(moveUp(state, p.muscle))}>
                        ↑
                      </button>
                    )}
                    <Stepper
                      value={p.count}
                      min={1}
                      max={MAX_COUNT}
                      label={`${info.label} exercises`}
                      onChange={(n) => setState(setCount(state, p.muscle, n))}
                    />
                  </div>
                  {info.focus.length > 1 && (
                    <div className="wb-focus" role="radiogroup" aria-label={`${info.label} focus`}>
                      {info.focus.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          role="radio"
                          aria-checked={p.focus === f.id}
                          className={p.focus === f.id ? 'on' : ''}
                          onClick={() => setState(setFocus(state, p.muscle, f.id))}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>

          <div className="wb-opt">
            <span>
              Sets per exercise
              <small>Warm-up sets are added only where a muscle is still cold</small>
            </span>
            <Stepper value={state.sets} min={MIN_SETS} max={MAX_SETS} label="sets" onChange={(n) => setState(setSets(state, n))} />
          </div>
          <label className="wb-opt">
            <span>
              Supersets
              <small>Pairs moves that don't tire each other and alternates their sets — saves time</small>
            </span>
            <input
              type="checkbox"
              role="switch"
              aria-label="Supersets"
              className="wb-switch"
              checked={state.supersets}
              onChange={(e) => setState(setSupersets(state, e.target.checked))}
            />
          </label>

          {result && (
            <p className="muted wb-caption" aria-live="polite">
              {exCount} exercises · {workSets} working sets · about {result.minutes} min
            </p>
          )}
          <button type="button" className="btn btn-primary wb-build" onClick={onBuild}>
            Build workout
          </button>
        </section>
      )}
    </>
  );
}

function Stepper({
  value,
  min,
  max,
  label,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  label: string;
  onChange: (n: number) => void;
}) {
  return (
    <div className="wb-stepper" role="group" aria-label={label}>
      <button type="button" aria-label={`Fewer ${label}`} disabled={value <= min} onClick={() => onChange(value - 1)}>
        −
      </button>
      <output className="mono" aria-live="polite">
        {value}
      </output>
      <button type="button" aria-label={`More ${label}`} disabled={value >= max} onClick={() => onChange(value + 1)}>
        +
      </button>
    </div>
  );
}

function VolumePanel({ result }: { result: BuildResult }) {
  return (
    <section className="panel stack" aria-labelledby="wb-vol-title">
      <div className="section-head">
        <h2 id="wb-vol-title" className="wb-h2">
          Volume
        </h2>
        <span className="dim wb-caption">hard sets per muscle · helper work counts by share</span>
      </div>
      <ul className="wb-vol">
        {result.volume.map((v) => (
          <li key={v.muscle} className={`${v.band}${v.picked ? '' : ' extra'}`}>
            <span className="wb-vol-name">{muscleLabel(v.muscle)}</span>
            <span className="wb-vol-bar" aria-hidden>
              <span style={{ width: `${Math.min(100, (v.sets / 14) * 100)}%` }} />
            </span>
            <span className="wb-vol-num mono">{v.sets}</span>
            <span className="wb-vol-band">{BAND_LABEL[v.band]}</span>
          </li>
        ))}
      </ul>
      <p className="dim wb-caption">
        The shaded band is about 4–10 sets: past roughly 11 in one session, extra sets add more tiredness than growth.
      </p>
    </section>
  );
}

function BuiltCard({
  b,
  code,
  defaultOpen,
  last,
  todayLog,
  swaps,
  onSave,
  onRest,
  onSwap,
  onRemove,
}: {
  b: BuiltExercise;
  code: string;
  defaultOpen: boolean;
  last: LastLog | undefined;
  todayLog: WorkoutExercise | undefined;
  swaps: () => LibExercise[];
  onSave: (name: string, weightKg: number | undefined, reps: number | undefined) => Promise<void>;
  onRest: () => void;
  onSwap: (id: string) => void;
  onRemove: () => void;
}) {
  const [swapOpen, setSwapOpen] = useState(false);
  const [kgEdit, setKgEdit] = useState<string | null>(null);
  const [repsEdit, setRepsEdit] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const timed = /\d\s*s\b/.test(b.reps);
  const kg = kgEdit ?? (todayLog?.weightKg != null ? String(todayLog.weightKg) : last?.weightKg != null ? String(last.weightKg) : '');
  const reps = repsEdit ?? (todayLog?.reps != null ? String(todayLog.reps) : '');
  const pct = Math.round(b.freshness * 100);
  const tone = pct >= 90 ? 'hi' : pct >= 70 ? 'mid' : 'lo';
  const muscle =
    b.muscle === b.ex.primary ? muscleLabel(b.muscle) : `${muscleLabel(b.muscle)} · via ${muscleLabel(b.ex.primary).toLowerCase()}`;
  const options = swapOpen ? swaps() : [];
  const idBase = `wb-${b.ex.id}`;

  const save = async () => {
    const k = kg.trim() === '' ? undefined : Number(kg);
    const r = reps.trim() === '' ? undefined : Number(reps);
    if ((k != null && (!Number.isFinite(k) || k < 0 || k > 500)) || (r != null && (!Number.isInteger(r) || r < 0 || r > 600))) return;
    if (k == null && r == null) return;
    setBusy(true);
    try {
      await onSave(b.ex.name, k, r);
      onRest();
      setKgEdit(null);
      setRepsEdit(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <details className={`ex wb-ex${todayLog ? ' done' : ''}${b.group ? ' paired' : ''}`} open={defaultOpen}>
      <summary>
        <span className="ex-code">{todayLog ? '✓' : code}</span>
        <span>
          <span className="ex-name">{b.ex.name}</span>
          <span className="ex-muscle">
            {muscle} · {b.workSets} × {b.reps}
          </span>
        </span>
        <span className={`wb-fresh ${tone}`} aria-label={`Predicted strength ${pct}%`}>
          {pct}%
        </span>
      </summary>
      <div className="ex-body">
        <ExerciseGif key={b.ex.id} name={b.ex.name} media={b.ex.media} />
        <div className="wb-tags">
          <span>{TIER_LABEL[b.tier]}</span>
          <span>{EQUIP_LABEL[b.ex.equip]}</span>
          {b.ex.uni && <span>One side at a time</span>}
          {b.group && <span className="accent">Superset {b.group}</span>}
          {b.pinned && <span className="accent">Added by you</span>}
        </div>
        <table className="ex-sets">
          <thead>
            <tr>
              <th>Set</th>
              <th>{timed ? 'Time' : 'Reps'}</th>
              <th>Guide</th>
            </tr>
          </thead>
          <tbody>
            {b.rows.map((r, j) => (
              <tr key={j} className={r.warmup ? 'wb-warm' : ''}>
                <td>{r.label}</td>
                <td>{r.reps}</td>
                <td>{r.guide}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="ex-meta">
          <strong>Rest:</strong> {b.restSec} s{b.group ? ' after each round of both' : ''}
          <button type="button" className="btn btn-ghost ex-rest-btn" onClick={onRest}>
            Start rest timer
          </button>
        </div>
        <ul className="ex-cues">
          {b.ex.cues.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
        <div className="ex-why">
          <strong>Why this, why here</strong>
          <ul className="wb-why">
            {b.why.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>

        <div className="ex-log">
          <div className="ex-log-head">
            <strong>Log your hardest set</strong>
            <span>
              {last?.weightKg != null || last?.reps != null
                ? `Last: ${last.weightKg != null ? `${last.weightKg} kg` : ''}${last.weightKg != null && last.reps != null ? ' × ' : ''}${last.reps ?? ''} (${fmtDay(last.date)})`
                : 'No log yet'}
            </span>
          </div>
          <p className="ex-hint">{timed ? 'Hold a few seconds longer than last time, with the same clean shape.' : progressionHint(last, b.reps)}</p>
          <div className="ex-log-row">
            <label htmlFor={`${idBase}-kg`}>
              kg
              <input
                id={`${idBase}-kg`}
                inputMode="decimal"
                type="number"
                step="0.5"
                min="0"
                value={kg}
                onChange={(e) => setKgEdit(e.target.value)}
              />
            </label>
            <label htmlFor={`${idBase}-reps`}>
              {timed ? 'sec' : 'reps'}
              <input
                id={`${idBase}-reps`}
                inputMode="numeric"
                type="number"
                step="1"
                min="0"
                placeholder={b.reps.split(/[-–\s]/)[0]}
                value={reps}
                onChange={(e) => setRepsEdit(e.target.value)}
              />
            </label>
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void save()}>
              {todayLog ? 'Update' : 'Save'}
            </button>
          </div>
        </div>

        <div className="wb-ex-actions">
          <button type="button" className={`btn${swapOpen ? ' wb-on' : ''}`} aria-expanded={swapOpen} onClick={() => setSwapOpen((o) => !o)}>
            Swap
          </button>
          <button type="button" className="btn btn-ghost" onClick={onRemove}>
            Remove
          </button>
          <a className="btn btn-ghost" href={demoUrl(b.ex.name)} target="_blank" rel="noopener">
            Demo video
          </a>
        </div>
        {swapOpen && (
          <ul className="wb-swaps" aria-label={`Swap ${b.ex.name} for`}>
            {options.length === 0 && <li className="muted">Nothing else fits here with this equipment.</li>}
            {options.map((e) => (
              <li key={e.id}>
                <button type="button" onClick={() => onSwap(e.id)}>
                  <ExerciseGif name={e.name} media={e.media} size="sm" />
                  <span>
                    <strong>{e.name}</strong>
                    <small>
                      {EQUIP_LABEL[e.equip]} · {e.kind === 'compound' ? 'compound' : 'isolation'}
                      {e.primary !== b.muscle ? ` · mainly ${muscleLabel(e.primary).toLowerCase()}` : ''}
                    </small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}
