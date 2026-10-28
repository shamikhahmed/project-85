# PROJECT 85 — Audit Findings Register

Last updated: 2026-10-28  
Baseline commit: `a9d1cff` (+ uncommitted audit fixes from prior session)  
Branch: `main`

Status legend: Confirmed | Suspected | Fixed | Verified | Deferred | Blocked

## Baseline (this session)

| Check | Exit | Notes |
|-------|------|-------|
| `npm run typecheck` | 0 | Clean |
| `npm test` | 0 | 18 files / 91 tests |
| `npm run lint` | 0 | Warnings only (hooks) |
| `npm run build` | 0 | Large chunk warning |
| `npm audit --omit=dev` | 0 | 0 vulnerabilities |

Working tree already contained 17 modified files from the prior honesty/sync/dates/backup audit (preserved).

---

## Prior session fixes (carried forward — Verified this session via suite)

| ID | Sev | Summary | Status |
|----|-----|---------|--------|
| P85-001 | High | Apple adapter fake `ok` without sync | Verified |
| P85-002 | High | Health sync race / non-atomic replace | Verified |
| P85-003 | High | Cross-provider day total summing | Verified |
| P85-004 | High | Overnight sleep UTC date math | Verified |
| P85-005 | Med | Invalid sleep as 0 hours | Verified |
| P85-006 | Med | `refreshDay` stale race | Verified |
| P85-007 | Med | Steps replace non-transactional | Verified |
| P85-008 | Med | Backup photos / dual primaries | Verified |
| P85-009 | Med | Weight projection / widget UTC dates | Verified |
| P85-010 | Med | Deep-link allowlist + seed refresh | Verified |

---

## New findings (this session)

| ID | Sev | Category | Evidence | Impact | Recommended fix | Regression test | Status |
|----|-----|----------|----------|--------|-----------------|-----------------|--------|
| P85-011 | High | Health honesty | `runSync` → `refreshHealthConnectionDiagnostics()` overwrites with `diagnose()` which never returns `ok` for Apple; successful `syncAppleHealthIfAvailable` does not persist `ok`/`lastSuccessAt`. Manual sync also `bulkPut(diagnoseAllConnections())`. | Real successful HealthKit pulls never show as connected; UI always `permission_needed` | Persist Apple `ok` after successful import; merge diagnostics so success is not wiped | `adapters.test.ts` | **Verified** (unit) |
| P85-012 | Med | Data export | `backupToCsv` quotes weight notes without escaping `"`; newlines in notes break row structure | Corrupted CSV / injection of extra columns | Shared `csvQuoted` that escapes quotes and flattens newlines | backup.test | **Verified** |
| P85-013 | Med | Health aggregates | `pickDayTotal` sums all same-provider cumulative rows — day-total + samples double-count | Inflated steps/energy | Prefer newest likely day-total; else sum interval samples | dedupe.test | **Verified** |
| P85-014 | Low | Maintainability | Ineffective dynamic imports (dates/repository) | Bundle size noise | Defer code-split pass | — | Deferred |
| P85-015 | Low | UX/lint | oxlint exhaustive-deps / set-state-in-effect | Noise; no confirmed bugs | Incremental cleanup | — | Deferred |
| P85-016 | Med | Perf | Main chunk ~1.1MB | Slow mobile parse | Route-level code split | — | Deferred |
| P85-017 | Blocked | Native | Live HealthKit / WidgetKit / signed device | Cannot verify E2E locally without signing | Document manual checklist | — | Blocked |
| P85-018 | Low | Testing | No IndexedDB integration tests (vitest `environment: 'node'`) | Restore txn behaviour untested in DB | Optional fake-indexeddb later | — | Deferred |
| P85-019 | Suspected | Backup | `bulkAdd` on replace fails hard if backup has duplicate ids | Replace aborts (txn rolls back — safe but opaque) | Pre-dedupe by id on validate | — | Deferred |

---

## Invariants checked (source + unit tests)

- Missing data ≠ zero (sleep null, weight progress null → 0% not invented as success)
- Steps REPLACE-total (aggregates + transactional set)
- Anti-starvation calorie scoring (`discipline.test`)
- Biological age `not_implemented`
- Backup validate rejects non-objects; strips non–data-image photos; demotes dual primaries
- REPLACE restore UI requires typing `REPLACE` (SettingsPage)
- No `dangerouslySetInnerHTML` in src
