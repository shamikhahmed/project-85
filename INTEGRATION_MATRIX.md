# Wearable / Health integration matrix

Verified from official docs on **2026-10-28** (WebFetch; Bright Data unavailable).  
Research agent: [Health API research](d0eb3cb1-d7e8-44e2-8c3b-2e8973fdc581).  
**No live API calls or device syncs have been executed.** Status reflects documentation only.

## Deadline (Fitbit legacy)

| Event | Date | Source |
|-------|------|--------|
| Legacy Fitbit Web API end of support | 2026-09-30 | [About Google Health API](https://developers.google.com/health/about) |
| Legacy Fitbit Web API + Fitbit OAuth **turned off** (`410 Gone`) | **2026-11-02** | Same |
| Consumer help “reconnect by” wording | ~2026-10-30 | [Google Health Help](https://support.google.com/googlehealth/answer/14236613) — minor discrepancy; treat **Nov 2** as hard cutover for API |

**Do not build against the Fitbit Web API.** Use Google Health API if integrating Fitbit/Pixel directly.

---

## Matrix

| Provider / device | Official route | Data types (doc) | Historical? | Permissions | Backend / native | Registration / approval | Difficulty | Status |
|-------------------|----------------|------------------|-------------|-----------------|------------------|-------------------------|------------|--------|
| **Fitbit Air / Pixel Watch** | [Google Health API](https://developers.google.com/health) REST `health.googleapis.com/v4` | Steps, HR, HRV, SpO₂, sleep, exercise, VO₂max, weight, nutrition, ECG, … (~40 types) | Yes; paginated; rollups capped 14–90d/call | Restricted OAuth scopes e.g. `…/googlehealth.sleep.readonly` | Prefer server for client secret + refresh (1h tokens); system browser OAuth | GCP project; enable API; test users; public → OAuth verification + annual **CASA** | Medium | **Requires setup** (≤100 users unverified) |
| **Apple Health / Watch** | HealthKit only (no web platform) | Per-type Activity, Heart, Sleep, Nutrition, … | Yes; user may limit window | Per-type R/W; HealthKit capability + usage strings | **Native iOS required** (e.g. Capacitor + `@capgo/capacitor-health`) | Xcode capability | Medium | **Requires setup** · **unavailable in browser PWA** |
| **Zepp / Amazfit → Apple Health** | Zepp app shares into Apple Health | Steps, distance, energy, sleep stages, workouts, HR, RHR, weight, breathing, VO₂max, SpO₂ (what reaches Google Health listed; exact AH write set not fully confirmed) | Via HealthKit once synced | User toggles in Zepp / Health | None beyond HealthKit bridge | Consumer setting | Low–Med | **Available** (consumer path) |
| **Zepp Open Platform (direct)** | OAuth + webhooks `api-open.zepp.com` | Profile, activity, workout, sleep, HR, HRV, SpO₂ | Backfill ≤30d/request, async webhook | Partner permission review | **Public HTTPS callback**; secret never in frontend | Enterprise verification + app registration | High | **Restricted** |
| **Manual CSV / export** | User export from Zepp/Fitbit if offered | Varies | Import into Dexie | N/A | Local parse only | None | Low | **Available** when export exists |

### Legend

- **Available** — usable without partner approval (may still need native app or user toggles).
- **Requires setup** — docs support it; credentials / native shell / verification not done for PROJECT 85.
- **Restricted** — partnership / enterprise / CASA gates.
- **Unavailable** — no official path for plain Safari PWA → HealthKit / Zepp cloud.

---

## VERIFIED vs ASSUMED

### Verified

- Fitbit Web API hard-off **2026-11-02**; migrate to Google Health API.
- Google Health scopes are **Restricted**; unverified apps capped (~100 users); CASA for broader access.
- Users must use Google Health app / account link; OAuth tokens not portable from legacy Fitbit.
- HealthKit has **no browser API**; Capacitor native shell required.
- Zepp Open Platform needs backend + enterprise-style onboarding.
- Zepp → Apple Health / Health Connect is the practical consumer path for Amazfit history.

### Assumed (do not treat as facts)

- Every Zepp metric typed into Apple Health appears 1:1 in HealthKit queries.
- Browser-only PKCE to Google Health without a confidential client is production-viable (docs emphasize web server client).
- Individual (non-enterprise) can pass Zepp partner verification.

---

## Architecture recommendation (for later phases)

| | **A — Apple Health hub** (preferred on iPhone) | **B — Direct Google Health API** |
|---|-----------------------------------------------|----------------------------------|
| Path | Fitbit→Google Health app→AH *(if user shares)*; Zepp→AH; Watch→AH → Capacitor HealthKit | OAuth backend → `health.googleapis.com` |
| Backend | None for tokens | Required for secrets / refresh |
| Approval | Apple capability | GCP + possible CASA |
| PWA alone | No | Possibly (with backend) |
| Zepp fidelity | Best via AH | Lossy if only via Google Health reconciled stream |

**PROJECT 85 decision (aligned with `PRODUCT_ROADMAP.md`):** ship local Mission / Trend / Quick Log first. When ready for Phase 3, implement **Approach A** (Capacitor + HealthKit) for iPhone; add Google Health (B) only if Fitbit Air data does not reach HealthKit adequately. Skip direct Zepp Open Platform unless enterprise onboarding is acceptable.

---

## Sources

- https://developers.google.com/health · /about · /data-types · /scopes · /setup · /app-verification · /migration/data-access  
- https://support.google.com/googlehealth/answer/14236613  
- https://developer.apple.com/documentation/healthkit  
- https://devopen.zepp.com/docs/ · partner onboarding · backfill API  
- https://github.com/Cap-go/capacitor-health  
