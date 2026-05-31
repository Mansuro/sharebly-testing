// extract-routes.js - Pull the canonical route list straight out of the
// app's production bundle and diff against routes.json.
//
// The bundle is referenced from index.html and contains every <Route> in
// transpiled form. We grep for path:"..." occurrences in bundle byte order,
// then reconstruct full URLs from React Router's nesting rules.
//
// Nesting rules used here:
//   - A path with leading "/"  → absolute top-level route.
//   - A path without leading "/" + only one segment → child of the most
//     recent top-level (current_layout). e.g. "dashboard" under "/profile".
//   - A path without leading "/" + multiple segments → if the first segment
//     matches a known top-level (e.g. "browse"), it's a React Router v6
//     relative declaration (just prepend "/"). Otherwise nested under the
//     current_layout.
//
// Output:
//   output/canonical-routes.json  — all real paths and their parents
//   output/routes.diff.md         — corrections, missing, orphans
//   output/routes.diff.json       — same data, machine-readable

import fs from 'fs';
import path from 'path';
import { CONFIG, loadRoutes, saveJson } from './config.js';

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.text();
}

async function getBundleUrl() {
  const html = await fetchText(CONFIG.BASE_URL + '/');
  const m = html.match(/src="(\/assets\/index-[^"]+\.js)"/);
  if (!m) throw new Error('Could not find bundle URL in index.html');
  return CONFIG.BASE_URL + m[1];
}

function extractPaths(bundleJs) {
  const re = /path:"([^"]+)"/g;
  const found = [];
  let m;
  while ((m = re.exec(bundleJs)) !== null) {
    found.push({ raw: m[1], offset: m.index });
  }
  return found;
}

function resolveNesting(paths) {
  const topLevel = new Set(paths.filter((p) => p.raw.startsWith('/')).map((p) => p.raw));
  // also remember the FIRST-segment of every top-level path
  // to detect v6 relative declarations like "browse/exchange/details"
  const topLevelFirstSegments = new Set(
    [...topLevel].map((p) => p.split('/').filter(Boolean)[0]).filter(Boolean),
  );

  let currentLayout = null;
  const resolved = [];

  for (const { raw, offset } of paths) {
    if (raw.startsWith('/')) {
      currentLayout = raw;
      resolved.push({ raw, full: raw, parent: null, offset });
      continue;
    }
    const segs = raw.split('/').filter(Boolean);
    let full;
    let parent;
    if (segs.length > 1 && topLevelFirstSegments.has(segs[0])) {
      full = '/' + raw;
      parent = '/' + segs[0];
    } else {
      const base = (currentLayout || '').replace(/\/$/, '');
      full = base + '/' + raw;
      parent = currentLayout;
    }
    resolved.push({ raw, full, parent, offset });
  }
  return resolved;
}

function normalizeForCompare(p) {
  // For matching purposes, strip trailing slash and lowercase.
  return p.replace(/\/+$/, '').toLowerCase();
}

function tokens(s) {
  return new Set(
    (s || '')
      .toLowerCase()
      .split(/[/_\-:\s,?&=~<>.]+/)
      .filter((t) => t && !['the', 'of', 'a', 'my', 'page'].includes(t)),
  );
}

function suggestCorrections(routesJson, canonical) {
  const canonicalNorm = new Map(); // norm path → resolved entry
  for (const r of canonical) canonicalNorm.set(normalizeForCompare(r.full), r);

  const canonicalPaths = [...canonicalNorm.keys()];

  const exactMatches = [];
  const correctionCandidates = [];
  const orphans = [];

  for (const r of routesJson) {
    const norm = normalizeForCompare(r.path);
    if (canonicalNorm.has(norm)) {
      exactMatches.push({ id: r.id, path: r.path });
      continue;
    }
    // Try to find a likely match by token overlap.
    const rTokens = new Set([
      ...tokens(r.id),
      ...tokens(r.path),
      ...tokens(r.component),
    ]);
    const scored = canonicalPaths
      .map((cp) => {
        const ct = tokens(cp);
        let overlap = 0;
        for (const t of rTokens) if (ct.has(t)) overlap++;
        return { canonical: cp, overlap, tokens_in_canonical: ct.size };
      })
      .filter((s) => s.overlap >= 2) // require >=2 shared tokens to suggest
      .sort((a, b) => b.overlap - a.overlap || a.tokens_in_canonical - b.tokens_in_canonical)
      .slice(0, 3);
    if (scored.length > 0) {
      correctionCandidates.push({
        id: r.id,
        priority: r.priority,
        component: r.component,
        current_path: r.path,
        suggestions: scored.map((s) => ({
          path: canonicalNorm.get(s.canonical).full,
          overlap: s.overlap,
        })),
      });
    } else {
      orphans.push({
        id: r.id,
        priority: r.priority,
        path: r.path,
        component: r.component,
      });
    }
  }

  // Canonical paths not represented in routes.json
  const inventoryNorms = new Set(routesJson.map((r) => normalizeForCompare(r.path)));
  const missing = canonical
    .filter((c) => !inventoryNorms.has(normalizeForCompare(c.full)))
    .map((c) => ({ path: c.full, parent: c.parent }));

  return { exactMatches, correctionCandidates, orphans, missing };
}

function buildMarkdown(diff, bundleUrl) {
  const lines = [];
  lines.push('# Routes diff — inventory vs. bundle');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Bundle: ${bundleUrl}`);
  lines.push('');
  lines.push(`- Exact matches:  ${diff.exactMatches.length}`);
  lines.push(`- Likely path corrections: ${diff.correctionCandidates.length}`);
  lines.push(`- Routes in inventory but not in bundle (orphans): ${diff.orphans.length}`);
  lines.push(`- Routes in bundle but not in inventory: ${diff.missing.length}`);
  lines.push('');

  lines.push('## Likely path corrections');
  lines.push('');
  lines.push('| ID | Priority | Current path | Suggested | Overlap |');
  lines.push('|---|---|---|---|---|');
  const byPri = { P0: 0, P1: 1, P2: 2 };
  diff.correctionCandidates
    .sort((a, b) => (byPri[a.priority] ?? 9) - (byPri[b.priority] ?? 9))
    .forEach((c) => {
      const top = c.suggestions[0];
      lines.push(`| ${c.id} | ${c.priority} | \`${c.current_path}\` | \`${top.path}\` | ${top.overlap} |`);
    });
  lines.push('');

  lines.push('## Orphans (in inventory, not found in bundle)');
  lines.push('');
  lines.push('| ID | Priority | Path | Component |');
  lines.push('|---|---|---|---|');
  diff.orphans
    .sort((a, b) => (byPri[a.priority] ?? 9) - (byPri[b.priority] ?? 9))
    .forEach((o) => {
      lines.push(`| ${o.id} | ${o.priority} | \`${o.path}\` | ${o.component} |`);
    });
  lines.push('');

  lines.push('## Missing from inventory (in bundle, not in inventory)');
  lines.push('');
  lines.push('| Bundle path | Parent |');
  lines.push('|---|---|');
  diff.missing.forEach((m) => {
    lines.push(`| \`${m.path}\` | ${m.parent ? '`' + m.parent + '`' : '—'} |`);
  });
  lines.push('');

  return lines.join('\n');
}

async function main() {
  const bundleUrl = await getBundleUrl();
  console.log(`Bundle: ${bundleUrl}`);
  const bundle = await fetchText(bundleUrl);
  console.log(`  ${bundle.length.toLocaleString()} chars`);

  const raw = extractPaths(bundle);
  console.log(`  ${raw.length} path:"…" occurrences`);

  const resolved = resolveNesting(raw);
  const unique = [...new Map(resolved.map((r) => [r.full, r])).values()].sort(
    (a, b) => a.full.localeCompare(b.full),
  );
  console.log(`  ${unique.length} unique resolved paths`);

  saveJson('canonical-routes.json', {
    bundle_url: bundleUrl,
    generated_at: new Date().toISOString(),
    count: unique.length,
    paths: unique,
  });

  const routesJson = loadRoutes();
  const diff = suggestCorrections(routesJson, unique);

  saveJson('routes.diff.json', {
    generated_at: new Date().toISOString(),
    bundle_url: bundleUrl,
    ...diff,
  });

  const md = buildMarkdown(diff, bundleUrl);
  const mdPath = path.join(CONFIG.OUT_DIR, 'routes.diff.md');
  fs.writeFileSync(mdPath, md);

  console.log(`\nDiff summary:`);
  console.log(`  Exact matches:        ${diff.exactMatches.length}`);
  console.log(`  Path corrections:     ${diff.correctionCandidates.length}`);
  console.log(`  Orphans (inventory):  ${diff.orphans.length}`);
  console.log(`  Missing (bundle):     ${diff.missing.length}`);
  console.log(`\n💾 → output/canonical-routes.json`);
  console.log(`💾 → output/routes.diff.json`);
  console.log(`💾 → ${mdPath}`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
