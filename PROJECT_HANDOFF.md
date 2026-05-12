# run-nerds Project Handoff

Last updated: 2026-05-12

## Product Direction

run-nerds is a mobile-first running coach app prototype. The final target is a phone app, but the current implementation is a static web MVP.

The intended experience:

- The app speaks plainly most of the time.
- When the user gives a signal, such as changing tabs, sending a consult message, completing a workout, or applying a plan, the app briefly shows a terminal-like processing state.
- After processing, the app returns to clean runner-facing language.
- Actual LLM API integration is not implemented yet. Current coach behavior is local/rule-based and should be treated as an MVP placeholder.

## Tech Stack

- Vanilla HTML/CSS/JavaScript
- ES modules
- Supabase Auth
- Supabase table storage via `runner_workspaces.payload`
- Static local server:

```bash
cd /Users/taewoo/Desktop/app/run-nerds
python3 -m http.server 4173
```

Open:

```text
http://localhost:4173/
```

Supabase setup:

- Copy `env.example.js` to `env.js`
- Put Supabase URL and publishable key into `env.js`
- Run `supabase-setup.sql` in Supabase SQL Editor

`env.js` is local-only and should not be committed.

## Important Files

- `index.html`: app shell, auth gate, onboarding shell, 3-tab layout
- `styles.css`: full UI styling, mobile layout, terminal pulse, modal styles
- `app.js`: imports and starts app
- `js/app-main.js`: auth, state, Supabase persistence, app actions
- `js/home.js`: home tab, profile tab, today workout, manual workout log UI
- `js/coach.js`: local coach chat engine and coach tab calendar
- `js/onboarding.js`: first consultation onboarding flow
- `js/plan.js`: local training plan generation
- `js/theme-select.js`: app-themed custom select replacement for native dropdown UI
- `js/config.js`: Supabase env exports, defaults, onboarding flag
- `supabase-setup.sql`: required Supabase tables and RLS policies
- `UI_CHANGE_NOTES.md`: design/UX continuation notes for future design agents
- `fonts/`: locally bundled IBM Plex Sans KR and IBM Plex Mono font files

## Implemented Features

### Auth

- Login
- Signup
- Logout
- Supabase session restore
- New users or users without completed first consultation are routed to onboarding
- Users with completed onboarding enter the app at the Home tab
- Auth hero language currently uses:
  - Eyebrow: `NOT FOR RUNNERS, FOR NERDS WHO RUN`
  - Main title: `run-nerds`
  - Supporting copy: `로그인하면 오늘 훈련부터 코치 메모까지 한 흐름으로 이어집니다.`
- The old Supabase-facing helper copy is no longer shown on the initial auth screen.

### Main Navigation

Current app tabs:

- `상담`
- `홈`
- `마이`

The old `기록` tab was replaced with `마이`.

### Home Tab

Includes:

- Goal summary
- Today workout
- Weekly check cards
- Status buttons:
  - 완료
  - 실패
  - 미실행

Status button behavior:

- `완료` opens a workout log modal after a terminal-style processing pulse.
- `실패` opens a coach check-in modal asking how far the user got and why they stopped.
- `미실행` opens a coach check-in modal asking why the workout was missed.
- Failed/skipped check-ins are saved into `activityLogs` and folded into `checkin` context for future coaching.

### Manual Workout Logging

Manual logging is attached to the Today workout card.

Flow:

1. User clicks `완료`
2. Terminal pulse runs first
3. Workout log modal opens
4. User enters:
   - distance
   - duration
   - RPE
   - pain
5. User clicks `SUBMIT`
6. Local coach question is generated from the objective workout data
7. User answers in a chat-like `YOU` field
8. User clicks `SUBMIT`
9. Activity is saved into `activityLogs` by date
10. Workout status becomes `complete`

Modal behavior:

- The modal is centered on screen.
- The rest of the app is dimmed/blurred.
- The top app header with logo and goal strip remains visible above the overlay.
- Submit buttons use the pixel/nerd type style and display `SUBMIT`.

Storage shape is intended to support future imports:

```js
activityLogs: {
  "YYYY-MM-DD": {
    date: "YYYY-MM-DD",
    dayId: "mon",
    distance: "5.2",
    duration: "32:10",
    rpe: "target",
    pain: "none",
    coachQuestion: "...",
    memo: "...",
    source: "manual",
    savedAt: "ISO timestamp"
  }
}
```

Failed/skipped check-ins currently use the same date-keyed `activityLogs` bucket:

```js
activityLogs: {
  "YYYY-MM-DD": {
    date: "YYYY-MM-DD",
    dayId: "mon",
    status: "failed" | "skipped",
    progress: "...",
    reason: "fatigue" | "pain" | "schedule" | "pace" | "weather" | "other",
    coachQuestion: "...",
    memo: "...",
    source: "coach-check-in",
    savedAt: "ISO timestamp"
  }
}
```

Future Garmin/NRC/HealthKit records should use the same structure with a different `source` and an `externalActivityId`.

### Custom Select UI

Native dropdowns are replaced after render by `enhanceThemeSelects()` from `js/theme-select.js`.

Behavior:

- Original `<select>` elements remain in the DOM as hidden value holders.
- The visible UI is a themed button/listbox pair.
- Latin/English option labels use the pixel font style.
- Korean labels use the app body font.
- The replacement is applied across onboarding, hidden profile/check-in forms, and workout modals.

### Coach Tab

Includes:

- Month calendar
- Training days only marked, not full workout content
- Coach chat

Current coach chat is local/rule-based:

- First user message triggers clarifying question
- Second message can create a proposed replan
- Calendar/plan does not change immediately
- User must click `계획 반영`
- Then plan is recalculated locally
- Coach chat has a `conversationDate`.
- Only the current day's conversation is shown; previous-day chat messages reset automatically.
- Applied coaching results remain in plan/profile/check-in state even after chat reset.

This should later be replaced by an actual LLM-backed coach service.

### My Page

Kept intentionally simple.

Shows:

- runner name
- email
- goal
- weekly routine
- long run day
- physical status card
- logout

The `PHYSICAL STATUS` card is the only My Page place that shows body-state context. The routine card no longer repeats pain text.

No save button. The page reflects data gathered from onboarding and consultation.

### Onboarding

First consultation onboarding exists and is enabled.

It collects:

- goal type
- race/non-race detail
- available training days
- latest run
- run feel
- recent 4-week mileage
- PBs
- body condition
- coaching style
- summary

Completion creates `initialPlanningProfile`, updates `profile`, generates a plan, and persists to Supabase.

## Terminal Pulse UX

The app intentionally uses terminal-like processing messages when the user takes an action.

Examples:

```text
> parsing check-in...
> reconciling plan...
> syncing coach state...
> evaluating recovery load...
> applying adjustments...
```

Important behavior:

- The pulse should not just decorate an already-finished action.
- For major UI transitions, the pulse should appear first.
- The screen/state change should happen after the pulse delay.
- This is implemented through `runSystemPulse()` in `js/app-main.js`.

Actions currently wired:

- login
- signup
- logout
- tab changes
- workout status changes
- workout log modal open
- failed/skipped coach check-in modal open
- coach question generation
- workout log save
- failed/skipped check-in save
- coach message processing
- plan adjustment
- onboarding back/next/complete

## Current Known Limitations

- No real LLM API yet
- Coach responses are local keyword/rule based
- Manual workout log is only attached to today's workout
- Failure/skipped check-ins are local/rule-based and should later be routed through the real coach service.
- No push notifications
- No external calendar
- No Garmin/NRC/HealthKit import yet
- UI is still prototype-level and expected to be redesigned in Claude Design/Stitch AI or another design tool

## Design Notes

Desired direction:

- Mobile-first
- 3 tabs only
- Main UI should be clean
- Nerd/terminal feel should appear during processing moments
- Avoid showing implementation details during normal reading states

Avoid:

- too many tabs
- admin screens
- technical implementation text in normal UI
- complex dashboards
- settings-heavy flows

Current font setup:

- Pixel/display: Google-hosted `Press Start 2P` and `VT323` import.
- Body: locally bundled `IBM Plex Sans KR`.
- Data/metrics: locally bundled `IBM Plex Mono`.
- Korean UI copy should generally stay in the body font.
- English labels, chips, and explicit nerd/terminal moments can use the pixel font.

## Suggested Next Tasks

1. Run through the full logged-in flow manually:
   - login
   - Home tab
   - complete workout
   - enter log
   - generate coach question
   - save log
   - refresh and verify state restores

2. Run through failure/skipped flows manually:
   - click `실패`
   - enter progress/reason/memo
   - verify saved summary and check-in context
   - click `미실행`
   - verify missed-workout reason is saved and restored

3. Remove or soften remaining technical labels:
   - `manual log`
   - `runner profile`
   - English terminal labels outside processing moments

4. Add future-ready activity fields:
   - `externalActivityId`
   - `source`
   - `importedAt`
   - `rawSummary`

5. Prepare LLM integration boundary:
   - Replace `buildCoachReply()` in `js/coach.js`
   - Replace `buildPostRunCoachQuestion()` in `js/home.js`
   - Replace `buildStatusCoachQuestion()` in `js/home.js`
   - Route requests through a backend instead of calling LLM from browser

6. Consider adding a lightweight backend before real LLM:
   - hide API keys
   - handle prompt construction
   - persist coach decisions
   - keep Supabase client-side auth only where safe

## Git State At Handoff

Latest pushed commits:

```text
76fe750 Refine mobile UX feedback and manual logging
30799c7 Add mobile app tabs and coach consult flow
7269a7b Move Supabase config to local env file
```
