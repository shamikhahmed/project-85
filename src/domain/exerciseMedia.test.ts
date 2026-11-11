import { describe, expect, it } from 'vitest';
import media from './exerciseMedia.json';
import catalog from '../../scripts/gif-library.json';
import { mediaFor } from './exerciseMedia';
import { LIBRARY } from './exerciseLibrary';

const map = media as Record<string, string>;
const known = new Set((catalog as [string, string, string][]).map(([, id]) => id));

describe('exercise animations', () => {
  it('only points at animations that exist', () => {
    for (const [name, id] of Object.entries(map)) {
      expect(known.has(id), `${name} → ${id}`).toBe(true);
    }
  });

  it('shows the movement the name says (checked by eye)', () => {
    expect(mediaFor('Single-arm dumbbell row')).toBe('0292-C0MA9bC'); // one arm on a bench, not a two-arm row
    expect(mediaFor("Captain's chair knee raise")).toBe('0826-ZNgOYQU'); // knees bent, not straight legs
    expect(mediaFor('High-to-low cable fly')).toBe('0155-0CXGHya'); // high pulleys sweeping down
    expect(mediaFor('Face pull')).toBe('0233-ZfyAGhK');
    expect(mediaFor('Rear delt fly machine')).toBe('0602-myfUsKf');
  });

  it('gives the plan and the builder library the same animation for the same exercise', () => {
    const byName = new Map(Object.entries(map).map(([n, id]) => [n.toLowerCase(), id]));
    for (const e of LIBRARY) {
      const planId = byName.get(e.name.toLowerCase());
      if (planId) expect(planId, e.name).toBe(e.media);
    }
  });
});
