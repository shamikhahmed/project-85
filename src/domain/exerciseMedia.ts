/**
 * Exercise name → Gym visual animation id (built by scripts/build-media-map.py) and demo links.
 * Covers plan exercises, alternatives, swap fallbacks and warm-ups.
 */
import media from './exerciseMedia.json';

const BY_NAME = new Map(Object.entries(media as Record<string, string>).map(([k, v]) => [k.toLowerCase(), v]));

/** Search words appended to demo links. */
export const DEMO_QUERY_SUFFIX = 'form tutorial';

export function mediaFor(name: string | null | undefined): string | null {
  if (!name) return null;
  return BY_NAME.get(name.trim().toLowerCase()) ?? null;
}

/** YouTube search for a form demo of any exercise name (plan, swap or warm-up). */
export function demoUrl(name: string): string {
  const q = `${name.replace(/\(.*?\)/g, '').replace(/,.*$/, '').trim()} ${DEMO_QUERY_SUFFIX}`;
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(q).replace(/%20/g, '+')}`;
}
