# Mobile app build notes

This project is still a static PWA at the source level. Capacitor should wrap the prepared `www` folder, not the repository root, so local files like `env.js`, tests, and docs do not get bundled into the app.

## One-time setup

Install the Capacitor packages when you are ready to generate native projects:

```bash
npm install --save-dev @capacitor/cli @capacitor/core
```

Then create the native projects:

```bash
npm run mobile:prepare
npx cap add android
npx cap add ios
```

## Regular sync

After changing the web app, run:

```bash
npm run mobile:sync
```

This refreshes `www` from the checked-in web files and syncs that bundle into Android/iOS.

## Open native projects

```bash
npm run mobile:open:android
npm run mobile:open:ios
```

Android builds require Android Studio and a signing key before Play Store submission. iOS builds require Xcode, an Apple Developer account, bundle signing, app icons, and launch assets before App Store submission.

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
- The app uses Supabase Auth for account login.
- Runner profile, goal, plan, activity log, onboarding, and coach chat workspace data are stored in Supabase.
- AI coach requests may send the current profile, check-in, plan, activity logs, and recent coach conversation to the Supabase Edge Function and OpenAI API.
- Before store submission, replace the privacy page contact placeholder with the real support email or support URL used in the App Store / Play Store listing.
