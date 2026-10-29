# CURSOR BRIEF — PROJECT 85 v0.12 (Body Age + Recovery / Strain / Sleep, WHOOP-style, free)

Do `CURSOR_FIX.md` first (sleep night grouping, local dates). This builds on it.
Work on the branch that is checked out now. Same house rules as `CURSOR_BRIEF.md`. All on-device, no paid APIs, no cloud.

**Honesty rule (project decision):** never show a number that comes from a made-up formula and presents itself as science.
Every age estimate must use a **published, peer-reviewed model** with its exact coefficients, a citation
shown in the app, and a test that reproduces a worked example from the source. If you cannot verify the
coefficients from the primary paper, do not ship that model. Leave it as "not available" and say why in your reply.
Readiness/strain scores are our own transparent formulas. Label them "PROJECT 85 score, not medical".

First, confirm which data types `@capgo/capacitor-health` actually supports on iOS and Android
(heart rate samples, resting HR, HRV, VO2max, respiratory rate, SpO2, workouts with HR). Build only on what exists,
and list the gaps in your reply.

## 1. Body Age (Health page, new card)

Two separate estimates. Never average them into one "biological age".

**A. Fitness Age, from VO2max.** Source: Nes BM et al., "Estimating VO2peak from a nonexercise prediction model:
the HUNT Study", Med Sci Sports Exerc 2011; and the "fitness age" concept from Nes et al. 2013 (CERG, NTNU).
- Input: VO2max from Apple Health ("Cardio Fitness") or Health Connect. Use the latest 30-day median.
- Fitness age = the age at which the user's VO2max equals the sex-specific population average in the source.
- If there is no VO2max sample, show the "Needs a watch that measures cardio fitness, or a lab test" empty state.

**B. PhenoAge, from blood tests.** Source: Levine ME et al., "An epigenetic biomarker of aging for lifespan and
healthspan", Aging 2018 (9 biomarkers + chronological age, Gompertz mortality formula).
- Manual entry form: albumin, creatinine, glucose, CRP, lymphocyte %, MCV, RDW, alkaline phosphatase, WBC, plus test date.
- Unit pickers with correct conversions (mg/dL ↔ µmol/L, g/dL ↔ g/L, mg/L ↔ mg/dL for CRP). CRP uses ln(CRP mg/dL).
- Test: reproduce a published or reference example to within 0.1 years.
- Save each lab panel with its date, so the result is tracked over time.

UI: chronological age vs each estimate ("Fitness age 34 · you are 31"), a trend line over time, a "how this is
calculated" sheet with the citation, and "what moves it" tips (zone-2 cardio and intervals for VO2max; for labs, see a doctor).
Remove or replace the old "bio-age not implemented" copy only for the parts that are now real.

## 2. Recovery (daily, 0–100, green ≥ 67 / amber 34–66 / red ≤ 33)

Inputs, each compared with the user's own **rolling 30-day baseline** (needs ≥ 7 days of data, else "calibrating, day X/7"):
- HRV: Apple gives SDNN, Health Connect may give RMSSD. Store which one it is. Never mix the two in one baseline.
  Use ln(HRV) z-score vs baseline. Weight 50%.
- Resting HR: inverted z-score (lower = better). Weight 25%.
- Last night's sleep performance (below). Weight 25%.
- Optional ±: respiratory rate > baseline + 1 breath/min → flag "possible illness/strain".
- **User's device is a Google Fitbit Air.** On iPhone its data reaches Apple Health through the Google Health app
  (Partner apps → Apple Health). Reported gap: **HRV does not sync**, and VO2max may not either. When HRV is missing,
  reweight to resting HR 50% + sleep 50% and show "HRV not shared by Google Health. Recovery uses resting HR + sleep".
  Don't call it calibrating forever. Keep the code ready to use HRV when it appears (Apple Watch, or a later
  Google Health API link). Don't build the Google Health API in this pass.
Map the weighted z-score to 0–100 with a clamped logistic. Keep the function pure and fully unit-tested.
Show which input pulled the score down ("HRV 18% below your normal").

## 3. Strain (daily, 0–21 scale like WHOOP, our own formula)

- HRmax = 208 − 0.7 × age (Tanaka 2001), with a manual override in Settings.
- Use the Edwards TRIMP on heart rate samples: minutes in zones 50–60 / 60–70 / 70–80 / 80–90 / 90–100 % HRmax × weights 1–5.
- Strain = 21 × (1 − e^(−TRIMP / k)). Pick k so a hard 60-min session ≈ 14–16, and document the choice.
- Add daily steps as a small bonus when there is no HR (show "estimated from steps").
- Per workout: strain and time in zones, plus the logged Train session linked by time overlap.

## 4. Sleep (WHOOP-style)

- Sleep need = 8h baseline (Settings) + sleep debt (last 3 nights' shortfall × 0.5, capped at +1h) + strain adjustment (+5 min per strain point above 10).
- Sleep performance = asleep ÷ need, capped at 100%.
- Show stages if they exist, consistency (std-dev of bed/wake time over 7 days), and "Go to bed by HH:MM to hit your need" for tonight.

## 5. Coach line (Today screen)

One sentence from the three scores: Green + low strain → "Push today: Advanced mode." Red → "Go Basic, add 20 min walk."
Feed it into the existing Train low-sleep → Basic logic, so there is one source of truth.

## 6. Journal (WHOOP-style, free)

Optional daily yes/no tags (late meal, chai after 4pm, alcohol, screens in bed, stress, sick). After 14+ days,
show "Nights after a late meal: recovery −11 on average". Use a simple mean difference, with n shown, and
"not enough data" below 5 per group.

## Data / tech

- New Dexie tables (version bump + migration test): `labPanels`, `dailyScores` (date, recovery, strain, sleepPerf, inputs JSON, version), `journalTags`.
- Recompute scores after each sync, for the days touched. All math lives in `src/health/scores/*.ts` as pure functions.
- Backup/restore must include the new tables (update `backup.ts` and its tests).

## Verify

- Tests: every formula has unit tests with hand-calculated values, including the published worked examples for both
  age models; calibration states; the SDNN/RMSSD separation; and the journal minimum n.
- `npm run typecheck && npm test && npm run lint && npm run build` → all 0, zero warnings. `cap sync ios/android` → 0. Simulator xcodebuild → succeeded.
- Check 390×844 and 1440×900, light and dark: Today, Health, Train, Settings. No overflow, 12px gaps, no console errors.
- Bump to v0.12.0, update CHANGELOG, HEALTH_INTELLIGENCE.md and TEST_PLAN.md. Commit small, push, `npm run deploy:pages`.

Final reply (< 40 lines): PASS/FAIL · what you built (file:line) · citations used and how they were verified ·
plugin data gaps · tests · exits · SHA.
