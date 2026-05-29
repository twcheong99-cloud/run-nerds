# Android permissions and Play Data safety

Use this file when preparing a Play Store release. The checked-in Android app currently requests only network access.

## Current manifest permissions

Declared in `android/app/src/main/AndroidManifest.xml`:

```text
android.permission.INTERNET
```

Why it is needed:

- Supabase Auth login and signup
- Supabase workspace sync
- Supabase Edge Function coach requests
- Static app asset/network loading inside the Capacitor WebView

## Permissions not used

The current app must not request these permission families unless the feature and store disclosures are updated first:

- Location: `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, `ACCESS_BACKGROUND_LOCATION`
- Camera: `CAMERA`
- Microphone: `RECORD_AUDIO`
- Contacts or calendar: `READ_CONTACTS`, `WRITE_CONTACTS`, `READ_CALENDAR`, `WRITE_CALENDAR`
- Photos, videos, or media library: `READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO`, `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE`
- Health Connect or sensors: `BODY_SENSORS`, `ACTIVITY_RECOGNITION`, `androidx.health`
- Notifications: `POST_NOTIFICATIONS`
- Advertising ID: `com.google.android.gms.permission.AD_ID`
- Bluetooth or nearby devices: `BLUETOOTH_SCAN`, `BLUETOOTH_CONNECT`, `NEARBY_WIFI_DEVICES`

If any of these are added later, update:

- `STORE_SUBMISSION.md`
- `BACKEND_RELEASE.md` if backend payloads change
- App Store privacy answers
- Play Console Data safety
- In-app privacy copy

## Play Data safety alignment

Current Play Console answers should reflect:

- Data collected: email address, name/display name, user ID, fitness/workout data, health-related status signals, coach messages, and app activity/workspace state.
- Data not collected: location, contacts, photos/videos, payment information, advertising ID.
- Tracking: no advertising SDK, no tracking SDK, no advertising ID collection.
- Security practices: data is transmitted over HTTPS, app backup is disabled, and Supabase RLS limits rows to the authenticated owner.

## Stop before upload

Stop before uploading an `.aab` if:

- Android manifest requests any permission not listed in the current manifest permissions section.
- Play Console Data safety says a data type is not collected while the app now collects it.
- A new SDK adds permissions or tracking behavior that is not documented here.
- `npm run release:check` fails the Android permission audit.
