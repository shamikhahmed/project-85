import { useState } from 'react';
import './ExerciseMedia.css';
import { SWAP_REASONS, type SwapReason } from '../domain/exerciseSwap';
import { demoUrl } from '../domain/exerciseMedia';
import { ExerciseGif } from './ExerciseGif';

interface Props {
  planName: string;
  muscle: string;
  alts: string[];
  reason: SwapReason;
  onReason: (r: SwapReason) => void;
  current: string | null;
  busy: boolean;
  onPick: (alt: string) => void;
  onUndo: () => void;
}

/** "Can't use this machine?" — reason, quick chips with thumbnails, and a full card sheet. */
export function SwapPanel({ planName, muscle, alts, reason, onReason, current, busy, onPick, onUndo }: Props) {
  const [sheet, setSheet] = useState(false);
  const pick = (alt: string) => {
    setSheet(false);
    onPick(alt);
  };
  return (
    <div className="swap">
      <div className="swap-head">
        <span>{"Can't use this machine?"}</span>
        <button type="button" className="swap-link" onClick={() => setSheet(true)}>
          {'See all'}
        </button>
      </div>
      <div className="swap-seg" role="group" aria-label="Swap reason">
        {SWAP_REASONS.map((r) => (
          <button key={r.id} type="button" aria-pressed={reason === r.id} className={reason === r.id ? 'on' : ''} onClick={() => onReason(r.id)}>
            {r.label}
          </button>
        ))}
      </div>
      {reason === 'pain' && (
        <p className="ex-pain" role="alert">
          Stop — don&apos;t push through pain. Pick the lightest option first.
        </p>
      )}
      <div className="swap-chips">
        {alts.slice(0, 3).map((alt) => (
          <button key={alt} type="button" className={`swap-chip${current === alt ? ' on' : ''}`} disabled={busy} onClick={() => pick(alt)}>
            <ExerciseGif name={alt} size="sm" />
            <span>{alt}</span>
          </button>
        ))}
      </div>
      {current && (
        <button type="button" className="swap-link swap-undo" disabled={busy} onClick={onUndo}>
          ↩ {'Back to'} {planName}
        </button>
      )}

      {sheet && (
        <div className="sheet-backdrop" role="presentation" onClick={() => setSheet(false)}>
          <div className="swap-sheet" role="dialog" aria-modal="true" aria-label={`Alternatives for ${planName}`} onClick={(e) => e.stopPropagation()}>
            <div className="swap-sheet-grip" aria-hidden />
            <div className="swap-sheet-head">
              <div>
                <h2>{'Alternatives'}</h2>
                <p className="muted">
                  {planName} · {muscle}
                </p>
              </div>
              <button type="button" className="swap-link" onClick={() => setSheet(false)}>
                {'Close'}
              </button>
            </div>
            <ul className="swap-cards">
              {alts.map((alt) => (
                <li key={alt} className={`swap-card${current === alt ? ' on' : ''}`}>
                  <ExerciseGif name={alt} />
                  <div className="swap-card-body">
                    <strong>{alt}</strong>
                    <span className="muted">Same muscles: {muscle.toLowerCase()}</span>
                    <div className="swap-card-actions">
                      <a className="swap-link" href={demoUrl(alt)} target="_blank" rel="noopener">
                        ▶ {'Video'}
                      </a>
                      <button type="button" className="btn btn-primary" disabled={busy || current === alt} onClick={() => pick(alt)}>
                        {current === alt ? 'In use' : 'Use this'}
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
