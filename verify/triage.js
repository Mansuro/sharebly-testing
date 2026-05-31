// triage.js - Finish triage of remaining not-found routes.
//
// Four operations:
//   1. Mark 9 unresolvable routes as status:blocked with a note.
//   2. Merge pin-listing-checkout ↔ featured-listing-payment (same concept).
//   3. Org cleanup: merge two pairs, delete one duplicate.
//   4. Update sample_paths that drifted after path corrections.
//
// Safety: dry-run unless --apply; backup on apply.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROUTES_PATH = path.resolve(__dirname, '../routes.json');
const APPLY = process.argv.includes('--apply');
const TODAY = new Date().toISOString().split('T')[0];

// 1. Routes to mark blocked
const BLOCK = {
  bids: 'Path /bids not in bundle. No clear canonical mapping.',
  'stripe-pay': 'Path /profile/stripe-pay not in bundle. No clear canonical mapping.',
  'profile-badge': 'Path /profile/badge not in bundle. No clear canonical mapping.',
  supporters: 'Path /supporters not in bundle. No clear canonical mapping.',
  'post-calendar': 'Path /calendar/post not in bundle. Likely defunct.',
  'post-proposal': 'Path /calendar/post-proposal not in bundle. Likely defunct.',
  'support-tickets': 'Path /profile/support/tickets not in bundle. No canonical mapping found.',
  'ticket-room': 'Path /profile/support/tickets/:id not in bundle. Closest /profile/room may serve similar purpose; needs developer confirmation.',
  'ticket-history': 'Path /profile/support/tickets/history not in bundle. No canonical mapping found.',
};

// 2. + 3. Merges: keep <a>'s id/component/etc, take path from <b>, delete <b>
const MERGES = [
  {
    keep: 'pin-listing-checkout',
    drop: 'featured-listing-payment',
    reason: 'pin-listing-checkout and featured-listing-payment describe the same checkout flow',
  },
  {
    keep: 'organization-public-profile',
    drop: 'profile-organization-2',
    reason: 'organization-public-profile is the slug-based detail page',
  },
  {
    keep: 'organization-member-invitation',
    drop: 'profile-organization-invites',
    reason: 'organization-member-invitation maps to the invites canonical route',
  },
];

// Deletion-only (no merge): exact duplicate of another entry
const DELETE = {
  'organization-invitation':
    'Duplicate concept of organization-member-invitation; both refer to org invites at /profile/organization_invites.',
};

// 4. Sample_path updates (path drifted, sample didn't follow)
const SAMPLE_UPDATES = {
  'service-order': '/profile/service_progress/1/1',
  'service-progress': '/profile/service_progress/1/1',
  'task-workspace': '/browse/task/details/task-workspace/1',
  'browse-post-by-type': '/browse/tasks',
  // organization-public-profile becomes /profile/organization/:slug — set sample
  'organization-public-profile': '/profile/organization/1',
};

// 5. Strip stale sample_paths from routes whose path is no longer parameterized
const STRIP_SAMPLE = ['request-details', 'exchange-details-marketplace', 'resource-details'];

function appendNote(existing, addition) {
  if (!existing || existing.trim() === '') return addition;
  if (existing.includes(addition)) return existing;
  return existing + ' ' + addition;
}

function main() {
  const doc = JSON.parse(fs.readFileSync(ROUTES_PATH, 'utf8'));
  const byId = Object.fromEntries(doc.routes.map((r) => [r.id, r]));

  // Pre-flight: confirm every referenced id exists
  const expectedIds = [
    ...Object.keys(BLOCK),
    ...MERGES.flatMap((m) => [m.keep, m.drop]),
    ...Object.keys(DELETE),
    ...Object.keys(SAMPLE_UPDATES),
    ...STRIP_SAMPLE,
  ];
  const missing = expectedIds.filter((id) => !byId[id]);
  if (missing.length > 0) {
    console.error('❌ Pre-flight failed. Missing ids:');
    missing.forEach((id) => console.error('  ' + id));
    process.exit(1);
  }

  console.log('');
  console.log(APPLY ? '🔧 APPLYING TRIAGE' : '🔍 DRY RUN — no changes will be written');
  console.log('');
  console.log('Plan:');
  console.log(`  Block (status=blocked + note): ${Object.keys(BLOCK).length}`);
  console.log(`  Merges (keep + drop):           ${MERGES.length}`);
  console.log(`  Delete (duplicate):             ${Object.keys(DELETE).length}`);
  console.log(`  Sample_path updates:            ${Object.keys(SAMPLE_UPDATES).length}`);
  console.log(`  Sample_path strips:             ${STRIP_SAMPLE.length}`);
  console.log('');

  console.log('── Block ──');
  for (const id of Object.keys(BLOCK)) {
    console.log(`  ${id.padEnd(28)} ${byId[id].path}`);
  }
  console.log('');

  console.log('── Merges ──');
  for (const m of MERGES) {
    console.log(`  keep   ${m.keep.padEnd(35)} ${byId[m.keep].path} → ${byId[m.drop].path}`);
    console.log(`  drop   ${m.drop.padEnd(35)} ${byId[m.drop].path}`);
  }
  console.log('');

  console.log('── Delete ──');
  for (const id of Object.keys(DELETE)) {
    console.log(`  ${id.padEnd(35)} ${byId[id].path}`);
  }
  console.log('');

  console.log('── Sample updates ──');
  for (const [id, sample] of Object.entries(SAMPLE_UPDATES)) {
    console.log(`  ${id.padEnd(35)} → ${sample}`);
  }
  console.log('');

  console.log('── Sample strips ──');
  for (const id of STRIP_SAMPLE) {
    console.log(`  ${id.padEnd(35)} (path=${byId[id].path})`);
  }
  console.log('');

  if (!APPLY) {
    console.log('Pass --apply to write changes.');
    return;
  }

  // Backup
  const backupPath = ROUTES_PATH.replace(/\.json$/, `.backup.${Date.now()}.json`);
  fs.copyFileSync(ROUTES_PATH, backupPath);
  console.log(`💾 Backup: ${path.basename(backupPath)}`);

  // 1. Block
  for (const [id, note] of Object.entries(BLOCK)) {
    const r = byId[id];
    r.status = 'blocked';
    r.notes = appendNote(r.notes, `${note} (Triaged ${TODAY}.)`);
  }

  // 2 & 3. Merges (capture drop objects by reference BEFORE mutation)
  const toDelete = new Set();
  for (const m of MERGES) {
    const keep = byId[m.keep];
    const drop = byId[m.drop];
    toDelete.add(drop);
    const oldPath = keep.path;
    keep.path = drop.path;
    if (drop.sample_path) keep.sample_path = drop.sample_path;
    keep.auth = drop.auth; // bundle-derived
    keep.inferred = false;
    keep.notes = appendNote(
      keep.notes,
      `Path corrected from ${oldPath} to ${drop.path} on ${TODAY}. ${m.reason}.`,
    );
  }

  // 4. Sample updates (must happen AFTER merges so org-public-profile path is right)
  for (const [id, sample] of Object.entries(SAMPLE_UPDATES)) {
    byId[id].sample_path = sample;
  }

  // 5. Sample strips
  for (const id of STRIP_SAMPLE) {
    delete byId[id].sample_path;
    // also strip trailing slash from path to match bundle canonical
    byId[id].path = byId[id].path.replace(/\/+$/, '') || '/';
    byId[id].notes = appendNote(
      byId[id].notes,
      `Stale sample_path removed; trailing slash normalized on ${TODAY}.`,
    );
  }

  // Plain deletions
  for (const id of Object.keys(DELETE)) {
    toDelete.add(byId[id]);
    byId[id].notes = appendNote(byId[id].notes, `Deleted ${TODAY}. ${DELETE[id]}`);
  }

  doc.routes = doc.routes.filter((r) => !toDelete.has(r));
  doc.updated_at = TODAY;

  fs.writeFileSync(ROUTES_PATH, JSON.stringify(doc, null, 2) + '\n');
  console.log(`✅ routes.json updated. ${doc.routes.length} routes total.`);
}

main();
