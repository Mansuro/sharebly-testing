/**
 * Renders a URL path with dimmed slashes and amber-tinted segments,
 * so a route reads like `/profile/dashboard` at a glance without the
 * slashes drowning out the segments.
 */
export function Path({ path, className = '' }: { path: string; className?: string }) {
  const [pathname, query] = path.split('?');
  const segments = pathname.split('/').filter(Boolean);

  return (
    <span className={`mono text-[12px] ${className}`}>
      {segments.length === 0 ? (
        <span className="text-[var(--text-faint)]">/</span>
      ) : (
        segments.map((seg, i) => (
          <span key={i}>
            <span className="text-[var(--text-faint)]">/</span>
            <span className="text-[var(--text)]">{seg}</span>
          </span>
        ))
      )}
      {query ? (
        <>
          <span className="text-[var(--text-faint)]">?</span>
          <span className="text-[var(--accent)]/80">{decodeURIComponent(query)}</span>
        </>
      ) : null}
    </span>
  );
}
