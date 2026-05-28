// verify-http.js - Stage 1: Fast HTTP check
// Hits every route URL and records status code, redirect, response time.
// For a Vite SPA, this mostly confirms the server is up and the path is
// reachable — it cannot distinguish "real route" from "404 caught by router".
// That's what Stage 2 (browser) is for.

import { CONFIG, loadRoutes, generateVariants, saveJson } from './config.js';

async function checkUrl(url) {
  const start = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CONFIG.HTTP_TIMEOUT);

  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'manual', // we want to see redirects, not follow them
      signal: controller.signal,
    });

    const elapsed = Date.now() - start;
    return {
      status: res.status,
      redirect: res.headers.get('location') || null,
      elapsed_ms: elapsed,
      ok: res.status < 400,
      error: null,
    };
  } catch (err) {
    return {
      status: null,
      redirect: null,
      elapsed_ms: Date.now() - start,
      ok: false,
      error: err.name === 'AbortError' ? 'timeout' : err.message,
    };
  } finally {
    clearTimeout(timer);
  }
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

async function main() {
  console.log(`\n🌐 HTTP verification → ${CONFIG.BASE_URL}\n`);

  const routes = loadRoutes();

  // Build list of URLs to check: route.path + variants for inferred routes
  const checks = [];
  for (const route of routes) {
    const variants = generateVariants(route);
    for (const variant of variants) {
      checks.push({
        route_id: route.id,
        path: variant,
        is_primary: variant === route.path,
        is_variant: variant !== route.path,
        url: CONFIG.BASE_URL + variant,
      });
    }
  }

  console.log(`Checking ${checks.length} URLs across ${routes.length} routes`);
  console.log(`Concurrency: ${CONFIG.HTTP_CONCURRENCY}\n`);

  let completed = 0;
  const results = await runWithConcurrency(
    checks,
    async (check) => {
      const result = await checkUrl(check.url);
      completed++;
      if (completed % 20 === 0 || completed === checks.length) {
        process.stdout.write(`\r  Progress: ${completed}/${checks.length}`);
      }
      return { ...check, ...result };
    },
    CONFIG.HTTP_CONCURRENCY,
  );
  console.log('\n');

  // Summary
  const ok = results.filter((r) => r.ok).length;
  const errors = results.filter((r) => !r.ok && r.error).length;
  const notFound = results.filter((r) => r.status === 404).length;
  const redirects = results.filter((r) => r.redirect).length;

  console.log(`✅ OK:        ${ok}`);
  console.log(`↪️  Redirects: ${redirects}`);
  console.log(`❌ 404:       ${notFound}`);
  console.log(`💥 Errors:    ${errors}`);

  if (errors > 0) {
    console.log('\n⚠️  Errors:');
    results
      .filter((r) => r.error)
      .slice(0, 10)
      .forEach((r) => console.log(`   ${r.path}: ${r.error}`));
  }

  const outPath = saveJson('http-results.json', {
    base_url: CONFIG.BASE_URL,
    checked_at: new Date().toISOString(),
    total_checks: checks.length,
    total_routes: routes.length,
    summary: { ok, errors, not_found: notFound, redirects },
    results,
  });

  console.log(`\n💾 Saved → ${outPath}`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
