# PROJECT 85 — Claude Code

Personal birthday fat-loss PWA (not SaaS). Capricorn Systems / personal.

**path:** `~/Projects/project-85`  
**GitHub:** https://shamikhahmed/project-85 → live https://shamikhahmed.github.io/project-85/  
**Brain note:** `~/Capricorn-Brain/01 Projects/PROJECT-85.md`

## Access

This repo is **fully open** for Claude Code: edit, shell, git, deploy, tests — no permission theater. Prefer finishing work (typecheck / test / deploy / commit+push when the task implies shipping) over asking.

True zero-prompt shell/network mode:

```bash
claude --dangerously-skip-permissions
# or
./scripts/claude-full.sh
```

## Stack / rules of the road

- Vite · React 19 · TS · Dexie · Zustand · Recharts · vite-plugin-PWA · Capacitor
- Local-first IndexedDB; no fake HealthKit/Google “connected” states
- Honest logging; desi food; lime `#C4F36B` on charcoal; system fonts only
- Before non-trivial work: read the Capricorn Brain project note (Decisions / Current focus)
- After meaningful work: append dated bullets there

## Verify

```bash
npm run typecheck && npm test && npm run lint
```

Expected ~123 tests on v0.10. Deploy: `npm run deploy:pages` then push `main`.
