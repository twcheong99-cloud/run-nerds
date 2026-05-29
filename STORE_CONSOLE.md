# Store console input package

Use this as the final copy-and-check source when filling Play Console and App Store Connect. It does not replace each detailed checklist; it points to the exact source of truth for each console field.

## Shared app identity

- App name: `run-nerds`
- Package / bundle ID: `com.runnerds.app`
- Category: Health & Fitness
- Positioning: fitness coaching and workout logging, not medical diagnosis or treatment
- Public URL checklist: `PRODUCTION_URLS.md`
- Production URL script: `PRODUCTION_ORIGIN=https://... npm run production:urls`
- Evidence template: `RELEASE_EVIDENCE.md`

## Public URLs

Replace `<production-origin>` only after `PRODUCTION_URLS.md` passes.

- Privacy Policy URL: `<production-origin>/privacy.html`
- Account Deletion URL: `<production-origin>/account-deletion.html`
- Safety / medical disclaimer URL: `<production-origin>/safety.html`
- Support URL: `<production-origin>/support.html` or the final support channel accepted by the store console

## Listing copy

Use `STORE_LISTING.md` for:

- Short description
- Full description
- Keywords
- Screenshot captions
- Reviewer notes

Do not paste demo credentials into repository files. Put demo email and password only in private reviewer-note fields in the store consoles.

## Privacy and data declarations

Use `STORE_SUBMISSION.md` for:

- Google Play Data safety
- App Store privacy nutrition labels
- iOS privacy manifest consistency
- No advertising/tracking/location/contact/photo/payment declarations

Use `ANDROID_PERMISSIONS.md` to confirm the Android permission list still contains only `android.permission.INTERNET`.

## Content rating and health declarations

Use `STORE_RATING.md` for:

- Play Console content rating questionnaire
- App Store Connect age rating questionnaire
- Health and fitness declarations
- Non-medical-device positioning

## Assets and screenshots

Use `STORE_ASSETS.md` for app icon and launch asset checks.

Use `STORE_SCREENSHOTS.md` for:

- Required Android screenshot file names
- Required iOS screenshot file names
- Demo account state
- Visual QA requirements

## Pre-submit evidence

Before submitting for review, update `RELEASE_EVIDENCE.md` with:

- Final `main` commit
- `Release readiness` workflow run URL from `CI_RELEASE.md`
- Production URL verification record
- Android internal testing record
- iOS TestFlight record
- Supabase/backend QA record
- Store declaration and screenshot evidence locations

## Stop before submit

Stop if any of these are true:

- Any production URL still contains `production URL` or `<production-origin>`.
- Demo credentials appear in repository files.
- Store privacy/data answers differ from `STORE_SUBMISSION.md`.
- Store content/age/health answers differ from `STORE_RATING.md`.
- Screenshot or asset evidence is missing.
- `RELEASE_EVIDENCE.md` still has blank required fields for the final submission.
