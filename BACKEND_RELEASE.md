# Backend release checklist

Use this checklist before a store review build. The mobile app depends on Supabase Auth, public anon configuration, the database schema/RLS policies, the `coach` Edge Function, and the `delete-account` Edge Function.

## Production project

Current project reference:

```text
jnlexemtrjgwskzwybim
```

Production public config lives in `env.public.js`:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`

These values are allowed in the browser/mobile bundle. Never put these secrets in `env.public.js`, `env.js`, `www`, or any frontend file:

- `OPENAI_API_KEY`
- Supabase service role key
- Database URL
- Signing keys or store credentials

## Supabase login and deploy

Install and log in to the Supabase CLI on the release machine:

```bash
supabase login
```

Deploy the coach Edge Function after changing `supabase/functions/coach/index.ts`:

```bash
supabase functions deploy coach --project-ref jnlexemtrjgwskzwybim
```

Deploy the account deletion Edge Function after changing `supabase/functions/delete-account/index.ts`:

```bash
supabase functions deploy delete-account --project-ref jnlexemtrjgwskzwybim
```

Set Edge Function secrets in Supabase, not in frontend files:

```bash
supabase secrets set OPENAI_API_KEY=... --project-ref jnlexemtrjgwskzwybim
supabase secrets set OPENAI_MODEL=gpt-5.2 --project-ref jnlexemtrjgwskzwybim
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=... --project-ref jnlexemtrjgwskzwybim
```

`OPENAI_MODEL` is optional. If `OPENAI_API_KEY` is missing or the Edge Function fails, the app should fall back to the local coach path.
`SUPABASE_SERVICE_ROLE_KEY` is required only inside Supabase Edge Functions and must never be bundled into the app.

## Database schema and RLS

Apply `supabase-setup.sql` in the production project SQL editor before review builds.

Required tables:

- `public.profiles`
- `public.runner_workspaces`

Required RLS behavior:

- RLS enabled on `profiles`
- RLS enabled on `runner_workspaces`
- Authenticated users can select/insert/update only their own profile row.
- Authenticated users can select/insert/update only their own workspace row.

Do not disable RLS to make testing easier. If reviewer login fails, fix Auth/demo account setup instead.

## Auth review setup

Before store review:

1. Confirm email/password signup works.
2. Confirm email/password login works.
3. Create a reviewer demo account if the store review needs credentials.
4. Complete onboarding for the demo account.
5. Confirm the demo account can load the same workspace after app restart.
6. Confirm logout and login restore the correct runner workspace.

Store the final demo credentials only in the private store console notes, not in this repository.

## Edge Function QA

Test these coach paths on the production Supabase project:

- General training question returns a Korean coach reply.
- Schedule-change request returns a pending plan proposal.
- Confirming an apply action updates the app-facing proposal contract.
- Pain/injury language returns conservative safety guidance and does not diagnose.
- Edge Function unavailable or failing path falls back without blocking the app.

Test these account deletion paths on the production Supabase project:

- Logged-in user can start account deletion from My Page.
- `delete-account` deletes the authenticated Supabase Auth user.
- `profiles` and `runner_workspaces` rows for that user are gone after deletion.
- The app clears the local session and returns to the login screen.
- A stale or missing token returns a controlled error, not a stack trace.

The response contract version should stay aligned with the frontend tests:

```text
coach-contract-v3
```

## Release stop points

Stop before store upload if:

- `www/env.js` exists after `npm run mobile:sync`.
- The executable web bundle contains server secret names.
- Supabase Auth cannot create or restore a reviewer account.
- Account deletion cannot be started from inside the app.
- `delete-account` is not deployed or cannot delete a test reviewer account.
- RLS allows one user to read or write another user's profile/workspace.
- The `coach` Edge Function returns raw JSON, stack traces, or non-Korean user-facing text.
- The local fallback coach path is broken when the Edge Function fails.
