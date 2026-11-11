import { describe, expect, it } from 'vitest';
import {
  addExercise,
  buildNow,
  fromTemplate,
  initialBuilder,
  moveUp,
  parseBuilder,
  refreshRecovery,
  removeAt,
  setAllCounts,
  setCount,
  setFocus,
  setMuscles,
  setSetting,
  shuffle,
  swapAt,
  toTemplate,
  toggleMuscle,
  type BuilderState,
} from './builderState';
import { buildWorkout, candidatesFor, swapOptions } from './workoutBuilder';

const TODAY = '2026-11-10';
const run = (s: BuilderState) =>
  buildWorkout({ picks: s.picks, setting: s.setting, sets: s.sets, supersets: s.supersets, seed: s.seed, pinned: s.pinned, avoid: s.avoid, shoulderCaution: true, readiness: s.readiness }).exercises;
const ids = (s: BuilderState) => run(s).map((b) => b.ex.id);

const chestBack = () => buildNow(setMuscles(initialBuilder(), ['chest', 'back']), {}, TODAY);

describe('builder state', () => {
  it('reads back only valid saved state', () => {
    expect(parseBuilder(null)).toEqual(initialBuilder());
    const s = parseBuilder({
      setting: 'moon',
      picks: [{ muscle: 'chest', count: 99, focus: 'nope' }, { muscle: 'wings', count: 2 }, { muscle: 'chest', count: 1 }],
      sets: 9,
      supersets: 'yes',
      pinned: [{ id: 'db-bench', muscle: 'chest' }, { id: 'ghost', muscle: 'chest' }, { id: 'db-row', muscle: 'back', kept: true }],
      avoid: ['db-bench', 'ghost'],
      built: true,
      readiness: { chest: 40, wings: 3, back: null },
      builtOn: 'yesterday',
    });
    expect(s.setting).toBe('gym');
    expect(s.picks).toEqual([{ muscle: 'chest', count: 6, focus: 'balanced' }]);
    expect(s.sets).toBe(5);
    expect(s.supersets).toBe(false);
    expect(s.pinned).toEqual([{ id: 'db-bench', muscle: 'chest' }, { id: 'db-row', muscle: 'back', kept: true }]);
    expect(s.avoid).toEqual(['db-bench']);
    expect(s.built).toBe(true);
    expect(s.readiness).toEqual({ chest: 40, back: null });
    expect(s.builtOn).toBeNull();
  });

  it('adds muscles in tap order, up to six, and removes them with their pins', () => {
    let s = initialBuilder();
    for (const m of ['biceps', 'chest', 'forearms', 'shoulders', 'abs', 'calves', 'quads'] as const) s = toggleMuscle(s, m);
    expect(s.picks.map((p) => p.muscle)).toEqual(['biceps', 'chest', 'forearms', 'shoulders', 'abs', 'calves']);
    s = { ...s, pinned: [{ id: 'db-bench', muscle: 'chest' }] };
    s = toggleMuscle(s, 'chest');
    expect(s.picks.map((p) => p.muscle)).not.toContain('chest');
    expect(s.pinned).toEqual([]);
    expect(moveUp(s, 'forearms').picks[0].muscle).toBe('forearms');
  });

  it('goes back to setup when the last muscle is taken out', () => {
    const one = buildNow(setMuscles(initialBuilder(), ['chest']), {}, TODAY);
    expect(one.built).toBe(true);
    const none = toggleMuscle(one, 'chest');
    expect(none.picks).toEqual([]);
    expect(none.built).toBe(false);
    expect(parseBuilder(JSON.parse(JSON.stringify(none)))).toEqual(none);
  });

  it('sets counts like 4-3-3 and focus per muscle', () => {
    let s = setMuscles(initialBuilder(), ['chest', 'biceps', 'forearms']);
    s = setAllCounts(s, 3);
    s = setCount(s, 'chest', 4);
    s = setCount(s, 'forearms', 12);
    s = setFocus(s, 'chest', 'upper');
    expect(s.picks.map((p) => [p.muscle, p.count, p.focus])).toEqual([
      ['chest', 4, 'upper'],
      ['biceps', 3, 'balanced'],
      ['forearms', 6, 'balanced'],
    ]);
  });

  it('setup edits drop what the builder held but keep what you added', () => {
    const s = { ...chestBack(), pinned: [{ id: 'pec-deck', muscle: 'chest' as const }, { id: 'db-row', muscle: 'back' as const, kept: true }], avoid: ['x'] };
    const next = setSetting(s, 'dumbbells');
    expect(next.pinned).toEqual([{ id: 'pec-deck', muscle: 'chest' }]);
    expect(next.avoid).toEqual([]);
  });

  it('swaps one exercise and leaves the rest of the session alone', () => {
    const s = chestBack();
    const list = run(s);
    const i = list.findIndex((b) => b.muscle === 'back');
    const alt = swapOptions(list[i], 'gym', new Set(list.map((b) => b.ex.id)), true)[0];
    const after = swapAt(s, list, i, alt.id);
    const next = ids(after);
    expect(next).toContain(alt.id);
    expect(next).not.toContain(list[i].ex.id);
    expect(next.filter((id) => id !== alt.id).sort()).toEqual(list.filter((_, j) => j !== i).map((b) => b.ex.id).sort());
    expect(run(after).find((b) => b.ex.id === alt.id)!.pinned).toBe(true);
  });

  it('removes an exercise for good, and the muscle when nothing is left', () => {
    let s = chestBack();
    const list = run(s);
    const gone = list[1].ex.id;
    s = removeAt(s, list, 1);
    expect(ids(s)).not.toContain(gone);
    expect(ids(s)).toHaveLength(list.length - 1);
    let one = buildNow(setCount(setMuscles(initialBuilder(), ['abs', 'chest']), 'abs', 1), {}, TODAY);
    const l2 = run(one);
    one = removeAt(one, l2, l2.findIndex((b) => b.muscle === 'abs'));
    expect(one.picks.map((p) => p.muscle)).toEqual(['chest']);
  });

  it('shuffles what the builder chose and keeps what you added', () => {
    const s = { ...chestBack(), pinned: [{ id: 'pec-deck', muscle: 'chest' as const }] };
    const list = run(s);
    const next = shuffle(s, list);
    expect(next.seed).not.toBe(s.seed);
    expect(next.avoid).not.toContain('pec-deck');
    expect(ids(next)).toContain('pec-deck');
    expect(ids(next)).not.toEqual(ids(s));
  });

  it('adds a library exercise to the right muscle', () => {
    // Setup screen: muscle is added and the session opens with the exercise in it.
    const a = addExercise(initialBuilder(), [], 'cable-crunch', true, {}, TODAY);
    expect(a.ok).toBe(true);
    if (!a.ok) return;
    expect(a.state.built).toBe(true);
    expect(ids(a.state)).toContain('cable-crunch');
    // Session showing: it joins, the rest stays.
    const s = chestBack();
    const list = run(s);
    const extra = candidatesFor('chest', 'gym', true).find((e) => e.primary === 'chest' && !list.some((x) => x.ex.id === e.id))!;
    const b = addExercise(s, list, extra.id, true, {}, TODAY);
    expect(b.ok).toBe(true);
    if (!b.ok) return;
    expect(ids(b.state).sort()).toEqual([...list.map((x) => x.ex.id), extra.id].sort());
    const tri = addExercise(s, list, 'close-grip-bench', true, {}, TODAY);
    expect(tri.ok && run(tri.state).filter((x) => x.muscle === 'triceps').map((x) => x.ex.id)).toContain('close-grip-bench');
  });

  it('says why a library exercise cannot be added', () => {
    const home = buildNow(setSetting(setMuscles(initialBuilder(), ['chest']), 'home'), {}, TODAY);
    expect(addExercise(home, run(home), 'bb-bench', true, {}, TODAY)).toEqual({ ok: false, reason: 'setting', muscle: 'chest' });
    const list = run(chestBack());
    expect(addExercise(chestBack(), list, list[0].ex.id, true, {}, TODAY)).toMatchObject({ ok: false, reason: 'already' });
    const six = setMuscles(initialBuilder(), ['chest', 'back', 'biceps', 'triceps', 'abs', 'calves']);
    expect(addExercise(six, [], 'leg-ext', true, {}, TODAY)).toMatchObject({ ok: false, reason: 'full' });
    expect(addExercise(initialBuilder(), [], 'chest-dip', true, {}, TODAY)).toMatchObject({ ok: false, reason: 'setting' });
  });

  it('keeps the exercises when it re-orders for today', () => {
    const s = { ...chestBack(), builtOn: '2026-11-08' };
    const list = run(s);
    const next = refreshRecovery(s, list, { chest: 20 }, TODAY);
    expect(next.builtOn).toBe(TODAY);
    expect(next.readiness).toEqual({ chest: 20 });
    expect(ids(next).sort()).toEqual(list.map((b) => b.ex.id).sort());
  });

  it('saves and reloads a template as the exact same session', () => {
    const s = { ...chestBack(), supersets: true, sets: 4 };
    const list = run(s);
    const t = toTemplate(s, list, '  Chest & back  ', 'w1', '2026-11-10T10:00:00.000Z');
    expect(t.name).toBe('Chest & back');
    expect(t.picks.reduce((n, p) => n + p.count, 0)).toBe(list.length);
    const back = fromTemplate(t, {}, TODAY);
    expect(back.built).toBe(true);
    expect(back.supersets).toBe(true);
    expect(back.sets).toBe(4);
    expect(ids(back)).toEqual(list.map((b) => b.ex.id));
  });
});
