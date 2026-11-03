import { describe, expect, it } from 'vitest';
import { addSupplement, groupByTiming, toggleTaken } from './supplements';

describe('supplements', () => {
  it('adds without duplicates or blanks', () => {
    let s = addSupplement(undefined, ' Creatine 5g ', 'morning');
    s = addSupplement(s, 'creatine 5g', 'post');
    s = addSupplement(s, '   ', 'post');
    expect(s).toEqual([{ name: 'Creatine 5g', timing: 'morning' }]);
  });

  it('groups in day order and skips empty groups', () => {
    const g = groupByTiming([
      { name: 'Magnesium', timing: 'evening' },
      { name: 'Whey', timing: 'post' },
      { name: 'Vitamin D', timing: 'morning' },
    ]);
    expect(g.map((x) => x.timing)).toEqual(['morning', 'post', 'evening']);
  });

  it('toggles per date without touching other days', () => {
    let log = toggleTaken(undefined, '2026-11-03', 'Whey');
    log = toggleTaken(log, '2026-11-04', 'Whey');
    log = toggleTaken(log, '2026-11-03', 'whey');
    expect(log).toEqual({ '2026-11-03': [], '2026-11-04': ['Whey'] });
  });
});
