# Test Plan

## Automated (`npm test`) — target v0.12
- [x] Daily Mission day-kind + sleep-adaptive briefing
- [x] Plateau vs short stable; daily-vs-trend calm copy
- [x] Birthday projection arrival estimate when rate supports it (local calendar dates)
- [x] Widget snapshot builder does not invent unlogged calories
- [x] 96.5 → 85 = 11.5 kg remaining; % progress bounded 0–100
- [x] Countdown / local calendar helpers + overnight wake date
- [x] Food totals + estimated labelling
- [x] Steps replace-total rule (aggregates + transactional setSteps)
- [x] Sleep across midnight; invalid sleep → null (not 0)
- [x] Daily score: missing ≠ success; starvation not rewarded
- [x] Macro success gated on honesty + completeness
- [x] Streaks skip missed days
- [x] Backup CSV quote/newline escape; corrupted restore reject; photo URL strip; dual primary demote
- [x] Health: no cross-provider step sum; day-total preferred over sample sum; connection merge preserves real ok
- [x] Briefing provisional-calories language
- [x] Weight trend insufficient-data / calm labels
- [x] Recovery plan constructive only
- [x] Fitness Age + PhenoAge unit tests (published examples); recovery/strain/sleep/coach/journal scores
- [x] Dexie v5 migration test (`labPanels`, `dailyScores`, `journalTags`)
- [x] Backup validates/restores v0.12 tables
- [x] Plan sessions/phases/targets/macros/migration + check-in + training-log helpers
- [x] **v0.11** `fallbackFor` covers every trainingPlan muscle; shoulder-caution excludes dips; displayName priority; swap date reset; last-log separation by real name
- [x] **v0.11** auto-sync throttle (15 min), overlap window, PWA unsupported; manual > Apple > Google; no Apple+Google step sum

## Quality gates — v0.12
- [x] `npm run typecheck` (exit 0)
- [x] `npm run lint` (exit 0; pre-existing warnings only; no errors)
- [x] `npm run build` (exit 0)
- [ ] `npx cap sync ios` / `npx cap sync android`
- [ ] `xcodebuild` simulator Debug `CODE_SIGNING_ALLOWED=NO`
- [ ] Visual: 390×844 + 1440×900 light/dark on `/` `/train` `/log` `/health` `/settings` `/progress` `/history`
- [ ] Manual swap E2E in browser (swap → log → reload → next day reset)

## Manual / remaining
- [ ] Signed HealthKit device pull (real samples)
- [ ] Health Connect device authorize + auto-sync
- [ ] WidgetKit App Group install on device
- [ ] Add to Home Screen install on physical iPhone
