/**
 * Ritual motion helpers. Prefer short ease-outs; never gate logging on animation.
 * Framer + CSS both honor prefers-reduced-motion via these helpers / tokens.
 */

export type MotionMs = {
  fast: number;
  base: number;
  hero: number;
};

/** Durations in seconds for Framer. Zero when reduced motion is preferred. */
export function motionDurations(reduce: boolean | null | undefined): MotionMs {
  if (reduce) return { fast: 0, base: 0, hero: 0 };
  return { fast: 0.14, base: 0.22, hero: 0.4 };
}

export const easeOut = [0.22, 1, 0.36, 1] as const;

/** Soft page enter — opacity + slight rise. Instant under reduced motion. */
export function pageReveal(reduce: boolean | null | undefined) {
  const d = motionDurations(reduce);
  if (d.base === 0) {
    return {
      initial: false as const,
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0 },
    };
  }
  return {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: d.base, ease: easeOut },
  };
}

/** Stagger children for weekly earned rows / metric strips. */
export function staggerChildren(reduce: boolean | null | undefined, stagger = 0.045) {
  const d = motionDurations(reduce);
  return {
    hidden: {},
    show: {
      transition: {
        staggerChildren: d.base === 0 ? 0 : stagger,
        delayChildren: d.base === 0 ? 0 : 0.04,
      },
    },
  };
}

export function fadeUpItem(reduce: boolean | null | undefined) {
  const d = motionDurations(reduce);
  if (d.base === 0) {
    return { hidden: { opacity: 1, y: 0 }, show: { opacity: 1, y: 0 } };
  }
  return {
    hidden: { opacity: 0, y: 8 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: d.base, ease: easeOut },
    },
  };
}

/** Rest timer enter/exit — slide up from above the tab bar. */
export function restTimerMotion(reduce: boolean | null | undefined) {
  const d = motionDurations(reduce);
  if (d.hero === 0) {
    return {
      initial: { opacity: 1, y: 0, scale: 1 },
      animate: { opacity: 1, y: 0, scale: 1 },
      exit: { opacity: 0 },
      transition: { duration: 0 },
    };
  }
  return {
    initial: { opacity: 0, y: 28, scale: 0.96 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: 16, scale: 0.98 },
    transition: { duration: d.hero, ease: easeOut },
  };
}

/** Player view crossfade — opacity only (no Y travel / form parallax). */
export function playerViewMotion(reduce: boolean | null | undefined) {
  const d = motionDurations(reduce);
  if (d.base === 0) {
    return {
      initial: { opacity: 1 },
      animate: { opacity: 1 },
      exit: { opacity: 1 },
      transition: { duration: 0 },
    };
  }
  return {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: d.fast, ease: easeOut },
  };
}

/**
 * Set-complete pop (scale + opacity). Logging must never await this —
 * fire CSS/Framer in parallel with the commit. No translateY on forms.
 */
export function setCompletePop(reduce: boolean | null | undefined) {
  const d = motionDurations(reduce);
  if (d.fast === 0) {
    return { scale: 1, opacity: 1, transition: { duration: 0 } };
  }
  return {
    scale: [1, 1.04, 1],
    opacity: [1, 0.92, 1],
    transition: { duration: d.base, ease: easeOut },
  };
}

/** Toast / streak chip enter — scale + fade, no travel. */
export function softPop(reduce: boolean | null | undefined) {
  const d = motionDurations(reduce);
  if (d.fast === 0) {
    return {
      initial: { opacity: 1, scale: 1 },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0 },
      transition: { duration: 0 },
    };
  }
  return {
    initial: { opacity: 0, scale: 0.94 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.96 },
    transition: { duration: d.fast, ease: easeOut },
  };
}

/** How long celebration bursts stay visible (ms). Zero under reduced motion. */
export function burstMs(reduce: boolean | null | undefined, dense = false): number {
  if (reduce) return 0;
  return dense ? 780 : 560;
}

/**
 * True when the closed week earned the streak beat:
 * all planned sessions done, or at least `min` sessions logged.
 */
export function weeklyStreakEarned(
  sessionsLogged: number,
  sessionsPlanned?: number,
  min = 3,
): boolean {
  if (sessionsPlanned != null && sessionsPlanned > 0) {
    return sessionsLogged >= sessionsPlanned;
  }
  return sessionsLogged >= min;
}
