# Store screenshot checklist

Capture these screenshots from signed or internal-test device builds, not from the desktop browser. Use the same demo account on Android and iOS so the plan, records, and coach history look consistent.

## Device sets

Android:

- Primary phone: current Play Console phone screenshot size from an internal-test build.
- Optional tablet screenshots only if tablet support is intentionally enabled later.

iOS:

- 6.7-inch iPhone screenshot set.
- 6.5-inch or 5.5-inch set if App Store Connect requests it for the selected build target.

## Demo account state

Before capturing:

1. Create or reset a reviewer/demo account.
2. Complete onboarding once with a race goal.
3. Use a half marathon or 10K goal within the next 4 to 8 weeks.
4. Add enough training history to show:
   - Today's workout
   - Weekly plan
   - One completed activity log with RPE and pain
   - One coach conversation with a proposed adjustment
5. Complete or simulate a past goal once to show the post-goal recovery and next-goal selection flow.
6. Confirm privacy, safety, and support pages open from My Page.

Keep personal names, real email addresses, exact race entries, and sensitive health notes out of screenshots.

## Required shots

1. Onboarding goal selection
   - State: visible race-goal and non-race-goal choices.
   - Check: no keyboard, no clipped buttons, no empty placeholder content.
   - Caption source: `목표 대회와 현재 상태를 먼저 맞춥니다.`

2. Home today's workout
   - State: logged-in home tab with a real workout, distance, duration, intensity, and weekly mini calendar.
   - Check: bottom tabs do not cover content; safe-area spacing looks natural.
   - Caption source: `오늘 할 훈련과 주간 흐름을 한 화면에서 확인합니다.`

3. Workout log completion form
   - State: activity log modal open after tapping complete.
   - Check: RPE, pain, memo, close, and save actions are all reachable by scrolling.
   - Caption source: `RPE, 통증, 메모를 기록하고 다음 훈련에 반영합니다.`

4. Coaching chat and proposal
   - State: coach tab with a user message and a visible adjustment proposal.
   - Check: no server error, no raw JSON, no placeholder copy.
   - Caption source: `일정 변경이나 컨디션 변화가 생기면 코치에게 조정을 요청합니다.`

5. Post-goal recovery and next goal
   - State: completed-goal card with recovery guidance and next-goal mode choices.
   - Check: race and non-race next-goal paths are visible or immediately reachable.
   - Caption source: `목표가 끝난 뒤 회복 주간과 다음 목표를 자연스럽게 선택합니다.`

6. My Page legal links
   - State: My Page showing profile summary and privacy, safety, support links.
   - Check: support link destination matches the final store support URL or support email.
   - Caption source: `개인정보, 안전 고지, 지원 안내를 앱 안에서 확인할 수 있습니다.`

## Visual QA

For every screenshot:

- Status bar and navigation bar should match the app background.
- Text must not overlap, clip, or wrap awkwardly inside buttons.
- Bottom tabs must remain tappable without hiding the main action.
- Modals and forms must scroll on the device, especially activity log and coach input.
- Korean copy should be final user-facing copy, not debug text.
- No local development URLs, console errors, fake secrets, or private user data should be visible.

## File naming

Use stable names so screenshots can be replaced without rewriting store notes:

```text
android-01-onboarding.png
android-02-home.png
android-03-workout-log.png
android-04-coach.png
android-05-post-goal.png
android-06-my-page.png
ios-01-onboarding.png
ios-02-home.png
ios-03-workout-log.png
ios-04-coach.png
ios-05-post-goal.png
ios-06-my-page.png
```

Store final screenshots outside the app bundle. Do not place screenshot source files in `www`.
