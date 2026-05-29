# Release blockers

This file tracks the remaining work that cannot be fully proven by repository checks alone. Keep it current until the first real Play Store / App Store submission is accepted.

## Current status

`npm run release:check` passes locally and is wired to the GitHub Actions `Release readiness` workflow. The app is not yet ready to mark as fully store-submission-complete because these external checks still need real accounts, production URLs, signed builds, or physical devices.

## Open blockers

1. Production privacy and support URLs
   - Evidence needed: public HTTPS privacy policy URL and support URL/email accepted in Play Console and App Store Connect.
   - Source docs to update: `STORE_LISTING.md`, `STORE_SUBMISSION.md`, `README.md`.
   - Release check warning today: `STORE_LISTING.md still has production URL placeholders`.

2. Reviewer demo credentials
   - Evidence needed: reviewer demo account email/password entered in private store review notes.
   - Do not commit the credentials to this repository.
   - Source docs to update: private store console notes only. Repository docs should only say where to enter credentials, never contain the credentials themselves.

3. Android signed build verification
   - Evidence needed: Android Studio/JDK release machine builds a signed `.aab`, installs an internal-test build on a real Android device, and passes `RELEASE_RUNBOOK.md` Android checks.
   - Current local blocker: this Mac previously could not run Gradle because Java Runtime/JDK was missing.
   - Source docs to use: `RELEASE_RUNBOOK.md`, `ANDROID_PERMISSIONS.md`, `VERSIONING.md`.

4. iOS signed build verification
   - Evidence needed: full Xcode archive validates, uploads to TestFlight, includes `PrivacyInfo.xcprivacy`, and passes `RELEASE_RUNBOOK.md` iOS checks on a real iPhone.
   - Current local blocker: this Mac previously had Command Line Tools selected instead of full Xcode.
   - Source docs to use: `RELEASE_RUNBOOK.md`, `VERSIONING.md`, `STORE_SUBMISSION.md`.

5. Production Supabase/Auth/Edge Function verification
   - Evidence needed: production Supabase project passes signup, login, account deletion, workspace restore, RLS owner isolation, Edge Function coach response, apply proposal, safety fallback, and local fallback checks.
   - Source docs to use: `BACKEND_RELEASE.md`.

6. Store screenshots from device builds
   - Evidence needed: Android and iOS screenshot sets captured from signed/internal-test builds using the stable file names in `STORE_SCREENSHOTS.md`.
   - Source docs to use: `STORE_SCREENSHOTS.md`, `STORE_LISTING.md`.

7. Store age rating and health declarations
   - Evidence needed: Play Console content rating and App Store Connect age rating / health declarations completed and saved with answers matching `STORE_RATING.md`.
   - Source docs to use: `STORE_RATING.md`, `STORE_SUBMISSION.md`, `ANDROID_PERMISSIONS.md`.

8. CI confirmation on main
   - Evidence needed: GitHub Actions `Release readiness` workflow passes on the final `main` commit.
   - Source docs to use: `.github/workflows/release-check.yml`, `RELEASE_RUNBOOK.md`.

## Completion rule

Do not mark the store-readiness goal complete until every blocker above has external evidence. Local repository checks are necessary, but they do not replace signed Android/iOS builds, production Supabase verification, production URLs, reviewer credentials, or device screenshots.
