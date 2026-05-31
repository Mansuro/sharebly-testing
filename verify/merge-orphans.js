// merge-orphans.js - Merge inferred-orphan inventory entries with their
// canonical bundle-derived replacement.
//
// For each pair:
//   - Delete the orphan entry.
//   - On the replacement entry: inherit id, component, priority, owner,
//     flows, tags, module, status from the orphan. Keep path, sample_path,
//     and auth from the replacement (these are the canonical values).
//   - inferred = false. Append a note explaining the merge.
//
// Safety: dry-run unless --apply; backup created on apply.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROUTES_PATH = path.resolve(__dirname, '../routes.json');
const APPLY = process.argv.includes('--apply');

const MERGES = [
  { orphan: 'dashboard',       replacement: 'profile-dashboard' },
  { orphan: 'my-services',     replacement: 'profile-my-service' },
  { orphan: 'search-result',   replacement: 'search-results' },
  { orphan: 'messages',        replacement: 'chat-room' },
  { orphan: 'my-calendar',     replacement: 'my-calendar-2' },
  { orphan: 'blog-details',    replacement: 'blog-2' },
  { orphan: 'premier-support', replacement: 'profile-premium-support' },
];

const today = new Date().toISOString().split('T')[0];

function appendNote(existing, addition) {
  if (!existing || existing.trim() === '') return addition;
  if (existing.includes(addition)) return existing;
  return existing + ' ' + addition;
}

function stripInferredNote(notes) {
  if (!notes) return '';
  return notes
    .replace(/Path inferred[^.]*\.\s*/g, '')
    .replace(/Verified missing[^.]*\.\s*/g, '')
    .trim();
}

function main() {
  const doc = JSON.parse(fs.readFileSync(ROUTES_PATH, 'utf8'));
  const byId = Object.fromEntries(doc.routes.map((r) => [r.id, r]));

  // Validate pairs exist
  const errors = [];
  for (const m of MERGES) {
    if (!byId[m.orphan]) errors.push(`Orphan not found: ${m.orphan}`);
    if (!byId[m.replacement]) errors.push(`Replacement not found: ${m.replacement}`);
  }
  if (errors.length > 0) {
    console.error('❌ Pre-flight failed:');
    errors.forEach((e) => console.error('  ' + e));
    process.exit(1);
  }

  console.log('');
  console.log(APPLY ? '🔧 APPLYING MERGES' : '🔍 DRY RUN — no changes will be written');
  console.log('');
  console.log('Plan:');
  for (const m of MERGES) {
    const o = byId[m.orphan];
    const r = byId[m.replacement];
    console.log(`  ${m.orphan.padEnd(25)} ${o.path.padEnd(28)}  →  delete`);
    console.log(`  ${m.replacement.padEnd(25)} ${r.path.padEnd(28)}  →  rename to ${m.orphan} (inherit metadata)`);
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

  // Capture original orphan objects by reference BEFORE any mutation
  const orphansToDelete = new Set(MERGES.map((m) => byId[m.orphan]));

  // Mutate replacement objects in-place
  for (const m of MERGES) {
    const o = byId[m.orphan];
    const r = byId[m.replacement];

    r.id = m.orphan;
    r.component = o.component;
    r.priority = o.priority;
    r.owner = o.owner;
    r.flows = [...o.flows];
    r.tags = [...o.tags];
    r.module = o.module;
    r.status = o.status === 'pass' ? 'pass' : 'pending';
    r.inferred = false;
    r.notes = stripInferredNote(r.notes);
    r.notes = appendNote(
      r.notes,
      `Merged from inferred orphan ${m.orphan} (was ${o.path}) on ${today}.`,
    );
  }

  // Drop orphans by object identity (renamed replacements stay)
  doc.routes = doc.routes.filter((r) => !orphansToDelete.has(r));

  doc.updated_at = today;
  fs.writeFileSync(ROUTES_PATH, JSON.stringify(doc, null, 2) + '\n');
  console.log(`✅ routes.json updated. ${doc.routes.length} routes total.`);
}

main();
