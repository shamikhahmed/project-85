# Native HealthKit / Health Connect setup (PROJECT 85)

**Status:** `@capgo/capacitor-health` installed. Bridge: `src/native/healthKitBridge.ts`. Engine: `src/health/syncEngine.ts` + `src/health/autoSync.ts`. Live reads require a signed Capacitor **iOS or Android** app — **not** the GitHub Pages PWA.

## Auto-sync (v0.11)

On native only (`Capacitor.isNativePlatform()`):

1. Runs after app launch and on every `appStateChange` resume (`CapAutoHealthSync`)
2. Throttled to **1 run / 15 minutes** (`lastAutoSyncAt` in settings)
3. Pull window: first run **30 days**; later runs from last success **− 2 days** overlap
4. Reuses single-flight sync lock — never two syncs at once
5. Projects samples into `weights` / `steps` / `sleep` / water when no manual entry wins
6. Settings: Auto-sync toggle (default on), Last synced, Sync now, optional weight write-back

PWA / Safari: shows “Auto-sync needs the installed iPhone app” — never fakes `connected`.

## Metrics pulled

weight, body fat %, steps, distance, active energy, basal energy, total energy, dietary energy, water, sleep (asleep + in-bed), resting HR, HRV, workouts.  
**Protein:** not in Capgo types — skipped and logged.

## Prerequisites (iOS)

1. Apple Developer account + signing team  
2. Xcode with HealthKit capability  
3. Physical iPhone  
4. `npm run build && npx cap sync ios`

### Info.plist usage strings

```xml
<key>NSHealthShareUsageDescription</key>
<string>PROJECT 85 reads steps, heart, sleep and body metrics you already keep in Apple Health to show honest progress — never sold or uploaded.</string>
<key>NSHealthUpdateUsageDescription</key>
<string>PROJECT 85 only writes health data when you explicitly choose to save a measurement back to Apple Health.</string>
```

Enable **HealthKit** on the App ID / Xcode target.

## Prerequisites (Android)

1. Android Studio + device/emulator with Health Connect  
2. `npm run build && npx cap sync android`  
3. Open `android/` in Android Studio, sync Gradle, run on device  
4. Manifest includes `READ_HEALTH_DATA_HISTORY` + Capgo privacy-policy activity (plugin merge)  
5. Privacy HTML: `android/app/src/main/assets/public/privacypolicy.html`

Google Fit REST is **deprecated** — do not use it. Health Connect only.

## App flow

1. Open the native shell (not Safari PWA alone)  
2. Health → **Connect Apple Health** / authorize Health Connect → system permission sheet  
3. Sync now or wait for auto-sync → samples land in IndexedDB `healthRecords` and day tables  

## What the PWA can still do

- Mirror **manual** weights/steps/sleep/water into `healthRecords`  
- Show honest `unsupported` / `blocked_credentials` for Apple / Google / Zepp  

## Google Health (cloud OAuth)

See `src/health/googleHealthClient.ts` and `INTEGRATION_MATRIX.md`. Requires backend OAuth — never put client secrets in Vite env for production. Native Android uses Health Connect via Capgo, not the Fit REST API.
