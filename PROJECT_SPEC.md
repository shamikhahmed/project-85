# PROJECT 85 — Product Spec

Personal birthday transformation mission control. Single-user, local-first PWA.

## Mission window
- **Start:** 3 November 2026 (Project New Me plan; was 27 Oct)
- **Deadline:** 15 January 2027
- **Start weight:** 96.0 kg (editable)
- **Target weight:** 85.0 kg (editable)
- **Required loss at defaults:** 11.0 kg

## Daily defaults
| Metric | Default |
|--------|---------|
| Steps | 10,000 every day |
| Calories | 2,150 kcal training days · 2,100 Saturday · 1,750 rest days (toggle) |
| Protein | 240 g (carbs 151 g, fat 65 g on training days) |
| Water | 3,000 ml |
| Sleep | 7 hours minimum |
| Cigarettes | 0 |

## Sections
1. Dashboard — mission control
2. Daily Log — weight, food, steps, water, workout, sleep, smoking, notes
3. Progress — charts, projections, habit consistency
4. Discipline — score, consequences, rewards, Nightly Truth Check
5. History — calendar 3 Nov 2026 → 15 Jan 2027
7. Train — plan sessions, top-set logging with progression hints, missions, checkpoints, check-in, PDF library
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
