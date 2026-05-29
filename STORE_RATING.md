# Store age rating and health declarations

Use this file before answering the Play Console content rating questionnaire and App Store Connect age rating / health declarations. The final rating is assigned by each store based on the answers entered in the console.

Official references:

- Apple App Store Connect: age ratings are generated from the age rating questionnaire.
- Google Play Console: each submitted app must complete the content rating questionnaire to avoid being listed as unrated.

## Current app profile

- App category: Health & Fitness
- App type: running coaching, workout planning, and workout logging
- Target audience: general runners who can make their own training decisions
- Medical positioning: fitness coaching only
- Medical device status: not a medical device

## Content rating answer baseline

Answer according to the current checked-in app:

- Violence: none
- Fear / horror: none
- Sexual content or nudity: none
- Profanity or crude humor: none
- Alcohol, tobacco, drugs, gambling, or contests: none
- User-generated public content: none. Coach messages and workout notes are private to the authenticated user.
- Social networking, public sharing, or user discovery: none
- Purchases, subscriptions, or payments: none
- Ads or ad targeting: none
- Location sharing or location tracking: none
- Browser access to arbitrary web content: none

## Health and fitness declarations

Use conservative wording in each store console:

- The app provides fitness planning and workout logging.
- The app asks for fatigue, sleep, pain, recovery, and workout history so it can reduce or adjust training load.
- The app does not diagnose, treat, monitor, cure, or prevent any disease or medical condition.
- The app does not provide emergency guidance.
- The app does not connect to medical devices, sensors, Health Connect, Apple Health, or wearable data.
- The app does not request location, camera, microphone, contacts, photo library, Bluetooth, or notification permissions.
- The app has no advertising SDK, tracking SDK, ad targeting, or advertising ID collection.

## Stop before submission if

- A new feature adds public user-generated content, social sharing, ads, payments, location, Health Connect, Apple Health, wearable data, or sensor access.
- A new SDK adds tracking, advertising ID usage, or permissions not listed in `ANDROID_PERMISSIONS.md`.
- Store console answers imply medical diagnosis, treatment, or emergency use.
- `safety.html`, `privacy.html`, or `STORE_SUBMISSION.md` no longer match the answers entered in the store console.

## Evidence to keep

- Screenshot or exported record of the final Play Console content rating answers.
- Screenshot or exported record of the final App Store Connect age rating and health declarations.
- Confirmation that final store privacy/data-safety answers match `STORE_SUBMISSION.md`, `ANDROID_PERMISSIONS.md`, and `ios/App/App/PrivacyInfo.xcprivacy`.
