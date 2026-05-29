# Production URL checklist

Use this before entering public URLs in Play Console and App Store Connect. The store consoles should receive public HTTPS URLs that are reachable without login.

## Required public pages

Publish the prepared `www` bundle and verify these paths on the production domain:

- `/privacy.html`
- `/account-deletion.html`
- `/safety.html`
- `/support.html`
- `/manifest.webmanifest`
- `/service-worker.js`

## Netlify deployment

This repository's Netlify config builds the production web bundle with:

```bash
npm run mobile:prepare
```

and publishes only:

```text
www
```

Do not publish the repository root for a store-facing production site. The root contains release docs, tests, scripts, and local-only examples that do not belong in the public app bundle.

## URL values to paste into stores

Replace `<production-origin>` with the deployed HTTPS origin, for example `https://example.netlify.app` or a custom domain.

- Privacy Policy URL: `<production-origin>/privacy.html`
- Account Deletion URL: `<production-origin>/account-deletion.html`
- Safety / medical disclaimer URL: `<production-origin>/safety.html`
- Support URL: `<production-origin>/support.html` or the final support email/channel accepted by the store console

## Verification

Before submitting a review build:

1. Open each required public page in a private/incognito browser window.
2. Confirm each page loads over HTTPS without authentication.
3. Confirm the privacy, account deletion, safety, and support pages link back to the app and to each other where relevant.
4. Confirm `manifest.webmanifest` loads with `application/manifest+json`.
5. Confirm `service-worker.js` is not cached aggressively.
6. Confirm no `env.js`, local secrets, release docs, tests, or scripts are reachable from the production origin.
7. Replace the production URL placeholders in `STORE_LISTING.md`.
8. Keep screenshots or store-console records proving the final URLs were accepted.

## Stop before submission if

- Any required page returns 404, redirects to login, or uses HTTP instead of HTTPS.
- The production site serves `env.js`, repository docs, tests, or scripts.
- Store listing URLs still contain `production URL`.
- The account deletion URL does not explain both in-app deletion and support-channel deletion when login is unavailable.
