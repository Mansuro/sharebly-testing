import { getRoutes, getResults, getLinkSources } from '@/lib/data';
import { Header } from '@/components/Header';
import { PageTabs } from '@/components/PageTabs';
import { RoutesSection } from '@/components/RoutesSection';

export const revalidate = 60;

export default async function RoutesPage() {
  // Issues data drives the Header meta; routes data drives the section.
  const [routes, issues, linkSources] = await Promise.all([
    getRoutes(),
    getResults(),
    getLinkSources(),
  ]);

  // Synthesize Header props. If issue data isn't available yet, fall back
  // to whatever metadata routes carries so the page still renders cleanly.
  const headerMeta = issues
    ? {
        baseUrl: issues.base_url,
        checkedAt: issues.checked_at,
        authenticated: issues.authenticated,
        totalIssues: issues.total_issues,
      }
    : routes
      ? {
          baseUrl: routes.base_url,
          checkedAt: routes.checked_at,
          authenticated: false,
          totalIssues: 0,
        }
      : null;

  return (
    <main>
      {headerMeta && <Header {...headerMeta} />}

      <PageTabs
        tabs={[
          { href: '/',       label: 'Overview', count: issues?.total_issues },
          { href: '/routes', label: 'Routes',   count: routes?.results.length },
        ]}
      />

      {routes && routes.results.length > 0 ? (
        <RoutesSection
          routes={routes.results}
          sourcesByTarget={linkSources?.sources_by_target}
        />
      ) : (
        <NoRoutesYet />
      )}

      <footer className="border-t border-[var(--border)] mt-12">
        <div className="max-w-[1200px] mx-auto px-6 py-6 flex items-center justify-between flex-wrap gap-3">
          <span className="eyebrow no-select">END · OF · ROUTES</span>
          {routes && (
            <span className="mono text-[10px] text-[var(--text-faint)] tabular">
              REV {routes.checked_at.slice(0, 19).replace('T', ' ')}
            </span>
          )}
        </div>
      </footer>
    </main>
  );
}

function NoRoutesYet() {
  return (
    <section className="max-w-[1200px] mx-auto px-6 py-24">
      <div className="border border-[var(--border)] bg-[var(--bg-elev)] p-8 max-w-[640px]">
        <div className="eyebrow mb-3 text-[var(--warn)]">NO DATA</div>
        <h2 className="text-[20px] font-light text-[var(--text)] mb-3 tracking-tight">
          Routes data isn&apos;t available yet.
        </h2>
        <p className="text-[13.5px] text-[var(--text-dim)] leading-relaxed">
          The Routes view consumes{' '}
          <span className="mono text-[var(--text)]">routes.status.json</span>
          {' '}from the data branch. Make sure{' '}
          <span className="mono text-[var(--text)]">ROUTES_DATA_URL</span>
          {' '}is set on your Vercel project, and that the latest workflow run
          completed the &quot;Build merged routes.status.json&quot; step.
        </p>
      </div>
    </section>
  );
}
