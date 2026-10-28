# Native HealthKit setup (PROJECT 85)

**Status:** Plugin dependency `@capgo/capacitor-health` is installed. Bridge code lives in `src/native/healthKitBridge.ts`. Live reads require a signed Capacitor iOS app — **not** the GitHub Pages PWA.

## Prerequisites

1. Apple Developer account + signing team  
2. Xcode with HealthKit capability  
3. Physical iPhone  
4. `npm run build && npx cap sync ios` (the `ios/` Xcode project already exists in-repo)

## Info.plist usage strings

Add (or confirm Capgo / Xcode capability wizard added):

```xml
<key>NSHealthShareUsageDescription</key>
<string>PROJECT 85 reads steps, heart, sleep and body metrics you already keep in Apple Health to show honest progress — never sold or uploaded.</string>
<key>NSHealthUpdateUsageDescription</key>
<string>PROJECT 85 only writes health data when you explicitly choose to save a measurement back to Apple Health.</string>
```

## Entitlements

Enable **HealthKit** on the App ID / Xcode target.

## App flow

1. Open the native shell (not Safari PWA alone)  
2. Health → **Connect Apple Health** → system permission sheet  
3. **Sync now** pulls authorised samples into IndexedDB `healthRecords`

## What the PWA can still do

- Mirror **manual** weights/steps/sleep/water into `healthRecords`  
- Show honest `unsupported` / `blocked_credentials` for Apple / Google / Zepp  

## Google Health

See `src/health/googleHealthClient.ts` and `INTEGRATION_MATRIX.md`. Requires backend OAuth — never put client secrets in Vite env for production.
