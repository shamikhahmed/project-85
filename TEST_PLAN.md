# Test Plan

## Calculation suites (`src/lib/**/*.test.ts`)
- [x] 96.5 → 85 = 11.5 kg remaining; % progress bounded 0–100
- [x] Countdown uses local calendar date to 2027-01-15
- [x] Food totals after add/edit/delete
- [x] Estimated foods remain labelled estimated
- [x] Steps: documented replace-total rule; no double-count
- [ ] Water undo restores prior total
- [x] Sleep across midnight duration
- [x] Daily score: missing ≠ success; starvation not rewarded
- [x] Streaks skip unlogged/missed days correctly
- [x] Export CSV/JSON shape; restore preserves history
- [x] Corrupted backup rejected safely

## Manual QA
- [x] Full day log → refresh → data present (browser smoke)
- [x] Offline after install (SW activated on preview)
- [x] Keyboard + 44px touch targets
- [ ] Light/dark theme
- [ ] Nightly Truth Check flow

**Last run:** `npm test` → 27 passed · `npm run typecheck` · `npm run build` OK
