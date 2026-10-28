# PROJECT 85 — Product Intelligence Audit & Roadmap

Evidence date: **2026-10-28** · App version **0.7.0** · Stack: Vite 8 · React 19 · Dexie · Zustand · Recharts · PWA · Capacitor deps present but **no `ios/` tree**.

## 1. Repository audit (evidence-based)

| # | Capability | Status | Evidence | Gap |
|---|------------|--------|----------|-----|
| 1 | Daily Mission / adaptive briefing | **partial → upgrading** | `src/lib/briefing.ts` `buildDailyBriefing`; Dashboard Command Centre | Hour-based next action only; no explicit day-kind / sleep-adaptive mission title |
| 2 | Quick Log + reusable meals | **partial → upgrading** | `QuickLogSheet.tsx`; `foodLibrary` + `useCount` | No “repeat yesterday” / recent-entry strip |
| 3 | Pakistani food library | **partial** | `SEED_FOOD_LIBRARY` (~13 desi + restaurant stub); Settings CRUD | No restaurant chains / portion ranges UI |
| 4 | Weight trend / plateau / projections | **partial → upgrading** | `weightTrend.ts`, `weightProgress.ts`, Progress charts | No plateau label; weak daily-vs-trend copy; projection is linear only |
| 5 | Weekly review + comeback | **implemented** | `weeklyReview.ts`, `comeback.ts`, Dashboard cards | Comeback CTA can be clearer (two-tap restart) |
| 6 | Workout / swimming companion | **partial** | DailyLog `WorkoutPanel` (types include swimming) | Log-only; no sets/reps/plan |
| 7 | Progress photos + measurements | **partial** | `waistCm` on weights | No photo storage/UI |
| 8 | Habit / craving tracking | **partial** | Smoking + nightly honesty; habit rollups | No dedicated craving model |
| 9 | Apple / Google / Zepp Health | **missing** · **requires accounts** | README: manual steps only; matrix: [`INTEGRATION_MATRIX.md`](./INTEGRATION_MATRIX.md) | Prefer HealthKit hub; Google Health Restricted/CASA; Zepp via AH or restricted Open Platform |
| 10 | Native iOS widgets | **partial scaffold · blocked** | `src/native/*`, `NATIVE_WIDGETS.md`, Capacitor packages | No Xcode project; sync not wired; **not device-tested** |
| 11 | Privacy / backup / restore | **implemented** | `backup.ts`, Settings merge/replace restore | Keep as-is |
| 12 | Focus Mode + polish | **partial** | `focusMode` settings + Dashboard priorities | Good enough for now |

**Routes:** `/` `/log` `/progress` `/discipline` `/history` `/settings`  
**Dexie v1 tables:** settings, weights, foods, foodLibrary, steps, water, workouts, sleep, cigarettes, notes, scores, xp, achievements  
**Tests (pre-phase):** 50 passing · typecheck had error in unfinished widget fixture (fixed in this phase)

---

## 2. Scored opportunities

Scale 1–5 (higher = better for “do now”). Privacy risk: lower is safer.

| Feature | Value | Cost | Reliability | Privacy risk | Ext. deps | Impact on existing | Score |
|---------|------:|-----:|------------:|-------------:|----------:|-------------------:|------:|
| Daily Mission polish | 5 | 2 | 5 | 1 | 0 | Low | **4.6** |
| Quick Log repeat/recent | 5 | 2 | 5 | 1 | 0 | Low | **4.6** |
| Trend Truth Engine | 5 | 2 | 5 | 1 | 0 | Low | **4.6** |
| Comeback UX | 4 | 1 | 5 | 1 | 0 | Low | **4.4** |
| Food library expansion | 4 | 3 | 4 | 1 | 0 | Med | 3.6 |
| Weekly review depth | 4 | 2 | 5 | 1 | 0 | Low | 4.0 |
| Workout companion | 3 | 4 | 4 | 1 | 0 | Med | 2.8 |
| Progress photos | 3 | 4 | 3 | 3 | 0 | Med | 2.4 |
| Health integrations | 4 | 5 | 2 | 5 | High | High | 2.0 |
| Native widgets | 3 | 5 | 2 | 2 | High | Med | 2.0 |
| Focus / polish | 3 | 2 | 5 | 1 | 0 | Low | 3.6 |

**Recommendation:** Do **Mission + Quick Log + Trend Truth + Comeback** next (this phase). Defer Health + Widgets until core daily loop is excellent and native signing is available.

---

## 3. Architecture (shared, forward-compatible)

### Canonical daily model (today)

`DayAggregate` remains the derived daily view from Dexie entries. Manual logging stays source of truth until health imports exist.

### Future imported measurement contract (not yet persisted)

Each future import must carry: metric type, value, unit, start/end, provider, device, sourceRecordId, syncAt, measured|manual|estimated, quality, timezone. Dedupe by `sourceRecordId` first; never sum steps across providers; never overwrite manual without explicit user choice.

### Widget contract (scaffolded only)

`src/native/widgetSnapshot.ts` JSON → App Group later. **PWA cannot update WidgetKit.** Claim “widgets work” only after Xcode build + Home Screen verification.

### Rules engine

Pure functions in `src/lib/*` — transparent, testable, no LLM required. Insights must cite timeframe/sample size in copy.

---

## 4. Acceptance matrix — Phase 1 (this release)

| ID | Criterion | How verified |
|----|-----------|--------------|
| P1-1 | Daily Mission shows day-kind + primary win without inventing workouts | Unit tests + Dashboard UI |
| P1-2 | Poor yesterday sleep softens training language | Unit test on briefing |
| P1-3 | Quick Log shows recent meals + one-tap re-log | Manual + code path |
| P1-4 | Trend engine can flag plateau separately from short flat spell | Unit tests |
| P1-5 | Daily-up / trend-down calm message when data supports it | Unit tests + Progress UI |
| P1-6 | Projection includes estimated arrival window or honest insufficient | Unit tests + Progress |
| P1-7 | Comeback ≥2 missed days offers clear restart CTAs | Dashboard |
| P1-8 | Existing logs/backup untouched; `npm test` + typecheck + build green | CI commands |
| P1-9 | No fake Health/widget “connected” states | Code review |

---

## 5. Phased roadmap

| Phase | Focus | Est. | Depends on |
|-------|-------|------|------------|
| **1** | Mission, Quick Log memory, Trend Truth, Comeback | 1–2 days | — |
| **2** | Food ranges / restaurant presets, weekly review depth, birthday forecast UX | 2–4 days | Phase 1 |
| **3** | Health data layer + one real integration path | Weeks | See [`INTEGRATION_MATRIX.md`](./INTEGRATION_MATRIX.md) — prefer Apple Health hub on iPhone; Google Health API if Fitbit Air needs direct OAuth |
| **4** | WidgetKit + App Groups + device test | Days–weeks | Xcode team, signing, Cap sync |
| **5** | Photos, gym companion, polish, a11y, real-device QA | Ongoing | Phase 1–2 solid |

---

## 6. Native boundary (honest)

| Can do in this repo now | Needs device / Apple / Google |
|-------------------------|--------------------------------|
| PWA logging, engines, UI | HealthKit read |
| Widget JSON contract | WidgetKit extension build & install |
| Capacitor config + npm deps | Provisioning, App Groups entitlements |
| Docs for setup | Physical iPhone verification |

**Do not claim widgets or Health sync are live.** Scaffolding ≠ shipping.
