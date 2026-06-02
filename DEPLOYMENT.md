# Deployment

This repo has three deliverables that ship together:

- `verify/` — Playwright-based verifier. Runs on GitHub Actions.
- `dashboard/` — Next.js dashboard. Deploys to Vercel.
- `.github/workflows/verify.yml` — Cron-scheduled verifier that publishes JSON to a `data` branch.

## 1. Create the GitHub repo

```bash
# From the repo root
git rm -r --cached verify/node_modules    # stop tracking node_modules
git add .gitignore
git add -A
git commit -m "chore: prepare for first push"

# Create the repo on github.com (empty, no README), then:
git remote add origin git@github.com:<owner>/<repo>.git
git push -u origin main
```

> `verify/node_modules/` is currently tracked from earlier commits.
> The `git rm --cached` step removes it from the index without deleting
> the local folder.

## 2. Configure repo secrets and variables

Settings → Secrets and variables → Actions.

| Name                     | Kind     | Required | Notes                                   |
|--------------------------|----------|----------|-----------------------------------------|
| `SHAREBLY_TEST_EMAIL`    | Secret   | Yes      | Email for the test account              |
| `SHAREBLY_TEST_PASSWORD` | Secret   | Yes      | Password for the test account           |
| `SHAREBLY_URL`           | Variable | No       | Defaults to `http://78.46.183.126:5173` |

## 3. Trigger the first verifier run

Actions → "Verify Sharebly" → **Run workflow** → branch `main`.

This run will:
1. Run all four verifier stages.
2. Create the `data` branch (orphan, first time only).
3. Publish `issue-results.json`, `scenario-results.json`, and a few support files to that branch.

Confirm the `data` branch exists and contains `issue-results.json` before
moving on. The raw URL will be:

```
https://raw.githubusercontent.com/<owner>/<repo>/data/issue-results.json
https://raw.githubusercontent.com/<owner>/<repo>/data/scenario-results.json
```

## 4. Deploy the dashboard to Vercel

1. **Import the repo** at https://vercel.com/new.
2. **Set the root directory** to `dashboard/`. Vercel will auto-detect Next.js.
3. **Environment variables**: add these two (in Production scope):
   - `DATA_URL` = the issue-results raw URL from step 3.
   - `SCENARIOS_DATA_URL` = the scenario-results raw URL from step 3.
4. **Deploy.** First build takes ~1 minute.

The dashboard server-fetches the JSON on every request with a 60s revalidate,
so a new verifier run shows up within ~60 seconds without redeploying.

## 5. Verify end-to-end

- Open the Vercel URL. You should see the health gauge and verdict tiles.
- Trigger a fresh workflow run (or wait for the daily 06:00 UTC cron).
- The `Last run` timestamp in the header should update within a minute.

## Troubleshooting

- **Dashboard shows the empty state** ("Waiting on first verification run"):
  the `DATA_URL` is unreachable. Check:
  1. The `data` branch exists and contains `issue-results.json`.
  2. The repo is public, OR Vercel has a token to read it (raw URLs work for
     public repos only without auth).
  3. `DATA_URL` env var on Vercel is exactly the raw URL — no trailing space.
- **Workflow fails at the verify step but no data is published**:
  open the workflow run, download the `verifier-output` artifact, and inspect
  the raw JSON for clues. The publish step runs with `if: always()` so partial
  failures still push what they have.
- **Login signal not detected in `verify-browser`**:
  the modal-based login is fragile. Check
  `verify/output/login-failure.png` in the workflow artifact and update
  selectors in `verify/config.js`.
