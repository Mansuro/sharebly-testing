// apply-bundle.js - Apply bundle-derived corrections to routes.json.
//
// Reads:
//   output/routes.diff.json
//   output/canonical-routes.json
//
// Actions:
//   1. Auto-apply path corrections where suggestion overlap >= 3.
//   2. Remove 6 footer-link routes that aren't in the bundle.
//   3. Revert service-details if it points to /browse/service/details/
//      (no such path in the bundle).
//   4. Add bundle paths missing from inventory (after corrections),
//      filtering out /socket and /engine.io.
//
// Safety: dry-run unless --apply is passed; writes a timestamped backup.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROUTES_PATH = path.resolve(__dirname, '../routes.json');
const DIFF_PATH = path.resolve(__dirname, 'output/routes.diff.json');
const CANONICAL_PATH = path.resolve(__dirname, 'output/canonical-routes.json');

const APPLY = process.argv.includes('--apply');

const FAKE_FOOTER_IDS = new Set([
  'pricing',
  'success-stories',
  'careers',
  'partners',
  'cookie-policy',
  'accessibility',
]);

const NON_ROUTE_PATHS = new Set(['/socket', '/engine.io']);

// IDs whose top suggestion is known-wrong on inspection. These stay in
// the review queue regardless of overlap score.
const EXCLUDE_FROM_AUTO = new Set([
  'pin-listing-checkout',
  'support-tickets',
  'ticket-history',
  'ticket-room',
]);

const OVERLAP_THRESHOLD = 2;

function moduleForPath(p) {
  if (p.startsWith('/settings')) return 'settings';
  if (p.startsWith('/profile')) return 'profile';
  if (p.startsWith('/browse')) return 'marketplace';
  if (p.startsWith('/blog')) return 'content';
  if (p.startsWith('/calendar')) return 'calendar';
  return 'public';
}

function authForPath(p) {
  return p.startsWith('/profile') || p.startsWith('/settings');
}

function pascal(seg) {
  return seg
    .split(/[-_]+/)
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
    .join('');
}

function componentFromPath(p) {
  const segs = p
    .replace(/\/$/, '')
    .split('/')
    .filter(Boolean)
    .filter((s) => !s.startsWith(':'));
  const tail = segs.slice(-1)[0] || 'root';
  return pascal(tail) + 'Page';
}

function idFromPath(p) {
  const segs = p
    .replace(/\/$/, '')
    .split('/')
    .filter(Boolean)
    .filter((s) => !s.startsWith(':'));
  // Use last 2 segments to disambiguate, lowercased and kebab.
  const meaningful = segs.slice(-2).join('-').replace(/_+/g, '-').toLowerCase();
  return meaningful || 'root';
}

function uniqueId(base, existing) {
  if (!existing.has(base)) return base;
  let n = 2;
  while (existing.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

function normPath(p) {
  if (!p) return p;
  const stripped = p.replace(/\/+$/, '');
  return stripped || '/';
}

function appendNote(existing, addition) {
  if (!existing || existing.trim() === '') return addition;
  if (existing.includes(addition)) return existing;
  return existing + ' ' + addition;
}

function stripInferredNote(notes) {
  if (!notes) return '';
  return notes.replace(/Path inferred[^.]*\.\s*/g, '').trim();
}

function main() {
  const routesDoc = JSON.parse(fs.readFileSync(ROUTES_PATH, 'utf8'));
  const diff = JSON.parse(fs.readFileSync(DIFF_PATH, 'utf8'));
  const canonical = JSON.parse(fs.readFileSync(CANONICAL_PATH, 'utf8'));

  const verifiedDate = new Date().toISOString().split('T')[0];
  const inventoryById = Object.fromEntries(
    routesDoc.routes.map((r) => [r.id, r]),
  );

  // Build action lists
  const remove = [...FAKE_FOOTER_IDS].filter((id) => inventoryById[id]);
  const sd = inventoryById['service-details'];
  const revertServiceDetails = !!sd && sd.path === '/browse/service/details/';

  const autoApply = diff.correctionCandidates.filter(
    (c) =>
      c.suggestions[0] &&
      c.suggestions[0].overlap >= OVERLAP_THRESHOLD &&
      !EXCLUDE_FROM_AUTO.has(c.id) &&
      // revert handles service-details; don't double-apply
      !(c.id === 'service-details' && revertServiceDetails),
  );
  const reviewQueue = diff.correctionCandidates.filter(
    (c) =>
      !(c.id === 'service-details' && revertServiceDetails) &&
      (!c.suggestions[0] ||
        c.suggestions[0].overlap < OVERLAP_THRESHOLD ||
        EXCLUDE_FROM_AUTO.has(c.id)),
  );

  // Compute final inventory paths after corrections/removals/revert.
  // Normalize trailing slashes so /browse/x/details/ == /browse/x/details.
  const finalPaths = new Set();
  for (const r of routesDoc.routes) {
    if (remove.includes(r.id)) continue;
    if (r.id === 'service-details' && revertServiceDetails) {
      finalPaths.add(normPath('/service/:id'));
      continue;
    }
    const ac = autoApply.find((c) => c.id === r.id);
    finalPaths.add(normPath(ac ? ac.suggestions[0].path : r.path));
  }

  // Additions: bundle paths not already represented in inventory
  const additions = canonical.paths.filter(
    (p) => !NON_ROUTE_PATHS.has(p.full) && !finalPaths.has(normPath(p.full)),
  );

  // ── Plan output ──────────────────────────────────────────────────────
  console.log('');
  console.log(APPLY ? '🔧 APPLYING CHANGES' : '🔍 DRY RUN — no changes will be written');
  console.log('');
  console.log('Plan:');
  console.log(`  Path corrections (auto, overlap >= ${OVERLAP_THRESHOLD}):  ${autoApply.length}`);
  console.log(`  Review queue (manual):                       ${reviewQueue.length}`);
  console.log(`  Fake footer routes to remove:                ${remove.length}`);
  console.log(`  service-details revert:                      ${revertServiceDetails ? 'yes' : 'no'}`);
  console.log(`  New routes to add (bundle missing):          ${additions.length}`);
  console.log('');

  console.log('── Auto path corrections ──');
  autoApply.forEach((c) =>
    console.log(`  ${c.id.padEnd(33)} ${c.current_path.padEnd(42)} → ${c.suggestions[0].path}`),
  );
  console.log('');

  console.log('── Routes to remove (not in bundle) ──');
  remove.forEach((id) =>
    console.log(`  ${id.padEnd(33)} ${inventoryById[id].path}`),
  );
  console.log('');

  console.log(`── Review queue (overlap < ${OVERLAP_THRESHOLD}) ──`);
  reviewQueue.forEach((c) => {
    const top = c.suggestions[0];
    console.log(
      `  ${c.priority} ${c.id.padEnd(33)} ${c.current_path.padEnd(42)} ≈ ${top ? top.path + '  (overlap=' + top.overlap + ')' : '(no suggestion)'}`,
    );
  });
  console.log('');

  console.log('── New routes to add ──');
  additions.forEach((p) =>
    console.log(`  ${idFromPath(p.full).padEnd(40)} ${p.full}`),
  );
  console.log('');

  if (!APPLY) {
    console.log('Pass --apply to write changes.');
    console.log('');
    return;
  }

  // ── Apply ───────────────────────────────────────────────────────────
  const backupPath = ROUTES_PATH.replace(
    /\.json$/,
    `.backup.${Date.now()}.json`,
  );
  fs.copyFileSync(ROUTES_PATH, backupPath);
  console.log(`💾 Backup: ${path.basename(backupPath)}`);

  const updatedRoutes = [];
  for (const r of routesDoc.routes) {
    if (remove.includes(r.id)) continue;
    if (r.id === 'service-details' && revertServiceDetails) {
      delete r.sample_path;
      r.path = '/service/:id';
      r.inferred = true;
      r.notes = appendNote(
        r.notes,
        `Path /browse/service/details/ not present in bundle; needs manual mapping on ${verifiedDate}.`,
      );
      updatedRoutes.push(r);
      continue;
    }
    const ac = autoApply.find((c) => c.id === r.id);
    if (ac) {
      r.path = ac.suggestions[0].path;
      r.inferred = false;
      r.notes = stripInferredNote(r.notes);
      r.notes = appendNote(
        r.notes,
        `Path corrected via bundle extraction on ${verifiedDate}.`,
      );
      if (!r.path.includes(':') && r.sample_path) delete r.sample_path;
    }
    updatedRoutes.push(r);
  }

  // Append new routes from bundle
  const usedIds = new Set(updatedRoutes.map((r) => r.id));
  for (const p of additions) {
    const id = uniqueId(idFromPath(p.full), usedIds);
    usedIds.add(id);
    updatedRoutes.push({
      id,
      path: p.full,
      component: componentFromPath(p.full),
      module: moduleForPath(p.full),
      auth: authForPath(p.full),
      priority: 'P2',
      status: 'pending',
      owner: 'unassigned',
      flows: [],
      tags: [],
      inferred: false,
      notes: `Discovered via bundle extraction on ${verifiedDate}.`,
    });
  }

  routesDoc.routes = updatedRoutes;
  routesDoc.updated_at = verifiedDate;

  fs.writeFileSync(ROUTES_PATH, JSON.stringify(routesDoc, null, 2) + '\n');
  console.log(`✅ routes.json updated. ${updatedRoutes.length} routes total.`);
  console.log('');
  console.log('Next: git diff routes.json | head -100');
}

main();
