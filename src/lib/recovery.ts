import { CONSEQUENCE_CATALOG } from '../domain/defaults';
import type { AppSettings, DayScoreBreakdown, GoalOutcome } from '../domain/types';

export interface RecoveryAction {
  id: string;
  title: string;
  description: string;
  trigger: string;
}

/**
 * Constructive recovery after imperfect days. Caps at 3 actions.
 * Never recommends starvation, dehydration, punishment workouts, or sleep loss.
 */
export function buildRecoveryPlan(
  breakdown: DayScoreBreakdown,
  _settings: AppSettings,
): RecoveryAction[] {
  const out: RecoveryAction[] = [];
  const needsHelp = (o: GoalOutcome) => o === 'missed_honest' || o === 'not_entered';

  for (const c of CONSEQUENCE_CATALOG) {
    const key = c.trigger as keyof DayScoreBreakdown;
    if (key in breakdown && needsHelp(breakdown[key])) {
      out.push({
        id: c.id,
        title: c.title,
        description: c.description,
        trigger: c.trigger,
      });
    }
    if (out.length >= 3) break;
  }

  if (out.length === 0) {
    out.push({
      id: 'keep_streak',
      title: 'Protect the streak with honesty',
      description:
        'Keep logging tomorrow even if today was imperfect — returning counts more than a perfect reset.',
      trigger: 'reflection',
    });
  }

  return out;
}
