import { useState } from 'react';
import './ExerciseMedia.css';
import { demoUrl, mediaFor } from '../domain/exerciseMedia';
import { ExerciseGif } from './ExerciseGif';

/** Warm-up / cool-down rows: thumbnail, dose, cue; tap to see the animation and a video link. */
export function WarmupList({ rows }: { rows: (string[] | [string, string, string?])[] }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <ul className="wu-list">
      {rows.map(([name, dose, cue]) => {
        const isOpen = open === name;
        const hasGif = mediaFor(name) != null;
        return (
          <li key={name} className={isOpen ? 'open' : ''}>
            <button type="button" className="wu-row" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : name)}>
              {hasGif ? <ExerciseGif name={name} size="sm" /> : <span className="ex-thumb ex-thumb-empty" aria-hidden>▶</span>}
              <span className="wu-text">
                <strong>{name}</strong>
                {cue && <span className="dim">{cue}</span>}
              </span>
              <span className="wu-dose">{dose}</span>
            </button>
            {isOpen && (
              <div className="wu-detail">
                <ExerciseGif name={name} />
                <a className="btn" href={demoUrl(name)} target="_blank" rel="noopener">
                  ▶ {'Watch form video'}
                </a>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
