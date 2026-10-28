# PROJECT 85 — Signature Edition (Stage 1)

Date: 2026-10-28 · Ships as **v0.9.0**

## Audit (before this stage)

| Area | State | Gap addressed now |
|------|--------|-------------------|
| Visual identity | Lime/charcoal tokens; some card clutter | Motion tokens, signature boot, denser editorial body metrics |
| Onboarding | None — jumps to dashboard | Profile fields for height/sex/birth year in Settings (concise) |
| Body calculations | None | BMI, BMR (Mifflin–St Jeor), TDEE estimate, WHtR |
| Zero-effort UX | Food/water push hard | Dashboard shows **Not tracked** when unlogged; Body Intelligence doesn’t require food logs |
| Health sync / widgets | Documented, not live | Still deferred — no fake “Connected” |
| Exercise video academy | Missing | Deferred (licensed media required) |
| 4K brand masters | `public/brand/` exists for icons | Keep for heroes; UI uses compressed exports |

## Acceptance (Stage 1)

- [x] Body Intelligence route with transparent formulas
- [x] Recalculates when weight/height/sex/age change
- [x] Unit tests for BMI/BMR/TDEE edge cases
- [x] Dashboard strip + Not tracked states
- [x] Motion tokens + reduced-motion respect
- [x] PWA build + tests green
- [ ] Native HealthKit / widgets — **not** in this stage
- [ ] Exercise video library — **not** in this stage

## Native boundary

PWA delivers Signature visuals + calculations. Live wearables and WidgetKit remain Phase 3–4 per `INTEGRATION_MATRIX.md` / `NATIVE_WIDGETS.md`.
