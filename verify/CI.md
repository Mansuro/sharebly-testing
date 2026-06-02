# Continuous Verification (GitHub Actions)

## Overview

The `Verify Sharebly` workflow (`.github/workflows/verify.yml`) runs daily at
`06:00 UTC` (cron `0 6 * * *`), on every push that touches `verify/**` on
`main`, and on manual dispatch. It installs the verifier, runs `verify:http`,
`verify:browser`, `verify:issues`, and `verify:scenarios`, then publishes the
resulting JSON and Markdown files to the `data` branch of this repository.

## Required secrets and variables

Configure these in repo Settings -> Secrets and variables -> Actions.

| Name                      | Kind     | Required | Notes                                                |
| ------------------------- | -------- | -------- | ---------------------------------------------------- |
| `SHAREBLY_TEST_EMAIL`     | secret   | yes      | Test account email used by `verify:browser`.         |
| `SHAREBLY_TEST_PASSWORD`  | secret   | yes      | Test account password.                               |
| `SHAREBLY_URL`            | variable | no       | Target base URL. Defaults to `http://78.46.183.126:5173`. |

## Where the data lives

The workflow pushes the latest results to the `data` branch as plain files at
the branch root. They are then reachable via raw URLs:

```
https://raw.githubusercontent.com/<owner>/<repo>/data/issue-results.json
https://raw.githubusercontent.com/<owner>/<repo>/data/scenario-results.json
```

Set these on the Vercel project that hosts `dashboard/`:

- `DATA_URL` -> `https://raw.githubusercontent.com/<owner>/<repo>/data/issue-results.json`
- `SCENARIOS_DATA_URL` -> `https://raw.githubusercontent.com/<owner>/<repo>/data/scenario-results.json`

Replace `<owner>/<repo>` with the actual GitHub slug once the remote is set.

The full list of files the workflow publishes (when present):
`issue-results.json`, `scenario-results.json`, `report.md`, `issues-report.md`,
`scenarios-report.md`, `http-results.json`, `browser-results.json`,
`routes.status.json`.

## Manual trigger

GitHub -> Actions -> "Verify Sharebly" -> Run workflow (select branch `main`).

## Troubleshooting

Every run uploads the full `verify/output/` directory as the `verifier-output`
workflow artifact, so you can inspect raw results even when a sub-step failed.
