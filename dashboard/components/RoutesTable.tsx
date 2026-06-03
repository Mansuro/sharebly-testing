'use client';

import { useMemo, useState } from 'react';
import type { RouteRecord } from '@/lib/data';
import { Path } from './Path';

type Filter = 'all' | 'failing' | 'redirected' | 'ok';

const TABS: { key: Filter; label: string }[] = [
  { key: 'all',        label: 'All' },
  { key: 'failing',    label: 'Failing' },
  { key: 'redirected', label: 'Redirected' },
  { key: 'ok',         label: 'OK' },
];

/** Map an unknown verdict + http status to one of four buckets. */
function bucket(r: RouteRecord): 'ok' | 'redirected' | 'failing' | 'other' {
  const v = String(r.verdict);
  if (v === 'pass') return 'ok';
  if (v === 'variant-works' || v === 'auth-redirect' || r.redirected) return 'redirected';
  if (
    v === 'not-found' ||
    v === 'error' ||
    v === 'blocked' ||
    (typeof r.http_status === 'number' && r.http_status >= 400)
  ) {
    return 'failing';
  }
  return 'other';
}

/** Derive an HTTP-status-style chip from whatever fields are available. */
function statusInfo(r: RouteRecord): { label: string; color: string } {
  const v = String(r.verdict);
  if (typeof r.http_status === 'number') {
    const s = r.http_status;
    if (s >= 500) return { label: String(s), color: 'var(--warn)' };
    if (s >= 400) return { label: String(s), color: 'var(--fail)' };
    if (s >= 300) return { label: String(s), color: 'var(--accent)' };
    if (s >= 200) return { label: String(s), color: 'var(--pass)' };
  }
  if (v === 'pass')           return { label: '200', color: 'var(--pass)' };
  if (v === 'variant-works')  return { label: '3xx', color: 'var(--accent)' };
  if (v === 'auth-redirect')  return { label: '3xx', color: 'var(--accent)' };
  if (v === 'not-found')      return { label: '404', color: 'var(--fail)' };
  if (v === 'error')          return { label: 'ERR', color: 'var(--warn)' };
  if (v === 'blocked')        return { label: 'BLK', color: 'var(--neutral)' };
  if (v === 'unverifiable')   return { label: '—',   color: 'var(--neutral)' };
  return { label: '???', color: 'var(--neutral)' };
}

export function RoutesTable({ routes }: { routes: RouteRecord[] }) {
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return routes.filter((r) => {
      const b = bucket(r);
      const passesFilter =
        filter === 'all' ||
        (filter === 'ok' && b === 'ok') ||
        (filter === 'redirected' && b === 'redirected') ||
        (filter === 'failing' && b === 'failing');
      if (!passesFilter) return false;
      if (!q) return true;
      const hay =
        `${r.id} ${r.path} ${r.final_path ?? ''} ${r.suggested_path ?? ''} ${r.component ?? ''} ${r.module ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [routes, filter, query]);

  return (
    <>
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        {/* Segmented filter control */}
        <div className="flex items-center gap-0 border border-[var(--border)] bg-[var(--bg-elev)]/40 self-start">
          {TABS.map((t) => {
            const active = t.key === filter;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setFilter(t.key)}
                className={`mono text-[10px] tracking-wider uppercase px-3 py-[6px] border-r border-[var(--border)] last:border-r-0 transition-colors ${
                  active
                    ? 'text-[var(--accent)] bg-[var(--accent-dim)]'
                    : 'text-[var(--text-dim)] hover:text-[var(--text)]'
                }`}
                aria-pressed={active}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Search input */}
        <div className="relative flex items-center self-start border border-[var(--border)] bg-[var(--bg-elev)]/40 focus-within:border-[var(--border-bright)] transition-colors">
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className="ml-2 text-[var(--text-faint)] shrink-0"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" strokeLinecap="square" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by path, id, component…"
            aria-label="Search routes"
            className="mono text-[11px] bg-transparent text-[var(--text)] placeholder:text-[var(--text-faint)] px-2 py-[6px] outline-none w-[240px] sm:w-[280px]"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="mono text-[10px] text-[var(--text-faint)] hover:text-[var(--text)] px-2 py-[6px] border-l border-[var(--border)]"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Result count line */}
      {(query || filter !== 'all') && (
        <div className="mono text-[10px] text-[var(--text-faint)] tracking-wider uppercase mb-2 tabular">
          {visible.length} / {routes.length} routes
        </div>
      )}

      <div className="border border-[var(--border)] bg-[var(--bg-elev)]/40">
        {visible.length === 0 ? (
          <div className="px-4 py-6 mono text-[11px] text-[var(--text-faint)] tracking-wider uppercase">
            No routes match {query ? `"${query}"` : 'this filter'}.
          </div>
        ) : (
          visible.map((r) => <RouteRow key={`${r.id}-${r.path}`} route={r} />)
        )}
      </div>
    </>
  );
}

function RouteRow({ route }: { route: RouteRecord }) {
  const s = statusInfo(route);
  const finalPath =
    route.suggested_path ||
    (route.final_path && route.final_path !== route.path ? route.final_path : null);

  // Provenance row — only shown for failing routes. Answers "is this a real
  // route?" using fields extract-routes.js wrote to routes.json: the React
  // component name (when present, the developer wired this), module owner,
  // whether the path was pattern-inferred vs. extracted verbatim, and the
  // triage notes capturing why we believe it doesn't render.
  const showProvenance =
    bucket(route) === 'failing' &&
    (route.component || route.module || route.notes || route.inferred);

  return (
    <div className="border-b border-[var(--border)] last:border-b-0 row-hover px-4 py-2.5">
      <div className="flex items-center gap-4">
        {/* HTTP status chip */}
        <span
          className="mono text-[10px] tabular font-semibold px-1.5 py-[2px] border shrink-0 w-[44px] text-center"
          style={{ color: s.color, borderColor: `${s.color}40`, background: `${s.color}1a` }}
        >
          {s.label}
        </span>

        {/* Path + (optional) redirect arrow */}
        <div className="min-w-0 flex-1 flex items-baseline gap-2 flex-wrap">
          <div className="min-w-0 max-w-full truncate">
            <Path path={route.path} className="text-[var(--text-dim)]" />
          </div>
          {finalPath && (
            <>
              <span className="mono text-[11px] text-[var(--text-faint)] shrink-0">→</span>
              <div className="min-w-0 max-w-full truncate">
                <Path path={finalPath} className="text-[var(--text-faint)]" />
              </div>
            </>
          )}
        </div>

        {/* Route id */}
        <span className="mono text-[11px] text-[var(--text-faint)] tabular shrink-0 hidden sm:inline">
          {route.id}
        </span>
      </div>

      {showProvenance && <Provenance route={route} />}
    </div>
  );
}

function Provenance({ route }: { route: RouteRecord }) {
  const notes = Array.isArray(route.notes)
    ? route.notes.join(' · ')
    : (route.notes || '');
  return (
    <div className="mt-1.5 pl-[60px] flex flex-col gap-1">
      <div className="flex items-baseline gap-3 flex-wrap text-[11px]">
        {route.component && (
          <span className="flex items-baseline gap-1">
            <span className="eyebrow">Component</span>
            <span className="mono text-[var(--text)]">{route.component}</span>
          </span>
        )}
        {route.module && (
          <span className="flex items-baseline gap-1">
            <span className="eyebrow">Module</span>
            <span className="mono text-[var(--text-dim)]">{route.module}</span>
          </span>
        )}
        <span className="flex items-baseline gap-1">
          <span className="eyebrow">Path</span>
          <span
            className="mono"
            style={{
              color: route.inferred ? 'var(--warn)' : 'var(--text-dim)',
            }}
            title={
              route.inferred
                ? 'Path was inferred from naming convention — may not match the developer-registered route.'
                : 'Path was extracted verbatim from the production bundle.'
            }
          >
            {route.inferred ? 'inferred' : 'from bundle'}
          </span>
        </span>
      </div>
      {notes && (
        <div className="text-[11.5px] text-[var(--text-dim)] leading-snug">
          {notes}
        </div>
      )}
    </div>
  );
}
