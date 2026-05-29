# Store listing draft

Use this as a copy source for Play Console and App Store Connect. Replace URLs before final submission. Demo credentials must be entered only in the private reviewer-notes fields in Play Console / App Store Connect and must not be committed to this repository.

## App Identity

- App name: run-nerds
- Bundle ID / Package name: `com.runnerds.app`
- Category: Health & Fitness
- Support URL: `https://github.com/twcheong99-cloud/run-nerds/issues`
- Privacy Policy URL: production URL for `privacy.html`
- Account Deletion URL: production URL for `account-deletion.html`
- Safety / medical disclaimer URL: production URL for `safety.html`

## Short Description

Korean:

```text
목표 대회, 회복, 주간 훈련 기록을 함께 관리하는 AI 러닝 코치
```

English:

```text
An AI running coach for race goals, recovery, weekly plans, and workout logs.
```

## Full Description

Korean:

```text
run-nerds는 목표 대회와 현재 컨디션을 바탕으로 주간 훈련 흐름을 관리하는 모바일 러닝 코치입니다.

러너는 목표 대회, 목표 기록, 훈련 가능 요일, 최근 훈련량, 피로와 통증 상태를 입력하고, 앱은 오늘의 훈련과 주간 계획을 한 화면에서 이어서 보여줍니다. 훈련을 완료하면 RPE, 통증, 메모를 기록할 수 있고, 일정 변경이나 컨디션 변화가 있을 때 코치에게 조정을 요청할 수 있습니다.

주요 기능:
- 목표 대회 또는 비대회 목표 기반 온보딩
- 오늘 훈련과 주간 훈련표 확인
- 훈련 완료, 스킵, 조정 기록
- 피로, 통증, 수면, 일정 상태를 반영한 코치 상담
- 목표가 끝난 뒤 회복 주간과 다음 목표 선택 흐름
- 개인정보 처리 안내, 안전 고지, 지원 안내 제공

run-nerds는 의료 앱이 아니며 질병, 부상, 통증에 대한 진단이나 치료를 제공하지 않습니다. 통증, 부상, 흉통, 호흡 곤란, 어지러움 같은 위험 신호가 있으면 훈련을 중단하고 의료 전문가의 도움을 받아야 합니다.
```

English:

```text
run-nerds is a mobile running coach that helps runners manage race goals, recovery, weekly training plans, and workout logs.

Runners can set a race or non-race goal, training availability, recent mileage, fatigue, sleep, and pain status. The app turns that context into a weekly training flow, shows today's session, and lets runners log RPE, pain, and notes after each workout. When schedules or body signals change, runners can ask the coach for safer adjustments.

Key features:
- Race-goal and non-race-goal onboarding
- Today's workout and weekly plan view
- Complete, skip, and adjust workout records
- Coach conversations that consider fatigue, pain, sleep, and schedule pressure
- Post-goal recovery week and next-goal selection flow
- Privacy policy, safety disclaimer, and support page

run-nerds is not a medical app and does not diagnose, treat, or prescribe for injuries, pain, or medical conditions. If you experience pain, injury symptoms, chest pain, shortness of breath, dizziness, or other warning signs, stop training and seek professional medical help.
```

## Keywords

Korean:

```text
러닝,마라톤,하프마라톤,10K,훈련계획,러닝코치,AI코치,운동기록,회복,러너
```

English:

```text
running,marathon,half marathon,10K,training plan,running coach,AI coach,workout log,recovery,runner
```

## Screenshot Plan

Capture on a real device build after signing/tooling is ready.
Use `STORE_SCREENSHOTS.md` for the exact demo account state, device checks, visual QA, and file naming.

1. Onboarding: goal type selection
   Caption: `목표 대회와 현재 상태를 먼저 맞춥니다.`
2. Home: today's workout
   Caption: `오늘 할 훈련과 주간 흐름을 한 화면에서 확인합니다.`
3. Workout log: completion form
   Caption: `RPE, 통증, 메모를 기록하고 다음 훈련에 반영합니다.`
4. Coaching: chat and proposal
   Caption: `일정 변경이나 컨디션 변화가 생기면 코치에게 조정을 요청합니다.`
5. Post-goal flow: recovery and next goal
   Caption: `목표가 끝난 뒤 회복 주간과 다음 목표를 자연스럽게 선택합니다.`
6. My Page / Legal links
   Caption: `개인정보, 안전 고지, 지원 안내를 앱 안에서 확인할 수 있습니다.`

## Review Notes Draft

```text
run-nerds is a Korean running coaching app for training planning and workout logging.

The app uses Supabase Auth for account login and Supabase tables for each runner's profile and workspace. AI coach requests are sent through a Supabase Edge Function; server secrets are not bundled in the app.

The app is not a medical device and does not provide diagnosis or treatment. Pain, fatigue, sleep, and recovery inputs are used to reduce training load and encourage safer decisions. Safety and medical disclaimers are available in the app.

There is no advertising SDK, tracking SDK, payment collection, contacts access, location tracking, photos, or videos in the current app.

Before review, provide demo credentials only in the private store console review fields. Do not paste demo email or password into this repository.
```

## Remaining Store Listing Inputs

- Production privacy policy URL
- Production account deletion URL
- Production support URL or final support email
- Demo account credentials entered privately in the store console
- Final app screenshots from signed Android/iOS builds
- Final age rating and health/fitness declarations in each store console, using `STORE_RATING.md`
