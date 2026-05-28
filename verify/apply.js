// apply.js - Apply verification results back into routes.json
//
// Reads output/routes.status.json (produced by report.js) and updates
// the source routes.json based on the verdicts:
//
//   pass + inferred:true       → clear inferred flag (path was correct)
//   variant-works              → update path to working variant, clear inferred
//   not-found                  → append note "Verified missing on <date>"
//   auth-redirect              → mark status as 'needs-auth-recheck', no path change
//   error                      → no change, just log
//
// Safety:
//   - Defaults to --dry-run; you must pass --apply to write
//   - Always writes a timestamped backup before modifying
//   - Refuses to run if routes.json was modified after routes.status.json
//     (prevents stomping on edits made since verification)

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROUTES_PATH = path.resolve(__dirname, '../routes.json');
const STATUS_PATH = path.resolve(__dirname, 'output/routes.status.json');

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const FORCE = args.includes('--force');
const VERBOSE = args.includes('--verbose') || args.includes('-v');

function log(...a) {
  console.log(...a);
}
function vlog(...a) {
  if (VERBOSE) console.log('  ', ...a);
}

function main() {
  // Load files
  if (!fs.existsSync(STATUS_PATH)) {
    console.error('❌ No status file found at:', STATUS_PATH);
    console.error('   Run `npm run verify:all && npm run report` first.');
    process.exit(1);
  }
  if (!fs.existsSync(ROUTES_PATH)) {
    console.error('❌ routes.json not found at:', ROUTES_PATH);
    process.exit(1);
  }

  // Freshness check
  const routesMtime = fs.statSync(ROUTES_PATH).mtime;
  const statusMtime = fs.statSync(STATUS_PATH).mtime;
  if (routesMtime > statusMtime && !FORCE) {
    console.error('⚠️  routes.json is newer than the verification results.');
    console.error(`   routes.json    last modified: ${routesMtime.toISOString()}`);
    console.error(`   status.json    last modified: ${statusMtime.toISOString()}`);
    console.error('   Re-run verification, or pass --force to apply anyway.');
    process.exit(1);
  }

  const routesDoc = JSON.parse(fs.readFileSync(ROUTES_PATH, 'utf8'));
  const status = JSON.parse(fs.readFileSync(STATUS_PATH, 'utf8'));

  const verdictsById = Object.fromEntries(status.verdicts.map((v) => [v.id, v]));

  // Plan changes
  const plan = {
    'path-fixed': [],
    'inferred-cleared': [],
    'marked-missing': [],
    'needs-auth-recheck': [],
    'no-change': [],
    'no-verdict': [],
  };

  const verifiedDate = new Date().toISOString().split('T')[0];

  for (const route of routesDoc.routes) {
    const v = verdictsById[route.id];
    if (!v) {
      plan['no-verdict'].push({ id: route.id });
      continue;
    }

    switch (v.verdict) {
      case 'pass':
        if (route.inferred) {
          plan['inferred-cleared'].push({
            id: route.id,
            path: route.path,
          });
          if (APPLY) {
            route.inferred = false;
            route.notes = stripInferredNote(route.notes);
          }
        } else {
          plan['no-change'].push({ id: route.id, reason: 'already-confirmed' });
        }
        break;

      case 'variant-works':
        if (!v.suggested_path) {
          plan['no-change'].push({
            id: route.id,
            reason: 'variant-works but no suggested_path',
          });
          break;
        }
        plan['path-fixed'].push({
          id: route.id,
          from: route.path,
          to: v.suggested_path,
        });
        if (APPLY) {
          route.path = v.suggested_path;
          route.inferred = false;
          route.notes = stripInferredNote(route.notes);
          route.notes = appendNote(
            route.notes,
            `Path corrected from verification on ${verifiedDate}.`,
          );
        }
        break;

      case 'not-found':
        plan['marked-missing'].push({ id: route.id, path: route.path });
        if (APPLY) {
          route.notes = appendNote(
            route.notes,
            `Verified missing on ${verifiedDate} — no path variant resolved.`,
          );
        }
        break;

      case 'auth-redirect':
        plan['needs-auth-recheck'].push({ id: route.id });
        if (APPLY) {
          route.notes = appendNote(
            route.notes,
            `Auth-gated. Re-run verification with credentials on ${verifiedDate}.`,
          );
        }
        break;

      case 'error':
      case 'unknown':
      default:
        plan['no-change'].push({ id: route.id, reason: v.verdict });
        break;
    }
  }

  // Print plan
  log('');
  log(APPLY ? '🔧 APPLYING CHANGES' : '🔍 DRY RUN — no changes will be written');
  log('   Pass --apply to actually modify routes.json');
  log('');
  log(`Plan:`);
  log(`  📍 Paths to fix:           ${plan['path-fixed'].length}`);
  log(`  ✓  Inferred flags to clear: ${plan['inferred-cleared'].length}`);
  log(`  ❌ To mark missing:         ${plan['marked-missing'].length}`);
  log(`  🔐 Need auth recheck:       ${plan['needs-auth-recheck'].length}`);
  log(`  ⏭️  No change:              ${plan['no-change'].length}`);
  log(`  ❓ No verdict:              ${plan['no-verdict'].length}`);
  log('');

  if (plan['path-fixed'].length > 0) {
    log('📍 Path fixes:');
    plan['path-fixed'].forEach((p) =>
      log(`   ${p.id.padEnd(35)} ${p.from}  →  ${p.to}`),
    );
    log('');
  }

  if (plan['inferred-cleared'].length > 0) {
    log('✓  Inferred flags to clear (path was correct):');
    plan['inferred-cleared'].forEach((p) =>
      log(`   ${p.id.padEnd(35)} ${p.path}`),
    );
    log('');
  }

  if (plan['marked-missing'].length > 0) {
    log('❌ Will be marked missing:');
    plan['marked-missing'].forEach((p) =>
      log(`   ${p.id.padEnd(35)} ${p.path}`),
    );
    log('');
  }

  if (VERBOSE && plan['no-change'].length > 0) {
    log('⏭️  No change:');
    plan['no-change'].forEach((p) => log(`   ${p.id.padEnd(35)} (${p.reason})`));
    log('');
  }

  if (!APPLY) {
    log('To apply these changes, run: npm run apply -- --apply');
    log('');
    return;
  }

  // Backup
  const backupPath = ROUTES_PATH.replace(
    /\.json$/,
    `.backup.${Date.now()}.json`,
  );
  fs.copyFileSync(ROUTES_PATH, backupPath);
  log(`💾 Backup written: ${path.basename(backupPath)}`);

  // Update metadata
  routesDoc.updated_at = verifiedDate;

  // Write
  fs.writeFileSync(ROUTES_PATH, JSON.stringify(routesDoc, null, 2) + '\n');
  log(`✅ routes.json updated`);
  log('');
  log('Next steps:');
  log('  1. Review changes:   git diff routes.json');
  log('  2. If anything looks wrong, restore:');
  log(`     cp ${path.basename(backupPath)} routes.json`);
  log('  3. Commit when satisfied');
  log('');
}

function appendNote(existing, addition) {
  if (!existing || existing.trim() === '') return addition;
  if (existing.includes(addition)) return existing; // idempotent
  return existing + ' ' + addition;
}

function stripInferredNote(notes) {
  if (!notes) return '';
  return notes
    .replace(/Path inferred[^.]*\.\s*/g, '')
    .trim();
}

main();
