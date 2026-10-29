# PROJECT 85 — Universal Health Intelligence

**Access / research date:** 2026-10-28  
**App version shipping this doc:** 0.12.0

## Research summary (official sources)

| Topic | Finding | Source |
|-------|---------|--------|
| Fitbit Web API | End of support 2026-09-30; **hard off 2026-11-02** (`410 Gone`) | [Google Health About](https://developers.google.com/health/about) (updated 2026-10-23) |
| Google Health API | Successor; REST; Restricted OAuth scopes; webhooks; reconciled stream | Same + [Scopes](https://developers.google.com/health/scopes) (2026-10-09) + [Data types](https://developers.google.com/health/data-types) |
| Apple HealthKit | Native only — no browser API | [Apple HealthKit](https://developer.apple.com/documentation/healthkit) |
| Zepp | Prefer Zepp → Apple Health; Open Platform = partner + HTTPS webhooks | See `INTEGRATION_MATRIX.md` |
| Fitness Age / PhenoAge | Shipped as **separate** published models (never averaged) | HUNT VO₂max + Levine 2018 labs (`src/health/scores/`) |

## What is implemented (verified in code)

- Canonical types: `src/health/types.ts`
- Metric capability registry: `src/health/metricRegistry.ts`
- Dedupe / day-total priority (never sum providers): `src/health/dedupe.ts`
- Provider adapters with **honest** diagnose states: `src/health/adapters.ts`
- Health Profile (domain scores) + explicit bio-age gate: `src/health/healthProfile.ts`
- Dexie v5 tables: `healthRecords`, `healthConnections`, `labPanels`, `dailyScores`, `journalTags`
- Pure readiness math: `src/health/scores/*`; orchestration `src/health/recomputeScores.ts` after sync
- Fitness Age (VO₂max median 30d) + PhenoAge (manual labs) on `/health`; Recovery/Strain/Sleep labelled not medical
- UI: `/health` Health Intelligence, plus Body Map / Body Intelligence / Motivation / Timeline
- HealthKit bridge stub: `src/native/healthKitBridge.ts` (returns unavailable in PWA)

## What is NOT live

| Integration | Status | Blocker |
|-------------|--------|---------|
| Apple HealthKit read | Unsupported in PWA | Capacitor iOS + entitlement + device |
| Google Health OAuth | Blocked credentials | GCP project, confidential client, Restricted scope review / CASA |
| Zepp Open Platform | Restricted | Enterprise partner onboarding |
| Blended “one biological age” | Not implemented | Project decision: never average Fitness Age + PhenoAge |
| WidgetKit live | Scaffold only | See `NATIVE_WIDGETS.md` |

## Operating costs

| Item | Runtime cost |
|------|----------------|
| Local calculations / IndexedDB | $0 |
| Google Health API (when enabled) | GCP + possible CASA annual review fees (external) |
| AI APIs for health age | Not used |

## Scientific limitations

Health Profile scores are transparent heuristics vs personal targets. They are **not** diagnoses, readiness scores, or biological age in years. HRV/RHR alone do not establish illness or aging rate. BMI is a screening measure.
