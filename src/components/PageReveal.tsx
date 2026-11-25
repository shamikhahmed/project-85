import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';
import { pageReveal } from '../lib/motion';

/** Soft enter for Train / Progress / Today. Never blocks interaction. */
export function PageReveal({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const m = pageReveal(reduce);
  return (
    <motion.div className={className} initial={m.initial} animate={m.animate} transition={m.transition}>
      {children}
    </motion.div>
  );
}
