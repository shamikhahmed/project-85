# Implementation Plan

## Phase 1 — Foundation ✅
- Vite React TS scaffold
- Design tokens (charcoal + electric orange)
- Domain types + defaults
- Docs scaffold

## Phase 2 — Data + Shell ✅
- Dexie schema + repository layer
- Settings store + day aggregates
- App shell: bottom nav (mobile) + sidebar (desktop)
- Routing for 6 sections

## Phase 3 — Daily Log ✅
- Weight (primary morning + corrections)
- Food library + meal entries + honesty checklist
- Steps (replace-total rule)
- Water quick-add + undo
- Workout / sleep / smoking / journal
- Autosave + edit/delete with confirm

## Phase 4 — Dashboard + Progress + History ✅
- Live scorecard + status + next actions
- Weight / waist / steps / nutrition charts
- Goal projection (labelled estimates)
- Mission calendar with day drill-in

## Phase 5 — Discipline ✅
- Deterministic 100-point score
- Safe consequences only; macro success gated on honesty + completeness
- XP, streaks, achievements
- Nightly Truth Check

## Phase 6 — PWA + Export ✅
- Installable offline PWA (icons, SW, install banner)
- CSV/JSON export, validated backup/restore, clear data

## Phase 7 — QA ✅
- Vitest: 27 tests (calc, discipline, backup)
- Typecheck + production build passing
- UI polish + a11y pass from design specialist

## Agent ownership
| Area | Owner |
|------|-------|
| Core calc + storage + tests | Data agent |
| Design system + shell + Dashboard | UI agent |
| Daily Log modules | Logging agent |
| Discipline + Nightly Truth | Accountability agent |
| Progress/History/Settings/PWA | Analytics agent |
