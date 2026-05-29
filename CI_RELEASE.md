# CI release confirmation

Use this checklist before the first real store submission and after every final `main` push.

## Workflow

- Workflow name: `Release readiness`
- Workflow file: `.github/workflows/release-check.yml`
- Required branch: `main`
- Required job: `npm run release:check`
- Workflow URL: `https://github.com/twcheong99-cloud/run-nerds/actions/workflows/release-check.yml`

## Required status

The final `main` commit used for store submission must have a successful `Release readiness` run.

Record this in `RELEASE_EVIDENCE.md`:

- Final commit SHA
- Workflow run URL
- Run date
- Job status
- Any warnings shown by `npm run release:check`

## Manual confirmation

1. Open the workflow URL.
2. Select the latest run on `main`.
3. Confirm the run is tied to the final commit SHA.
4. Confirm the `npm run release:check` job passed.
5. Copy the workflow run URL into `RELEASE_EVIDENCE.md`.

## CLI confirmation

If GitHub CLI is installed and authenticated on the release machine:

```bash
gh run list --workflow release-check.yml --branch main --limit 5
gh run view <run-id> --log-failed
```

Do not mark the CI blocker closed until the final `main` commit has a passing run.
