// verify-browser.js - Stage 2: Real browser check with auth
// Loads each route in a headless browser, checks final URL, detects 404
// components, captures console errors, and screenshots failures.

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { CONFIG, loadRoutes, generateVariants, saveJson, loadJson } from './config.js';

const AUTH_STATE_PATH = path.join(CONFIG.OUT_DIR, 'auth-state.json');
const SCREENSHOTS_DIR = path.join(CONFIG.OUT_DIR, 'screenshots');
if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

/**
 * Log in once and save the storage state (cookies + localStorage)
 * so we can reuse it across all authed route checks.
 */
async function setupAuth(browser) {
  if (CONFIG.TEST_EMAIL.includes('CHANGE_ME')) {
    console.log('⚠️  No test credentials set. Authed routes will be checked anonymously.');
    console.log('   Set SHAREBLY_TEST_EMAIL and SHAREBLY_TEST_PASSWORD env vars to enable auth.\n');
    return null;
  }

  console.log('🔐 Logging in...');
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Step 1: Go to home page (login modal is in the navbar, /login route is broken)
    await page.goto(CONFIG.BASE_URL + CONFIG.LOGIN_TRIGGER_PATH, {
      waitUntil: CONFIG.NAV_WAIT,
      timeout: CONFIG.PAGE_TIMEOUT,
    });
    await page.waitForTimeout(1500);

    // Step 2: Click the navbar "Log in" button to open the modal
    console.log('   Opening login modal...');
    const triggerClicked = await tryClick(page, [
      { kind: 'role', name: 'button', text: /^log\s?in$/i },
      { kind: 'role', name: 'link', text: /^log\s?in$/i },
      { kind: 'selector', value: 'header button:has-text("Log in")' },
      { kind: 'selector', value: 'nav button:has-text("Log in")' },
      { kind: 'selector', value: 'button:has-text("Log in")' },
    ]);
    if (!triggerClicked) {
      throw new Error('Could not find "Log in" button in navbar');
    }

    // Step 3: Wait for modal to render
    await page.waitForTimeout(800);
    // Prefer waiting for an actual modal/dialog indicator
    await page.locator('[role="dialog"], .MuiDialog-root, .MuiModal-root').first()
      .waitFor({ state: 'visible', timeout: 5000 })
      .catch(() => {}); // ok if not found — modal might not have these roles

    // Step 4: Fill the form (scoped to the modal if we can find it)
    const modalScope = page.locator('[role="dialog"], .MuiDialog-root, .MuiModal-root').first();
    const scope = (await modalScope.count()) > 0 ? modalScope : page;

    console.log('   Filling credentials...');
    const emailFilled = await tryFill(scope, [
      ...CONFIG.LOGIN_EMAIL_LABELS.map((label) => ({ kind: 'label', value: label })),
      { kind: 'selector', value: CONFIG.LOGIN_SELECTORS.email },
      { kind: 'placeholder', value: /e-?mail/i },
      { kind: 'selector', value: 'input[type="email"], input[type="text"]' },
    ], CONFIG.TEST_EMAIL);
    if (!emailFilled) throw new Error('Could not locate email input in modal');

    const passwordFilled = await tryFill(scope, [
      ...CONFIG.LOGIN_PASSWORD_LABELS.map((label) => ({ kind: 'label', value: label })),
      { kind: 'selector', value: CONFIG.LOGIN_SELECTORS.password },
      { kind: 'selector', value: 'input[type="password"]' },
    ], CONFIG.TEST_PASSWORD);
    if (!passwordFilled) throw new Error('Could not locate password input in modal');

    // Step 5: Submit the form
    console.log('   Submitting...');
    const submitClicked = await tryClick(scope, [
      { kind: 'role', name: 'button', text: /^log\s?in$/i },
      { kind: 'role', name: 'button', text: /sign\s?in|anmelden/i },
      { kind: 'selector', value: CONFIG.LOGIN_SELECTORS.submit },
      { kind: 'selector', value: 'button[type="submit"]' },
    ]);
    if (!submitClicked) throw new Error('Could not locate submit button in modal');

    // Step 6: Verify login success.
    // Sharebly shows "Authenticated" inside the modal briefly before closing.
    // We start watching for that message immediately after submit (don't
    // await — it's transient), then race the modal-close / indicator checks.
    console.log('   Waiting for login success...');

    const modalLocator = page.locator('[role="dialog"], .MuiDialog-root').first();
    const indicatorLocator = page.locator(CONFIG.LOGGED_IN_INDICATORS.join(', ')).first();

    // Snapshot modal visibility BEFORE we wait, so we can tell if it closed
    const modalWasOpen = await modalLocator.isVisible().catch(() => false);

    // Watch for the transient success message in parallel — capture and store
    let successMessageSeen = false;
    const successMessagePromise = (async () => {
      for (const msg of CONFIG.LOGIN_SUCCESS_MESSAGES) {
        try {
          await page.getByText(msg, { exact: false }).first()
            .waitFor({ state: 'visible', timeout: CONFIG.PAGE_TIMEOUT });
          successMessageSeen = true;
          return;
        } catch (e) {
          // try next message
        }
      }
    })();

    // Race: whichever happens first wins
    await Promise.race([
      successMessagePromise,
      modalLocator.waitFor({ state: 'hidden', timeout: CONFIG.PAGE_TIMEOUT }),
      indicatorLocator.waitFor({ state: 'visible', timeout: CONFIG.PAGE_TIMEOUT }),
      page.waitForTimeout(CONFIG.PAGE_TIMEOUT), // backstop
    ]);

    // Now collect all signals
    const modalNowOpen = await modalLocator.isVisible().catch(() => false);
    const modalClosed = modalWasOpen && !modalNowOpen;

    const indicatorVisible = await indicatorLocator.isVisible().catch(() => false);

    const storageSignal = await page.evaluate(() => {
      const hasToken = (store) =>
        Object.keys(store).some(
          (k) => /token|auth|jwt|session|user/i.test(k) && store.getItem(k),
        );
      return {
        hasLocalStorageToken: hasToken(localStorage),
        hasSessionStorageToken: hasToken(sessionStorage),
        keys: { ls: Object.keys(localStorage), ss: Object.keys(sessionStorage) },
      };
    });

    const cookies = await context.cookies();
    const hasAuthCookie = cookies.some((c) =>
      /token|auth|jwt|session|user|sid/i.test(c.name),
    );

    // Decision: any signal = logged in
    const success =
      successMessageSeen ||
      modalClosed ||
      indicatorVisible ||
      storageSignal.hasLocalStorageToken ||
      storageSignal.hasSessionStorageToken ||
      hasAuthCookie;

    if (!success) {
      // Dump diagnostics to help debug
      const errorText = await scope
        .locator('[role="alert"], .MuiAlert-root, .error, [class*="error" i]')
        .first()
        .textContent({ timeout: 500 })
        .catch(() => null);

      console.log('\n   📋 Diagnostic info:');
      console.log(`      Modal still open:       ${modalNowOpen}`);
      console.log(`      Indicator visible:      ${indicatorVisible}`);
      console.log(`      LocalStorage keys:      ${storageSignal.keys.ls.join(', ') || '(none)'}`);
      console.log(`      SessionStorage keys:    ${storageSignal.keys.ss.join(', ') || '(none)'}`);
      console.log(`      Cookies:                ${cookies.map((c) => c.name).join(', ') || '(none)'}`);
      if (errorText) console.log(`      Error message on page:  "${errorText.trim()}"`);

      // Screenshot for debugging
      const errShotPath = path.join(CONFIG.OUT_DIR, 'login-failure.png');
      await page.screenshot({ path: errShotPath, fullPage: false }).catch(() => {});
      console.log(`      Screenshot:             ${errShotPath}`);

      throw new Error(
        'Login could not be confirmed. Likely cause: wrong credentials, ' +
          'or the app uses a logged-in signal we are not checking. ' +
          'Check the diagnostic info above.',
      );
    }

    // Report which signal we used (helpful for tuning)
    const signals = [];
    if (successMessageSeen) signals.push('success-message');
    if (modalClosed) signals.push('modal-closed');
    if (indicatorVisible) signals.push('dom-indicator');
    if (storageSignal.hasLocalStorageToken) signals.push('localStorage');
    if (storageSignal.hasSessionStorageToken) signals.push('sessionStorage');
    if (hasAuthCookie) signals.push('cookie');
    console.log(`   Login confirmed via: ${signals.join(', ')}`);

    await context.storageState({ path: AUTH_STATE_PATH });
    console.log(`✅ Logged in. Auth state saved.\n`);
    await context.close();
    return AUTH_STATE_PATH;
  } catch (err) {
    console.log(`❌ Login failed: ${err.message}`);
    console.log('   Continuing without auth — run `node inspect-login.js` to debug.\n');
    await context.close();
    return null;
  }
}

/**
 * Try multiple location strategies to fill an input.
 * `scope` can be a Page or a Locator (e.g. to scope to a modal).
 */
async function tryFill(scope, strategies, value) {
  for (const strat of strategies) {
    try {
      let locator;
      if (strat.kind === 'label') {
        locator = scope.getByLabel(strat.value, { exact: false });
      } else if (strat.kind === 'placeholder') {
        locator = scope.getByPlaceholder(strat.value);
      } else if (strat.kind === 'selector') {
        locator = scope.locator(strat.value).first();
      }
      await locator.waitFor({ state: 'visible', timeout: 2000 });
      await locator.fill(value);
      return true;
    } catch (e) {
      // try next strategy
    }
  }
  return false;
}

async function tryClick(scope, strategies) {
  for (const strat of strategies) {
    try {
      let locator;
      if (strat.kind === 'role') {
        locator = scope.getByRole(strat.name, { name: strat.text });
      } else if (strat.kind === 'selector') {
        locator = scope.locator(strat.value).first();
      }
      await locator.waitFor({ state: 'visible', timeout: 2000 });
      await locator.click();
      return true;
    } catch (e) {
      // try next strategy
    }
  }
  return false;
}

/**
 * Check a single route in a browser context.
 */
async function checkRoute(context, check) {
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => pageErrors.push(err.message));

  const start = Date.now();
  let result = {
    route_id: check.route_id,
    path: check.path,
    is_variant: check.is_variant,
    final_url: null,
    final_path: null,
    redirected: false,
    title: null,
    not_found_detected: false,
    console_errors: [],
    page_errors: [],
    screenshot: null,
    elapsed_ms: 0,
    ok: false,
    error: null,
  };

  try {
    await page.goto(CONFIG.BASE_URL + check.path, {
      waitUntil: CONFIG.NAV_WAIT,
      timeout: CONFIG.PAGE_TIMEOUT,
    });

    // Give React a moment to render
    await page.waitForTimeout(800);

    const finalUrl = page.url();
    const finalPath = new URL(finalUrl).pathname;
    result.final_url = finalUrl;
    result.final_path = finalPath;
    result.redirected = finalPath !== check.path;
    result.title = await page.title().catch(() => null);

    // ── 404 / blank-page detection ───────────────────────────────────
    // Sharebly's 404 page is completely blank (no header/footer/content).
    // We measure rendered content and treat very-low signals as "not found".
    const pageMetrics = await page.evaluate(() => {
      const body = document.body;
      const text = (body.innerText || '').trim();
      return {
        text_length: text.length,
        element_count: body.querySelectorAll('*').length,
        has_header: !!document.querySelector('header, [role="banner"], nav'),
        has_footer: !!document.querySelector('footer, [role="contentinfo"]'),
        has_main: !!document.querySelector('main, [role="main"], #root > div'),
        body_html_length: body.innerHTML.length,
      };
    }).catch(() => null);

    result.page_metrics = pageMetrics;

    if (pageMetrics) {
      // Calibrate these thresholds after one run — see what real pages look like
      const looksBlank =
        pageMetrics.text_length < CONFIG.BLANK_PAGE_TEXT_THRESHOLD &&
        pageMetrics.element_count < CONFIG.BLANK_PAGE_ELEMENT_THRESHOLD &&
        !pageMetrics.has_header &&
        !pageMetrics.has_footer;

      if (looksBlank) {
        result.not_found_detected = true;
        result.not_found_reason = 'blank-page';
      }
    }

    // Also keep the text-indicator check in case some 404s do render text
    if (!result.not_found_detected) {
      for (const indicator of CONFIG.NOT_FOUND_INDICATORS) {
        const locator = page.locator(indicator).first();
        if (await locator.isVisible().catch(() => false)) {
          result.not_found_detected = true;
          result.not_found_reason = 'indicator-matched';
          break;
        }
      }
    }

    result.console_errors = consoleErrors;
    result.page_errors = pageErrors;
    result.ok = !result.not_found_detected && pageErrors.length === 0;

    // Screenshot failures only (to save disk)
    if (!result.ok) {
      const screenshotName = `${check.route_id}${check.is_variant ? '_variant' : ''}_${check.path.replace(/[/:]/g, '_')}.png`;
      const screenshotPath = path.join(SCREENSHOTS_DIR, screenshotName);
      await page.screenshot({ path: screenshotPath, fullPage: false }).catch(() => {});
      result.screenshot = screenshotName;
    }
  } catch (err) {
    result.error = err.message.split('\n')[0]; // first line only
  } finally {
    result.elapsed_ms = Date.now() - start;
    await page.close();
  }

  return result;
}

async function runWithConcurrency(items, worker, concurrency) {
  const results = [];
  let idx = 0;
  const runners = Array.from({ length: concurrency }, async () => {
    while (idx < items.length) {
      const i = idx++;
      results[i] = await worker(items[i], i);
    }
  });
  await Promise.all(runners);
  return results;
}

async function main() {
  console.log(`\n🎭 Browser verification → ${CONFIG.BASE_URL}\n`);

  const routes = loadRoutes();

  // Decide which URLs to check. If HTTP results exist, skip the obvious
  // dead variants (errors/timeouts). Otherwise check everything.
  const httpResults = loadJson('http-results.json');

  let checks = [];
  let skippedParameterized = 0;
  for (const route of routes) {
    let concretePath;
    if (route.sample_path) {
      concretePath = route.sample_path;
    } else if (route.path.includes(':')) {
      skippedParameterized++;
      continue;
    } else {
      concretePath = route.path;
    }

    // Variants only make sense for paths without query strings.
    // For sample_paths that include a query, just check the sample_path.
    const variants = concretePath.includes('?')
      ? [concretePath]
      : generateVariants({ ...route, path: concretePath });
    for (const variant of variants) {
      checks.push({
        route_id: route.id,
        path: variant,
        is_primary: variant === concretePath,
        is_variant: variant !== concretePath,
        auth_required: route.auth,
      });
    }
  }
  if (skippedParameterized > 0) {
    console.log(`Skipping ${skippedParameterized} parameterized routes with no sample_path`);
  }

  if (httpResults) {
    const deadPaths = new Set(
      httpResults.results
        .filter((r) => r.error && r.error !== 'timeout')
        .map((r) => r.path),
    );
    if (deadPaths.size > 0) {
      const before = checks.length;
      checks = checks.filter((c) => !deadPaths.has(c.path));
      console.log(`Skipping ${before - checks.length} URLs that failed in HTTP stage`);
    }
  }

  console.log(`Browser checks: ${checks.length}\n`);

  const browser = await chromium.launch({ headless: true });
  const authStatePath = await setupAuth(browser);

  // If credentials were provided but login failed, stop the script.
  // Continuing without auth means 76 authed routes get checked anonymously
  // and produce useless "auth-redirect" verdicts.
  const credentialsProvided = !CONFIG.TEST_EMAIL.includes('CHANGE_ME');
  if (credentialsProvided && !authStatePath) {
    console.log('\n🛑 Stopping: credentials were provided but login failed.');
    console.log('   Fix the login issue and re-run, or unset SHAREBLY_TEST_EMAIL');
    console.log('   to intentionally run without auth.\n');
    await browser.close();
    process.exit(1);
  }

  const context = await browser.newContext({
    storageState: authStatePath || undefined,
    viewport: { width: 1280, height: 800 },
  });

  let completed = 0;
  const results = await runWithConcurrency(
    checks,
    async (check) => {
      const result = await checkRoute(context, check);
      completed++;
      const status = result.ok ? '✓' : result.not_found_detected ? '✗404' : '✗';
      process.stdout.write(`\r  [${completed}/${checks.length}] ${status} ${check.path.slice(0, 50).padEnd(50)}`);
      return result;
    },
    CONFIG.BROWSER_CONCURRENCY,
  );
  console.log('\n');

  await context.close();
  await browser.close();

  // Summary
  const ok = results.filter((r) => r.ok).length;
  const notFound = results.filter((r) => r.not_found_detected).length;
  const errors = results.filter((r) => r.error).length;
  const withConsoleErrors = results.filter((r) => r.console_errors.length > 0).length;
  const redirected = results.filter((r) => r.redirected).length;

  console.log(`✅ OK:               ${ok}`);
  console.log(`↪️  Redirected:       ${redirected}`);
  console.log(`❌ 404 detected:     ${notFound}`);
  console.log(`💥 Errors:           ${errors}`);
  console.log(`⚠️  Console errors:   ${withConsoleErrors}`);

  const outPath = saveJson('browser-results.json', {
    base_url: CONFIG.BASE_URL,
    checked_at: new Date().toISOString(),
    total_checks: checks.length,
    authenticated: !!authStatePath,
    summary: {
      ok,
      not_found: notFound,
      errors,
      console_errors: withConsoleErrors,
      redirected,
    },
    results,
  });

  console.log(`\n💾 Saved → ${outPath}`);
  console.log(`📸 Failure screenshots → ${SCREENSHOTS_DIR}\n`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
