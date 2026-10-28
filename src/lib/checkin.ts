import type { AppSettings, DayAggregate, ISODate } from '../domain/types';
import { macrosFor, missionFor, planPhase, targetWeightOn } from '../domain/plan';

/** Plain-text weekly check-in to paste into a chat with Claude. Uses only logged data. */
export function buildCheckin(
  settings: AppSettings,
  week: DayAggregate[],
  today: ISODate,
  prevWeekAvgKg: number | null,
): string {
  const kgs = week.map((d) => d.primaryWeightKg).filter((v): v is number => v != null);
  const avg = kgs.length ? kgs.reduce((a, b) => a + b, 0) / kgs.length : null;
  const centre = week[Math.floor(week.length / 2)]?.date ?? today;
  const target = targetWeightOn(settings, centre);
  const phase = planPhase(today);
  const mission = missionFor(today);
  const steps = week.map((d) => d.steps).filter((v): v is number => v != null);
  const sleep = week.map((d) => d.sleepHours).filter((v): v is number => v != null);
  const trained = week.filter((d) => d.workoutTypes.length > 0).length;
  const proteinDays = week.filter(
    (d) => d.foodEntryCount > 0 && d.proteinG >= macrosFor(settings, d.date).proteinG * 0.9,
  ).length;
  const fmt1 = (n: number) => n.toFixed(1);
  const lines = week.map((d) => {
    const parts = [
      d.primaryWeightKg != null ? `${d.primaryWeightKg} kg` : 'no weigh-in',
      d.steps != null ? `${d.steps} steps` : 'steps not logged',
      d.sleepHours != null ? `${fmt1(d.sleepHours)} h sleep` : 'sleep not logged',
      d.foodEntryCount > 0 ? `${Math.round(d.calories)} kcal / ${Math.round(d.proteinG)} g protein (target ${macrosFor(settings, d.date).calories})` : 'food not logged',
      d.workoutTypes.length ? `trained: ${d.workoutTypes.join(', ')}` : 'no training logged',
    ];
    return `${d.date}: ${parts.join(', ')}`;
  });
  return [
    `PROJECT 85 / New Me — Sunday check-in (${today})`,
    `Plan: ${settings.startingWeightKg} kg on ${settings.startDate} to ${settings.targetWeightKg} kg on ${settings.deadline}. Week ${phase.week}, ${phase.phase} (${phase.mode}).`,
    `This week's mission: ${mission.text}`,
    '',
    `7-day average: ${avg != null ? fmt1(avg) + ' kg' : 'not enough weigh-ins'} (target ${fmt1(target)} kg${avg != null ? `, ${avg - target > 0 ? '+' : ''}${fmt1(avg - target)} vs target` : ''})`,
    `Previous week average: ${prevWeekAvgKg != null ? fmt1(prevWeekAvgKg) + ' kg' : 'n/a'}${avg != null && prevWeekAvgKg != null ? ` (change ${avg - prevWeekAvgKg > 0 ? '+' : ''}${fmt1(avg - prevWeekAvgKg)} kg)` : ''}`,
    `Avg steps: ${steps.length ? Math.round(steps.reduce((a, b) => a + b, 0) / steps.length) : '?'} · Avg sleep: ${sleep.length ? fmt1(sleep.reduce((a, b) => a + b, 0) / sleep.length) + ' h' : '?'} · Training days: ${trained} · Protein target hit: ${proteinDays} days`,
    '',
    'Daily log:',
    ...lines,
    '',
    'My notes (fill in):',
    '- Energy and hunger:',
    '- Lifts going up, flat or down:',
    '- Waist (navel / love handles):',
    '- Weddings or events next week:',
    '- Anything that went wrong:',
    '',
    "Coach me in the same direct style: am I on track, what is the ONE change for next week using the plan's behind/ahead rules, and anything to fix in training or food.",
  ].join('\n');
}
