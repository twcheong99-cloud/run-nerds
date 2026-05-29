# Mobile app build notes

This project is still a static PWA at the source level. Capacitor should wrap the prepared `www` folder, not the repository root, so local files like `env.js`, tests, and docs do not get bundled into the app.

## Native project status

Capacitor packages and the native project folders are now checked in:

- `android/`
- `ios/`
- `package-lock.json`

The native shells are generated from `capacitor.config.json` and the prepared `www` bundle. The Android and iOS apps are locked to portrait orientation to match the mobile web UI.

Native security defaults:

- Android backup is disabled for the app shell.
- Android cleartext HTTP traffic is disabled.
- iOS declares no non-exempt encryption; the app uses ordinary HTTPS/Supabase/OpenAI network transport.
- iOS includes `PrivacyInfo.xcprivacy` in the app target resources for App Store privacy manifest validation.

Native visual defaults:

- The Android status bar and navigation bar use the same dark runnerds colors as the web shell.
- Android launch and post-launch themes keep the same dark status/navigation bar colors to avoid a bright flash around startup.
- iOS is fixed to dark appearance and the launch storyboard background matches the splash background.
- On phone-width viewports, the web frame expands to the device edges so the app does not look like a browser page inside a native shell.
- The bottom tab bar includes safe-area padding so Galaxy gesture navigation and 3-button navigation do not crowd or cover tappable controls.

## One-time setup

Install dependencies after cloning:

```bash
npm install
```

The native projects already exist. Only run `npx cap add android` or `npx cap add ios` again if a platform folder is intentionally removed and regenerated.

## Regular sync

After changing the web app, run:

```bash
npm run mobile:sync
```

This refreshes `www` from the checked-in web files and syncs that bundle into Android/iOS.

## Health check

Use this after dependency changes or native project edits:

```bash
npm run mobile:doctor
```

Before a release candidate, run the broader release check:

```bash
npm run release:check
```

This runs the web tests, syncs Capacitor, checks Capacitor doctor, validates the iOS plist, and verifies the core store-readiness settings that can be checked without Android Studio or full Xcode.

For the full store-review build sequence, follow `RELEASE_RUNBOOK.md` after `npm run release:check` passes.

## Open native projects

```bash
npm run mobile:open:android
npm run mobile:open:ios
```

Android builds require Android Studio and a signing key before Play Store submission. iOS builds require Xcode, an Apple Developer account, bundle signing, app icons, and launch assets before App Store submission.

## Local build prerequisites

The Capacitor projects can be generated and synced in this repository, but native compilation still requires local platform tooling:

- Android: Android Studio, Android SDK, and a working Java Runtime / JDK.
- iOS: full Xcode selected with `xcode-select`, not only Command Line Tools.
- Store release: Android signing key, Apple Developer team, bundle signing, and production privacy URL.

## Current app identity

- App ID: `com.runnerds.app`
- App name: `run-nerds`
- Web bundle: `www`
- Android scheme: `https`
- Splash background: `#050806`
- Status bar background: `#06100a`

Keep `env.js` local-only. The native app should use `env.public.js` plus Supabase Edge Functions, never browser-bundled server secrets.

## Store listing notes

- Privacy policy page: `privacy.html`
- Account deletion page: `account-deletion.html`
- Safety and medical disclaimer page: `safety.html`
- Support page: `support.html`
- Store submission checklist: `STORE_SUBMISSION.md`
- Store listing draft: `STORE_LISTING.md`
- Store screenshot checklist: `STORE_SCREENSHOTS.md`
- Store icon and launch asset checklist: `STORE_ASSETS.md`
- Release runbook: `RELEASE_RUNBOOK.md`
- Backend release checklist: `BACKEND_RELEASE.md`
- Versioning and app identity: `VERSIONING.md`
- Android permissions and Play Data safety: `ANDROID_PERMISSIONS.md`
- The app uses Supabase Auth for account login.
- Account deletion is initiated from My Page and handled by the Supabase Edge Function `delete-account`.
- Runner profile, goal, plan, activity log, onboarding, and coach chat workspace data are stored in Supabase.
- AI coach requests may send the current profile, check-in, plan, activity logs, and recent coach conversation to the Supabase Edge Function and OpenAI API.
- The iOS privacy manifest declares linked, non-tracking use of email, name, user ID, fitness/health status, coach messages, and app interaction state for app functionality and personalization.
- Current support URL candidate: `https://github.com/twcheong99-cloud/run-nerds/issues`
