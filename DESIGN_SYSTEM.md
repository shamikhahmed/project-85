# Design System — PROJECT 85

## Art direction
Premium dark wellness × Apple restraint × editorial metrics × precise charts.

Brand signal: **PROJECT** + lime **85**. Most UI stays neutral; lime (`#C4F36B`) marks progress and primary actions only.

## Surfaces
| Token | Value | Use |
|-------|-------|-----|
| `--bg-deep` | `#0B0D10` | Page |
| `--bg-elevated` | `#12151A` | Panels |
| `--bg-panel` | `#191D24` | Hero / command |
| `--border` | `#282E38` | Separators |

## Typography
System stack only (SF on Apple). No Google Fonts. No bundled SF Pro files.

```css
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
```

Tabular numerals via `font-variant-numeric: tabular-nums`. Rem scale respects text-size prefs.

## Components
`panel`, `panel-hero`, `MetricChip`, `ProgressRing`, Quick Log sheet, bottom nav, toast, badges.

## Themes
Dark default. Light + system in Settings.

## Motion
Short ease-out transitions; Framer for sheets. `prefers-reduced-motion` honored.

## Principles
1. One focal point per screen  
2. Useful next action always visible on Today  
3. Charts never invent missing data  
4. Touch ≥ 44px; safe-area aware  
5. No manipulative streaks or neon chrome  
