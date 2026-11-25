import { useEffect, useId, useMemo, type CSSProperties } from 'react';
import { useReducedMotion } from 'framer-motion';
import { burstMs } from '../lib/motion';

type Props = {
  /** Fire the burst when true. Parent owns the flag; we call onDone after. */
  active: boolean;
  /** Denser particle field for session end. */
  dense?: boolean;
  onDone?: () => void;
};

/**
 * Lime particle burst for session start/end and earned streak moments.
 * Pointer-events none; never blocks logging. Skips entirely under reduced motion.
 */
export function CelebrationBurst({ active, dense = false, onDone }: Props) {
  const reduce = useReducedMotion();
  const uid = useId();
  const count = dense ? 18 : 12;
  const particles = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2 + (i % 2) * 0.18;
        const dist = dense ? 72 + (i % 4) * 14 : 56 + (i % 3) * 12;
        return {
          id: `${uid}-${i}`,
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist,
          delay: (i % 6) * 18,
          size: 4 + (i % 3) * 2,
        };
      }),
    [count, dense, uid],
  );

  useEffect(() => {
    if (!active) return;
    const ms = burstMs(reduce, dense);
    if (ms === 0) {
      onDone?.();
      return;
    }
    const t = window.setTimeout(() => onDone?.(), ms);
    return () => window.clearTimeout(t);
  }, [active, dense, onDone, reduce]);

  if (!active || reduce) return null;

  return (
    <div className={`cele-burst${dense ? ' dense' : ''}`} aria-hidden>
      {particles.map((p) => (
        <span
          key={p.id}
          className="cele-dot"
          style={
            {
              '--tx': `${p.x}px`,
              '--ty': `${p.y}px`,
              '--delay': `${p.delay}ms`,
              '--size': `${p.size}px`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
