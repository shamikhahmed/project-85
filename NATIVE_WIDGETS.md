# Native iPhone Widgets — PROJECT 85

Genuine Home Screen and Lock Screen widgets require a **native iOS app + WidgetKit extension**. The Vite/React PWA alone cannot register widgets with iOS.

## Architecture (verified)

```
┌─────────────────────────────────────────────────────────────┐
│  React / IndexedDB (source of truth for logging)            │
│  buildWidgetSnapshot() → JSON contract                      │
└──────────────────────────┬──────────────────────────────────┘
                           │ Capacitor bridge (native only)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  App Group UserDefaults                                     │
│  suite: group.com.capricorn.project85                       │
│  key:   widgetSnapshotV1                                    │
└──────────────────────────┬──────────────────────────────────┘
                           │ WidgetKit TimelineProvider
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Project85Widgets.appex                                     │
│  Progress · Daily Targets · Lock Screen accessories         │
└─────────────────────────────────────────────────────────────┘
```

### Why App Groups?

[Apple: Configuring app groups](https://developer.apple.com/documentation/xcode/configuring-app-groups) — extensions cannot read the host app sandbox or browser IndexedDB. Shared container / App Group `UserDefaults` is the supported local path.

### Refresh reality

- Snapshot is written when the Capacitor app opens, after logging, and after day refresh.
- `WidgetCenter.reloadAllTimelines()` requests a reload; **iOS decides** when widgets actually update.
- Background updates are not guaranteed. Do not promise real-time widgets.
- Safari PWA has **no** widget bridge — widgets require the native shell.

### Deep links

Custom URL scheme: `project85://`

| Path | Opens |
|------|--------|
| `/` | Today |
| `/log?tab=weight` | Weight log |
| `/log?tab=food` | Food log |
| `/log?tab=water` | Water log |
| `/log?tab=workout` | Workout |
| `/discipline` | Nightly / review |

### Privacy

- Lock Screen widgets omit food detail, cigarettes, and journal by default.
- `redactSensitiveOnLockScreen: true` in the snapshot contract.
- Prefer weight/steps/water progress on accessories.

## Widget catalogue (priority)

| Widget | Families | Status |
|--------|----------|--------|
| Progress | systemSmall, systemMedium, systemLarge | Implemented in extension |
| Daily Targets | systemSmall, systemMedium | Implemented |
| Lock Screen | accessoryInline, accessoryCircular, accessoryRectangular | Implemented |
| Activity / Trend / Quick Actions | — | Scaffolded kinds; expand after first install verified |

## Build & signing

1. Apple Developer account + App ID with App Groups.
2. Enable App Group `group.com.capricorn.project85` on **App** and **Widget** targets.
3. Open `ios/App/App.xcodeproj` in Xcode.
4. Select a Development Team; resolve provisioning.
5. Run on Simulator or device; long-press Home Screen → Add Widget → PROJECT 85.

See `ios/WIDGET_SETUP.md` for Xcode steps if the widget target needs re-linking.

## Honest status

| Claim | Reality |
|-------|---------|
| Widget Swift sources exist | Yes, in-repo |
| Capacitor iOS shell exists | After `npm run native:sync` |
| Widgets installed on your iPhone | Only after you build/sign/install |
| PWA Safari shows widgets | No — impossible by design |
