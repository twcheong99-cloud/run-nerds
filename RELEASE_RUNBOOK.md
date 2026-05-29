# Release runbook

Use this runbook when preparing the first Play Store or App Store review build. It assumes the current source has already passed `npm run release:check`.

## Preflight

1. Confirm the working tree is clean.
2. Confirm production Supabase settings are in `env.public.js`.
3. Confirm `env.js` does not exist in the generated `www` bundle.
4. Run:

```bash
npm install
npm run release:check
```

5. Fill the final store inputs:
   - Production privacy policy URL
   - Production support URL or support email
   - Demo reviewer account credentials
   - Store screenshots from signed device builds using `STORE_SCREENSHOTS.md`
6. Complete the backend release checks in `BACKEND_RELEASE.md`.

## Android review build

Required local tools:

- Android Studio
- Android SDK
- Java Runtime / JDK
- Play Console upload key or app signing setup

Steps:

1. Run `npm run mobile:sync`.
2. Open Android Studio with `npm run mobile:open:android`.
3. Confirm package name `com.runnerds.app`.
4. Confirm version values in `android/app/build.gradle`:
   - `versionCode 1`
   - `versionName "1.0"`
5. Configure release signing in Android Studio or Gradle.
6. Build a signed Android App Bundle (`.aab`).
7. Install a debug or internal-test build on a real Android device before upload.
8. Device-test these flows:
   - Signup and login
   - Onboarding with race goal
   - Onboarding without race goal
   - Today's workout completion and activity log scrolling
   - Coach conversation and fallback response
   - Post-goal recovery and next-goal selection
   - Privacy, safety, and support links
9. Capture Play Store screenshots from the tested build using `STORE_SCREENSHOTS.md`.
10. Upload the `.aab` to an internal testing track first.

Stop before review if:

- The activity log form cannot scroll to RPE, pain, memo, and save actions.
- Android status bar or navigation bar clashes with the app background.
- Login, signup, or workspace restore fails on a real device.
- Production Supabase Auth, RLS, or coach Edge Function checks from `BACKEND_RELEASE.md` fail.
- The app bundle includes local secrets or `env.js`.
- Store Data safety answers differ from `STORE_SUBMISSION.md`.

## iOS review build

Required local tools:

- Full Xcode selected with `xcode-select`
- Apple Developer account
- App Store Connect app record
- Signing certificate and provisioning profile

Steps:

1. Run `npm run mobile:sync`.
2. Open Xcode with `npm run mobile:open:ios`.
3. Confirm bundle ID `com.runnerds.app`.
4. Confirm version values in Xcode:
   - Marketing Version `1.0`
   - Current Project Version `1`
5. Select the Apple Developer Team and signing profile.
6. Build and run on a real iPhone.
7. Device-test these flows:
   - Signup and login
   - Onboarding with race goal
   - Onboarding without race goal
   - Today's workout completion and activity log scrolling
   - Coach conversation and fallback response
   - Post-goal recovery and next-goal selection
   - Privacy, safety, and support links
8. Archive in Xcode and validate the archive.
9. Upload to TestFlight first.
10. Capture App Store screenshots from the tested build using `STORE_SCREENSHOTS.md`.

Stop before review if:

- Safe-area spacing is wrong around the status bar or home indicator.
- The keyboard hides coach input, activity log fields, or submit actions.
- Production Supabase Auth, RLS, or coach Edge Function checks from `BACKEND_RELEASE.md` fail.
- App Store privacy answers differ from `STORE_SUBMISSION.md`.
- Safety disclaimer or privacy policy pages are inaccessible in the app.

## Reviewer notes

Use `STORE_LISTING.md` for the final store copy and reviewer notes. Before submitting, replace placeholders with:

- Demo account email and password
- Production privacy policy URL
- Production support URL or support email

Review note essentials:

- The app is a fitness coaching app, not a medical device.
- Pain and fatigue inputs are used to reduce training load and encourage safer decisions.
- AI coach requests go through a Supabase Edge Function; server secrets are not bundled in the app.
- The current app has no advertising SDK, tracking SDK, location tracking, contacts access, photos/videos access, or payments.
