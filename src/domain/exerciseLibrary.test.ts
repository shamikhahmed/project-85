import { describe, expect, it } from 'vitest';
import gifLibrary from '../../scripts/gif-library.json';
import {
  LIBRARY,
  LIBRARY_MUSCLE_INDEX,
  MUSCLES,
  MUSCLE_BY_ID,
  coverageFor,
  fitsSetting,
  kitNeeded,
  loadOn,
  type Setting,
} from './exerciseLibrary';
import { groupsForMuscle } from './muscleRecovery';
import { candidatesFor } from './workoutBuilder';

const SETTINGS: Setting[] = ['gym', 'dumbbells', 'home'];
const knownMedia = new Set((gifLibrary as string[][]).map((row) => row[1]));

describe('exercise library', () => {
  it('has unique ids and names', () => {
    expect(new Set(LIBRARY.map((e) => e.id)).size).toBe(LIBRARY.length);
    expect(new Set(LIBRARY.map((e) => e.name.toLowerCase())).size).toBe(LIBRARY.length);
    expect(LIBRARY.length).toBeGreaterThanOrEqual(170);
  });

  it('points every exercise at a real, unique animation', () => {
    for (const e of LIBRARY) expect(knownMedia.has(e.media), `${e.id} → ${e.media}`).toBe(true);
    expect(new Set(LIBRARY.map((e) => e.media)).size).toBe(LIBRARY.length);
  });

  it('never uses the triceps kickback animation for a glute kickback', () => {
    const kick = LIBRARY.find((e) => e.id === 'cable-glute-kickback')!;
    expect(kick.media).toBe('0228-Kpajagk');
    expect(LIBRARY.find((e) => e.media === '0860-HEJ6DIX')).toBeUndefined();
  });

  it('only names facets the muscle has', () => {
    for (const e of LIBRARY) {
      const own = Object.keys(MUSCLE_BY_ID.get(e.primary)!.facets);
      for (const f of Object.keys(e.facets)) expect(own, `${e.id}: ${f}`).toContain(f);
      for (const [m, cov] of Object.entries(e.also)) {
        const facets = Object.keys(MUSCLE_BY_ID.get(m as never)!.facets);
        for (const f of Object.keys(cov ?? {})) expect(facets, `${e.id} also ${m}: ${f}`).toContain(f);
      }
    }
  });

  it('keeps every number in range', () => {
    for (const e of LIBRARY) {
      for (const v of [e.stretch, e.skill, e.systemic, ...Object.values(e.facets), ...Object.values(e.inv), ...Object.values(e.limit)]) {
        expect(v, e.id).toBeGreaterThanOrEqual(0);
        expect(v, e.id).toBeLessThanOrEqual(1);
      }
      expect(e.cues.length, e.id).toBeGreaterThanOrEqual(2);
      expect(e.inv[e.primary], e.id).toBeUndefined();
    }
  });

  it('has focus weights that sum to 1 over real facets', () => {
    for (const m of MUSCLES) {
      for (const f of m.focus) {
        const sum = Object.values(f.w).reduce((a, b) => a + b, 0);
        expect(sum, `${m.id}/${f.id}`).toBeCloseTo(1, 5);
        for (const k of Object.keys(f.w)) expect(Object.keys(m.facets)).toContain(k);
      }
    }
  });

  it('offers at least two exercises for every muscle wherever you train', () => {
    for (const m of MUSCLES) {
      for (const s of SETTINGS) {
        expect(candidatesFor(m.id, s, true).length, `${m.id} @ ${s}`).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('filters by equipment: home has no bars, benches or machines', () => {
    for (const e of LIBRARY.filter((x) => fitsSetting(x, 'home'))) {
      expect(['bodyweight', 'band']).toContain(e.equip);
      expect(e.bar || e.bench).toBe(false);
    }
    for (const e of LIBRARY.filter((x) => fitsSetting(x, 'dumbbells'))) {
      expect(['dumbbell', 'bodyweight']).toContain(e.equip);
      expect(e.bar).toBe(false);
    }
  });

  it('reads coverage and load for primary and stand-in muscles', () => {
    const bss = LIBRARY.find((e) => e.id === 'bss')!;
    expect(coverageFor(bss, 'quads')).toEqual(bss.facets);
    expect(coverageFor(bss, 'glutes').stretch).toBeGreaterThan(0.5);
    expect(coverageFor(bss, 'biceps')).toEqual({});
    expect(loadOn(bss, 'quads')).toBe(1);
    expect(loadOn(bss, 'glutes')).toBe(0.6);
  });

  it('logs into muscles the recovery grid understands', () => {
    for (const e of LIBRARY) {
      const words = LIBRARY_MUSCLE_INDEX.get(e.name.toLowerCase())!;
      expect(words, e.id).toBeTruthy();
      if (e.primary !== 'forearms') expect(groupsForMuscle(words).length, `${e.id}: ${words}`).toBeGreaterThan(0);
    }
    expect(groupsForMuscle(LIBRARY_MUSCLE_INDEX.get('barbell bench press')!)).toEqual(
      expect.arrayContaining(['chest', 'triceps', 'shoulders']),
    );
  });

  it('names the kit an exercise needs in plain words', () => {
    const kit = (name: string) => kitNeeded(LIBRARY.find((e) => e.name === name)!);
    expect(kit('Barbell row')).toBe('gym equipment');
    expect(kit('Dumbbell bench press')).toBe('dumbbells and a bench');
    expect(kit('Decline crunch')).toBe('a bench');
    expect(kit('Chest dip')).toBe('dip bars');
    expect(kit('Pull-up')).toBe('a bar to hang from');
    // Every exercise that some setting leaves out gets a real answer.
    for (const e of LIBRARY) {
      if (!fitsSetting(e, 'home')) expect(kitNeeded(e), e.name).not.toBe('nothing extra');
    }
  });
});
