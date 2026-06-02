import type { IssueResult } from '@/lib/data';
import { Path } from './Path';

type Kind = 'fixed' | 'broken';

const CONFIG: Record<Kind, { label: string; eyebrow: string; color: string; dim: string; border: string; icon: React.ReactNode }> = {
  fixed: {
    label: 'Newly fixed since last run',
    eyebrow: 'REGRESSION CLEARED',
    color: 'var(--pass)',
    dim: 'var(--pass-dim)',
    border: 'rgba(74, 222, 128, 0.3)',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M20 6L9 17l-5-5" strokeLinecap="square" />
      </svg>
    ),
  },
  broken: {
    label: 'Newly broken since last run',
    eyebrow: 'NEW REGRESSION',
    color: 'var(--fail)',
    dim: 'var(--fail-dim)',
    border: 'rgba(248, 113, 113, 0.3)',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeLinejoin="round" />
      </svg>
    ),
  },
};

export function DiffCallout({
  kind,
  issues,
  delay = 0,
}: {
  kind: Kind;
  issues: IssueResult[];
  delay?: number;
}) {
  if (issues.length === 0) return null;
  const c = CONFIG[kind];

  return (
    <div
      className="rise border bg-[var(--bg-elev)] p-5"
      style={{
        animationDelay: `${delay}ms`,
        borderColor: c.border,
        boxShadow: `inset 3px 0 0 0 ${c.color}`,
      }}
    >
      <div className="flex items-center gap-2 mb-4">
        <span style={{ color: c.color }}>{c.icon}</span>
        <span className="eyebrow" style={{ color: c.color, opacity: 0.9 }}>{c.eyebrow}</span>
        <span className="mono text-[10px] text-[var(--text-faint)] ml-auto tabular">
          {issues.length} {issues.length === 1 ? 'item' : 'items'}
        </span>
      </div>
      <h3 className="text-[15px] font-medium text-[var(--text)] mb-4">{c.label}</h3>
      <ul className="space-y-2.5">
        {issues.map((issue) => (
          <li
            key={issue.id}
            className="flex items-start gap-3 text-[13px] leading-snug"
          >
            <span
              className="mono shrink-0 mt-[3px] inline-block w-1.5 h-1.5"
              style={{ background: c.color }}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="mono text-[11px] font-semibold" style={{ color: c.color }}>
                  {issue.id}
                </span>
                <Path path={issue.path} className="text-[var(--text-dim)]" />
              </div>
              <div className="text-[var(--text-dim)] mt-0.5 text-[12.5px]">{issue.description}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
