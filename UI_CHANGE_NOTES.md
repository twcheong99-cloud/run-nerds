# run-nerds UI Change Notes

Last updated: 2026-05-12

This document explains the recent UI/UX changes so a design-focused agent or tool can understand the current app state and continue visual refinement.

## High-Level UI Direction

run-nerds is moving toward a mobile-first running coach app.

The visual tone should balance:

- clean runner-facing product UI
- subtle nerd/terminal personality
- minimal tab structure
- coach-like conversation patterns

The app should not feel like a technical dashboard. It should feel like a running coach app with a nerdy processing layer.

## Main Structural Changes

### 1. Three-Tab App Structure

The app now uses exactly three bottom tabs:

- `상담`
- `홈`
- `마이`

The previous `기록` tab was removed. Workout logging now belongs inside the Home flow, triggered by completing today's workout.

Design implication:

- Keep the bottom nav prominent and touch-friendly.
- Do not add more tabs for MVP.
- If more functionality is needed, place it inside one of the existing tabs.

### 2. Home Tab

The Home tab is the primary tab after login for users who completed onboarding.

It includes:

- goal summary
- today's workout
- weekly check cards
- workout status buttons

Current status buttons:

- `완료`
- `실패`
- `미실행`

Design implication:

- Home should remain the clearest and most actionable screen.
- The most important thing is today's workout.
- Avoid making this a complex dashboard.

### 3. Consultation Tab

The Consultation tab now includes:

- a monthly calendar
- coach chat

The monthly calendar intentionally does not show full workout details. It only marks whether a day has training.

Design implication:

- Calendar should be simple and scannable.
- Training days can use small dots, marks, or light pixel indicators.
- Do not cram full workout copy into the calendar.
- Coach chat can sit below or beside the calendar depending on viewport.

### 4. My Page

The My tab is intentionally simple.

It shows:

- runner name
- email
- goal
- weekly routine
- long run day
- pain note
- logout

There is no save button.

Design implication:

- Treat this as a read-only runner profile card.
- It reflects onboarding and consultation results.
- Do not turn it into a settings-heavy screen.

## Manual Workout Logging UI

Manual workout logging was added to the Home tab.

Flow:

1. User sees today's workout.
2. User taps `완료`.
3. Terminal-style loading appears first.
4. Workout log modal opens.
5. User enters objective data:
   - distance
   - duration
   - RPE
   - pain
6. User taps `코치 질문 받기`.
7. App generates a coach question based on the objective data.
8. User answers in a chat-like field.
9. User taps `기록 저장`.

Design implication:

- The workout log should feel like a post-run debrief, not a spreadsheet.
- First step should be compact and objective.
- Second step should feel conversational.
- The modal should not visually collide with bottom tabs.
- The modal should feel intentional, like a focused bottom sheet or centered sheet.

## Terminal Processing Layer

A new global processing element was added:

```html
<div id="systemPulse" class="system-pulse hidden" aria-live="polite"></div>
```

This is used for nerd/terminal flavor.

Examples:

```text
> parsing check-in...
> reconciling plan...
> syncing coach state...
> evaluating recovery load...
> applying adjustments...
```

Important UX rule:

- The loading layer should appear before a visible screen/state change.
- It should feel like the app is processing the user's signal.
- It should not feel like a decorative toast after the work is already done.

Design implication:

- Make this element feel like a small terminal/status module.
- It can be more technical than the rest of the app.
- It should be temporary.
- Normal screen text should stay runner-friendly.

## Product Language Direction

The app now separates language into three modes.

### Normal Screen Language

Clean product language:

- 오늘 할 훈련
- plan is stable
- 워크스페이스 동기화 완료
- 오늘 훈련 준비됨

### Processing Language

Nerd/terminal language:

- parsing check-in...
- reconciling plan...
- syncing coach state...
- evaluating recovery load...
- applying adjustments...

### Completion Language

Back to product language:

- 조정이 반영됐어요
- 오늘 계획을 업데이트했어요
- 컨디션을 반영해 정리했어요
- 훈련 기록을 저장했어요

Design implication:

- Do not sprinkle technical phrases everywhere.
- Use technical-feeling language only during processing.
- Make normal UI readable and calm.

## Current Visual Style

Current prototype style:

- dark background
- green terminal/pixel accents
- panel borders
- grid pattern
- pixel-like headings and badges
- sticky bottom navigation

Current font stack is defined but not loaded via webfont import:

```css
--pixel-font: "Press Start 2P", "VT323", "IBM Plex Mono", "Menlo", monospace;
--display-font: "VT323", "Press Start 2P", monospace;
--body-font: "IBM Plex Sans KR", "Pretendard", "Noto Sans KR", sans-serif;
```

Design recommendation:

- Keep the nerd feel, but reduce visual clutter.
- Use the pixel/terminal style mainly for headings, chips, status, and processing.
- Use a readable Korean body font for actual workout instructions.

Suggested future font pairing:

- `Galmuri11` or `NeoDunggeunmo` for pixel accents
- `Pretendard` for body text
- `IBM Plex Mono` or `JetBrains Mono` for metrics

## Screens To Review

Design pass should review these states:

1. Login screen
2. Signup screen
3. First consultation onboarding
4. Home tab default
5. Home tab with workout log modal closed
6. Home tab after tapping `완료`, while processing
7. Workout log modal first step
8. Workout log modal coach question step
9. Saved workout state
10. Consultation tab
11. Consultation tab with proposed plan
12. My tab
13. Terminal pulse state

## UI Problems To Watch For

Known or likely issues:

- Modal/bottom-tab overlap on small screens
- Too much green/pixel treatment may become visually noisy
- Some labels still mix English/Korean
- Processing pulse may need refined timing
- Calendar could feel too plain if training markers are too subtle
- Today workout card may become too long on mobile

## Do Not Change Without Product Decision

- Keep three tabs only
- Keep Home as the default post-login tab
- Keep manual log triggered from `완료`
- Keep coach plan changes behind explicit user confirmation
- Keep My page simple and mostly read-only
- Do not add a full settings screen yet
- Do not add real LLM API directly from frontend

## Recent Commit Context

Relevant pushed commits:

```text
76fe750 Refine mobile UX feedback and manual logging
30799c7 Add mobile app tabs and coach consult flow
```

`PROJECT_HANDOFF.md` contains the broader engineering handoff. This file focuses on UI/design interpretation.
