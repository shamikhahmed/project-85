# Data Model — PROJECT 85

## Storage
Dexie IndexedDB database `project85` (**v4**). Local-only; no sync.

## Tables
`settings`, `weights`, `foods`, `foodLibrary`, `steps`, `water`, `workouts`, `sleep`, `cigarettes`, `notes`, `scores`, `xp`, `achievements`

### v2+
`bodyMeasurements`, `motivationItems`, `personalLetters`, `journalEntries`, `progressPhotos`

### v3+
`healthRecords`, `healthConnections`

### v4+
`exerciseSwaps` — historical machine-swap log (`date`, `dayKey`, `code`, `planName`, `swappedName`, `reason`)

## Plan logging (v0.10+)
- Train tab logs one top set per exercise into `workouts` (type `strength`, `notes` = `Plan: <session>`, `exercises[]` with `name`, `weightKg`, `reps`). Re-logging the same exercise on the same day replaces it.
- `settings.planVersion` (2 = Project New Me migration applied) and `settings.dayTypeCalories`.
- **v0.11 swaps:** active map in `settings.todayExerciseSwaps` (date-keyed; resets next day). History in `exerciseSwaps`. Display/log name = swap > Block B > plan name.

## Health sync (v0.11)
- `settings.autoSyncHealth`, `lastAutoSyncAt`, `offerHealthWriteBack`
- Steps/weight/sleep `source`: `manual` | `apple_health` | `google_health` — manual wins on conflict.

## Critical rules
- **Steps:** `setStepsForDate` **replaces** the day’s total (never adds).
- **Weight:** one primary morning weigh-in per date; corrections demote prior primary.
- **Food confidence:** `verified` | `estimated` | `range` — never silently upgrade.
- **Body measurements:** append history; left/right and relaxed/flexed never merged.
- **Health imports:** never sum overlapping provider day totals; calculated ≠ overwrite originals.
- **Scores:** missing → `not_entered` (0 pts); honest miss → partial; starvation not rewarded.
- **Dates:** local `YYYY-MM-DD` via `date-fns` format — not UTC midnight tricks.

## Backup
`validateBackupPayload` + JSON restore; CSV export via `backupToCsv`. New tables optional on older backups.
