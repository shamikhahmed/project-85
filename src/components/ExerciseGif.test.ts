import { describe, expect, it } from 'vitest';
import { mediaSources } from './ExerciseGif';

const CDN = 'https://cdn.jsdelivr.net/gh/plataformafitness/exercises-library@';
const RAW = 'https://raw.githubusercontent.com/plataformafitness/exercises-library/';

describe('animation sources', () => {
  it('tries the CDN, then GitHub, then the still', () => {
    const gif = mediaSources('0241-gAwDzB3', 'gif');
    expect(gif.map((u) => [u.startsWith(CDN) ? 'cdn' : u.startsWith(RAW) ? 'raw' : '?', u.slice(-4)])).toEqual([
      ['cdn', '.gif'],
      ['raw', '.gif'],
      ['cdn', '.jpg'],
      ['raw', '.jpg'],
    ]);
  });

  it('gives stills (list rows, Reduce Motion) the same GitHub fallback — jsDelivr refuses some', () => {
    const still = mediaSources('0773-6MaEjVA', 'thumb');
    expect(still).toHaveLength(2);
    expect(still[0].startsWith(CDN) && still[0].endsWith('/images/0773-6MaEjVA.jpg')).toBe(true);
    expect(still[1].startsWith(RAW) && still[1].endsWith('/images/0773-6MaEjVA.jpg')).toBe(true);
  });

  it('ignores missing or malformed ids', () => {
    expect(mediaSources(null, 'gif')).toEqual([]);
    expect(mediaSources('../etc/passwd', 'thumb')).toEqual([]);
  });
});
