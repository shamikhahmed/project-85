# Changelog

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
