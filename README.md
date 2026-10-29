# PROJECT 85

Personal birthday transformation mission control. Local-first **PWA** for one person.

**Mission:** 3 Nov 2026 → 15 Jan 2027 · **Target:** 85.0 kg · **Start:** 96.0 kg (11 kg to lose)

**Live PWA:** https://shamikhahmed.github.io/project-85/  
(iPhone Safari → Share → **Add to Home Screen**)

## Quick start

```bash
npm install
npm run dev
```

### Production / install as PWA

```bash
npm run build
npm run preview
# GitHub Pages (hash routes):
GITHUB_PAGES=1 npm run build && npx gh-pages -d dist -t
```

## What’s in v0.11

New: **exercise swaps** (busy/broken/pain + DB fallback), **native auto health sync** (launch/resume, 15‑min throttle, Android Health Connect), morning weight/sleep line, step bar, swap insights.

### Earlier (v0.10)

**Train** tab with the full Project New Me plan, weekly missions, Sunday checkpoints, Sunday check-in for Claude, and the PDF plan library (`public/plan/`). Day-specific calories.

### Earlier (v0.9+)

| Area | Status |
|------|--------|
| Today / Log / Progress / Review / History / Settings | Working |
| Physique (separate measurement systems + table & charts) | Working |
| Body Intelligence (BMI / BMR / TDEE estimates) | Working |
| Health Intelligence (profile + honest source status + sync mirror) | Working |
| Motivation / Timeline | Working |
| Manual → `healthRecords` sync | Working in PWA |
| Apple HealthKit live read | **Native Capacitor app only** — see `NATIVE_HEALTHKIT.md` |
| Google Health / Fitbit Air API | **Blocked** — needs OAuth backend (`INTEGRATION_MATRIX.md`) |
| Biological age in years | **Not implemented** (Health Profile only) |
| WidgetKit | Scaffold only (`NATIVE_WIDGETS.md`) |

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Dev server |
| `npm run build` | Icons + typecheck + production build |
| `npm run preview` | Serve production build |
| `npm test` | Vitest |
| `npm run typecheck` | TypeScript |
| `npm run lint` | Oxlint |
| `npx cap sync ios` | Sync web build into native shell (after `cap add ios`) |

## Stack

Vite · React 19 · TypeScript · Dexie · Zustand · Recharts · Framer Motion · vite-plugin-pwa · Capacitor (+ `@capgo/capacitor-health`)

## Docs

- [HEALTH_INTELLIGENCE.md](./HEALTH_INTELLIGENCE.md)
- [NATIVE_HEALTHKIT.md](./NATIVE_HEALTHKIT.md)
- [INTEGRATION_MATRIX.md](./INTEGRATION_MATRIX.md)
- [PRODUCT_ROADMAP.md](./PRODUCT_ROADMAP.md)
- [DATA_MODEL.md](./DATA_MODEL.md)
- [CHANGELOG.md](./CHANGELOG.md)

## Important limitations

- Clearing browser storage or uninstalling can erase local data — export backups from Settings  
- No cloud sync across devices  
- Wearable imports need native/OAuth work documented above — the app will **not** fake a connection  
