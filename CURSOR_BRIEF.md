# CURSOR BRIEF — PROJECT 85 v0.11 (exercise swaps + auto health sync)

Work on the branch that is checked out now. Do not create or switch branches.
Quality bar: senior staff engineer. Finish every item fully, test everything, leave no TODOs.
Do not redesign the visual style (lime `#C4F36B` on charcoal, system fonts). Read `CLAUDE.md`,
`DESIGN_SYSTEM.md`, `DATA_MODEL.md` and `NATIVE_HEALTHKIT.md` first, and follow their rules.

House rules that must survive (from the project decisions):
- Never show Apple/Google "connected" without a real successful sync.
- Never sum overlapping provider day totals; for day aggregates prefer manual > Apple > Google.
- Steps use the REPLACE-total model. Bio-age stays not implemented.
- Local-first: IndexedDB (Dexie). No cloud, no login.

Before starting: note HEAD SHA, run `npm run typecheck && npm test && npm run lint && npm run build`, record exit codes.

---

## Task 1 — Exercise swaps (machine busy / broken / taken)

Current state: `src/domain/trainingPlan.json` has 49 exercises across push/pull/legs/upper/lower/arms.
Every exercise has `alts` (2 items) and some have `blockB`. `src/pages/TrainingPage.tsx` shows alts
only as text (around line 594: `If busy: 1) … · 2) …`). You cannot pick one, and logging always uses
the plan name.

Build:
1. On each exercise card (`ExerciseCard`, ~line 436), add a "Machine busy or broken?" row with
   tappable chips: `alts[0]`, `alts[1]`, plus a third **No-equipment / dumbbell** fallback.
   Generate the fallback from the `muscle` field with a small pure helper in `src/domain/`
   (e.g. `fallbackFor(muscle)`: chest → push-ups or DB floor press, back → DB row / band row,
   quads → goblet squat / split squat, hamstrings → DB RDL, shoulders → DB lateral raise,
   biceps → DB curl, triceps → bench dip / overhead DB extension, calves → single-leg calf raise,
   core → plank / dead bug). Respect the shoulder-caution setting: never suggest dips or
   behind-neck moves when it is on.
2. Also add a reason picker (Busy / Broken / Not available / Pain) and store the reason.
   If the reason is **Pain**, show a short "stop, don't push through pain" note and offer the
   lowest-load option first.
3. Lift swap state into the parent (`TrainingPage`): `swaps: Record<"day:code", string>`.
   Make `displayName` return swap > blockB > name so `lastLogsByName` and `saveSet` use the
   exercise actually done. This keeps top-set history and progression hints separate for each
   real exercise.
4. Persist swaps for **today only** (e.g. Dexie table or the existing settings/preferences store,
   keyed by date). Tomorrow resets to the plan. Add an "Undo swap / back to plan" button.
5. Show a small "Swapped: X → Y (busy)" badge on the card summary.
6. On swap, set the weight input to empty (not the old machine's weight). Show the hint
   "New exercise: pick a weight you can do for the top of the rep range with 1–2 reps left".
7. Add Vitest tests: `fallbackFor` covers every muscle string in `trainingPlan.json` (loop
   over the JSON so nothing returns undefined), shoulder-caution exclusion, displayName
   priority, swap reset on a new date, last-log separation per real exercise name.

## Task 2 — Automatic health sync (Apple Health on iPhone, Health Connect on Android)

Current state: `@capgo/capacitor-health` is installed. Bridge: `src/native/healthKitBridge.ts`
(`requestHealthAuthorization`, `pullCommonHealthMetrics(days)`). Engine: `src/health/syncEngine.ts`
(single-flight, replace txn). Sync runs only from the "Sync now" button in
`src/pages/HealthIntelligencePage.tsx` (~line 256). `@capacitor/app` is installed.

Build:
1. Auto sync in the native shell only (`Capacitor.isNativePlatform()`): on app launch and on
   every `App.addListener('appStateChange', { isActive: true })` resume. Throttle to 1 run
   per 15 minutes (persist `lastAutoSyncAt`). Reuse the existing single-flight engine; never
   run two syncs at once. Pull window: since the last successful sync minus 2 days overlap
   (catch late-arriving samples), first run 30 days.
2. Metrics to read (confirm each exists in the plugin's type list; skip and log the ones that
   don't): weight, body fat %, steps, distance, active energy, basal/resting energy,
   dietary energy (calories eaten, e.g. from MyFitnessPal via Health), protein, water,
   sleep (asleep + in-bed, with stages if available), resting heart rate, HRV, workouts.
   Map each into `metricRegistry.ts`, and keep the dedupe rules in `dedupe.ts`.
3. Make synced data fill the app automatically: today's weight, steps, sleep and calories
   should appear on Dashboard / Log / Progress without manual entry. A manual entry for the
   same day still wins (existing rule). Show the source as a small chip ("Apple Health", "Manual").
4. Settings: "Auto-sync" toggle (default on in native), "Last synced: <relative time>",
   a "Sync now" button that stays, and an honest status line using the existing states.
   In the PWA (Safari), show: "Auto-sync needs the installed iPhone app" — no fake state.
5. Android / Health Connect: add `@capacitor/android`, run `npx cap add android`, add the
   Health Connect permissions + the privacy-policy activity alias the Capgo plugin docs
   require in `AndroidManifest.xml`. Use the same bridge code path. Make sure it builds with
   `npx cap sync android`. (Google Fit REST is deprecated — do not use it.)
6. Optional write-back: when the user logs weight manually in the app, offer
   "Also save to Apple Health" (uses the existing `NSHealthUpdateUsageDescription`). Off by default.
7. Tests: mock the plugin. Cover throttle (no second run within 15 min), resume trigger,
   overlap window, manual-beats-synced, no double counting of steps from Apple + Google,
   PWA shows unsupported and never "connected", a failed sync keeps the previous status and data.

## Task 3 — Polish ideas (do after 1 and 2 are green)

1. **Morning auto-check-in:** if today's weight and last night's sleep synced, Dashboard shows
   "Weight 95.8 (7-day avg 96.1, −0.4/wk) · Slept 6h 40m" with no input needed.
2. **Calorie balance today:** eaten (dietary energy or manual) vs target from `macrosFor`,
   and active energy burned, with an honest "estimated" label.
3. **Low-sleep training note:** if sleep < 6h, the Train tab suggests the Basic (not Advanced) mode for that day.
4. **Step goal nudge:** a progress bar toward the daily step target using synced steps.
5. **Swap insights:** History shows how often each machine was swapped and why.

---

## Verification (all required before you say done)

1. `npm run typecheck && npm test && npm run lint && npm run build`: all exit 0, zero new lint warnings.
2. `npx cap sync ios` and `npx cap sync android` succeed. Run `xcodebuild -project ios/App/App.xcodeproj -scheme App -sdk iphonesimulator -configuration Debug build CODE_SIGNING_ALLOWED=NO` and record the result.
3. Check at 390×844 and 1440×900, light and dark: `/`, `/train`, `/log`, `/health`, `/settings`,
   `/progress`, `/history`: no horizontal overflow, 12px panel gaps, chips wrap cleanly,
   tap targets ≥ 44px, no console errors.
4. Manually exercise a swap end-to-end in the browser: swap → log a top set → reload → the swap and
   log persist today → change the date → resets to the plan, and the history stays under the real name.
5. Update `CHANGELOG.md` (v0.11.0), `package.json` version, `NATIVE_HEALTHKIT.md` (auto-sync +
   Android steps) and `TEST_PLAN.md`.
6. Commit in small logical commits with clear messages, and push.

## Final reply (< 40 lines)

PASS/FAIL · what you built (file:line) · tests added · command exits · anything NOT done and why ·
final SHA · exact steps the user must do in Xcode / Android Studio to put it on their phone.
