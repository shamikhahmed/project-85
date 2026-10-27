# Data Model — PROJECT 85

## Storage
Dexie IndexedDB database `project85` (v1). Local-only; no sync.

## Tables
`settings`, `weights`, `foods`, `foodLibrary`, `steps`, `water`, `workouts`, `sleep`, `cigarettes`, `notes`, `scores`, `xp`, `achievements`

## Critical rules
- **Steps:** `setStepsForDate` **replaces** the day’s total (never adds).
- **Weight:** one primary morning weigh-in per date; corrections demote prior primary.
- **Food confidence:** `verified` | `estimated` | `range` — never silently upgrade.
- **Scores:** missing → `not_entered` (0 pts); honest miss → partial; starvation not rewarded.
- **Dates:** local `YYYY-MM-DD` via `date-fns` format — not UTC midnight tricks.

## Backup
`validateBackupPayload` + JSON restore; CSV export via `backupToCsv`.
