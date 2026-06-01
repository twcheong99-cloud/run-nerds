# Tomorrow next steps

Date written: 2026-05-29
Next work day: 2026-05-30

## Current state

- The repository is on `main` and was clean before this note was added.
- The local release readiness work is in place:
  - `STORE_READY_AUDIT.md`
  - `STORE_CONSOLE.md`
  - `STORE_SUBMISSION.md`
  - `STORE_SCREENSHOTS.md`
  - `STORE_ASSETS.md`
  - `STORE_RATING.md`
  - `PRODUCTION_URLS.md`
  - `BACKEND_RELEASE.md`
  - `RELEASE_RUNBOOK.md`
  - `RELEASE_EVIDENCE.md`
- The latest full local release check passed, with one expected warning:
  - `STORE_LISTING.md` still contains production URL placeholders.
- The app is not ready to mark as final store-submission complete yet. The remaining work is mostly external proof: production URLs, signed builds, store-console inputs, device QA, and release evidence.

## Start here tomorrow

1. Pull the latest `main`.

```sh
git pull origin main
```

2. Re-run the lightweight safety checks.

```sh
npm run security:scan
npm run release:check
```

3. Decide the Vercel final-candidate URL first.

This is the cleanest next move because the only known local warning is about production URL placeholders. The immediate goal is a polished final-candidate build for internal/family testing, not a same-day store submission. Once the real Vercel origin exists, run:

```sh
PRODUCTION_ORIGIN=https://your-vercel-domain.example npm run production:urls
```

Then update:

- `STORE_LISTING.md`
- `STORE_CONSOLE.md`
- `RELEASE_EVIDENCE.md`

## Recommended order

1. Confirm the production deployment and public domain.
2. Run the production URL checker with `PRODUCTION_ORIGIN`.
3. Prepare the native release machine:
   - JDK installed
   - Android Studio installed
   - Full Xcode selected, not only Command Line Tools
   - Supabase CLI available
4. Run:

```sh
npm run native:doctor
```

5. Verify the production Supabase backend using `BACKEND_RELEASE.md`.
6. Create a reviewer demo account.

Do not commit reviewer credentials. Put them only in the private reviewer notes inside Play Console and App Store Connect.

7. Build and upload the Android signed internal-test `.aab`.
8. Build and upload the iOS TestFlight archive.
9. Run real-device QA with `RELEASE_RUNBOOK.md`.
10. Capture final screenshots using `STORE_SCREENSHOTS.md`.
11. Fill the store consoles using:
    - `STORE_CONSOLE.md`
    - `STORE_SUBMISSION.md`
    - `STORE_RATING.md`
    - `ANDROID_PERMISSIONS.md`
12. Confirm GitHub Actions release readiness using `CI_RELEASE.md`.
13. Fill the final proof table in `RELEASE_EVIDENCE.md`.

## Do not do yet

- Do not mark the store-readiness goal complete until signed Android and iOS builds, production backend checks, real-device QA, screenshots, and store-console fields are all verified.
- Do not commit secrets, signing keys, reviewer credentials, or production Supabase keys.
- Do not submit to the stores until `RELEASE_EVIDENCE.md` is complete.

## Best first action

Use the Vercel final-candidate URL as today's anchor. Once the deployed domain is confirmed and `npm run production:urls` passes, internal testing can focus on app polish while the stricter store checklist remains available for later.
