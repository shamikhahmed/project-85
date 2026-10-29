# Changelog

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
