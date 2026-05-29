# Mobile app build notes

This project is still a static PWA at the source level. Capacitor should wrap the prepared `www` folder, not the repository root, so local files like `env.js`, tests, and docs do not get bundled into the app.

## Native project status

Capacitor packages and the native project folders are now checked in:

- `android/`
- `ios/`
- `package-lock.json`

The native shells are generated from `capacitor.config.json` and the prepared `www` bundle. The Android and iOS apps are locked to portrait orientation to match the mobile web UI.

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
- Store release: Android signing key, Apple Developer team, bundle signing, and production support/privacy URLs.

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
- Safety and medical disclaimer page: `safety.html`
- Support page: `support.html`
- Store submission checklist: `STORE_SUBMISSION.md`
- The app uses Supabase Auth for account login.
- Runner profile, goal, plan, activity log, onboarding, and coach chat workspace data are stored in Supabase.
- AI coach requests may send the current profile, check-in, plan, activity logs, and recent coach conversation to the Supabase Edge Function and OpenAI API.
- Before store submission, replace the support contact placeholder with the real support email or support URL used in the App Store / Play Store listing.
