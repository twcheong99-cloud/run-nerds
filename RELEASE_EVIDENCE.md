# Release evidence template

Use this file as the non-secret evidence index for the first Play Store / App Store review submission. Do not add reviewer passwords, signing keys, Supabase service-role keys, Apple credentials, Google credentials, or private account recovery data.

For sensitive proof, store screenshots or console exports in the private store/team workspace and reference only their location or filename here.

## Final source state

- Final commit on `main`:
- GitHub Actions `Release readiness` workflow URL:
- Checked against `CI_RELEASE.md`: yes / no
- `npm run release:check` result: passed locally on 2026-06-01

## Production URLs

- Production origin: `https://run-nerds.vercel.app`
- Privacy policy URL: `https://run-nerds.vercel.app/privacy.html`
- Account deletion URL: `https://run-nerds.vercel.app/account-deletion.html`
- Safety / medical disclaimer URL: `https://run-nerds.vercel.app/safety.html`
- Support URL or support email: `https://run-nerds.vercel.app/support.html`
- Evidence location for URL acceptance: Vercel deployment `https://run-nerds.vercel.app`
- Checked against `PRODUCTION_URLS.md`: yes
- `npm run production:urls` result: passed on 2026-06-01 for `https://run-nerds.vercel.app`

## Reviewer access

- Demo account created: yes / no
- Demo account email stored in private store review notes: yes / no
- Demo password stored only in private store review notes: yes / no
- Disposable account deletion tested: yes / no
- Evidence location:

## Android signed build

- Version name / code:
- Signed `.aab` filename:
- Internal testing track upload: yes / no
- Real Android device tested:
- Device OS version:
- Device QA passed against `RELEASE_RUNBOOK.md`: yes / no
- Android permissions checked against `ANDROID_PERMISSIONS.md`: yes / no
- Launcher/splash assets checked against `STORE_ASSETS.md`: yes / no
- Evidence location:

## iOS signed build

- Marketing version / build:
- Xcode archive validation: passed / failed
- TestFlight upload: yes / no
- Real iPhone tested:
- iOS version:
- Device QA passed against `RELEASE_RUNBOOK.md`: yes / no
- Privacy manifest included in archive: yes / no
- App icon / launch assets checked against `STORE_ASSETS.md`: yes / no
- Evidence location:

## Production backend

- Supabase project ref:
- Auth signup/login tested: yes / no
- Workspace restore tested: yes / no
- RLS owner isolation tested: yes / no
- `coach` Edge Function tested: yes / no
- `delete-account` Edge Function tested: yes / no
- Safety fallback tested: yes / no
- Checked against `BACKEND_RELEASE.md`: yes / no
- Evidence location:

## Store screenshots

- Android screenshots captured from signed/internal-test build: yes / no
- iOS screenshots captured from TestFlight/device build: yes / no
- File naming matches `STORE_SCREENSHOTS.md`: yes / no
- Visual QA passed: yes / no
- Evidence location:

## Store declarations

- Store console inputs checked against `STORE_CONSOLE.md`: yes / no
- Play Data safety matches `STORE_SUBMISSION.md`: yes / no
- App Store privacy answers match `STORE_SUBMISSION.md` and `PrivacyInfo.xcprivacy`: yes / no
- Play content rating matches `STORE_RATING.md`: yes / no
- App Store age rating / health declarations match `STORE_RATING.md`: yes / no
- Evidence location:

## Final stop-before-review audit

Do not submit if any answer above is `no`, blank, failed, or missing evidence.

- All blockers in `RELEASE_BLOCKERS.md` closed with evidence: yes / no
- Final submitter:
- Final review date:
