# Test Plan

## Automated (`npm test`) — last run 2026-10-28: **55 passed / 13 files**
- [x] Daily Mission day-kind + sleep-adaptive briefing
- [x] Plateau vs short stable; daily-vs-trend calm copy
- [x] Birthday projection arrival estimate when rate supports it
- [x] Widget snapshot builder does not invent unlogged calories
- [x] 96.5 → 85 = 11.5 kg remaining; % progress bounded 0–100
- [x] Countdown / local calendar helpers
- [x] Food totals + estimated labelling
- [x] Steps replace-total rule
- [x] Sleep across midnight
- [x] Daily score: missing ≠ success; starvation not rewarded
- [x] Macro success gated on honesty + completeness
- [x] Streaks skip missed days
- [x] Backup CSV + corrupted restore reject
- [x] Briefing provisional-calories language
- [x] Weight trend insufficient-data / calm labels
- [x] Recovery plan constructive only

## Quality gates — last run 2026-10-28
- [x] `npm run typecheck`
- [x] `npm run lint` (warnings only; no errors)
- [x] `npm run build` (PWA SW + manifest; brand masters excluded from precache)
- [x] Cursor browser visual pass: desktop + 390×844 device metrics; Quick Log sheet
- [x] PWA: SW activated on preview; manifest 192/512 icons (prior)
- [x] iPhone 16 Simulator Safari open + screenshot (`qa-sim-iphone16.png` local — prior orange-era capture; re-run recommended)
- [x] Playwright iPhone 390×844 viewport smoke (prior)

## Manual / remaining
- [ ] Water undo unit test
- [ ] Light theme visual pass
- [ ] Add to Home Screen install on physical iPhone (needs HTTPS or LAN host)
- [ ] Full Nightly Truth end-to-end on device
