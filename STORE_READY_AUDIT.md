# Store readiness audit

Use this file as the current top-level answer to: "Can this app be submitted to Play Store / App Store today?"

## Current verdict

Not yet ready for final store submission.

The repository-level readiness gate passes, but store submission still requires external evidence from production hosting, signed native builds, real device testing, store console answers, reviewer credentials, production backend QA, screenshots, and CI on the final `main` commit.

## Repository evidence already in place

- `npm run release:check` covers web tests, secret scanning, Capacitor sync/doctor, iOS plist linting, privacy manifest linting, app identity, permissions, safe-area/native bar settings, assets, store docs, backend docs, and release blockers.
- `npm run security:scan` checks committed files for secret-like key/password/token patterns.
- `npm run native:doctor` checks whether a release machine has Java/JDK, Android Gradle wrapper, Android Studio, full Xcode, `xcodebuild`, and Supabase CLI.
- `npm run production:urls` can verify public production pages after the production origin exists.
- `.github/workflows/release-check.yml` runs the release readiness gate on `main`, pull requests, and manual dispatch.

## External evidence still required

Track every item in `RELEASE_EVIDENCE.md` and keep `RELEASE_BLOCKERS.md` open until these are proven:

- Production privacy, account deletion, safety, and support URLs accepted by store consoles.
- Reviewer demo credentials entered only in private store console notes.
- Android signed `.aab`, internal testing upload, and real-device QA.
- iOS Xcode archive validation, TestFlight upload, and real-device QA.
- Production Supabase Auth, RLS, `coach`, and `delete-account` QA.
- Store screenshots captured from signed/internal-test builds.
- Store icon and launch asset verification on signed builds.
- Play content rating and App Store age/health declarations matching `STORE_RATING.md`.
- GitHub Actions `Release readiness` success on the final `main` commit.

## Submit only when

- `STORE_CONSOLE.md` has been used as the final store-console input package.
- `RELEASE_EVIDENCE.md` has no blank, `no`, failed, or missing-evidence answers.
- `RELEASE_BLOCKERS.md` has no open external blocker.
- `npm run security:scan`, `npm run release:check`, `npm run native:doctor`, and `npm run production:urls` pass on the appropriate release machine/origin.
- The final signed Android/iOS builds match the source commit recorded in `RELEASE_EVIDENCE.md`.

## Do not mark complete if

- Only repository checks have passed.
- The app has not been tested as a signed Android/iOS build.
- Production URLs are still placeholders.
- Reviewer credentials are not entered in private store notes.
- Store screenshots were captured from a browser or unsigned build instead of the tested native build.
- Any production backend, account deletion, or privacy/data declaration evidence is missing.
