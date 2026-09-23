# IconicHealth (local Expo module)

Read-only OS bridge. Expo SDK 54 autolinks `modules/` during prebuild. No npm/native third-party health SDK, BLE pairing, watch app, or background daemon. A physical-device development/production build is required; Expo Go and web do not contain this module.

## Host configuration required

- iOS: enable HealthKit for the app identifier and provisioning profile; add entitlement `com.apple.developer.healthkit: true`. Set `NSHealthShareUsageDescription` to a clear description of the six read categories and daily dashboard purpose. Also set `NSHealthUpdateUsageDescription`: Apple's upload validation requires this key for this HealthKit-linked binary even though authorization is read-only. Keep its wording honest about not adding or changing Apple Health data. No write permissions or background-delivery entitlement are requested.
- Android: compile with API 34+ (Expo 54 default suffices). The module manifest merges six READ permissions and OS rationale handlers. Set application metadata `expo.modules.iconichealth.PRIVACY_POLICY_URL` to the public HTTPS privacy policy using the host config plugin. Complete Play Console Health Connect declarations for all six categories, health-app declaration, Data Safety, and privacy disclosures. Permissions are subject to review.
- Rebuild native binaries after changes. Native compilation/device permission tests have **not** been performed in this workspace.

## Contract and limitations

`IconicHealth` exports async `getAvailability`, `requestPermissions`, `readDailyRecords(startDate,endDate)`, and `openSettings`. Date ranges are inclusive, strict YYYY-MM-DD, at most 31 days, in Asia/Kolkata. Metrics are steps, kcal, km, asleep hours (overlaps unioned), average BPM, and latest kg within the day. Missing or denied reads are null, not fabricated zero.

iOS intentionally does not reveal READ authorization: prompt completion is not proof of consent. `openSettings` rejects `E_SETTINGS_UNSUPPORTED` with instructions to use Health > profile > Apps and Services > Iconic Fitness; no private URL scheme is used. Android below 14 is explicitly unsupported. Android partial grants return null for denied categories; provider/query failures reject. Health Connect restricts historical reads (normally 30 days before first grant); no extended history permission is requested. API service presence does not prove data or granted access.

Apple Watch must first sync to Apple Health. Android watches must export through their vendor app to Health Connect; support varies by watch/vendor. The host initiates foreground reads and controls upload consent, authentication, storage and deletion. No automatic daily/background execution is promised. iOS distance is walking/running distance; Android uses the provider's distance record. Platform aggregates honor their own source-priority semantics; sleep uses only explicit asleep stages, never session duration as a substitute.

References: https://docs.expo.dev/modules/get-started/ and Android framework `android.health.connect.HealthConnectManager` (not AndroidX).