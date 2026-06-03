// verify-issues.js
// Loads each URL listed in known-issues.json in a real browser, runs a set
// of generic checks (console errors, broken images, error-text on page,
// final HTTP status) plus per-issue targeted assertions, and writes a
// PASS/FAIL verdict per issue. Diffs against the previous run so newly-
// fixed and newly-regressed issues stand out.
//
// Usage:
//   npm run verify:issues
//
// Reads:
//   verify/known-issues.json
//   verify/output/auth-state.json    (optional — produced by verify-browser.js)
//   verify/output/issue-results.json (optional — previous run, for diffing)
//
// Writes:
//   verify/output/issue-results.json
//   verify/output/issues-report.md
//   verify/output/issue-screenshots/<issue-id>.png   (failures only)

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { CONFIG, saveJson, loadJson } from './config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const KNOWN_ISSUES_PATH = path.join(__dirname, 'known-issues.json');
const AUTH_STATE_PATH = path.join(CONFIG.OUT_DIR, 'auth-state.json');
const SCREENSHOTS_DIR = path.join(CONFIG.OUT_DIR, 'issue-screenshots');
if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

// ─── Generic checks (run for every URL) ─────────────────────────────────
//
// Each returns { name, ok, detail } where ok=false means the page is
// observably broken. These run independently of per-issue rules.

function genericChecks(pageData) {
  const checks = [];

  checks.push({
    name: 'http-ok',
    ok: pageData.http_status >= 200 && pageData.http_status < 400,
    detail: `HTTP ${pageData.http_status}`,
  });

  checks.push({
    name: 'no-page-errors',
    ok: pageData.page_errors.length === 0,
    detail:
      pageData.page_errors.length === 0
        ? 'no uncaught exceptions'
        : `${pageData.page_errors.length} uncaught: ${pageData.page_errors[0].slice(0, 120)}`,
  });

  // Console errors are noisy in dev mode. Treat as warning, not failure,
  // unless they look like real product breakage (fetch failures, 5xx).
  const seriousConsole = pageData.console_errors.filter((e) =>
    /(failed to fetch|networkerror|500|503|TypeError|undefined is not)/i.test(e),
  );
  checks.push({
    name: 'no-serious-console-errors',
    ok: seriousConsole.length === 0,
    detail:
      seriousConsole.length === 0
        ? `${pageData.console_errors.length} benign console msgs`
        : `${seriousConsole.length} serious: ${seriousConsole[0].slice(0, 120)}`,
  });

  checks.push({
    name: 'no-error-text-on-page',
    ok: !pageData.error_text_visible,
    detail: pageData.error_text_visible
      ? `visible error text: "${pageData.error_text_sample}"`
      : 'no error text visible',
  });

  checks.push({
    name: 'no-broken-images',
    ok: pageData.broken_images === 0,
    detail:
      pageData.broken_images === 0
        ? `${pageData.total_images} images loaded`
        : `${pageData.broken_images}/${pageData.total_images} images failed to load`,
  });

  return checks;
}

// ─── Per-issue rules ────────────────────────────────────────────────────
//
// Map of rule-name -> async (page, pageData) => { ok, detail }.
// Add new rules here; reference them by name from known-issues.json.

const RULES = {
  // At least one avatar/profile image must be present AND actually loaded.
  // (Targets the "no picture in profile section" issue.)
  async avatarImageLoaded(page) {
    const result = await page.evaluate(() => {
      const candidates = Array.from(
        document.querySelectorAll(
          'img[alt*="avatar" i], img[alt*="profile" i], .MuiAvatar-root img, [class*="avatar" i] img, [data-testid*="avatar" i] img',
        ),
      );
      if (candidates.length === 0) {
        return { ok: false, detail: 'no avatar element found' };
      }
      const loaded = candidates.filter(
        (img) => img.naturalWidth > 0 && img.naturalHeight > 0,
      );
      return {
        ok: loaded.length > 0,
        detail: `${loaded.length}/${candidates.length} avatar images loaded`,
      };
    });
    return result;
  },

  // No visible error-style alert on the page.
  // (Targets settings-account "Cannot be edited. Error message".)
  async noErrorAlertVisible(page) {
    const result = await page.evaluate(() => {
      const selectors = [
        '[role="alert"]',
        '.MuiAlert-standardError',
        '.MuiAlert-filledError',
        '[class*="error" i]:not(input):not(label)',
      ];
      const text = [];
      for (const sel of selectors) {
        for (const el of document.querySelectorAll(sel)) {
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) continue;
          const style = window.getComputedStyle(el);
          if (style.display === 'none' || style.visibility === 'hidden') continue;
          const t = (el.innerText || '').trim();
          if (t && t.length < 300) text.push(t);
        }
      }
      return {
        ok: text.length === 0,
        detail:
          text.length === 0
            ? 'no error alerts visible'
            : `error visible: "${text[0]}"`,
      };
    });
    return result;
  },

  // Form fields on the page are not all disabled/readonly.
  // (Targets "Cannot edit the information. Cannot save.")
  async formFieldsEditable(page) {
    const result = await page.evaluate(() => {
      const inputs = Array.from(
        document.querySelectorAll('form input, form textarea, form select'),
      ).filter((el) => el.type !== 'hidden' && el.type !== 'submit');
      if (inputs.length === 0) {
        return { ok: false, detail: 'no form inputs found' };
      }
      const editable = inputs.filter((el) => !el.disabled && !el.readOnly);
      return {
        ok: editable.length > 0,
        detail: `${editable.length}/${inputs.length} inputs editable`,
      };
    });
    return result;
  },

  // No `<img>` elements display zero by zero — covers "missing images
  // across galleries / thumbnails" on /browse/task.
  async imagesActuallyLoaded(page) {
    const result = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('img'));
      if (imgs.length === 0) {
        return { ok: false, detail: 'no <img> elements on page' };
      }
      const failed = imgs.filter((img) => {
        if (!img.src || img.src === window.location.href) return true;
        if (img.naturalWidth === 0 && img.complete) return true;
        return false;
      });
      return {
        ok: failed.length === 0,
        detail:
          failed.length === 0
            ? `all ${imgs.length} images loaded`
            : `${failed.length}/${imgs.length} images failed`,
      };
    });
    return result;
  },

  // Page must not contain the literal text "undefined" rendered into the UI.
  async noUndefinedOnPage(page) {
    const result = await page.evaluate(() => {
      const text = (document.body.innerText || '').toLowerCase();
      const hits = (text.match(/undefined/g) || []).length;
      return {
        ok: hits === 0,
        detail:
          hits === 0
            ? 'no "undefined" text on page'
            : `"undefined" appears ${hits} time(s)`,
      };
    });
    return result;
  },

  // No horizontal overflow at our viewport — catches "design distorted".
  async noHorizontalOverflow(page) {
    const result = await page.evaluate(() => {
      const overflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
      return {
        ok: overflow <= 4,
        detail:
          overflow <= 4
            ? 'no horizontal overflow'
            : `${overflow}px horizontal overflow`,
      };
    });
    return result;
  },

  // A visible search input/textbox is present.
  async searchInputPresent(page) {
    const result = await page.evaluate(() => {
      const inputs = Array.from(
        document.querySelectorAll(
          'input[type="search"], input[placeholder*="search" i], input[aria-label*="search" i], [role="searchbox"]',
        ),
      ).filter((el) => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
      return {
        ok: inputs.length > 0,
        detail: inputs.length > 0 ? 'search input present' : 'no search input found',
      };
    });
    return result;
  },

  // Dashboard has at least one enabled button or link that looks
  // actionable (covers "all links and buttons are inactive").
  async dashboardHasActionableButtons(page) {
    const result = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, a[href]'));
      const enabled = buttons.filter((el) => {
        if (el.disabled) return false;
        if (el.getAttribute('aria-disabled') === 'true') return false;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return false;
        const style = window.getComputedStyle(el);
        if (style.pointerEvents === 'none') return false;
        return true;
      });
      return {
        ok: enabled.length > 0,
        detail: `${enabled.length}/${buttons.length} buttons/links actionable`,
      };
    });
    return result;
  },
};

// ─── Page loader ────────────────────────────────────────────────────────

async function loadPage(context, path) {
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => pageErrors.push(err.message));

  const url = CONFIG.BASE_URL + path;
  let response = null;
  let error = null;

  try {
    response = await page.goto(url, {
      waitUntil: CONFIG.NAV_WAIT,
      timeout: CONFIG.PAGE_TIMEOUT,
    });
    // Give SPA time to settle. The existing verify-browser.js uses 800ms;
    // these pages often pull data so wait a bit longer.
    await page.waitForTimeout(1500);
  } catch (err) {
    error = err.message.split('\n')[0];
  }

  const pageData = {
    requested_path: path,
    final_url: page.url(),
    final_path: (() => {
      try { return new URL(page.url()).pathname; } catch { return null; }
    })(),
    http_status: response ? response.status() : 0,
    nav_error: error,
    console_errors: consoleErrors,
    page_errors: pageErrors,
    error_text_visible: false,
    error_text_sample: null,
    broken_images: 0,
    total_images: 0,
  };

  // Probe for error-style text. Patterns are intentionally narrow to
  // avoid matching normal product copy (e.g. "Error 404" templates,
  // user-facing forms with a help link to "report an error" etc.).
  if (!error) {
    const errProbe = await page.evaluate(() => {
      const patterns = [
        /unable to load/i,
        /something went wrong/i,
        /please try again later/i,
        /failed to fetch/i,
        /network error/i,
      ];
      const text = document.body.innerText || '';
      for (const p of patterns) {
        const m = text.match(p);
        if (m) {
          const idx = m.index;
          const slice = text.slice(Math.max(0, idx - 20), Math.min(text.length, idx + 120));
          return { visible: true, sample: slice.trim() };
        }
      }
      return { visible: false, sample: null };
    }).catch(() => ({ visible: false, sample: null }));
    pageData.error_text_visible = errProbe.visible;
    pageData.error_text_sample = errProbe.sample;

    const imgStats = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('img'));
      let broken = 0;
      for (const img of imgs) {
        if (!img.src) { broken++; continue; }
        if (img.complete && img.naturalWidth === 0) { broken++; continue; }
      }
      return { total: imgs.length, broken };
    }).catch(() => ({ total: 0, broken: 0 }));
    pageData.total_images = imgStats.total;
    pageData.broken_images = imgStats.broken;
  }

  return { page, pageData };
}

// ─── Per-issue evaluation ───────────────────────────────────────────────

async function evaluateIssue(context, issue, isAuthenticated) {
  // Treat any value other than "resolved" or "wontfix" as "active" so legacy
  // entries without a status field still run.
  const status =
    issue.status === 'resolved' || issue.status === 'wontfix'
      ? issue.status
      : 'active';

  // Wontfix issues are accepted as-is. Don't even load the page — return a
  // skipped verdict so the dashboard can quietly account for them without
  // burning a Playwright tab on a page nobody plans to fix.
  if (status === 'wontfix') {
    return {
      id: issue.id,
      path: issue.path,
      area: issue.area,
      description: issue.description,
      rule: issue.rule,
      issue_status: status,
      source: issue.source || null,
      verdict: 'skipped',
      reason: 'wontfix',
      generic_checks: [],
      rule_check: null,
      page_data: null,
    };
  }

  if (issue.auth && !isAuthenticated) {
    return {
      id: issue.id,
      path: issue.path,
      area: issue.area,
      description: issue.description,
      rule: issue.rule,
      issue_status: status,
      source: issue.source || null,
      verdict: 'skipped',
      reason: 'auth required but no auth state available',
      generic_checks: [],
      rule_check: null,
      page_data: null,
    };
  }

  const { page, pageData } = await loadPage(context, issue.path);

  const generic = genericChecks(pageData);

  let ruleCheck = null;
  if (issue.rule) {
    if (typeof RULES[issue.rule] !== 'function') {
      ruleCheck = {
        name: issue.rule,
        ok: false,
        detail: `rule "${issue.rule}" not defined in RULES`,
      };
    } else if (pageData.nav_error) {
      ruleCheck = {
        name: issue.rule,
        ok: false,
        detail: `skipped (nav failed: ${pageData.nav_error})`,
      };
    } else {
      try {
        const r = await RULES[issue.rule](page, pageData);
        ruleCheck = { name: issue.rule, ok: r.ok, detail: r.detail };
      } catch (err) {
        ruleCheck = {
          name: issue.rule,
          ok: false,
          detail: `rule threw: ${err.message.split('\n')[0]}`,
        };
      }
    }
  }

  // Verdict logic:
  //   PASS    — the issue appears fixed: generic checks pass AND (no rule, or
  //             rule passes). For UX-only issues (rule=null) this just means
  //             "no observable breakage" which is the best automation can say.
  //   FAIL    — the issue still reproduces: a generic check failed OR the
  //             rule failed.
  //   UNKNOWN — page couldn't load at all.
  let verdict;
  if (pageData.nav_error) {
    verdict = 'unknown';
  } else {
    const allGenericOk = generic.every((c) => c.ok);
    const ruleOk = ruleCheck ? ruleCheck.ok : true;
    verdict = allGenericOk && ruleOk ? 'pass' : 'fail';
  }

  if (verdict === 'fail' || verdict === 'unknown') {
    const screenshotPath = path.join(SCREENSHOTS_DIR, `${issue.id}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false }).catch(() => {});
  }

  await page.close();

  return {
    id: issue.id,
    path: issue.path,
    area: issue.area,
    description: issue.description,
    rule: issue.rule,
    issue_status: status,
    verdict,
    generic_checks: generic,
    rule_check: ruleCheck,
    page_data: {
      final_path: pageData.final_path,
      http_status: pageData.http_status,
      total_images: pageData.total_images,
      broken_images: pageData.broken_images,
      console_error_count: pageData.console_errors.length,
      page_error_count: pageData.page_errors.length,
      nav_error: pageData.nav_error,
    },
  };
}

// ─── Diff vs previous run ───────────────────────────────────────────────

function diffAgainstPrevious(current, previous) {
  if (!previous) return { newly_fixed: [], newly_broken: [], unchanged: current.results.map((r) => r.id) };

  const prevById = new Map(previous.results.map((r) => [r.id, r.verdict]));
  const newlyFixed = [];
  const newlyBroken = [];
  const unchanged = [];

  for (const r of current.results) {
    const prev = prevById.get(r.id);
    if (prev === undefined) {
      // brand-new issue in the list — count as "new"
      newlyBroken.push({ id: r.id, was: 'new', now: r.verdict });
      continue;
    }
    if (prev === r.verdict) {
      unchanged.push(r.id);
      continue;
    }
    if (prev === 'fail' && r.verdict === 'pass') {
      newlyFixed.push({ id: r.id, was: prev, now: r.verdict });
    } else if (prev === 'pass' && r.verdict === 'fail') {
      newlyBroken.push({ id: r.id, was: prev, now: r.verdict });
    } else {
      // any transition involving unknown/skipped — list as changed but not in either bucket
      unchanged.push(r.id);
    }
  }

  return { newly_fixed: newlyFixed, newly_broken: newlyBroken, unchanged };
}

// ─── Markdown report ────────────────────────────────────────────────────

function buildReport(current, diff, isAuthenticated) {
  const byArea = new Map();
  for (const r of current.results) {
    if (!byArea.has(r.area)) byArea.set(r.area, []);
    byArea.get(r.area).push(r);
  }

  const counts = current.results.reduce(
    (acc, r) => {
      acc[r.verdict] = (acc[r.verdict] || 0) + 1;
      return acc;
    },
    {},
  );

  const lines = [];
  lines.push(`# Known-Issue Verification`);
  lines.push('');
  lines.push(`- Base URL: ${current.base_url}`);
  lines.push(`- Checked at: ${current.checked_at}`);
  lines.push(`- Authenticated session: ${isAuthenticated ? 'yes' : 'no'}`);
  lines.push(
    `- Verdicts: ${counts.pass || 0} pass · ${counts.fail || 0} fail · ${counts.skipped || 0} skipped · ${counts.unknown || 0} unknown`,
  );
  lines.push('');

  if (diff.newly_fixed.length > 0) {
    lines.push(`## ✅ Newly fixed (${diff.newly_fixed.length})`);
    lines.push('');
    for (const { id } of diff.newly_fixed) {
      const r = current.results.find((x) => x.id === id);
      lines.push(`- **${id}** — \`${r.path}\` — _${r.description}_`);
    }
    lines.push('');
  }

  if (diff.newly_broken.length > 0) {
    lines.push(`## ⚠️ Newly broken / new failures (${diff.newly_broken.length})`);
    lines.push('');
    for (const { id, was } of diff.newly_broken) {
      const r = current.results.find((x) => x.id === id);
      lines.push(`- **${id}** (was: ${was}) — \`${r.path}\` — _${r.description}_`);
    }
    lines.push('');
  }

  for (const [area, results] of byArea) {
    lines.push(`## ${area}`);
    lines.push('');
    for (const r of results) {
      const icon =
        r.verdict === 'pass' ? '✅'
        : r.verdict === 'fail' ? '❌'
        : r.verdict === 'skipped' ? '⏭️'
        : '❓';
      lines.push(`### ${icon} ${r.id}`);
      lines.push('');
      lines.push(`- Path: \`${r.path}\``);
      lines.push(`- Issue: ${r.description}`);
      if (r.rule) lines.push(`- Targeted rule: \`${r.rule}\``);
      if (r.verdict === 'skipped') {
        lines.push(`- _Skipped: ${r.reason || ''}_`);
        lines.push('');
        continue;
      }
      lines.push(`- HTTP: ${r.page_data?.http_status ?? 'n/a'} → final \`${r.page_data?.final_path ?? '?'}\``);
      if (r.page_data?.nav_error) {
        lines.push(`- Navigation error: ${r.page_data.nav_error}`);
      }
      const failed = r.generic_checks.filter((c) => !c.ok);
      if (failed.length > 0) {
        lines.push(`- Generic failures:`);
        for (const c of failed) lines.push(`  - **${c.name}**: ${c.detail}`);
      }
      if (r.rule_check && !r.rule_check.ok) {
        lines.push(`- Rule failed: **${r.rule_check.name}** — ${r.rule_check.detail}`);
      } else if (r.rule_check && r.rule_check.ok) {
        lines.push(`- Rule passed: **${r.rule_check.name}** — ${r.rule_check.detail}`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

// ─── Concurrency helper ─────────────────────────────────────────────────

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

// ─── Entry point ────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🩺 Known-issue verification → ${CONFIG.BASE_URL}\n`);

  if (!fs.existsSync(KNOWN_ISSUES_PATH)) {
    console.error(`No known-issues.json at ${KNOWN_ISSUES_PATH}`);
    process.exit(1);
  }
  const { issues } = JSON.parse(fs.readFileSync(KNOWN_ISSUES_PATH, 'utf8'));
  console.log(`Loaded ${issues.length} known issues.`);

  const hasAuthState = fs.existsSync(AUTH_STATE_PATH);
  if (!hasAuthState) {
    const authedCount = issues.filter((i) => i.auth).length;
    console.log(
      `⚠️  No auth-state.json found — ${authedCount} authed issues will be skipped.`,
    );
    console.log(`   Run \`npm run verify:browser\` first to produce one.`);
  } else {
    console.log(`Using auth state: ${AUTH_STATE_PATH}`);
  }
  console.log('');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: hasAuthState ? AUTH_STATE_PATH : undefined,
    viewport: { width: 1280, height: 800 },
  });

  let completed = 0;
  const results = await runWithConcurrency(
    issues,
    async (issue) => {
      const r = await evaluateIssue(context, issue, hasAuthState);
      completed++;
      const icon =
        r.verdict === 'pass' ? '✓'
        : r.verdict === 'fail' ? '✗'
        : r.verdict === 'skipped' ? '⏭'
        : '?';
      process.stdout.write(
        `\r  [${completed}/${issues.length}] ${icon} ${issue.id.slice(0, 40).padEnd(40)}`,
      );
      return r;
    },
    CONFIG.BROWSER_CONCURRENCY,
  );
  console.log('\n');

  await context.close();
  await browser.close();

  const current = {
    base_url: CONFIG.BASE_URL,
    checked_at: new Date().toISOString(),
    total_issues: issues.length,
    authenticated: hasAuthState,
    results,
  };

  const previous = loadJson('issue-results.json');
  const diff = diffAgainstPrevious(current, previous);
  current.diff_vs_previous = {
    newly_fixed: diff.newly_fixed.map((d) => d.id),
    newly_broken: diff.newly_broken.map((d) => d.id),
  };

  const jsonPath = saveJson('issue-results.json', current);
  const reportPath = path.join(CONFIG.OUT_DIR, 'issues-report.md');
  fs.writeFileSync(reportPath, buildReport(current, diff, hasAuthState));

  // Summary
  const counts = results.reduce((acc, r) => {
    acc[r.verdict] = (acc[r.verdict] || 0) + 1;
    return acc;
  }, {});
  console.log(`✅ Pass:    ${counts.pass || 0}`);
  console.log(`❌ Fail:    ${counts.fail || 0}`);
  console.log(`⏭  Skipped: ${counts.skipped || 0}`);
  console.log(`❓ Unknown: ${counts.unknown || 0}`);
  if (diff.newly_fixed.length > 0) {
    console.log(`\n🎉 Newly fixed since last run: ${diff.newly_fixed.map((d) => d.id).join(', ')}`);
  }
  if (diff.newly_broken.length > 0) {
    console.log(`\n⚠️  Newly broken since last run: ${diff.newly_broken.map((d) => d.id).join(', ')}`);
  }
  console.log(`\n💾 Saved → ${jsonPath}`);
  console.log(`📝 Report → ${reportPath}`);
  console.log(`📸 Screenshots → ${SCREENSHOTS_DIR}\n`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
