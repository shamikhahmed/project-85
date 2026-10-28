# Test Plan

## Automated (`npm test`) — last run 2026-10-28 (deep audit): **98 passed / 19 files**
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
- [x] Biological age remains `not_implemented`

## Quality gates — last run 2026-10-28 (deep audit)
- [x] `npm run typecheck` (exit 0)
- [x] `npm run lint` (exit 0; warnings only; no errors)
- [x] `npm run build` (exit 0; PWA SW + manifest; brand masters excluded from precache)
- [x] `npm audit --omit=dev` (0 vulnerabilities)
- [x] Cursor browser visual pass: desktop + 390×844 (prior session)
- [x] PWA: SW generated on build; navigateFallback configured
- [ ] iPhone 16 Simulator re-QA after this audit (not re-run this pass)
- [ ] Playwright preview smoke (attempted when server available)

## Manual / remaining
- [ ] Water delete regression with IndexedDB harness
- [ ] Light theme visual pass
- [ ] Add to Home Screen install on physical iPhone (needs HTTPS or LAN host)
- [ ] Full Nightly Truth end-to-end on device
- [ ] Signed HealthKit device pull (real samples)
- [ ] WidgetKit App Group install on device
