# PROJECT 85 — Deep Audit Report

**Date:** 2026-10-28  
**Repo:** https://github.com/shamikhahmed/project-85  
**Branch:** `main` @ `a9d1cff` + uncommitted audit fixes  
**Verdict:** **PASS WITH KNOWN LIMITATIONS**

This application is not claimed defect-free. Verdict means: critical actionable local integrity defects found in this pass were fixed or blocked, automated gates passed, and remaining risks are documented.

---

## 1. Executive summary

PROJECT 85 is a local-first birthday mission-control PWA (React 19, Vite, Dexie, Zustand, Capacitor iOS shell). A prior uncommitted audit batch was preserved and extended. New confirmed defects fixed this session: Apple connection success wiped by diagnose refresh, CSV quote/newline corruption, and same-provider day-total + sample double-counting. Full Vitest suite, typecheck, lint, production build, and a production-preview Playwright smoke (after SW update) succeeded.

---

## 2. Baseline → final

| Check | Baseline (session start) | Final |
|-------|--------------------------|-------|
| typecheck | exit 0 | exit 0 |
| test | 91 / 18 files | **98 / 19 files** |
| lint | exit 0 (warnings) | exit 0 (warnings) |
| build | exit 0 | exit 0 |
| npm audit --omit=dev | 0 vulns | 0 vulns |
| Playwright preview | not yet | Smoke OK after SW Reload (0 console errors) |

---

## 3. Findings by severity

See `AUDIT_FINDINGS.md` for the full register.

### Critical / High — fixed
- P85-001–004, P85-011 (Apple ok never persisted / wiped on refresh)

### Medium — fixed
- P85-005–010, P85-012 (CSV escape), P85-013 (day-total vs samples)

### Deferred / blocked
- Bundle size (~1.1MB), oxlint hook warnings, IndexedDB integration harness, live HealthKit/WidgetKit/device signing (P85-017)

---

## 4. Confirmed defects fixed (this + carried prior batch)

| Area | Fix |
|------|-----|
| Health honesty | Adapter never fakes Apple ok; mark ok only after import; merge preserves success |
| Health sync | Mutex + transactional replace; empty pull ≠ success |
| Dates / sleep | Local overnight wake; null invalid durations |
| Steps | Transactional REPLACE-total + dedupe rows |
| Backup | Sanitize photos + dual primaries; CSV `csvQuoted` |
| Aggregates | Prefer day-total; no cross-provider sum |
| Store / deep links | refreshDay generation; allowlisted routes |

---

## 5. Files changed (meaningful)

Uncommitted relative to `a9d1cff` (includes prior session + this session):

- `src/health/adapters.ts` (+ `adapters.test.ts`) — merge/mark success
- `src/health/syncEngine.ts`, `dedupe.ts` (+ tests)
- `src/data/backup.ts` (+ tests), `repository.ts`
- `src/lib/dates.ts`, `aggregates.ts`, `weightProgress.ts` (+ tests)
- `src/store/useAppStore.ts`, `pages/DailyLog.tsx`, `HealthIntelligencePage.tsx`
- `src/native/widgetSnapshot.ts`, `components/CapDeepLinks.tsx`
- `AUDIT_FINDINGS.md`, `AUDIT_REPORT.md`, `TEST_PLAN.md`, `CHANGELOG.md`

---

## 6. Tests added / extended

- Connection merge + mark success (`adapters.test.ts`)
- Day-total preference (`dedupe.test.ts`)
- CSV quote/newline (`backup.test.ts`)
- Overnight wake / null sleep / aggregate sleep (prior + this session)

---

## 7. Database & backup safety

- Dexie v1→v3 additive stores; no destructive upgrade hooks observed
- `restoreBackup` validates **before** opening the write transaction; invalid payload does not clear data
- Merge mode uses `mergeRowsKeepNewer` (local wins on equal/newer timestamps)
- Replace mode UI requires typing `REPLACE`
- Progress photos must be `data:image/…`; dual primary morning weights demoted on validate
- **Limitation:** Vitest runs in `environment: 'node'` — no live IndexedDB txn abort simulation

---

## 8. Health integrations

| Provider | Status |
|----------|--------|
| Manual | Live — mirrors into `healthRecords` |
| Apple HealthKit | Native bridge + plist present; `ok` only after successful sample import; **signed device pull not re-verified this pass** |
| Google Health | Explicitly `blocked_credentials` |
| Zepp | `unsupported` / via Apple documented |
| Biological age | Explicitly `not_implemented` in UI + profile |

---

## 9. PWA & iOS

- Build generates SW + precache (~29 entries); `registerType: 'prompt'`
- Preview smoke: stale SW showed older nav + “Update available”; Reload brought Signature Edition routes (`/physique`, `/health`, `/motivation`, …). Console: 0 errors after update
- Capacitor `ios/` present; live simulator/device HealthKit **not** re-run this pass

---

## 10. Security & dependencies

- No `dangerouslySetInnerHTML` in app source
- Backup import rejects remote/script photo URLs
- Deep-link paths allowlisted
- `npm audit --omit=dev`: 0 vulnerabilities
- No secrets introduced in the diff

---

## 11. Remaining risks & manual tasks

1. Signed iPhone HealthKit authorize + Sync with real samples  
2. WidgetKit App Group on device  
3. Physical Add-to-Home-Screen install  
4. Light theme visual pass  
5. Main-bundle code-splitting  
6. Optional `fake-indexeddb` restore abort tests  
7. Re-QA iPhone 16 Pro Max simulator layouts after this code batch  

---

## 12. Reproduce

```bash
cd ~/Projects/project-85
npm run typecheck
npm test
npm run lint
npm run build
npm audit --omit=dev
npx vite preview --host 127.0.0.1 --port 4173
# Open http://127.0.0.1:4173/ — if “Update available”, Reload once
```

---

## 13. Git status (end of session)

- Branch: `main` tracking `origin/main`
- HEAD: `a9d1cff`
- Uncommitted: audit source + docs (not pushed; not requested)
- Prior user work preserved (no reset/clean/revert)

---

## 14. Verdict

**PASS WITH KNOWN LIMITATIONS**

Acceptance criteria 1–10 met for local automation and honesty invariants. Native HealthKit/WidgetKit/device install remain blockers, not silent green claims.
