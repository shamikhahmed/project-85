/**
 * Sweep: every muscle × count × setting × superset choice, a few hundred random sessions, and
 * random sequences of user edits. Hard rules must hold for every single build.
 */
import { describe, expect, it } from 'vitest';
import { EXERCISE_BY_ID, LIBRARY, MUSCLES, type MuscleId, type Setting } from './exerciseLibrary';
import { buildPlayerSteps } from './workoutPlayer';
import { CARDIO_MODES, type CardioBlock, type CardioEffort, type CardioWhen } from './cardioLoad';
import {
  MAX_COUNT,
  SHOULDER_RISK,
  bandOf,
  buildWorkout,
  isAllowed,
  mulberry32,
  pairable,
  serves,
  swapOptions,
  toPlayerExercises,
  type BuildInput,
  type BuildResult,
  type MusclePick,
} from './workoutBuilder';
import {
  addExercise,
  buildNow,
  fromTemplate,
  initialBuilder,
  moveUp,
  parseBuilder,
  removeAt,
  setCardio,
  setCount,
  setFocus,
  setSets,
  setSetting,
  setSupersets,
  shuffle,
  swapAt,
  toTemplate,
  toggleMuscle,
  type BuilderState,
} from './builderState';

const SETTINGS: Setting[] = ['gym', 'dumbbells', 'home'];
const WHENS: CardioWhen[] = ['earlier', 'before', 'after', 'later'];
const EFFORTS: CardioEffort[] = ['easy', 'moderate', 'hard'];
function randomCardio(rng: () => number): CardioBlock[] {
  return WHENS.filter(() => rng() < 0.4).map((when) => ({
    when,
    mode: CARDIO_MODES[Math.floor(rng() * CARDIO_MODES.length)].id,
    minutes: [5, 10, 12, 20, 30, 45, 60, 90][Math.floor(rng() * 8)],
    effort: EFFORTS[Math.floor(rng() * 3)],
  }));
}
const BAD_TEXT = /undefined|NaN|null|\[object/;

/** Rules every build must keep. Returns what broke. */
function hardRules(input: BuildInput, r: BuildResult): string[] {
  const errs: string[] = [];
  const ids = r.exercises.map((b) => b.ex.id);
  if (new Set(ids).size !== ids.length) errs.push('same exercise twice');
  for (const b of r.exercises) {
    if (!isAllowed(b.ex, input.setting, input.shoulderCaution)) errs.push(`${b.ex.id} not possible at ${input.setting}`);
    if (input.shoulderCaution && SHOULDER_RISK.has(b.ex.id)) errs.push(`${b.ex.id} despite shoulder caution`);
    if (!input.picks.some((p) => p.muscle === b.muscle)) errs.push(`${b.ex.id} for unpicked ${b.muscle}`);
    if (!serves(b.ex, b.muscle)) errs.push(`${b.ex.id} does not train ${b.muscle}`);
    if (!(b.freshness >= 0.2 && b.freshness <= 1)) errs.push(`${b.ex.id} freshness ${b.freshness}`);
    const work = b.rows.filter((x) => !x.warmup);
    const want = Math.round(input.sets) - (b.cardioHold === 'set' ? 1 : 0);
    if (work.length !== b.workSets || b.workSets !== want) errs.push(`${b.ex.id} ${work.length} work sets, hold ${b.cardioHold}`);
    if (b.cardioHold === 'set' && Math.round(input.sets) < 3) errs.push(`${b.ex.id} trimmed below 2 sets`);
    if (b.cardioHold !== 'none' && !(input.cardio ?? []).some((c) => c.when === 'after' || c.when === 'later')) errs.push(`${b.ex.id} held with no cardio ahead`);
    if (b.cardioHold !== 'none' && work.some((x) => /failure|never grind|1 rep\b|1–2/.test(x.guide))) errs.push(`${b.ex.id} held but pushed to failure`);
    const firstWork = b.rows.findIndex((x) => !x.warmup);
    if (b.rows.slice(firstWork).some((x) => x.warmup)) errs.push(`${b.ex.id} warm-up after a work set`);
    if (!(b.restSec >= 45 && b.restSec <= 240)) errs.push(`${b.ex.id} rest ${b.restSec}`);
    if (!b.why.length) errs.push(`${b.ex.id} has no reason`);
    for (const t of [b.reps, ...b.why, ...b.rows.flatMap((x) => [x.label, x.reps, x.guide])]) {
      if (!t || BAD_TEXT.test(t)) errs.push(`${b.ex.id} text "${t}"`);
    }
  }
  const pinned = input.pinned ?? [];
  for (const p of input.picks) {
    const got = r.exercises.filter((b) => b.muscle === p.muscle).length;
    const mine = pinned.filter((s) => s.muscle === p.muscle).length;
    const sf = r.shortfalls.find((s) => s.muscle === p.muscle);
    if (got < p.count && !(sf && sf.got === got && sf.wanted === p.count)) errs.push(`${p.muscle} ${got}/${p.count}, no shortfall note`);
    if (got > Math.max(p.count, mine)) errs.push(`${p.muscle} ${got} > ${p.count}`);
  }
  const groups = new Map<string, number[]>();
  r.exercises.forEach((b, i) => {
    if (b.group) groups.set(b.group, [...(groups.get(b.group) ?? []), i]);
  });
  if (!input.supersets && groups.size) errs.push('supersets while off');
  for (const [g, at] of groups) {
    if (at.length !== 2 || at[1] !== at[0] + 1) errs.push(`superset ${g} at ${at.join(',')}`);
    else if (!pairable(r.exercises[at[0]].ex, r.exercises[at[1]].ex)) errs.push(`superset ${g} not pairable`);
  }
  for (const v of r.volume) {
    if (!Number.isFinite(v.sets) || v.sets < 0 || v.band !== bandOf(v.sets)) errs.push(`volume ${v.muscle} ${v.sets} ${v.band}`);
  }
  for (const p of input.picks) {
    if (!r.volume.some((v) => v.muscle === p.muscle && v.picked)) errs.push(`no volume row for ${p.muscle}`);
  }
  if (r.exercises.length && !(r.minutes > 0 && r.minutes < 400)) errs.push(`minutes ${r.minutes}`);
  for (const n of r.notes) if (BAD_TEXT.test(n)) errs.push(`note "${n}"`);
  r.exercises.forEach((b, i) => {
    if (b.ex.kind !== 'isolation') return;
    // No pre-exhaustion: a muscle's isolation waits for its compounds and for those it clearly limits.
    const c = r.exercises
      .slice(i + 1)
      .find((x) => x.ex.kind === 'compound' && (x.ex.primary === b.ex.primary || (x.ex.limit[b.ex.primary] ?? 0) >= 0.5));
    if (c) errs.push(`${b.ex.id} before ${c.ex.id}`);
  });

  const cardio = input.cardio ?? [];
  const steps = buildPlayerSteps(toPlayerExercises(r.exercises, cardio));
  const extra = r.exercises.length ? cardio.filter((c) => c.when === 'before' || c.when === 'after').length : 0;
  const rows = r.exercises.reduce((n, b) => n + b.rows.length, 0) + extra;
  const onSite = cardio.filter((c) => c.when === 'before' || c.when === 'after').reduce((n, c) => n + c.minutes, 0);
  if (r.exercises.length && r.cardioMinutes !== onSite) errs.push(`cardio minutes ${r.cardioMinutes} ≠ ${onSite}`);
  if (cardio.length && r.exercises.length && r.notes.filter((n) => /Morán|light enough|warm-up costs|Sporer|other muscles than/.test(n)).length > 1) errs.push('more than one cardio note');
  if (steps.length !== rows) errs.push(`player ${steps.length} steps for ${rows} sets`);
  steps.forEach((s, i) => {
    if (i < steps.length - 1 && !(s.restSec > 0)) errs.push(`player step ${i} rest ${s.restSec}`);
  });
  if (steps.length && steps[steps.length - 1].restSec !== 0) errs.push('player: rest after the last set');
  if (steps.filter((s) => s.logs).length !== r.exercises.length) errs.push('player: one logged set per exercise');
  return errs;
}

const inputOf = (s: BuilderState, caution: boolean): BuildInput => ({
  picks: s.picks,
  setting: s.setting,
  sets: s.sets,
  supersets: s.supersets,
  seed: s.seed,
  pinned: s.pinned,
  avoid: s.avoid,
  shoulderCaution: caution,
  readiness: s.readiness,
  cardio: s.cardio,
});

describe('builder sweep', () => {
  it('keeps every rule for each muscle, count, setting and superset choice', () => {
    const errs: string[] = [];
    for (const setting of SETTINGS) {
      for (const caution of [true, false]) {
        for (const supersets of [false, true]) {
          for (const m of MUSCLES) {
            for (let count = 1; count <= MAX_COUNT; count++) {
              const input: BuildInput = {
                picks: [{ muscle: m.id, count, focus: m.focus[count % m.focus.length].id }],
                setting,
                sets: 3,
                supersets,
                seed: count,
                shoulderCaution: caution,
              };
              const r = buildWorkout(input);
              for (const e of hardRules(input, r)) errs.push(`${m.id}×${count} ${setting}${supersets ? ' ss' : ''}: ${e}`);
            }
          }
        }
      }
    }
    expect(errs.slice(0, 15)).toEqual([]);
  }, 60_000);

  it('keeps every rule for random multi-muscle sessions', () => {
    const rng = mulberry32(2026);
    const pickOf = <T,>(xs: readonly T[]) => xs[Math.floor(rng() * xs.length)];
    const errs: string[] = [];
    const held = { none: 0, reps: 0, set: 0 };
    for (let k = 0; k < 400; k++) {
      const n = 1 + Math.floor(rng() * 6);
      const muscles = [...MUSCLES].sort(() => rng() - 0.5).slice(0, n);
      const picks: MusclePick[] = muscles.map((m) => ({
        muscle: m.id,
        count: 1 + Math.floor(rng() * (n > 4 ? 3 : 5)),
        focus: pickOf(m.focus).id,
      }));
      const readiness: Partial<Record<MuscleId, number | null>> = {};
      if (rng() < 0.4) for (const m of MUSCLES) readiness[m.id] = rng() < 0.3 ? Math.floor(rng() * 100) : null;
      const input: BuildInput = {
        picks,
        setting: pickOf(SETTINGS),
        sets: 2 + Math.floor(rng() * 4),
        supersets: rng() < 0.5,
        seed: Math.floor(rng() * 1e6),
        shoulderCaution: rng() < 0.7,
        readiness,
        cardio: rng() < 0.5 ? randomCardio(rng) : [],
      };
      const r = buildWorkout(input);
      for (const b of r.exercises) held[b.cardioHold]++;
      for (const e of hardRules(input, r)) errs.push(`#${k} ${JSON.stringify(picks.map((p) => `${p.muscle}${p.count}`))} ${input.setting}: ${e}`);
      if (k % 20 === 0) expect(buildWorkout(input).exercises.map((b) => b.ex.id)).toEqual(r.exercises.map((b) => b.ex.id));
    }
    expect(errs.slice(0, 15)).toEqual([]);
    // The random cardio really exercised both kinds of hold.
    expect(held.reps).toBeGreaterThan(20);
    expect(held.set).toBeGreaterThan(20);
  }, 60_000);

  it('survives random sequences of edits, and the saved state reads back the same', () => {
    const rng = mulberry32(85);
    const errs: string[] = [];
    const ids = LIBRARY.map((e) => e.id);
    for (let seq = 0; seq < 60; seq++) {
      const caution = rng() < 0.7;
      let s: BuilderState = initialBuilder();
      let list: BuildResult['exercises'] = [];
      for (let step = 0; step < 30; step++) {
        const before = list;
        const check: ((now: string[]) => void)[] = [];
        const m = MUSCLES[Math.floor(rng() * MUSCLES.length)];
        const op = Math.floor(rng() * 14);
        let what = '';
        const did = (label: string, next: BuilderState) => {
          what = label;
          s = next;
        };
        if (op === 0 || op === 1) did(`toggle ${m.id}`, toggleMuscle(s, m.id));
        else if (op === 2) did(`count ${m.id}`, setCount(s, m.id, 1 + Math.floor(rng() * 6)));
        else if (op === 3) did(`focus ${m.id}`, setFocus(s, m.id, m.focus[Math.floor(rng() * m.focus.length)].id));
        else if (op === 4) did(`up ${m.id}`, moveUp(s, m.id));
        else if (op === 5) did('setting', setSetting(s, SETTINGS[Math.floor(rng() * 3)]));
        else if (op === 6) did('sets', setSupersets(setSets(s, 2 + Math.floor(rng() * 4)), rng() < 0.5));
        else if (op === 7) did('build', buildNow(s, {}, '2026-11-11'));
        else if (op === 8 && s.built && list.length) did('shuffle', shuffle(s, list));
        else if (op === 9 && s.built && list.length) {
          const i = Math.floor(rng() * list.length);
          const alt = swapOptions(list[i], s.setting, new Set(list.map((b) => b.ex.id)), caution)[0];
          if (alt) {
            const old = list[i].ex.id;
            what = `swap ${old}→${alt.id}`;
            s = swapAt(s, list, i, alt.id);
            check.push((now) => {
              if (!now.includes(alt.id) || now.includes(old) || now.length !== before.length) errs.push(`seq ${seq}: ${what} did not stick`);
            });
          }
        } else if (op === 10 && s.built && list.length) {
          const i = Math.floor(rng() * list.length);
          const old = list[i].ex.id;
          what = `remove ${old}`;
          s = removeAt(s, list, i);
          check.push((now) => {
            if (now.includes(old) || now.length !== before.length - 1) errs.push(`seq ${seq}: ${what} → ${now.length}`);
          });
        } else if (op === 11) {
          const id = ids[Math.floor(rng() * ids.length)];
          const res = addExercise(s, list, id, caution, {}, '2026-11-11');
          what = `add ${id} ${res.ok ? 'ok' : res.reason}`;
          if (res.ok) {
            s = res.state;
            check.push((now) => {
              if (!now.includes(id)) errs.push(`seq ${seq}: ${what} missing`);
            });
          } else if (res.reason === 'setting' && isAllowed(EXERCISE_BY_ID.get(id)!, s.setting, caution)) {
            errs.push(`seq ${seq}: ${what} but it is allowed`);
          }
        } else if (op === 12 && s.built && list.length) {
          what = 'template';
          const back = fromTemplate(JSON.parse(JSON.stringify(toTemplate(s, list, 'T', 't', 'now'))), {}, '2026-11-11', s.cardio);
          const again = buildWorkout(inputOf(back, caution)).exercises.map((b) => b.ex.id);
          if (again.join() !== list.map((b) => b.ex.id).join()) errs.push(`seq ${seq}: template changed the session`);
          if (JSON.stringify(back.cardio) !== JSON.stringify(s.cardio)) errs.push(`seq ${seq}: template dropped the cardio`);
        } else if (op === 13) {
          const when = WHENS[Math.floor(rng() * 4)];
          const pickBlock = rng() < 0.3 ? null : randomCardio(() => 0.1)[0] ?? null;
          const block = pickBlock && { mode: CARDIO_MODES[Math.floor(rng() * CARDIO_MODES.length)].id, minutes: pickBlock.minutes, effort: EFFORTS[Math.floor(rng() * 3)] };
          did(`cardio ${when} ${block ? `${block.mode} ${block.effort}` : 'off'}`, setCardio(s, when, block));
          if ((s.cardio.find((c) => c.when === when) ? 1 : 0) !== (block ? 1 : 0)) errs.push(`seq ${seq}: ${what} did not stick`);
        }
        if (JSON.stringify(parseBuilder(JSON.parse(JSON.stringify(s)))) !== JSON.stringify(s)) errs.push(`seq ${seq} ${what}: saved state reads back different`);
        if (s.picks.length > 6 || s.picks.some((p) => p.count < 1 || p.count > MAX_COUNT)) errs.push(`seq ${seq} ${what}: bad picks`);
        if (s.built && !s.picks.length) errs.push(`seq ${seq} ${what}: built with nothing picked`);
        if (s.picks.length) {
          const input = inputOf(s, caution);
          const r = buildWorkout(input);
          for (const e of hardRules(input, r)) errs.push(`seq ${seq} after ${what}: ${e}`);
          list = r.exercises;
        } else {
          list = [];
        }
        for (const c of check) c(list.map((b) => b.ex.id));
      }
    }
    expect(errs.slice(0, 15)).toEqual([]);
  }, 60_000);
});
