import { useState } from 'react';
import './ExerciseMedia.css';
import { mediaFor } from '../domain/exerciseMedia';

/* Exercise animations © Gym visual (gymvisual.com), via the Exercises Library repo — shown at the
   180×180 size they are distributed at, with the credit on every animation (kept small, per licence).
   Online only (not precached). */
const SHA = 'e54213fddbff4979da0af7546048b2743e4521f9';
const CDN = `https://cdn.jsdelivr.net/gh/plataformafitness/exercises-library@${SHA}/`;
// jsDelivr refuses a few files (403); GitHub raw serves the same commit.
const RAW = `https://raw.githubusercontent.com/plataformafitness/exercises-library/${SHA}/`;

const valid = (media: string | null | undefined): media is string => !!media && /^\d{4}-[A-Za-z0-9]+$/.test(media);

export function exerciseGifUrl(media: string | null | undefined, kind: 'gif' | 'thumb' = 'gif'): string | null {
  if (!valid(media)) return null;
  return CDN + (kind === 'thumb' ? `images/${media}.jpg` : `videos/${media}.gif`);
}

/** Sources to try in order: CDN, GitHub raw, then the still image. */
export function mediaSources(media: string | null | undefined, kind: 'gif' | 'thumb'): string[] {
  if (!valid(media)) return [];
  const path = kind === 'thumb' ? `images/${media}.jpg` : `videos/${media}.gif`;
  const list = [CDN + path, RAW + path];
  if (kind === 'gif') list.push(CDN + `images/${media}.jpg`, RAW + `images/${media}.jpg`);
  return list;
}

interface Props {
  name: string;
  /** Explicit id (plan field); falls back to the name lookup. */
  media?: string | null;
  size?: 'lg' | 'sm';
}

/** Large animated demo, or a small still thumbnail for lists. Renders nothing when there is no media. */
export function ExerciseGif({ name, media, size = 'lg' }: Props) {
  const id = media ?? mediaFor(name);
  const [fail, setFail] = useState<{ id: string | null; n: number }>({ id, n: 0 });
  const tries = fail.id === id ? fail.n : 0;
  const sources = mediaSources(id, size === 'sm' ? 'thumb' : 'gif');
  const src = sources[tries];
  const onError = () => setFail({ id, n: tries + 1 });
  if (!src) return null;
  if (size === 'sm') {
    return (
      <img className="ex-thumb" src={src} alt="" width={44} height={44} loading="lazy" decoding="async" onError={onError} />
    );
  }
  return (
    <figure className="ex-gif">
      <picture>
        <source media="(prefers-reduced-motion: reduce)" srcSet={exerciseGifUrl(id, 'thumb') ?? undefined} />
        <img src={src} width={180} height={180} alt={`How to do ${name}`} loading="lazy" decoding="async" onError={onError} />
      </picture>
      <figcaption>© Gym visual</figcaption>
    </figure>
  );
}
