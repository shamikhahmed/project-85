# Changelog

## v0.18.0 — Cardio-aware builder (2026-11-11)

- **Cardio today (Build):** add cardio earlier today, before lifting, after lifting or later today — machine (walk, incline walk, run, bike, elliptical, stairs, rower, swim), minutes and effort by the talk test (easy: you can chat · moderate: short sentences · hard: can't talk). Cardio already logged today is offered as "earlier today". Each block says in one line what it will change.
- **Cardio before:** tires the muscles the machine drives, not the rest — a hard bike or run takes reps off squats but leaves bench press alone (Sporer & Wenger 2003; Panissa 2015, 2016). Those muscles start part-tired in the fatigue simulation, so other muscles go first while the legs recover, and the cards say so. An easy warm-up of 15 min or less costs nothing. Cardio hours earlier counts only its lasting part. The model is fitted to Panissa 2016 (hard 25-min run: squat reps ~26% down at 30 min vs 31% measured, 19% at 1 h vs 19%).
- **Cardio after:** keeps energy for it instead of grinding to failure, which adds a day or two of fatigue for little extra growth (Morán-Navarro 2017; Refalo 2023). Muscles the cardio needs stop 2–3 reps short; for a long hard block they also do one set fewer (never below 2). A short finisher like the plan's 12-min incline walk changes nothing. Lifting first, cardio after is the better order for strength (Murlasits 2018), and the note says so when cardio comes first.
- **Workout player:** cardio blocks are steps of their own (animation, minutes, effort), before the first lift and after the last; they log nothing.
- **Builder fixes since v0.17:** no exercise ever pre-exhausts a lift it helps; long sessions stay sane; templates reload as the exact same session; one combined "too many sets" warning instead of one per muscle; the Library says the actual kit missing ("needs a bench", "needs dip bars") instead of "needs dumbbells equipment".
- **Animations:** every name checked against its clip again; gaps in the plan filled; still image under Reduce Motion.
- **Fix:** History's swap insights never loaded (sorted on a field that isn't indexed). Now they do.

## v0.17.0 — Muscle builder + exercise library (2026-11-10)

- **Train has tabs:** My plan · Build · Library. The plan is unchanged.
- **Build:** pick 1–6 muscles in priority order (12 to choose from, each with a focus such as upper chest or long head), 1–6 exercises per muscle (3-3-4, 4-3-3-4-3-2 …), 2–5 sets, Gym / Dumbbells / Home, supersets on or off. The app picks the exercises, orders them, and sets reps, rest and warm-ups.
- **How it decides (original method):** exercises are chosen to cover each muscle's parts, and what other picks already train counts as half (presses cover front delts, so shoulder picks go to side and rear). The order comes from a fatigue simulation: helpers that limit a lift (triceps for presses, grip for rows, core for squats) go after it, and your first muscle gets the freshest slot. Supersets only pair moves that share no working muscle and don't limit each other. Each card says why it's there and the predicted strength left when you reach it.
- **Session tools:** volume per muscle against the ~11-set plateau, time estimate, swap one exercise (rest stays put), remove, shuffle, save as a template, start in the workout player (supersets alternate set by set with a 15 s switch), log top sets with progression hints. Recovery shows on each muscle chip, "Pick what's ready" suggests a session, and a built session keeps its order when you log.
- **Library:** 177 exercises with animations, cues, what each works and where you can do it; search, filter by muscle and equipment, "Add to build".
- Builder logs count in the muscle-recovery grid. Shoulder caution keeps dips out of builds.

## v0.16.0 — Exercise animations, workout player, tour (2026-11-06)

- **Animations:** Gym visual GIFs on every exercise card with a match (135 of 175 names, each checked by eye; no GIF beats a wrong one). Tiny corner credit. CDN with GitHub raw fallback; still image under reduced motion.
- **Start workout:** full-screen player — one set at a time, animation, rest countdown with beeps and voice cues, wake lock, top-set logging.
- **Swaps redone:** reason segment, quick options with thumbnails, "See all" card sheet with animation, video and "Use this". Swapped exercise gets its own animation, video link and log.
- **Warm-up/cool-down demos:** thumbnail rows; tap for the animation and a form video.
- **App tour** on first open; Settings → Take the tour. Day tabs now show the weekday (Mon · Push …).

## v0.15.0 — Weekly auto-report (2026-11-04)

- **Sunday report:** closed Mon–Sun week vs the week before (▲/▼ per row) and vs the plan line: 7-day average weight, steps, protein, sleep, sessions done of planned, days logged.
- **One fix for next week:** picked in order — logging gaps, missed sessions, protein, steps, sleep, then weight vs line. Up to two wins called out.
- **Where:** Today from Sunday to Tuesday until "Got it"; Progress always shows the last closed week. Share sends a plain-text summary (share sheet or clipboard). Built from logged days only.

## v0.14.0 — Skip-day coach, muscle recovery, supplements (2026-11-03)

- **Skip-day coach (Train):** "Can't train today?" offers move-to-tomorrow, merge key lifts into tomorrow, or drop — with a coach pick (move when tomorrow is free, else merge). Next day shows a carry-over banner; undo any time. Stored in settings so backups keep it.
- **Muscle recovery grid (Train):** 10 groups from logged top sets (plan, Block B and alternative names), timed from the save time; 72 h window for big groups, 48 h for small.
- **Supplements:** build a stack with timing in Settings; tick each one off on Today (x/y taken). Stored per date in settings.

## v0.13.0 — New icon, rest timer, PRs, plan-aware targets (2026-11-03)

- **New app icon:** vector source (`public/brand/icon-source.svg`) rendered at 4K; exported for PWA, iOS 1024, Android (all densities, round + adaptive) and favicon.
- **Rest timer (Train):** starts after each logged top set or on demand; wall-clock based so it survives screen lock; +30s / Skip; beep + vibration at zero.
- **PR detection:** 🏆 toast when a top set beats every earlier log (heavier, or more reps at the best weight). First log is a baseline.
- **Weigh-in coach reaction:** weight toast compares to the plan line (on the line / ahead / above, calm copy).
- **Steps follow the plan:** 8k week 1 → 10k from week 2 → 12k final weeks; a manual target in Settings pins your own.
- **Today polish:** "Log first weigh-in" button in the hero; readable dates; empty-day score shows — not 0/100; week card no longer says "Welcome back" on day 1; removed dev-speak copy.
- **Fitness age:** shows ≤25 / 75+ at table edges; says when the men's table is used because sex isn't set.

## v0.12.0 — Body age + readiness scores (2026-10-29)

- **Body age (Health):** separate Fitness Age (30d median VO₂max, HUNT) and PhenoAge (Levine 2018 manual labs with unit pickers); citations in-app; never blended.
- **Readiness:** Recovery (0–100), Strain (0–21), Sleep performance + go-to-bed-by; labelled PROJECT 85 score, not medical. Recomputed after health sync into Dexie `dailyScores`.
- **Journal tags:** daily yes/no tags with mean-difference insights after 14+ days.
- **Coach line** on Today from recovery + strain; Train Basic mode uses `shouldForceBasic` (recovery + sleep).
- **Settings:** HR max override, sleep need baseline hours.
- Dexie **v5** tables `labPanels`, `dailyScores`, `journalTags`; backup/restore includes them.

## v0.11.0 — Exercise swaps + auto health sync (2026-10-29)

- **Exercise swaps:** Train cards offer Busy / Broken / Not available / Pain reasons with tappable alts + no-equipment/DB fallback (`fallbackFor`). Swap > Block B > plan name for logging; today-only persistence; undo; history insights.
- **Auto health sync (native only):** launch + resume with 15-minute throttle; full Capgo metric pull (weight, BF%, steps, distance, active/basal/total energy, dietary energy, water, sleep asleep/in-bed, RHR, HRV, workouts); projects into day tables with manual-wins; PWA stays honest (“needs installed app”).
- **Android:** `@capacitor/android` + `android/` platform, Health Connect history permission + privacy policy asset.
- **Optional write-back:** Settings toggle + Quick Log “Also save to Apple Health” (off by default).
- **Polish:** morning weight/sleep line, calorie estimated label, low-sleep → Basic mode on Train, step progress bar, swap insights on History.
- Dexie **v4** `exerciseSwaps` table. Tests: **135** passing.

## v0.10.0 — Project New Me plan (2026-10-29)

- **Train tab** (`/train`): Push / Pull / Legs / Upper / Lower + two Saturday options. Every exercise has sets with kg and lb, rest, cues, why it's there, two alternatives, advanced technique, Block B swap and a demo link. Warm-up, cardio and cooldown per day.
- **Top-set logging with progression**: each exercise card logs weight × reps into today's workout; next session shows "Last: 60 kg × 8 (17 Nov)" and tells you to add weight or beat the reps. Feeds the existing training score.
- **Birthday pump** day on 15 Jan and Block B recalibration note.
- Coaching text no longer suggests swimming (dropped from the plan).
- **Plan phases**: weeks 1-2 Basic, 3-4 Advanced, 5 Deload, 6-10 Block B, 11-15 Jan Reveal. Today's session and phase on the dashboard.
- **Full muscle coverage**: lower chest (high-to-low fly), traps (shrug), obliques (woodchop), glute medius (abductor), adductors added.
- **Weekly missions + Sunday checkpoints** on the straight line to the target.
- **Sunday check-in for Claude**: copies the last 7 days of real logs as text.
- **Plan library**: 15 PDFs in `public/plan/`, precached for offline.
- **Day-specific calories**: Saturday −50 kcal, rest days −400 kcal (carbs carry it); protein and fat constant. Toggle `dayTypeCalories`.
- **One-time settings migration (planVersion 2)**: start 3 Nov 2026 at 96 kg, 240 g protein, 2,150 kcal, 151 g carbs, 65 g fat, 7 h sleep.
- Tests: plan sessions/phases/targets/macros/migration, check-in builder, training-log helpers (123 passing).

## Unreleased — 2026-10-28 (deep audit)

### Reliability & honesty
- Health sync: single-flight lock + transactional `healthRecords` replace; Apple connection `ok` only after a real sample import and preserved across diagnose refresh
- Overnight sleep wake dates use local calendar helpers (no UTC shift)
- Invalid sleep durations stay `null` (never averaged as zero); aggregates take max of valid rows
- Steps replace-total is transactional and collapses duplicate date rows
- Backup validate strips non–`data:image/` progress photos and demotes duplicate primary morning weights
- CSV export escapes quotes and flattens newlines in detail fields
- `pickDayTotal` never sums across providers; prefers day-total over summing interval samples
- Deep links / QA routes allowlisted; weight seed refreshes the day store

### Tests
- Vitest **98** passing across **19** files (was 55 / 13 at 0.9.0 docs; prior session baseline 80 / 18)

## 0.9.0 — 2026-10-28

### Health Intelligence + Body Map / Motivation / Timeline
- Canonical health model, metric registry, provider adapters with honest connection states (`HEALTH_INTELLIGENCE.md`)
- Health Profile domain scores; **numerical biological age explicitly not implemented**
- Dexie v2/v3: body measurements, motivation, letters, journal, progress photos, health records/connections
- Screens: `/physique`, `/body`, `/health`, `/motivation`, `/timeline`
- Body metrics: BMI, Mifflin–St Jeor BMR, TDEE estimate, optional Navy BF% estimate (labelled)
- Zero-effort: calories/water show **Not tracked** when empty; no invented hydration
- Backup/restore includes new tables; PWA remains functional without HealthKit
- Manual logs mirror into `healthRecords` on init + Health **Sync now**; Apple Connect button uses Capgo bridge
- Capacitor `ios/` shell added; HealthKit usage strings in Info.plist (`NATIVE_HEALTHKIT.md`)
- Physique: measurement systems separated + Table & charts (CSV, bars, site history)

### Not live (documented blockers)
- Apple HealthKit **live samples** still need signed Xcode build + HealthKit capability on device
- Google Health OAuth, Zepp Open Platform, WidgetKit device install

## 0.8.0 — 2026-10-28

### Product intelligence (Phase 1)
- Evidence-based audit + roadmap: `PRODUCT_ROADMAP.md`
- **Daily Mission**: day-kind labels, sleep-adaptive copy, mission title on Today
- **Trend Truth Engine**: plateau status (≥21-day flat), daily-vs-trend calm messaging, birthday forecast with estimated arrival
- **Quick Log**: re-log recent meals from the last two days in one tap
- **Comeback**: two-tap restart actions (meal / weight / suggested / water)
- Widget JSON contract scaffolding retained under `src/native/` — **not device-tested**; no fake “connected” UI

### Tests
- 55 Vitest tests passing; typecheck + production build green

## 0.7.0 — 2026-10-28

### Visual audit → premium polish
- Honest hero: dashed “awaiting scale” ring when no weigh-in (no fake 0% failure state)
- Flattened hero metrics (start / now / target / to go) — removed nested card grid + duplicate progress bar
- Command Centre + focused Quick Log (4 primary actions; secondary text links)
- Compact “This week” teaser on Today; full weekly review on Progress
- Today metrics trimmed to steps / calories / protein / water (secondary status line for the rest)
- SVG nav icons; quieter lime (less glow/gradient chrome); system font enforced on charts/tooltips
- Boot / loading branded with lime **85**; install banner quieter
- Food library dedupe by name on init (keeps highest-use template; does not wipe logs)
- PWA build: exclude `public/brand/**` masters from Workbox precache

### Already present (retained)
- Quick Log sheet, Focus Mode, Nightly Truth, Pakistani food library, weight trend honesty gates, backup/restore, IndexedDB persistence

## 0.6.0 — 2026-10-27

### Premium dark UI (production visual language)
- Art direction: layered charcoal (`#0B0D10` / `#12151A` / `#191D24`) + lime accent `#C4F36B`
- System typography throughout (SF on Apple); Google Fonts removed
- Dashboard: hero progress ring, MetricChip daily metrics with bars, Command Centre
- Polished Progress charts (daily vs 7-day avg), History calendar tones, all page headers
- PWA icons / favicon / theme-color updated to lime charcoal identity
- Comeback mechanic, food memory Quick Log, Focus Mode retained

### Production readiness
- Local-first IndexedDB preserved; merge-safe backup restore
- Vitest + typecheck + production build verified for this release

## 0.5.0 — 2026-10-27

### Typography & engagement foundations
- System font stack; Command Centre briefing; comeback; progress proof milestones

## 0.4.0 — 2026-10-27

### Added
- Quick Log sheet — saved meals / water / steps / weight in ≤4 taps
- Focus Mode (Settings) — three daily priorities + quick actions
- Weekly review card — 7-day averages, hit rates, 1–2 adjustments
- Food library CRUD (create / edit / duplicate / delete) in Settings
- Safer backup restore: merge-keep-newer by default; full replace requires typing REPLACE
- Profile flags: shoulder caution, avoid chai, focus mode
- Green tea seed (chai removed for GI profile)

### Copy / safety
- Friendlier empty / incomplete / recovery language
- Nightly Truth prompts for oil, sauces, unplanned meals
- Streak messaging preserves historical achievements

## 0.3.0 — 2026-10-27

### Polish
- Refined charcoal/orange design tokens, type scale, warmer empty states
- Friendlier IA: Today / Log / Trend / Review / History / More
- Dashboard: time-of-day greeting, hero-first, clearer briefing, provisional calorie badge
- Settings fields sync when values change; softer install copy
- Feature questionnaire for ChatGPT-driven ideation

## 0.2.0 — 2026-10-27

### Added
- Mission briefing + next-best-action engine (`src/lib/briefing.ts`)
- Weight trend engine with 7-day averages; insufficient-data gate (`src/lib/weightTrend.ts`)
- Recovery plan for imperfect days (`src/lib/recovery.ts`)
- Expanded Pakistani/desi food library (boti, shami, karahi, daal, raita, chai)
- Research dossier, design system, data model, agent work log docs
- Installable PWA with PNG icons, SW offline precache, install banner
- iPhone 16 Simulator Safari QA screenshot

### Safety / accountability
- Macro success requires honesty + ≥60% logging completeness
- Starvation cannot score as calorie success
- Supportive Nightly Truth / Discipline copy

## 0.1.0 — 2026-10-27

### Added
- Full local-first Vite + React + TypeScript app
- Dashboard, Daily Log, Progress, Discipline, History, Settings
- Dexie persistence, backup/restore, CSV export
- Nightly Truth Check, discipline score /100
