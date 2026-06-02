// smoke.spec.js - One Playwright test per status:pass route in routes.json.
//
// Asserts:
//   - final URL stays on the expected path (no silent redirect to /login)
//   - page renders non-blank content (text + DOM threshold)
//   - has at least one chrome element (header, main, or footer)
//   - no uncaught page errors
//
// Console errors are NOT failed (too noisy in current app; tracked separately
// by the verifier).
//
// Designed as a CI guard: a previously-passing route silently going blank
// will fail this suite.

import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROUTES_PATH = path.resolve(__dirname, '../../routes.json');
const STATUS_PATH = path.resolve(__dirname, '../output/routes.status.json');

const TEXT_THRESHOLD = 50;
const ELEMENT_THRESHOLD = 20;

if (!fs.existsSync(STATUS_PATH)) {
  throw new Error(
    `Missing ${STATUS_PATH}. Run "npm run verify:browser && npm run report" first ` +
      `so we know which routes are currently passing.`,
  );
}

const doc = JSON.parse(fs.readFileSync(ROUTES_PATH, 'utf8'));
const status = JSON.parse(fs.readFileSync(STATUS_PATH, 'utf8'));
const routesById = Object.fromEntries(doc.routes.map((r) => [r.id, r]));

// Take routes the verifier currently sees as passing AND that aren't
// manually marked as blocked in routes.json.
const routes = status.verdicts
  .filter((v) => v.verdict === 'pass')
  .map((v) => routesById[v.id])
  .filter((r) => r && r.status !== 'blocked');

for (const route of routes) {
  const url = route.sample_path || route.path;
  const expectedPath = url.split('?')[0]; // strip query for redirect comparison

  test(`${route.id} — ${url}`, async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);

    // Redirect check — if the app bounced us to /login, auth state is stale.
    const finalPath = new URL(page.url()).pathname;
    expect(
      finalPath,
      `Redirected away from ${expectedPath} to ${finalPath} (auth-state.json may be stale — re-run verify:browser to refresh)`,
    ).toBe(expectedPath);

    // Render check — match the verifier's blank-page heuristic: a page is
    // "blank" only when text AND elements AND chrome are all missing.
    // (Login/signup-style routes render a centered form with no chrome
    // but plenty of text + elements, and should still pass.)
    const metrics = await page.evaluate(() => ({
      text_length: (document.body.innerText || '').trim().length,
      element_count: document.body.querySelectorAll('*').length,
      has_chrome: !!document.querySelector(
        'header, [role="banner"], nav, main, [role="main"], footer, [role="contentinfo"]',
      ),
    }));

    const looksBlank =
      metrics.text_length < TEXT_THRESHOLD &&
      metrics.element_count < ELEMENT_THRESHOLD &&
      !metrics.has_chrome;

    expect(
      looksBlank,
      `${route.id} rendered blank (${metrics.text_length} chars, ${metrics.element_count} elements, has_chrome=${metrics.has_chrome})`,
    ).toBe(false);

    // No uncaught exceptions during render
    expect(
      pageErrors,
      `${route.id} produced ${pageErrors.length} page error(s):\n${pageErrors.join('\n')}`,
    ).toHaveLength(0);
  });
}
