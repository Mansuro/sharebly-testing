import { formatRelativeTime } from '@/lib/data';

export function Header({
  baseUrl,
  checkedAt,
  authenticated,
  totalIssues,
}: {
  baseUrl: string;
  checkedAt: string;
  authenticated: boolean;
  totalIssues: number;
}) {
  const absolute = new Date(checkedAt).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <header className="border-b border-[var(--border)]">
      <div className="max-w-[1200px] mx-auto px-6 py-7">
        <div className="flex items-start justify-between gap-8 flex-wrap">
          {/* Identity block */}
          <div className="rise" style={{ animationDelay: '40ms' }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="relative w-2 h-2 no-select">
                <span className="pulse-ring absolute inset-0 rounded-full bg-[var(--accent)]" />
                <span className="pulse-dot absolute inset-0 rounded-full bg-[var(--accent)] shadow-[0_0_12px_rgba(245,185,66,0.7)]" />
              </div>
              <span className="eyebrow">Sharebly · Verification Surface</span>
            </div>
            <h1 className="text-[42px] leading-[1.05] font-extralight tracking-[-0.025em] text-[var(--text)]">
              Issue <span className="font-semibold text-[var(--accent)]">Verifier</span>
            </h1>
            <p className="mt-2 text-[13px] text-[var(--text-dim)] max-w-md">
              Continuous mechanical re-check of known UI defects against the live target.
              Tracked: <span className="mono text-[var(--text)]">{totalIssues}</span> issues.
            </p>
          </div>

          {/* Meta block */}
          <div className="rise flex flex-col gap-3 min-w-[300px]" style={{ animationDelay: '120ms' }}>
            <MetaRow label="TARGET">
              <a
                href={baseUrl}
                target="_blank"
                rel="noreferrer"
                className="mono text-[12px] text-[var(--text)] hover:text-[var(--accent)] transition-colors"
              >
                {baseUrl.replace(/^https?:\/\//, '')}
                <span className="text-[var(--text-faint)] ml-1.5">↗</span>
              </a>
            </MetaRow>
            <MetaRow label="LAST RUN">
              <span
                className="mono text-[12px] text-[var(--text)] cursor-help underline decoration-[var(--text-faint)] decoration-dotted underline-offset-[3px]"
                title={absolute}
              >
                {formatRelativeTime(checkedAt)}
              </span>
            </MetaRow>
            <MetaRow label="SESSION">
              <AuthBadge authenticated={authenticated} />
            </MetaRow>
          </div>
        </div>
      </div>
    </header>
  );
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6 border-b border-[var(--border)] pb-2">
      <span className="eyebrow no-select">{label}</span>
      {children}
    </div>
  );
}

function AuthBadge({ authenticated }: { authenticated: boolean }) {
  return (
    <span
      className={`mono inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-wider px-2 py-[3px] border ${
        authenticated
          ? 'text-[var(--pass)] bg-[var(--pass-dim)] border-[var(--pass)]/30'
          : 'text-[var(--text-dim)] bg-[var(--neutral-dim)] border-[var(--neutral)]/30'
      }`}
    >
      <span className={`inline-block w-1 h-1 ${authenticated ? 'bg-[var(--pass)]' : 'bg-[var(--neutral)]'}`} />
      {authenticated ? 'AUTHENTICATED' : 'ANONYMOUS'}
    </span>
  );
}
