import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { fadeUpItem, staggerChildren, weeklyStreakEarned } from '../lib/motion';
import { CelebrationBurst } from './CelebrationBurst';

const SEEN_KEY = 'p85.streak.moment.v1';

function weekKey(isoWeekEnd: string): string {
  return `${SEEN_KEY}.${isoWeekEnd}`;
}

function alreadySeen(isoWeekEnd: string): boolean {
  try {
    return sessionStorage.getItem(weekKey(isoWeekEnd)) === '1';
  } catch {
    return false;
  }
}

function markSeen(isoWeekEnd: string) {
  try {
    sessionStorage.setItem(weekKey(isoWeekEnd), '1');
  } catch {
    /* private mode */
  }
}

/**
 * Earned weekly streak beat — only when ≥3 sessions logged this week.
 * One burst per browser session per week end; reduced motion = static card.
 * Never manipulative: no fake counters, no neon chrome.
 */
export function StreakMoment({
  sessionsThisWeek,
  weekEnd,
}: {
  sessionsThisWeek: number;
  /** ISO date used as the "seen" key (rolling week end / today). */
  weekEnd: string;
}) {
  const reduce = useReducedMotion();
  const earned = weeklyStreakEarned(sessionsThisWeek);
  const [burst, setBurst] = useState(false);

  useEffect(() => {
    if (!earned) return;
    if (alreadySeen(weekEnd)) {
      setBurst(false);
      return;
    }
    setBurst(true);
    markSeen(weekEnd);
  }, [earned, weekEnd]);

  if (!earned) return null;

  const parent = staggerChildren(reduce, 0.05);
  const item = fadeUpItem(reduce);

  return (
    <motion.section
      className={`streak-moment${burst && !reduce ? ' burst' : ''}`}
      aria-label="Weekly training streak"
      variants={parent}
      initial="hidden"
      animate="show"
      style={{ position: 'relative', overflow: 'hidden' }}
    >
      <CelebrationBurst active={burst && !reduce} dense onDone={() => setBurst(false)} />
      <motion.div className="streak-moment-mark" variants={item} aria-hidden>
        <span />
      </motion.div>
      <motion.div variants={item}>
        <p className="briefing-kicker">Week locked in</p>
        <h2 style={{ fontSize: 'var(--text-lg)', margin: '4px 0 0' }}>
          {sessionsThisWeek} sessions this week
        </h2>
        <p className="muted" style={{ margin: '6px 0 0', fontSize: 'var(--text-sm)' }}>
          Earned from real logs — keep showing up; missed days pause the counter, never wipe history.
        </p>
      </motion.div>
    </motion.section>
  );
}
