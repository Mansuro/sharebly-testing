// crawl.js - Discover the app's real routes by walking <a href> links.
//
// Logs in (reuses auth-state.json from verify-browser.js), seeds from
// known-passing routes, BFS-walks the link graph up to MAX_DEPTH, and
// emits:
//   output/discovered-paths.json   — every unique route shape found
//   output/match-suggestions.json  — best-guess matches against inferred
//                                    routes that came back not-found.
//
// Run after a successful verify:browser run (so we have auth state and
// the routes.status.json of known-passing routes to seed from).

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { CONFIG, loadRoutes, loadJson, saveJson } from './config.js';

const MAX_DEPTH = 3;
const MAX_PAGES = 80;
const AUTH_STATE = path.join(CONFIG.OUT_DIR, 'auth-state.json');

// Normalize an href into an internal path+query string, or null if external.
function normalizePath(href, baseOrigin) {
  try {
    const u = new URL(href, baseOrigin + '/');
    if (u.origin !== baseOrigin) return null;
    if (!['http:', 'https:'].includes(u.protocol)) return null;
    return u.pathname + u.search;
  } catch {
    return null;
  }
}

// Collapse instance-specific IDs into placeholders so we count route shapes,
// not individual URLs. Handles UUIDs, numeric ids, and the ~uuid query form.
function normalizeShape(p) {
  const uuid = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
  return p
    .replace(new RegExp(uuid, 'gi'), '<uuid>')
    .replace(/\/\d+(?=\/|$|\?)/g, '/<id>')
    .replace(/~<uuid>/g, '~<uuid>'); // keep ~uuid form readable
}

function tokenize(s) {
  return new Set(
    (s || '')
      .toLowerCase()
      .split(/[/_\-:\s,?&=~<>]+/)
      .filter((t) => t && !['the', 'of', 'a', 'my', 'page', 'browse'].includes(t)),
  );
}

async function main() {
  const baseOrigin = new URL(CONFIG.BASE_URL).origin;
  if (!fs.existsSync(AUTH_STATE)) {
    console.error(`No auth state at ${AUTH_STATE}. Run npm run verify:browser first.`);
    process.exit(1);
  }

  const status = loadJson('routes.status.json');
  const seeds = new Set(['/']);
  if (status) {
    for (const v of status.verdicts) {
      if (v.verdict === 'pass') seeds.add(v.tested_path || v.path);
    }
  }
  console.log(`Seeds: ${seeds.size} URLs (passing routes + /)`);

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    storageState: AUTH_STATE,
    viewport: { width: 1280, height: 800 },
  });

  const queue = [...seeds].map((p) => ({ p, depth: 0 }));
  const visitedShapes = new Set();
  // shape → { count, examples: Set, found_on: Set }
  const discovered = new Map();

  while (queue.length > 0 && visitedShapes.size < MAX_PAGES) {
    const { p, depth } = queue.shift();
    const shape = normalizeShape(p);
    if (visitedShapes.has(shape)) continue;
    visitedShapes.add(shape);

    const page = await ctx.newPage();
    try {
      await page.goto(baseOrigin + p, {
        waitUntil: 'domcontentloaded',
        timeout: 20_000,
      });
      await page.waitForTimeout(800);

      const hrefs = await page
        .$$eval('a[href]', (as) => as.map((a) => a.getAttribute('href')))
        .catch(() => []);

      for (const href of hrefs) {
        const norm = normalizePath(href, baseOrigin);
        if (!norm) continue;
        const s = normalizeShape(norm);
        if (!discovered.has(s)) {
          discovered.set(s, { count: 0, examples: new Set(), found_on: new Set() });
        }
        const d = discovered.get(s);
        d.count++;
        if (d.examples.size < 3) d.examples.add(norm);
        d.found_on.add(p);

        if (depth < MAX_DEPTH && !visitedShapes.has(s)) {
          if (!queue.some((q) => normalizeShape(q.p) === s)) {
            queue.push({ p: norm, depth: depth + 1 });
          }
        }
      }
      process.stdout.write(
        `\r  [${visitedShapes.size}/${MAX_PAGES}] depth ${depth} ${p.slice(0, 60).padEnd(60)}`,
      );
    } catch (e) {
      // skip page
    } finally {
      await page.close();
    }
  }
  console.log('\n');

  const result = [...discovered.entries()]
    .map(([shape, d]) => ({
      shape,
      count: d.count,
      examples: [...d.examples],
      found_on: [...d.found_on].slice(0, 3),
    }))
    .sort((a, b) => b.count - a.count);

  saveJson('discovered-paths.json', {
    generated_at: new Date().toISOString(),
    pages_crawled: visitedShapes.size,
    unique_shapes: result.length,
    discovered: result,
  });

  // Suggest matches for not-found routes
  const routes = loadRoutes();
  const routesById = Object.fromEntries(routes.map((r) => [r.id, r]));
  const failing = status
    ? status.verdicts.filter((v) => v.verdict === 'not-found')
    : [];

  const suggestions = failing
    .map((v) => {
      const r = routesById[v.id];
      if (!r) return null;
      const want = new Set([
        ...tokenize(r.id),
        ...tokenize(r.path),
        ...tokenize(r.component),
      ]);
      const scored = result
        .map((d) => {
          const got = tokenize(d.shape);
          let overlap = 0;
          for (const t of want) if (got.has(t)) overlap++;
          return { shape: d.shape, overlap, examples: d.examples };
        })
        .filter((s) => s.overlap > 0)
        .sort((a, b) => b.overlap - a.overlap)
        .slice(0, 3);
      return {
        id: r.id,
        priority: r.priority,
        current_path: r.path,
        component: r.component,
        suggestions: scored,
      };
    })
    .filter(Boolean);

  saveJson('match-suggestions.json', {
    generated_at: new Date().toISOString(),
    suggestions,
  });

  await browser.close();

  // Console summary
  console.log(`✓ Crawled ${visitedShapes.size} pages, found ${result.length} unique route shapes\n`);
  console.log('Top route shapes discovered:');
  result.slice(0, 20).forEach((d) =>
    console.log(`  ${String(d.count).padStart(4)} × ${d.shape}`),
  );
  console.log('');
  console.log('Match suggestions for not-found routes (top-3 each):');
  for (const s of suggestions.filter((x) => x.suggestions.length > 0).slice(0, 30)) {
    console.log(`  ${s.priority} ${s.id.padEnd(35)} (${s.current_path})`);
    s.suggestions.forEach((sg) =>
      console.log(`     overlap=${sg.overlap}  ${sg.shape}`),
    );
  }
  console.log(`\n💾 → output/discovered-paths.json`);
  console.log(`💾 → output/match-suggestions.json\n`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
