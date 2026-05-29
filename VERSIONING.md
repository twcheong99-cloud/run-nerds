# Versioning and app identity

Use this file when cutting a Play Store or App Store build. Android and iOS versions must move together unless there is a store-specific rejected build that needs only one platform re-uploaded.

## Current release identity

- App name: `run-nerds`
- Android application ID: `com.runnerds.app`
- Android namespace: `com.runnerds.app`
- iOS bundle ID: `com.runnerds.app`
- Capacitor app ID: `com.runnerds.app`
- Marketing version: `1.0`
- Build number: `1`

## Source of truth

Update these files together for each store release:

- `android/app/build.gradle`
  - `applicationId`
  - `namespace`
  - `versionName`
  - `versionCode`
- `ios/App/App.xcodeproj/project.pbxproj`
  - `PRODUCT_BUNDLE_IDENTIFIER`
  - `MARKETING_VERSION`
  - `CURRENT_PROJECT_VERSION`
- `capacitor.config.json`
  - `appId`
  - `appName`

`npm run release:check` verifies that the checked-in values still match this file.

## Release bump rules

- First public review build: `versionName 1.0`, `MARKETING_VERSION 1.0`, `versionCode 1`, `CURRENT_PROJECT_VERSION 1`.
- For a rejected binary with no user-visible version change, keep marketing version the same and increment build number only.
- For a user-visible release, increment marketing version and reset or continue build number according to the store workflow.
- Android `versionCode` must always increase for each uploaded `.aab`.
- iOS `CURRENT_PROJECT_VERSION` must always increase for each uploaded build with the same marketing version.

## Before upload

1. Run `npm run release:check`.
2. Confirm Play Console package name is `com.runnerds.app`.
3. Confirm App Store Connect bundle ID is `com.runnerds.app`.
4. Confirm the uploaded build version shown in each store matches this file.
5. Update store release notes if marketing version changes.
