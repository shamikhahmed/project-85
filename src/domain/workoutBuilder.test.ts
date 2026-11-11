import { describe, expect, it } from 'vitest';
import { EXERCISE_BY_ID, fitsSetting, type MuscleId, type Setting } from './exerciseLibrary';
import { buildPlayerSteps } from './workoutPlayer';
import {
  SHOULDER_RISK,
  bandOf,
  buildWorkout,
  defaultPick,
  indirectCoverage,
  pairable,
  readinessFrom,
  sanitizePicks,
  sessionTitle,
  slotsOf,
  suggestReady,
  swapOptions,
  tierOf,
  toPlayerExercises,
  type BuildInput,
} from './workoutBuilder';

const pick = (muscle: MuscleId, count?: number, focus?: string) => ({
  ...defaultPick(muscle),
  ...(count != null ? { count } : {}),
  ...(focus ? { focus } : {}),
});

const build = (picks: ReturnType<typeof pick>[], over: Partial<BuildInput> = {}) =>
  buildWorkout({ picks, setting: 'gym', sets: 3, supersets: false, seed: 7, shoulderCaution: true, ...over });

const ids = (r: ReturnType<typeof build>) => r.exercises.map((b) => b.ex.id);
const indexWhere = (r: ReturnType<typeof build>, f: (b: ReturnType<typeof build>['exercises'][number]) => boolean) =>
  r.exercises.findIndex(f);

describe('buildWorkout — picking', () => {
  it('is repeatable for the same seed and changes with Shuffle', () => {
    const picks = [pick('chest'), pick('back'), pick('biceps')];
    expect(ids(build(picks))).toEqual(ids(build(picks)));
    const first = build(picks);
    const shuffled = build(picks, { seed: 99, avoid: ids(first) });
    const same = ids(shuffled).filter((id) => ids(first).includes(id)).length;
    expect(same).toBeLessThan(first.exercises.length);
  });

  it('gives each muscle the number of exercises asked for, without repeats', () => {
    const r = build([pick('chest', 4), pick('biceps', 3), pick('forearms', 3), pick('shoulders', 4), pick('abs', 3), pick('calves', 2)]);
    const per = (m: MuscleId) => r.exercises.filter((b) => b.muscle === m).length;
    expect([per('chest'), per('biceps'), per('forearms'), per('shoulders'), per('abs'), per('calves')]).toEqual([4, 3, 3, 4, 3, 2]);
    expect(new Set(ids(r)).size).toBe(r.exercises.length);
    expect(r.shortfalls).toEqual([]);
  });

  it('only uses equipment you have', () => {
    const settings: Setting[] = ['gym', 'dumbbells', 'home'];
    for (const setting of settings) {
      const r = build([pick('chest'), pick('back'), pick('quads'), pick('hamstrings'), pick('shoulders'), pick('abs')], { setting });
      for (const b of r.exercises) expect(fitsSetting(b.ex, setting), `${b.ex.id} @ ${setting}`).toBe(true);
    }
  });

  it('leaves dips out when shoulder caution is on', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const r = build([pick('chest', 5), pick('triceps', 5)], { seed });
      for (const b of r.exercises) expect(SHOULDER_RISK.has(b.ex.id)).toBe(false);
    }
    expect(build([pick('triceps', 5)]).notes.join(' ')).toMatch(/dips are left out/);
  });

  it('covers every part of a muscle before doubling up', () => {
    const r = build([pick('chest', 3)]);
    const covers = (f: string) => r.exercises.some((b) => (b.ex.facets[f] ?? 0) >= 0.7);
    expect(covers('flat') && covers('incline') && covers('fly')).toBe(true);
    const tri = build([pick('triceps', 2)]);
    expect(tri.exercises.some((b) => (b.ex.facets.long ?? 0) >= 0.6)).toBe(true);
  });

  it('follows the focus', () => {
    const upper = build([pick('chest', 2, 'upper')]);
    expect(upper.exercises.some((b) => (b.ex.facets.incline ?? 0) >= 0.8)).toBe(true);
    const side = build([pick('shoulders', 2, 'side-rear')]);
    expect(side.exercises.every((b) => (b.ex.facets.front ?? 0) < 0.5)).toBe(true);
  });

  it('lets pressing cover the triceps’ pressing role, so triceps picks go elsewhere', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const r = build([pick('chest', 3), pick('triceps', 2)], { seed });
      const tri = r.exercises.filter((b) => b.muscle === 'triceps');
      expect(tri.some((b) => (b.ex.facets.long ?? 0) >= 0.6), `seed ${seed}`).toBe(true);
      expect(tri.every((b) => (b.ex.facets.press ?? 0) < 0.8), `seed ${seed}`).toBe(true);
    }
    const bench = EXERCISE_BY_ID.get('bb-bench')!;
    expect(indirectCoverage(bench, 'shoulders').front).toBeGreaterThan(0.2);
    expect(indirectCoverage(bench, 'chest')).toEqual({});
  });

  it('prefers loadable equipment over bands in a gym', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const r = build([pick('quads', 3), pick('biceps', 3), pick('shoulders', 3)], { seed });
      expect(r.exercises.filter((b) => b.ex.equip === 'band'), `seed ${seed}`).toEqual([]);
    }
  });

  it('keeps pinned exercises and reports shortfalls', () => {
    const r = build([pick('chest', 2)], { pinned: [{ id: 'pec-deck', muscle: 'chest' }] });
    expect(ids(r)).toContain('pec-deck');
    expect(r.exercises.find((b) => b.ex.id === 'pec-deck')!.pinned).toBe(true);
    const home = build([pick('forearms', 5)], { setting: 'home' });
    expect(home.shortfalls).toEqual([{ muscle: 'forearms', wanted: 5, got: 2 }]);
    expect(home.notes[0]).toMatch(/only 2 of 5/);
  });

  it('rebuilds the same session from its slots (templates, swaps)', () => {
    const first = build([pick('back'), pick('biceps')]);
    const again = build([pick('back'), pick('biceps')], { pinned: slotsOf(first.exercises), seed: 12345 });
    expect(ids(again)).toEqual(ids(first));
    // Held slots keep their own reasons; only what you added says so.
    expect(again.exercises.some((b) => b.pinned)).toBe(false);
    expect(again.exercises.flatMap((b) => b.why)).not.toContain('You added this one.');
  });

  it('keeps an exercise pinned for one muscle away from the others', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const r = build([pick('chest', 3), pick('triceps', 1)], { seed, pinned: [{ id: 'close-grip-bench', muscle: 'triceps' }] });
      const cg = r.exercises.filter((b) => b.ex.id === 'close-grip-bench');
      expect(cg.map((b) => b.muscle), `seed ${seed}`).toEqual(['triceps']);
      expect(cg[0].pinned).toBe(true);
    }
  });
});

describe('buildWorkout — order', () => {
  it('puts compounds before isolation work for the same muscle', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const r = build([pick('quads', 3), pick('hamstrings', 2), pick('chest', 3)], { seed });
      for (const m of ['quads', 'chest'] as MuscleId[]) {
        const firstIso = indexWhere(r, (b) => b.muscle === m && b.ex.kind === 'isolation');
        const lastCompound = r.exercises.map((b, i) => (b.ex.primary === m && b.ex.kind === 'compound' ? i : -1)).reduce((a, b) => Math.max(a, b), -1);
        if (firstIso >= 0) expect(firstIso, `${m} seed ${seed}`).toBeGreaterThan(lastCompound);
      }
    }
  });

  it('trains limiting helpers after the lifts they limit', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const push = build([pick('triceps', 2), pick('chest', 3)], { seed });
      const lastPress = Math.max(...push.exercises.map((b, i) => (b.ex.primary === 'chest' && b.ex.kind === 'compound' ? i : -1)));
      const firstTri = indexWhere(push, (b) => b.ex.primary === 'triceps');
      expect(firstTri, `seed ${seed}`).toBeGreaterThan(lastPress);

      const pull = build([pick('forearms', 2), pick('back', 3)], { seed });
      const lastRow = Math.max(...pull.exercises.map((b, i) => (b.ex.primary === 'back' && b.ex.kind === 'compound' ? i : -1)));
      expect(indexWhere(pull, (b) => b.ex.primary === 'forearms'), `seed ${seed}`).toBeGreaterThan(lastRow);

      const legs = build([pick('quads', 2, 'squat'), pick('abs', 2)], { seed });
      expect(indexWhere(legs, (b) => b.ex.primary === 'abs'), `seed ${seed}`).toBeGreaterThan(0);
      // Even with abs picked first, a heavy barbell squat goes before tiring the core.
      const brace = build([pick('abs', 2), pick('quads', 1, 'squat')], { seed, pinned: [{ id: 'back-squat', muscle: 'quads' }] });
      expect(indexWhere(brace, (b) => b.ex.id === 'back-squat'), `seed ${seed}`).toBe(0);
    }
  });

  it('never pre-exhausts, even in a long session that puts a small muscle first', () => {
    // 13 exercises × 5 sets, grip picked first: the grip work still waits for the hinges it limits.
    for (const seed of [1, 2, 3]) {
      const r = build([pick('forearms', 3, 'size'), pick('glutes', 5), pick('calves', 5)], { sets: 5, seed, supersets: seed === 2 });
      r.exercises.forEach((b, i) => {
        if (b.ex.kind !== 'isolation') return;
        const later = r.exercises.slice(i + 1).filter((x) => x.ex.kind === 'compound');
        for (const c of later) {
          expect(c.ex.primary === b.ex.primary || (c.ex.limit[b.ex.primary] ?? 0) >= 0.5, `${b.ex.id} before ${c.ex.id}`).toBe(false);
        }
      });
    }
  });

  it('keeps each muscle’s exercises together without supersets', () => {
    const r = build([pick('chest'), pick('biceps'), pick('shoulders'), pick('forearms')]);
    const seq = r.exercises.map((b) => b.muscle);
    const blocks = seq.filter((m, i) => i === 0 || seq[i - 1] !== m);
    expect(new Set(blocks).size).toBe(blocks.length);
  });

  it('opens with the first exercise fresh and fades after', () => {
    const r = build([pick('chest'), pick('back')]);
    expect(r.exercises[0].freshness).toBe(1);
    for (const b of r.exercises) {
      expect(b.freshness).toBeGreaterThanOrEqual(0.2);
      expect(b.freshness).toBeLessThanOrEqual(1);
    }
  });

  it('explains every exercise', () => {
    const r = build([pick('chest'), pick('triceps')]);
    for (const b of r.exercises) expect(b.why.length).toBeGreaterThan(0);
    expect(r.exercises[0].why.join(' ')).toMatch(/First/);
    const press = r.exercises.find((b) => b.ex.primary === 'chest' && b.ex.kind === 'compound')!;
    expect(press.why.join(' ')).toMatch(/triceps/);
  });
});

describe('buildWorkout — supersets', () => {
  it('pairs neighbours that do not share or limit a muscle', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const r = build([pick('chest'), pick('back'), pick('biceps'), pick('triceps')], { seed, supersets: true });
      const groups = new Map<string, number[]>();
      r.exercises.forEach((b, i) => b.group && groups.set(b.group, [...(groups.get(b.group) ?? []), i]));
      expect(groups.size).toBeGreaterThan(0);
      for (const [g, idx] of groups) {
        expect(idx.length, g).toBe(2);
        expect(idx[1] - idx[0]).toBe(1);
        const [a, b] = idx.map((i) => r.exercises[i]);
        expect(pairable(a.ex, b.ex)).toBe(true);
        expect(a.muscle).not.toBe(b.muscle);
        expect(a.restSec).toBe(b.restSec);
      }
    }
  });

  it('never moves a superset partner ahead of a heavier lift for the same muscle', () => {
    for (let seed = 1; seed <= 15; seed++) {
      const r = build([pick('biceps'), pick('chest'), pick('forearms'), pick('shoulders')], { seed, supersets: true });
      const chest = r.exercises.filter((b) => b.muscle === 'chest');
      const heavy = chest.findIndex((b) => b.tier === 'heavy');
      if (heavy > 0) expect(chest.slice(0, heavy).every((b) => b.tier === 'heavy')).toBe(true);
    }
  });

  it('saves time', () => {
    const picks = [pick('chest'), pick('back'), pick('biceps'), pick('triceps')];
    expect(build(picks, { supersets: true }).minutes).toBeLessThan(build(picks).minutes);
  });
});

describe('buildWorkout — prescription', () => {
  it('sets reps and rest by lift type', () => {
    expect(tierOf(EXERCISE_BY_ID.get('back-squat')!)).toBe('heavy');
    expect(tierOf(EXERCISE_BY_ID.get('db-bench')!)).toBe('compound');
    expect(tierOf(EXERCISE_BY_ID.get('leg-ext')!)).toBe('isolation');
    expect(tierOf(EXERCISE_BY_ID.get('db-lateral')!)).toBe('small');
    expect(tierOf(EXERCISE_BY_ID.get('standing-calf')!)).toBe('core');
    expect(tierOf(EXERCISE_BY_ID.get('kb-swing')!)).toBe('compound');

    const r = build([pick('quads', 1, 'squat')], { pinned: [{ id: 'back-squat', muscle: 'quads' }] });
    const squat = r.exercises[0];
    expect(squat.reps).toBe('5-8');
    expect(squat.restSec).toBe(180);
    expect(squat.rows.filter((x) => x.warmup)).toHaveLength(3);
    expect(squat.rows.filter((x) => !x.warmup)).toHaveLength(3);
  });

  it('skips warm-ups once the muscle is warm, but ramps heavy lifts', () => {
    const r = build([pick('back', 2), pick('biceps', 1)], { pinned: [{ id: 'db-row', muscle: 'back' }, { id: 'incline-curl', muscle: 'biceps' }] });
    expect(r.exercises[0].rows.some((x) => x.warmup)).toBe(true);
    const curl = r.exercises.find((b) => b.ex.id === 'incline-curl')!;
    expect(curl.rows.some((x) => x.warmup)).toBe(false);
  });

  it('uses library rep overrides (holds, carries) and a hold guide', () => {
    const r = build([pick('abs', 1)], { pinned: [{ id: 'plank', muscle: 'abs' }] });
    expect(r.exercises[0].reps).toBe('30-60 s');
    expect(r.exercises[0].rows.at(-1)!.guide).toMatch(/Hold/);
  });

  it('counts volume, including indirect work, against the per-session plateau', () => {
    expect([bandOf(3), bandOf(4), bandOf(10), bandOf(11), bandOf(13)]).toEqual(['light', 'productive', 'productive', 'high', 'over']);
    const r = build([pick('chest', 3)]);
    const chest = r.volume.find((v) => v.muscle === 'chest')!;
    expect(chest.sets).toBeGreaterThanOrEqual(9);
    expect(r.volume.some((v) => v.muscle === 'triceps' && !v.picked)).toBe(true);
    const big = build([pick('chest', 6)], { sets: 4 });
    expect(big.notes.join(' ')).toMatch(/Past about 11/);
  });

  it('puts every over-volume muscle in one warning, not one card each', () => {
    const r = build([pick('chest', 5), pick('back', 5), pick('calves', 5)], { sets: 5 });
    const warn = r.notes.filter((n) => n.includes('Past about 11'));
    expect(warn).toHaveLength(1);
    for (const m of ['Chest', 'Back', 'Calves']) expect(warn[0]).toContain(m);
    expect(warn[0]).not.toMatch(/undefined|NaN/);
  });

  it('estimates the session length', () => {
    const short = build([pick('abs', 2)]);
    const long = build([pick('chest', 4), pick('back', 4), pick('shoulders', 4)]);
    expect(short.minutes).toBeGreaterThan(0);
    expect(long.minutes).toBeGreaterThan(short.minutes);
    expect(long.notes.join(' ')).toMatch(/min — long/);
  });

  it('warns when a picked muscle is not recovered', () => {
    const r = build([pick('chest')], { readiness: { chest: 40 } });
    expect(r.notes.join(' ')).toMatch(/Chest is 40% recovered/);
  });
});

describe('builder helpers', () => {
  it('sanitizes picks: unique, max 6, counts 1–6, known focus', () => {
    const out = sanitizePicks([
      { muscle: 'chest', count: 9, focus: 'nope' },
      { muscle: 'chest', count: 2, focus: 'upper' },
      { muscle: 'back', count: 0, focus: 'width' },
      ...(['biceps', 'triceps', 'abs', 'quads', 'calves'] as MuscleId[]).map((m) => defaultPick(m)),
    ]);
    expect(out).toHaveLength(6);
    expect(out[0]).toEqual({ muscle: 'chest', count: 6, focus: 'balanced' });
    expect(out[1]).toEqual({ muscle: 'back', count: 3, focus: 'width' });
    expect(buildWorkout({ picks: [], setting: 'gym', sets: 3, supersets: false, seed: 1 }).exercises).toEqual([]);
  });

  it('suggests a coherent set of ready muscles', () => {
    const fresh = suggestReady({});
    expect(fresh).toHaveLength(3);
    const upperSore = suggestReady({ chest: 30, back: 40, shoulders: 45, triceps: 20, biceps: 35, core: 100 } as never);
    expect(upperSore[0]).toBe('quads');
    expect(upperSore.every((m) => ['quads', 'hamstrings', 'glutes', 'calves', 'abs'].includes(m))).toBe(true);
  });

  it('maps recovery-grid groups onto builder muscles', () => {
    const r = readinessFrom([
      { id: 'chest', label: 'Chest', pct: 50, lastDate: '2026-11-09' },
      { id: 'core', label: 'Core', pct: null, lastDate: null },
    ]);
    expect(r.chest).toBe(50);
    expect(r.abs).toBeNull();
    expect(r.forearms).toBeUndefined();
  });

  it('offers similar swaps that are not already in the session', () => {
    const r = build([pick('chest', 3)]);
    const slot = r.exercises[0];
    const used = new Set(ids(r));
    const opts = swapOptions(slot, 'gym', used, true);
    expect(opts.length).toBeGreaterThan(2);
    for (const e of opts) {
      expect(used.has(e.id)).toBe(false);
      expect(SHOULDER_RISK.has(e.id)).toBe(false);
    }
  });

  it('turns a build into player steps, alternating superset sets', () => {
    const r = build([pick('chest', 1), pick('back', 1)], {
      supersets: true,
      pinned: [{ id: 'db-bench', muscle: 'chest' }, { id: 'lat-pulldown', muscle: 'back' }],
    });
    expect(r.exercises.map((b) => b.group)).toEqual(['A', 'A']);
    const steps = buildPlayerSteps(toPlayerExercises(r.exercises));
    const work = steps.filter((s) => !/warm/i.test(s.setLabel));
    expect(work.map((s) => s.name)).toEqual([
      'Dumbbell bench press', 'Lat pulldown', 'Dumbbell bench press', 'Lat pulldown', 'Dumbbell bench press', 'Lat pulldown',
    ]);
    expect(work[0].restSec).toBe(15);
    expect(work[1].restSec).toBe(120);
    expect(steps.filter((s) => /warm/i.test(s.setLabel)).every((s) => s.restSec === 45)).toBe(true);
    expect(sessionTitle([pick('chest'), pick('back')])).toBe('Chest + Back');
  });
});

describe('buildWorkout — cardio the same day', () => {
  const legsChest = [pick('quads', 3), pick('chest', 3)];
  const LOWER = new Set(['quads', 'hamstrings', 'glutes', 'calves']);
  const legs = (r: ReturnType<typeof build>) => r.exercises.filter((b) => LOWER.has(b.ex.primary));
  const fresh = (r: ReturnType<typeof build>, id: string) => r.exercises.find((b) => b.ex.id === id)!.freshness;
  const cardioNotes = (r: ReturnType<typeof build>) =>
    r.notes.filter((n) => /cardio|bike|run|walk|warm-up|Sporer|Morán/.test(n) && !/Shoulder caution/.test(n));

  it('changes nothing without cardio, and nothing for an easy warm-up', () => {
    const none = build(legsChest, { sets: 4 });
    expect(JSON.stringify(build(legsChest, { sets: 4, cardio: [] }))).toBe(JSON.stringify(none));
    const warm = build(legsChest, { sets: 4, cardio: [{ when: 'before', mode: 'bike', minutes: 5, effort: 'easy' }] });
    expect(ids(warm)).toEqual(ids(none));
    expect(warm.exercises.map((b) => [b.workSets, b.freshness, b.rows])).toEqual(none.exercises.map((b) => [b.workSets, b.freshness, b.rows]));
    expect(warm.cardioMinutes).toBe(5);
    expect(cardioNotes(warm)).toEqual([expect.stringMatching(/warm-up costs no reps/)]);
  });

  it('starts the legs part-tired after hard cycling, but not the chest (Sporer & Wenger 2003)', () => {
    const none = build(legsChest, { sets: 4 });
    const bike = build(legsChest, { sets: 4, cardio: [{ when: 'before', mode: 'bike', minutes: 30, effort: 'hard' }] });
    expect(ids(bike).slice().sort()).toEqual(ids(none).slice().sort()); // same exercises, maybe a new order
    for (const b of legs(bike)) {
      expect(b.freshness).toBeLessThan(fresh(none, b.ex.id));
      expect(b.why.join(' ')).toMatch(/part-tired from the bike before/);
    }
    for (const b of bike.exercises.filter((x) => x.ex.primary === 'chest')) {
      expect(b.freshness).toBeGreaterThanOrEqual(fresh(none, b.ex.id) - 0.05);
    }
    const note = cardioNotes(bike).join(' ');
    expect(note).toMatch(/Sporer & Wenger 2003/);
    expect(note).toMatch(/Murlasits 2018/);
    // Legs wait while the bike wears off; the first exercise says so instead of "you are fresh".
    expect(LOWER.has(bike.exercises[0].ex.primary)).toBe(false);
    expect(bike.exercises[0].why.join(' ')).toMatch(/recover from the bike/);
  });

  it('counts only the lasting part of cardio done hours earlier', () => {
    const none = build(legsChest, { sets: 4 });
    const before = build(legsChest, { sets: 4, cardio: [{ when: 'before', mode: 'run', minutes: 45, effort: 'moderate' }] });
    const earlier = build(legsChest, { sets: 4, cardio: [{ when: 'earlier', mode: 'run', minutes: 45, effort: 'moderate' }] });
    const squat = earlier.exercises.find((b) => b.ex.primary === 'quads' && b.ex.kind === 'compound')!;
    expect(squat.freshness).toBeLessThan(fresh(none, squat.ex.id));
    expect(squat.freshness).toBeGreaterThan(Math.min(...legs(before).map((b) => b.freshness)));
    expect(earlier.cardioMinutes).toBe(0);
    expect(cardioNotes(earlier).join(' ')).toMatch(/earlier today/);
  });

  it('saves the legs for hard cardio after: 2–3 reps short and a set fewer, chest untouched', () => {
    const r = build(legsChest, { sets: 4, cardio: [{ when: 'after', mode: 'bike', minutes: 20, effort: 'hard' }] });
    for (const b of legs(r)) {
      expect(b.cardioHold).toBe('set');
      expect(b.workSets).toBe(3);
      const guides = b.rows.filter((x) => !x.warmup).map((x) => x.guide);
      expect(guides.at(-1)).toBe('2 in the tank — cardio next');
      expect(guides.join(' ')).not.toMatch(/failure|never grind|1 rep|1–2/);
      expect(b.why.join(' ')).toMatch(/One set fewer .* for the bike after/);
    }
    for (const b of r.exercises.filter((x) => x.ex.primary === 'chest')) {
      expect(b.cardioHold).toBe('none');
      expect(b.workSets).toBe(4);
    }
    expect(r.cardioMinutes).toBe(20);
    expect(cardioNotes(r)).toEqual([expect.stringMatching(/Saving your legs for the bike after: 3 exercises do a set fewer/)]);
  });

  it('holds every exercise back before a long hard session, but never below 2 sets', () => {
    const r = build(legsChest, { sets: 4, cardio: [{ when: 'after', mode: 'run', minutes: 40, effort: 'hard' }] });
    expect(r.exercises.every((b) => b.cardioHold !== 'none')).toBe(true);
    const two = build(legsChest, { sets: 2, cardio: [{ when: 'after', mode: 'run', minutes: 90, effort: 'hard' }] });
    expect(two.exercises.every((b) => b.workSets === 2 && b.cardioHold === 'reps')).toBe(true);
  });

  it("leaves the session as planned for the plan's own short finisher", () => {
    const r = build(legsChest, { sets: 4, cardio: [{ when: 'after', mode: 'incline', minutes: 12, effort: 'moderate' }] });
    expect(r.exercises.every((b) => b.cardioHold === 'none')).toBe(true);
    expect(ids(r)).toEqual(ids(build(legsChest, { sets: 4 })));
    expect(cardioNotes(r)).toEqual([expect.stringMatching(/light enough/)]);
  });

  it('holds back for a run later today too, less than straight after', () => {
    const later = build(legsChest, { sets: 4, cardio: [{ when: 'later', mode: 'run', minutes: 45, effort: 'moderate' }] });
    expect(legs(later).every((b) => b.cardioHold === 'reps')).toBe(true);
    expect(later.exercises.filter((b) => b.ex.primary === 'chest').every((b) => b.cardioHold === 'none')).toBe(true);
    expect(legs(later)[0].rows.filter((x) => !x.warmup).at(-1)!.guide).toBe('2 in the tank — cardio later');
    expect(later.cardioMinutes).toBe(0);
    // Running on a leg day gets the gentler-machine hint, with both sides of the evidence.
    expect(cardioNotes(later).join(' ')).toMatch(/Wilson 2012.*Schumann 2022/);
  });

  it('puts the cardio into the player as steps of its own that log nothing', () => {
    const cardio = [
      { when: 'before', mode: 'bike', minutes: 5, effort: 'easy' },
      { when: 'after', mode: 'incline', minutes: 12, effort: 'moderate' },
    ] as const;
    const r = build(legsChest, { cardio: [...cardio] });
    const players = toPlayerExercises(r.exercises, [...cardio]);
    expect(players.length).toBe(r.exercises.length + 2);
    expect(players[0]).toMatchObject({ name: 'Bike', media: '2138-H1PESYI', logs: false });
    expect(players.at(-1)).toMatchObject({ name: 'Incline walk', logs: false, sets: [['Cardio', '12 min', 'Moderate: short sentences only']] });
    const steps = buildPlayerSteps(players);
    expect(steps.filter((s) => s.logs).length).toBe(r.exercises.length);
    expect(steps[0].restSec).toBeGreaterThan(0);
    expect(steps.at(-1)!.restSec).toBe(0);
    expect(toPlayerExercises(r.exercises).length).toBe(r.exercises.length);
  });

  it('is repeatable and keeps every note readable', () => {
    const input = {
      sets: 4,
      cardio: [
        { when: 'earlier', mode: 'swim', minutes: 40, effort: 'hard' },
        { when: 'after', mode: 'rower', minutes: 25, effort: 'hard' },
      ] as BuildInput['cardio'],
    };
    const picks = [pick('back', 3), pick('shoulders', 2), pick('quads', 2)];
    expect(JSON.stringify(build(picks, input))).toBe(JSON.stringify(build(picks, input)));
    const r = build(picks, input);
    for (const t of [...r.notes, ...r.exercises.flatMap((b) => b.why)]) expect(t).not.toMatch(/undefined|NaN|null|\[object/);
    expect(cardioNotes(r).length).toBe(1);
  });
});
