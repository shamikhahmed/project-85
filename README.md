# PROJECT 85

Personal birthday transformation mission control. Local-first **PWA** for one person.

**Mission:** 27 Oct 2026 → 15 Jan 2027 · **Target:** 85.0 kg · **Start:** 96.5 kg (11.5 kg to lose)

## Quick start

```bash
npm install
npm run dev
```

### Production / install as PWA

```bash
npm run build
npm run preview
```

- **Chrome/Edge:** install from the address bar or the in-app Install banner  
- **iPhone Safari:** Share → **Add to Home Screen**

After first load, the service worker caches the app shell. Logs live in IndexedDB on this device only — export backups from Settings.

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Dev server (SW enabled for smoke tests) |
| `npm run build` | Icons + typecheck + production build |
| `npm run preview` | Serve production build |
| `npm test` | Vitest (40 tests) |
| `npm run typecheck` | TypeScript |
| `npm run lint` | Oxlint |

## Stack

Vite · React 19 · TypeScript · Dexie · Zustand · Recharts · Framer Motion · vite-plugin-pwa

## Docs

- [PROJECT_SPEC.md](./PROJECT_SPEC.md)
- [RESEARCH_DOSSIER.md](./RESEARCH_DOSSIER.md)
- [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md)
- [DATA_MODEL.md](./DATA_MODEL.md)
- [FEATURE_QUESTIONNAIRE.md](./FEATURE_QUESTIONNAIRE.md) — fill / paste into ChatGPT for next features
- [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)
- [TEST_PLAN.md](./TEST_PLAN.md)
- [AGENT_WORK_LOG.md](./AGENT_WORK_LOG.md)
- [CHANGELOG.md](./CHANGELOG.md)

## Important limitations

- Manual steps only — no Apple Health / Fitbit / Google Fit until a real integration is built  
- No cloud sync across devices  
- Clearing browser storage or uninstalling can erase local data  
