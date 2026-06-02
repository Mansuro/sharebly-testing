// verify-scenarios.js
// Executes ordered Playwright "scenarios" defined in scenarios.json. Each
// scenario is a sequence of typed steps (goto / click / fill / expect_*).
// Steps run sequentially; the first failure stops the scenario and produces
// a screenshot. The runner records per-step timings and writes a JSON report
// plus a grouped markdown summary, mirroring verify-issues.js.
//
// Usage:
//   npm run verify:scenarios
//
// Reads:
//   verify/scenarios.json
//   verify/output/auth-state.json     (optional — produced by verify-browser.js)
//   verify/output/scenario-results.json (optional — previous run, for diffing)
//
// Writes:
//   verify/output/scenario-results.json
//   verify/output/scenarios-report.md
//   verify/output/scenario-screenshots/<scenario-id>-<step-index>.png

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { CONFIG, saveJson, loadJson } from './config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SCENARIOS_PATH = path.join(__dirname, 'scenarios.json');
const AUTH_STATE_PATH = path.join(CONFIG.OUT_DIR, 'auth-state.json');
const SCREENSHOTS_DIR = path.join(CONFIG.OUT_DIR, 'scenario-screenshots');
if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

// ─── Step execution ─────────────────────────────────────────────────────
//
// Each handler takes (page, params) and returns a Promise that resolves
// when the step succeeds, or rejects with an Error when it fails. Timeouts
// are honored per-step where appropriate; otherwise the runner falls back
// to CONFIG.PAGE_TIMEOUT.

function substituteValue(value) {
  if (typeof value !== 'string') return value;
  if (value === '$EMAIL') return CONFIG.TEST_EMAIL;
  if (value === '$PASSWORD') return CONFIG.TEST_PASSWORD;
  return value;
}

const STEP_HANDLERS = {
  async goto(page, params) {
    if (!params.path) throw new Error('goto: missing "path"');
    await page.goto(CONFIG.BASE_URL + params.path, {
      waitUntil: CONFIG.NAV_WAIT,
      timeout: params.timeout_ms || CONFIG.PAGE_TIMEOUT,
    });
  },

  async click(page, params) {
    const timeout = params.timeout_ms || 5000;
    let locator;
    if (params.selector) {
      locator = page.locator(params.selector).first();
    } else if (params.text) {
      locator = page.getByText(params.text, { exact: false }).first();
    } else {
      throw new Error('click: missing "selector" or "text"');
    }
    await locator.waitFor({ state: 'visible', timeout });
    await locator.click({ timeout });
  },

  async fill(page, params) {
    if (!params.selector) throw new Error('fill: missing "selector"');
    if (params.value === undefined) throw new Error('fill: missing "value"');
    const timeout = params.timeout_ms || 5000;
    const locator = page.locator(params.selector).first();
    await locator.waitFor({ state: 'visible', timeout });
    await locator.fill(substituteValue(params.value));
  },

  async expect_text(page, params) {
    if (!params.text) throw new Error('expect_text: missing "text"');
    const timeout = params.timeout_ms || 5000;
    await page.getByText(params.text, { exact: false }).first()
      .waitFor({ state: 'visible', timeout });
  },

  async expect_url(page, params) {
    if (!params.contains) throw new Error('expect_url: missing "contains"');
    const url = page.url();
    if (!url.includes(params.contains)) {
      throw new Error(`url "${url}" does not contain "${params.contains}"`);
    }
  },

  async expect_visible(page, params) {
    if (!params.selector) throw new Error('expect_visible: missing "selector"');
    const timeout = params.timeout_ms || 5000;
    await page.locator(params.selector).first()
      .waitFor({ state: 'visible', timeout });
  },

  async wait(page, params) {
    const ms = Number(params.ms);
    if (!Number.isFinite(ms) || ms < 0) throw new Error('wait: "ms" must be a non-negative number');
    await page.waitForTimeout(ms);
  },
};

// Strip the `kind` key from a step so the recorded params don't duplicate it.
function paramsOf(step) {
  const { kind, ...rest } = step;
  return rest;
}

async function runStep(page, step) {
  const handler = STEP_HANDLERS[step.kind];
  const params = paramsOf(step);
  const start = Date.now();
  if (!handler) {
    return {
      kind: step.kind,
      params,
      ok: false,
      duration_ms: 0,
      error: `unknown step kind "${step.kind}"`,
    };
  }
  try {
    await handler(page, params);
    return { kind: step.kind, params, ok: true, duration_ms: Date.now() - start, error: null };
  } catch (err) {
    return {
      kind: step.kind,
      params,
      ok: false,
      duration_ms: Date.now() - start,
      error: (err.message || String(err)).split('\n')[0],
    };
  }
}

// ─── Scenario execution ─────────────────────────────────────────────────

async function runScenario(context, scenario, isAuthenticated) {
  if (scenario.auth && !isAuthenticated) {
    return {
      id: scenario.id,
      name: scenario.name,
      area: scenario.area,
      description: scenario.description,
      verdict: 'skipped',
      reason: 'auth required but no auth state available',
      step_results: scenario.steps.map((step) => ({
        kind: step.kind,
        params: paramsOf(step),
        ok: null,
        duration_ms: 0,
        error: null,
      })),
    };
  }

  let page;
  try {
    page = await context.newPage();
  } catch (err) {
    return {
      id: scenario.id,
      name: scenario.name,
      area: scenario.area,
      description: scenario.description,
      verdict: 'unknown',
      reason: `failed to open page: ${(err.message || String(err)).split('\n')[0]}`,
      step_results: scenario.steps.map((step) => ({
        kind: step.kind,
        params: paramsOf(step),
        ok: null,
        duration_ms: 0,
        error: null,
      })),
    };
  }

  const stepResults = [];
  let failedIndex = -1;

  for (let i = 0; i < scenario.steps.length; i++) {
    const step = scenario.steps[i];
    if (failedIndex !== -1) {
      // Subsequent steps after a failure are recorded but not executed.
      stepResults.push({
        kind: step.kind,
        params: paramsOf(step),
        ok: null,
        duration_ms: 0,
        error: null,
      });
      continue;
    }
    const result = await runStep(page, step);
    if (!result.ok) {
      failedIndex = i;
      const screenshotName = `${scenario.id}-${i}.png`;
      const screenshotPath = path.join(SCREENSHOTS_DIR, screenshotName);
      await page.screenshot({ path: screenshotPath, fullPage: false }).catch(() => {});
      result.screenshot = screenshotName;
    }
    stepResults.push(result);
  }

  await page.close().catch(() => {});

  const verdict = failedIndex === -1 ? 'pass' : 'fail';
  return {
    id: scenario.id,
    name: scenario.name,
    area: scenario.area,
    description: scenario.description,
    verdict,
    step_results: stepResults,
  };
}

// ─── Diff vs previous run ───────────────────────────────────────────────

function diffAgainstPrevious(current, previous) {
  if (!previous) {
    return { newly_passing: [], newly_failing: [] };
  }
  const prevById = new Map(previous.results.map((r) => [r.id, r.verdict]));
  const newlyPassing = [];
  const newlyFailing = [];
  for (const r of current.results) {
    const prev = prevById.get(r.id);
    if (prev === undefined) continue;
    if (prev === r.verdict) continue;
    if (prev === 'fail' && r.verdict === 'pass') newlyPassing.push(r.id);
    else if (prev === 'pass' && r.verdict === 'fail') newlyFailing.push(r.id);
  }
  return { newly_passing: newlyPassing, newly_failing: newlyFailing };
}

// ─── Markdown report ────────────────────────────────────────────────────

function buildReport(current, diff, isAuthenticated) {
  const byArea = new Map();
  for (const r of current.results) {
    if (!byArea.has(r.area)) byArea.set(r.area, []);
    byArea.get(r.area).push(r);
  }

  const counts = current.results.reduce((acc, r) => {
    acc[r.verdict] = (acc[r.verdict] || 0) + 1;
    return acc;
  }, {});

  const lines = [];
  lines.push(`# Workflow Scenario Verification`);
  lines.push('');
  lines.push(`- Base URL: ${current.base_url}`);
  lines.push(`- Checked at: ${current.checked_at}`);
  lines.push(`- Authenticated session: ${isAuthenticated ? 'yes' : 'no'}`);
  lines.push(
    `- Verdicts: ${counts.pass || 0} pass · ${counts.fail || 0} fail · ${counts.skipped || 0} skipped · ${counts.unknown || 0} unknown`,
  );
  lines.push('');

  if (diff.newly_passing.length > 0) {
    lines.push(`## ✅ Newly passing (${diff.newly_passing.length})`);
    lines.push('');
    for (const id of diff.newly_passing) {
      const r = current.results.find((x) => x.id === id);
      lines.push(`- **${id}** — _${r.description}_`);
    }
    lines.push('');
  }

  if (diff.newly_failing.length > 0) {
    lines.push(`## ⚠️ Newly failing (${diff.newly_failing.length})`);
    lines.push('');
    for (const id of diff.newly_failing) {
      const r = current.results.find((x) => x.id === id);
      lines.push(`- **${id}** — _${r.description}_`);
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
      lines.push(`### ${icon} ${r.id} — ${r.name}`);
      lines.push('');
      lines.push(`- ${r.description}`);
      if (r.reason) lines.push(`- _${r.reason}_`);
      const total = r.step_results.length;
      const passed = r.step_results.filter((s) => s.ok === true).length;
      const failed = r.step_results.find((s) => s.ok === false);
      const totalMs = r.step_results.reduce((acc, s) => acc + (s.duration_ms || 0), 0);
      lines.push(`- Steps: ${passed}/${total} passed · ${totalMs}ms`);
      if (failed) {
        const idx = r.step_results.indexOf(failed);
        lines.push(`- Failed step #${idx + 1} (\`${failed.kind}\`): ${failed.error}`);
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
  console.log(`\n🎬 Scenario verification → ${CONFIG.BASE_URL}\n`);

  if (!fs.existsSync(SCENARIOS_PATH)) {
    console.error(`No scenarios.json at ${SCENARIOS_PATH}`);
    process.exit(1);
  }
  const { scenarios } = JSON.parse(fs.readFileSync(SCENARIOS_PATH, 'utf8'));
  console.log(`Loaded ${scenarios.length} scenarios.`);

  const hasAuthState = fs.existsSync(AUTH_STATE_PATH);
  if (!hasAuthState) {
    const authedCount = scenarios.filter((s) => s.auth).length;
    console.log(
      `⚠️  No auth-state.json found — ${authedCount} authed scenarios will be skipped.`,
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
    scenarios,
    async (scenario) => {
      const r = await runScenario(context, scenario, hasAuthState);
      completed++;
      const icon =
        r.verdict === 'pass' ? '✓'
        : r.verdict === 'fail' ? '✗'
        : r.verdict === 'skipped' ? '⏭'
        : '?';
      process.stdout.write(
        `\r  [${completed}/${scenarios.length}] ${icon} ${r.id.slice(0, 40).padEnd(40)}`,
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
    authenticated: hasAuthState,
    total_scenarios: scenarios.length,
    results,
  };

  const previous = loadJson('scenario-results.json');
  const diff = diffAgainstPrevious(current, previous);
  current.diff_vs_previous = diff;

  const jsonPath = saveJson('scenario-results.json', current);
  const reportPath = path.join(CONFIG.OUT_DIR, 'scenarios-report.md');
  fs.writeFileSync(reportPath, buildReport(current, diff, hasAuthState));

  const counts = results.reduce((acc, r) => {
    acc[r.verdict] = (acc[r.verdict] || 0) + 1;
    return acc;
  }, {});
  console.log(`✅ Pass:    ${counts.pass || 0}`);
  console.log(`❌ Fail:    ${counts.fail || 0}`);
  console.log(`⏭  Skipped: ${counts.skipped || 0}`);
  console.log(`❓ Unknown: ${counts.unknown || 0}`);
  if (diff.newly_passing.length > 0) {
    console.log(`\n🎉 Newly passing since last run: ${diff.newly_passing.join(', ')}`);
  }
  if (diff.newly_failing.length > 0) {
    console.log(`\n⚠️  Newly failing since last run: ${diff.newly_failing.join(', ')}`);
  }
  console.log(`\n💾 Saved → ${jsonPath}`);
  console.log(`📝 Report → ${reportPath}`);
  console.log(`📸 Screenshots → ${SCREENSHOTS_DIR}\n`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
