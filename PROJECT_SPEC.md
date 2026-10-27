# PROJECT 85 — Product Spec

Personal birthday transformation mission control. Single-user, local-first PWA.

## Mission window
- **Start:** 27 October 2026
- **Deadline:** 15 January 2027
- **Start weight:** 96.5 kg (editable)
- **Target weight:** 85.0 kg (editable)
- **Required loss at defaults:** 11.5 kg

## Daily defaults
| Metric | Default |
|--------|---------|
| Steps | 10,000 every day |
| Calories | 2,200 kcal |
| Protein | 160 g |
| Water | 3,000 ml |
| Sleep | 8 hours |
| Cigarettes | 0 |

## Sections
1. Dashboard — mission control
2. Daily Log — weight, food, steps, water, workout, sleep, smoking, notes
3. Progress — charts, projections, habit consistency
4. Discipline — score, consequences, rewards, Nightly Truth Check
5. History — calendar 27 Oct 2026 → 15 Jan 2027
6. Settings — targets, theme, export/backup

## Non-negotiables
- No mock data in operational views
- Incomplete logging ≠ success
- No fabricated nutrition values presented as verified
- No punishing with starvation, dehydration, or compensatory exercise
- Manual steps only (Health integrations are future work)
- Local-only persistence; no cloud sync claims
- Honesty rewarded over perfection

## Stack
Vite + React 19 + TypeScript, Dexie (IndexedDB), Zustand, Recharts, Framer Motion, vite-plugin-pwa, Vitest.
