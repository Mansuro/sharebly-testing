import type { RouteRecord, LinkSource } from '@/lib/data';
import { RoutesTable } from './RoutesTable';

/**
 * Top-level Route Health section. Server component: derives summary
 * counts from the route records and hands the per-row rendering off
 * to <RoutesTable />, which owns the filter state.
 */
export function RoutesSection({
  routes,
  sourcesByTarget,
}: {
  routes: RouteRecord[];
  sourcesByTarget?: Record<string, LinkSource[]>;
}) {
  const counts = bucketCounts(routes);

  return (
    <section className="max-w-[1200px] mx-auto px-6 py-10 border-b border-[var(--border)]">
      <div
        className="rise flex items-end justify-between mb-6 flex-wrap gap-3"
        style={{ animationDelay: '335ms' }}
      >
        <div>
          <div className="eyebrow mb-1.5">Surface Reachability</div>
          <h2 className="text-[22px] font-light tracking-tight text-[var(--text)]">
            Route Health
          </h2>
          <p className="text-[13px] text-[var(--text-dim)] mt-1">
            Every route the verifier loaded, with its merged HTTP + browser status.
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <CountChip n={counts.ok}         color="var(--pass)"    label="OK" />
          <CountChip n={counts.redirected} color="var(--accent)"  label="3xx" />
          <CountChip n={counts.failing}    color="var(--fail)"    label="404" />
          <CountChip n={counts.error}      color="var(--warn)"    label="ERR" />
        </div>
      </div>

      <div
        className="rise rule-l pl-6 flex flex-col"
        style={{ animationDelay: '380ms' }}
      >
        <RoutesTable routes={routes} sourcesByTarget={sourcesByTarget} />
      </div>
    </section>
  );
}

/** Reduce verdict-space into the four chip buckets shown in the header. */
function bucketCounts(routes: RouteRecord[]): {
  ok: number;
  redirected: number;
  failing: number;
  error: number;
} {
  const counts = { ok: 0, redirected: 0, failing: 0, error: 0 };
  for (const r of routes) {
    const v = String(r.verdict);
    const s = r.http_status;

    if (v === 'pass' || s === 200) {
      counts.ok++;
    } else if (
      v === 'variant-works' ||
      v === 'auth-redirect' ||
      r.redirected ||
      (typeof s === 'number' && s >= 300 && s < 400)
    ) {
      counts.redirected++;
    } else if (
      v === 'not-found' ||
      v === 'blocked' ||
      (typeof s === 'number' && s >= 400 && s < 500)
    ) {
      counts.failing++;
    } else if (v === 'error' || (typeof s === 'number' && s >= 500)) {
      counts.error++;
    }
  }
  return counts;
}

function CountChip({ n, color, label }: { n: number; color: string; label: string }) {
  if (n === 0) {
    return (
      <span className="mono text-[10px] tabular text-[var(--text-faint)] px-1.5 py-[2px] border border-[var(--border)]">
        <span className="opacity-60">{label}</span> 0
      </span>
    );
  }
  return (
    <span
      className="mono text-[10px] tabular font-semibold px-1.5 py-[2px] border"
      style={{ color, borderColor: `${color}40`, background: `${color}1a` }}
    >
      <span className="opacity-80">{label}</span> {n}
    </span>
  );
}
