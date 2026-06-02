// find-link-sources.js
// Crawl pages that actually render (verdict=pass or auth-redirect from the
// latest routes.status.json) and record where each in-app navigation
// originates — anchor links, header/nav links, anchors-styled-as-buttons,
// and form actions. The output answers "where is this broken route linked
// from?" so failing routes in the dashboard become actionable.
//
// Usage:
//   npm run verify:link-sources
//
// Reads:
//   verify/output/routes.status.json  (seed list — pass + auth-redirect)
//   verify/output/auth-state.json     (optional — produced by verify-browser.js)
//
// Writes:
//   verify/output/link-sources.json
//
// The shape of the output is intentionally flat:
//   { base_url, checked_at, sources_by_target: { "/path": [ {...}, ... ] } }
// where each source carries source_path, element_kind, label, and a short
// CSS-path selector for the element.

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { CONFIG, saveJson, loadJson } from './config.js';

const AUTH_STATE_PATH = path.join(CONFIG.OUT_DIR, 'auth-state.json');

// Cap so the run stays well under 2 minutes at concurrency=3.
const MAX_PAGES = 25;
const CONCURRENCY = 3;
const SETTLE_MS = 900;

// ─── URL helpers ────────────────────────────────────────────────────────

function normalizePath(href, baseOrigin) {
  if (!href) return null;
  const trimmed = String(href).trim();
  if (!trimmed) return null;
  // Skip non-navigational hrefs.
  if (
    trimmed.startsWith('#') ||
    trimmed.startsWith('mailto:') ||
    trimmed.startsWith('tel:') ||
    trimmed.startsWith('javascript:')
  ) {
    return null;
  }
  try {
    const u = new URL(trimmed, baseOrigin + '/');
    if (u.origin !== baseOrigin) return null;
    if (!['http:', 'https:'].includes(u.protocol)) return null;
    return u.pathname + u.search;
  } catch {
    return null;
  }
}

// ─── In-page extraction ─────────────────────────────────────────────────
//
// Runs inside the browser. Walks every <a href>, anchor-button hybrid, and
// <form action> on the page, returning a list of { href, kind, label,
// selector } records. We keep the logic minimal so it's easy to reason
// about — pure DOM, no framework introspection.

function extractSourcesScript() {
  return () => {
    function visibleText(el) {
      if (!el) return '';
      const t = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
      if (t) return t;
      const aria = el.getAttribute && el.getAttribute('aria-label');
      if (aria) return aria.trim();
      const img = el.querySelector && el.querySelector('img[alt]');
      if (img) {
        const alt = (img.getAttribute('alt') || '').trim();
        if (alt) return alt;
      }
      const title = el.getAttribute && el.getAttribute('title');
      if (title) return title.trim();
      return '';
    }

    // Build a short CSS path for an element — at most 4 levels deep, using
    // tag + :nth-of-type. Best-effort: this isn't unique across the whole
    // doc, but it's enough for a human to find the link again.
    function shortSelector(el) {
      const parts = [];
      let cur = el;
      for (let i = 0; i < 4 && cur && cur.nodeType === 1 && cur.tagName !== 'HTML'; i++) {
        const tag = cur.tagName.toLowerCase();
        const parent = cur.parentElement;
        if (!parent) {
          parts.unshift(tag);
          break;
        }
        const sibs = Array.from(parent.children).filter((c) => c.tagName === cur.tagName);
        const idx = sibs.indexOf(cur) + 1;
        parts.unshift(sibs.length > 1 ? `${tag}:nth-of-type(${idx})` : tag);
        cur = parent;
      }
      return parts.join(' > ');
    }

    function classifyAnchor(a) {
      // nav: inside <nav>, <header>, [role=navigation], or a class that
      //   strongly suggests navigation.
      if (a.closest('nav, header, [role="navigation"]')) return 'nav';
      // button: anchors styled as buttons. Detected by role=button or a
      //   class containing 'btn' / 'button' / MUI's MuiButton.
      if (
        a.getAttribute('role') === 'button' ||
        /(\bbtn\b|\bbutton\b|MuiButton)/i.test(a.className || '')
      ) {
        return 'button';
      }
      return 'link';
    }

    const records = [];

    // 1) Anchors. Each href yields one record.
    for (const a of Array.from(document.querySelectorAll('a[href]'))) {
      const href = a.getAttribute('href');
      if (!href) continue;
      const label = visibleText(a).slice(0, 80);
      records.push({
        href,
        kind: classifyAnchor(a),
        label,
        selector: shortSelector(a),
      });
    }

    // 2) Forms with an action attribute that looks like an internal path.
    for (const f of Array.from(document.querySelectorAll('form[action]'))) {
      const href = f.getAttribute('action');
      if (!href) continue;
      // Best-effort label: nearest visible heading or the submit button.
      const submit = f.querySelector('button[type="submit"], input[type="submit"]');
      const label = (
        (submit && (submit.innerText || submit.value)) ||
        (f.getAttribute('aria-label') || '') ||
        'form'
      )
        .toString()
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 80);
      records.push({
        href,
        kind: 'form',
        label,
        selector: shortSelector(f),
      });
    }

    return records;
  };
}

// ─── Crawler ────────────────────────────────────────────────────────────

async function crawlPage(context, sourcePath, baseOrigin) {
  const page = await context.newPage();
  const sources = [];
  try {
    await page.goto(baseOrigin + sourcePath, {
      waitUntil: CONFIG.NAV_WAIT,
      timeout: CONFIG.PAGE_TIMEOUT,
    });
    await page.waitForTimeout(SETTLE_MS);

    const records = await page.evaluate(extractSourcesScript()).catch(() => []);
    for (const r of records) {
      const target = normalizePath(r.href, baseOrigin);
      if (!target) continue;
      sources.push({
        target,
        source_path: sourcePath,
        element_kind: r.kind,
        label: r.label || '',
        selector: r.selector || '',
      });
    }
  } catch {
    // Page failed to load — skip; the seed list shouldn't include broken
    // pages anyway, but we don't want a single failure to stop the run.
  } finally {
    await page.close().catch(() => {});
  }
  return sources;
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

// ─── Entry point ────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🔗 Link-source crawl → ${CONFIG.BASE_URL}\n`);

  const baseOrigin = new URL(CONFIG.BASE_URL).origin;

  const status = loadJson('routes.status.json');
  if (!status) {
    console.error('No routes.status.json in output/. Run npm run report first.');
    process.exit(1);
  }
  const records = status.results || status.verdicts || [];

  // Seed from pass + auth-redirect, dedupe by tested_path/path. These are
  // the only pages worth crawling — 404s and errors don't render anything
  // we could harvest links from.
  const seen = new Set();
  const seeds = [];
  for (const r of records) {
    const v = String(r.verdict);
    if (v !== 'pass' && v !== 'auth-redirect') continue;
    const p = r.tested_path || r.confirmed_path || r.path;
    if (!p || seen.has(p)) continue;
    seen.add(p);
    seeds.push(p);
    if (seeds.length >= MAX_PAGES) break;
  }
  console.log(`Seeds: ${seeds.length} pages (max ${MAX_PAGES}).`);

  const hasAuthState = fs.existsSync(AUTH_STATE_PATH);
  if (hasAuthState) {
    console.log(`Using auth state: ${AUTH_STATE_PATH}`);
  } else {
    console.log(`⚠️  No auth-state.json — crawling as anonymous user.`);
  }
  console.log('');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: hasAuthState ? AUTH_STATE_PATH : undefined,
    viewport: { width: 1280, height: 800 },
  });

  let completed = 0;
  const allSourceLists = await runWithConcurrency(
    seeds,
    async (seed) => {
      const list = await crawlPage(context, seed, baseOrigin);
      completed++;
      process.stdout.write(
        `\r  [${completed}/${seeds.length}] ${seed.slice(0, 50).padEnd(50)} (${list.length} links)`,
      );
      return list;
    },
    CONCURRENCY,
  );
  console.log('\n');

  await context.close();
  await browser.close();

  // Aggregate: { target -> [ {source_path, element_kind, label, selector}, ... ] }
  // Dedupe within the same source_path by (kind, label, selector) so the
  // same link in a global header counted only once per page.
  const sourcesByTarget = {};
  for (const list of allSourceLists) {
    for (const s of list) {
      if (!sourcesByTarget[s.target]) sourcesByTarget[s.target] = [];
      const bucket = sourcesByTarget[s.target];
      const dup = bucket.some(
        (x) =>
          x.source_path === s.source_path &&
          x.element_kind === s.element_kind &&
          x.label === s.label &&
          x.selector === s.selector,
      );
      if (!dup) {
        bucket.push({
          source_path: s.source_path,
          element_kind: s.element_kind,
          label: s.label,
          selector: s.selector,
        });
      }
    }
  }

  const out = {
    base_url: CONFIG.BASE_URL,
    checked_at: new Date().toISOString(),
    pages_crawled: seeds.length,
    unique_targets: Object.keys(sourcesByTarget).length,
    sources_by_target: sourcesByTarget,
  };

  const jsonPath = saveJson('link-sources.json', out);

  console.log(`✓ Crawled ${seeds.length} pages.`);
  console.log(`✓ ${out.unique_targets} unique link targets recorded.`);
  console.log(`\n💾 Saved → ${jsonPath}\n`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
