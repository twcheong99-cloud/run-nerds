# Store submission checklist

This file is a working checklist for Play Store / App Store submission. It should be updated before the first real review build.

## Public URLs

- Privacy policy: `privacy.html`
- Safety / medical disclaimer: `safety.html`
- Support page: `support.html`

Before submission, publish these pages on the production domain. Current support URL candidate: `https://github.com/twcheong99-cloud/run-nerds/issues`.

## App category and positioning

- Primary category: Health & Fitness
- Secondary fit: Sports / Productivity
- Short description: Korean mobile running coach for goal races, recovery, weekly plans, and workout logs.
- Medical positioning: Fitness coaching only. The app does not diagnose, treat, prescribe, or provide emergency medical guidance.

## Data Safety Draft

Use this as the starting point for the Google Play Data safety form and App Store privacy nutrition labels.

| Data type | Collected | Purpose | Shared / processed by third party | Required |
| --- | --- | --- | --- | --- |
| Email address | Yes | Account creation, login, account recovery, workspace ownership | Supabase Auth | Yes |
| Name / display name | Yes | Personalize runner profile and coach messages | Supabase | Yes for signup |
| User IDs | Yes | Associate profiles and workspaces with the authenticated user | Supabase | Yes |
| Fitness / workout data | Yes | Build weekly plan, show progress, adjust coaching | Supabase, OpenAI via Supabase Edge Function for AI coach requests | Yes for core features |
| Health-related signals | Yes | Conservative training adjustment based on fatigue, sleep, pain, and recovery | Supabase, OpenAI via Supabase Edge Function for AI coach requests | Optional but used for safer coaching |
| User-generated coach messages | Yes | Generate coach replies and plan changes | Supabase, OpenAI via Supabase Edge Function for AI coach requests | Optional |
| App activity / current app state | Yes | Restore workspace, active tab, onboarding, goal lifecycle | Supabase | Yes for sync |
| Location | No | Not collected | Not applicable | No |
| Contacts | No | Not collected | Not applicable | No |
| Photos or videos | No | Not collected | Not applicable | No |
| Payment information | No | Not collected | Not applicable | No |
| Device advertising ID | No | Not collected | Not applicable | No |

## Data handling notes

- Authentication uses Supabase Auth.
- Profile rows are stored in `profiles`.
- Workspace payloads are stored in `runner_workspaces`.
- Row Level Security policies restrict profile and workspace rows to the authenticated owner.
- AI coach requests are sent to the Supabase Edge Function `coach`.
- The Edge Function calls the OpenAI Responses API only when `OPENAI_API_KEY` is configured.
- Browser and mobile bundles must not include `OPENAI_API_KEY`, Supabase service role keys, database URLs, or other server secrets.
- `env.js` is local-only and is ignored by git.
- Capacitor should package the generated `www` folder, not the repository root.
- Android app backup is disabled and cleartext HTTP traffic is disabled.
- iOS declares no non-exempt encryption; the app uses standard HTTPS transport.

## Review notes to prepare

- Run `npm run release:check` before cutting a review build.
- Use `STORE_LISTING.md` for store copy, screenshot captions, and review notes.
- Demo account credentials, if reviewers need login.
- Production privacy policy URL.
- Production support URL or support email. Current candidate: `https://github.com/twcheong99-cloud/run-nerds/issues`.
- Confirmation that the app is not a medical device and does not provide diagnosis or treatment.
- Explanation that pain and fatigue inputs are used to reduce training load and encourage professional evaluation when needed.
- Confirmation that there is no advertising, tracking SDK, location collection, contacts access, or payment collection in the current app.

## Remaining blockers before real submission

- Generate native Android/iOS projects and verify app signing.
- Install native build tooling on the release machine: Android Studio/JDK for Android and full Xcode for iOS.
- Confirm final bundle ID / package name: `com.runnerds.app`.
- Capture store screenshots on target devices.
- Test login, signup, coach fallback, workout logging, privacy page, safety page, and support page on a device build.
