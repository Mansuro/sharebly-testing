// report.js - Merge HTTP + browser results into a readable report
// Outputs both a markdown summary and an updated routes.status.json
// that you can feed back into routes.json.

import fs from 'fs';
import path from 'path';
import { CONFIG, loadRoutes, loadJson, saveJson } from './config.js';

function main() {
  const routes = loadRoutes();
  const http = loadJson('http-results.json');
  const browser = loadJson('browser-results.json');

  if (!http && !browser) {
    console.error('No results found. Run verify-http and/or verify-browser first.');
    process.exit(1);
  }

  // Group results by route_id
  const byRoute = {};
  for (const r of routes) {
    byRoute[r.id] = {
      ...r,
      http_checks: [],
      browser_checks: [],
    };
  }

  if (http) {
    for (const result of http.results) {
      if (byRoute[result.route_id]) {
        byRoute[result.route_id].http_checks.push(result);
      }
    }
  }
  if (browser) {
    for (const result of browser.results) {
      if (byRoute[result.route_id]) {
        byRoute[result.route_id].browser_checks.push(result);
      }
    }
  }

  // Determine final verdict per route
  const verdicts = [];
  for (const route of Object.values(byRoute)) {
    const primaryBrowser = route.browser_checks.find((c) => !c.is_variant);
    const variantBrowser = route.browser_checks.filter((c) => c.is_variant);

    let verdict = 'unknown';
    let confirmed_path = route.path;
    let suggested_path = null;
    const tested_path = primaryBrowser ? primaryBrowser.path : null;
    let notes = [];

    if (route.status === 'blocked') {
      verdict = 'blocked';
      notes.push('Route marked blocked in routes.json — known broken or defunct.');
    } else if (!primaryBrowser && route.path.includes(':')) {
      verdict = 'unverifiable';
      notes.push('Parameterized route — no sample_path provided in routes.json.');
    } else if (primaryBrowser) {
      if (primaryBrowser.ok && !primaryBrowser.not_found_detected) {
        verdict = 'pass';
      } else if (primaryBrowser.not_found_detected) {
        // Primary is 404 — check if a variant worked
        const workingVariant = variantBrowser.find(
          (c) => c.ok && !c.not_found_detected,
        );
        if (workingVariant) {
          verdict = 'variant-works';
          suggested_path = workingVariant.path;
          notes.push(`Primary path 404s. Variant works: ${workingVariant.path}`);
        } else {
          verdict = 'not-found';
          notes.push('Primary path 404s. No variant worked either.');
        }
      } else if (primaryBrowser.error) {
        verdict = 'error';
        notes.push(`Error: ${primaryBrowser.error}`);
      }

      if (primaryBrowser.redirected && verdict === 'pass') {
        notes.push(`Redirected to ${primaryBrowser.final_path}`);
        if (
          route.auth &&
          primaryBrowser.final_path.toLowerCase().includes('login')
        ) {
          verdict = 'auth-redirect';
          notes.push('Auth redirect (expected for protected route, but auth failed).');
        }
      }

      if (primaryBrowser.console_errors.length > 0) {
        notes.push(`${primaryBrowser.console_errors.length} console errors`);
      }
    }

    verdicts.push({
      id: route.id,
      path: route.path,
      component: route.component,
      module: route.module,
      auth: route.auth,
      priority: route.priority,
      inferred: route.inferred,
      verdict,
      confirmed_path,
      suggested_path,
      tested_path,
      notes,
    });
  }

  // Save status JSON
  const statusPath = saveJson('routes.status.json', {
    generated_at: new Date().toISOString(),
    base_url: CONFIG.BASE_URL,
    verdicts,
  });

  // Build markdown report
  const md = buildMarkdownReport(verdicts);
  const mdPath = path.join(CONFIG.OUT_DIR, 'report.md');
  fs.writeFileSync(mdPath, md);

  console.log(`\n📊 Report generated:`);
  console.log(`   ${mdPath}`);
  console.log(`   ${statusPath}\n`);

  // Quick console summary
  const counts = {};
  for (const v of verdicts) counts[v.verdict] = (counts[v.verdict] || 0) + 1;
  console.log('Verdict summary:');
  Object.entries(counts).forEach(([k, v]) => console.log(`  ${k.padEnd(20)} ${v}`));
}

function buildMarkdownReport(verdicts) {
  const counts = {};
  for (const v of verdicts) counts[v.verdict] = (counts[v.verdict] || 0) + 1;

  const lines = [];
  lines.push('# Sharebly Route Verification Report');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Base URL: ${CONFIG.BASE_URL}`);
  lines.push(`Total routes: ${verdicts.length}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push('| Verdict | Count |');
  lines.push('|---|---|');
  Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([k, v]) => lines.push(`| ${k} | ${v} |`));
  lines.push('');

  const groups = {
    pass: '✅ Working routes',
    'variant-works': '🔄 Working under a different path (fix routes.json)',
    'auth-redirect': '🔐 Auth-gated (login redirect — re-run with credentials)',
    'not-found': '❌ Not found (404)',
    blocked: '🚫 Blocked (known broken, kept for traceability)',
    unverifiable: '⏭️  Unverifiable (parameterized, no sample_path)',
    error: '💥 Errors',
    unknown: '❓ No browser check (HTTP only)',
  };

  for (const [verdict, title] of Object.entries(groups)) {
    const items = verdicts.filter((v) => v.verdict === verdict);
    if (items.length === 0) continue;
    lines.push(`## ${title} (${items.length})`);
    lines.push('');
    lines.push('| Route | Path | Component | Priority | Notes |');
    lines.push('|---|---|---|---|---|');
    for (const v of items) {
      let pathDisplay;
      if (v.suggested_path) {
        pathDisplay = `~~${v.path}~~ → \`${v.suggested_path}\``;
      } else if (v.tested_path && v.tested_path !== v.path) {
        pathDisplay = `\`${v.path}\` (tested: \`${v.tested_path}\`)`;
      } else {
        pathDisplay = `\`${v.path}\``;
      }
      const notes = v.notes.join('; ') || '';
      lines.push(
        `| ${v.id} | ${pathDisplay} | ${v.component} | ${v.priority} | ${notes} |`,
      );
    }
    lines.push('');
  }

  return lines.join('\n');
}

main();
