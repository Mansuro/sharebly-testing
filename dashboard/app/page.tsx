import {
  getResults,
  getScenarios,
  getRoutes,
  countByVerdict,
  groupByArea,
  type IssueResult,
} from '@/lib/data';

import { Header } from '@/components/Header';
import { HealthSummary } from '@/components/HealthSummary';
import { DiffCallout } from '@/components/DiffCallout';
import { SolvedRegressionAlert } from '@/components/SolvedRegressionAlert';
import { AreaSection } from '@/components/AreaSection';
import { EmptyState } from '@/components/EmptyState';
import { ScenariosSection } from '@/components/ScenariosSection';
import { RoutesSection } from '@/components/RoutesSection';

export const revalidate = 60;

export default async function Page() {
  const [data, scenarios, routes] = await Promise.all([
    getResults(),
    getScenarios(),
    getRoutes(),
  ]);

  if (!data) {
    const configuredUrl =
      process.env.DATA_URL ||
      'https://raw.githubusercontent.com/REPLACE_ME/REPLACE_ME/data/issue-results.json';
    return <EmptyState dataUrl={configuredUrl} />;
  }

  const counts = countByVerdict(data.results);
  const grouped = groupByArea(data.results);
  const areas = Array.from(grouped.entries());

  // Resolve diff arrays (lists of ids) to full IssueResult records so the
  // callouts can render meaningful details without re-fetching.
  const byId = new Map(data.results.map((r) => [r.id, r]));
  const newlyFixed: IssueResult[] = (data.diff_vs_previous?.newly_fixed ?? [])
    .map((id) => byId.get(id))
    .filter((r): r is IssueResult => Boolean(r));
  const newlyBroken: IssueResult[] = (data.diff_vs_previous?.newly_broken ?? [])
    .map((id) => byId.get(id))
    .filter((r): r is IssueResult => Boolean(r));

  // Issues the user marked as resolved but that are failing again — these
  // are real regressions and deserve a top-of-page alert.
  const regressedSolved = data.results.filter(
    (r) => r.issue_status === 'resolved' && r.verdict === 'fail',
  );

  return (
    <main>
      <Header
        baseUrl={data.base_url}
        checkedAt={data.checked_at}
        authenticated={data.authenticated}
        totalIssues={data.total_issues}
      />

      <HealthSummary counts={counts} total={data.total_issues} />

      {(newlyFixed.length > 0 || newlyBroken.length > 0 || regressedSolved.length > 0) && (
        <section className="border-b border-[var(--border)]">
          <div className="max-w-[1200px] mx-auto px-6 py-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <SolvedRegressionAlert issues={regressedSolved} delay={300} />
            <DiffCallout kind="fixed"  issues={newlyFixed}  delay={320} />
            <DiffCallout kind="broken" issues={newlyBroken} delay={360} />
          </div>
        </section>
      )}

      {scenarios !== null && scenarios.results.length > 0 && (
        <ScenariosSection results={scenarios.results} />
      )}

      {routes !== null && routes.results.length > 0 && (
        <RoutesSection routes={routes.results} />
      )}

      <section className="max-w-[1200px] mx-auto px-6 py-10">
        <div className="rise flex items-center justify-between mb-8" style={{ animationDelay: '340ms' }}>
          <div>
            <div className="eyebrow mb-1.5">Verification Surface</div>
            <h2 className="text-[22px] font-light tracking-tight text-[var(--text)]">
              All tracked issues, grouped by area.
            </h2>
          </div>
          <div className="hidden sm:flex items-center gap-3 text-[var(--text-faint)]">
            <Legend />
          </div>
        </div>

        <div className="space-y-10">
          {areas.map(([area, issues], i) => (
            <AreaSection key={area} area={area} issues={issues} index={i} />
          ))}
        </div>
      </section>

      <footer className="border-t border-[var(--border)] mt-12">
        <div className="max-w-[1200px] mx-auto px-6 py-6 flex items-center justify-between flex-wrap gap-3">
          <span className="eyebrow no-select">END · OF · SURFACE</span>
          <span className="mono text-[10px] text-[var(--text-faint)] tabular">
            REV {data.checked_at.slice(0, 19).replace('T', ' ')}
          </span>
        </div>
      </footer>
    </main>
  );
}

function Legend() {
  return (
    <div className="flex items-center gap-3 mono text-[10px] tracking-wider">
      {[
        ['PASS', 'var(--pass)'],
        ['FAIL', 'var(--fail)'],
        ['SKIP', 'var(--neutral)'],
        ['UNK', 'var(--warn)'],
      ].map(([label, color]) => (
        <span key={label} className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5" style={{ background: color }} />
          <span className="text-[var(--text-dim)]">{label}</span>
        </span>
      ))}
    </div>
  );
}
