# Sharebly Route Verifier

Verifies that the routes listed in `routes.json` actually exist on the running app.

## Setup

```bash
npm install
npx playwright install chromium
```

## Configure

Set environment variables (or edit `config.js`):

```bash
export SHAREBLY_URL="http://78.46.183.126:5173"
export SHAREBLY_TEST_EMAIL="your-test-account@example.com"
export SHAREBLY_TEST_PASSWORD="..."
```

Without credentials, authed routes will be checked anonymously (you'll see them redirect to /login — that's still useful info).

## Run

```bash
# Stage 1: Fast HTTP check (~30s)
npm run verify:http

# Stage 2: Real browser check with auth (~3-5 min)
npm run verify:browser

# Or both
npm run verify:all

# Generate the merged report
npm run report
```

## What you get

In `output/`:

- `http-results.json` — raw HTTP status codes per URL
- `browser-results.json` — browser results: 404 detection, console errors, redirects
- `routes.status.json` — per-route verdict, ready to merge back into routes.json
- `report.md` — human-readable summary grouped by verdict
- `screenshots/` — screenshots of failing routes

## Verdicts

| Verdict | Meaning |
|---|---|
| `pass` | Route renders, no errors, no 404 |
| `variant-works` | Primary path 404s but a snake_case/kebab-case variant works — update routes.json |
| `auth-redirect` | Redirects to login (expected for authed routes when not logged in) |
| `not-found` | Path and all variants 404 — likely doesn't exist on the app |
| `error` | Browser couldn't load (timeout, network error, etc.) |

## Customizing 404 detection

The default detection looks for text like "404", "Page not found", etc.
Update `NOT_FOUND_INDICATORS` in `config.js` once you've seen how the app
actually renders unknown routes — usually there's a unique element or message.

## Updating login selectors

If the developer used non-standard form field names, update
`LOGIN_SELECTORS` in `config.js`. Open the login page in a browser, inspect
the email/password inputs, and put the selectors there.

## Continuous verification

A scheduled GitHub Actions workflow runs the verifier daily and publishes the
JSON/Markdown outputs to a `data` branch in this repository for the dashboard
to consume. See [`CI.md`](./CI.md) for the cron schedule, the secrets/variables
to configure, and the raw URL pattern to point `DATA_URL` / `SCENARIOS_DATA_URL`
at on Vercel.
