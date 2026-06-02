'use client';

import { useState } from 'react';
import type { IssueResult } from '@/lib/data';
import { IssueRow } from './IssueRow';

export function AreaSection({
  area,
  issues,
  index,
}: {
  area: string;
  issues: IssueResult[];
  index: number;
}) {
  // Split by status. `wontfix` is hidden from the main list entirely; the
  // user accepted these and doesn't want them cluttering the surface.
  // `resolved` issues that still pass collapse into a small footer chip so
  // the area stays focused on the issues that actually need attention.
  // Resolved-but-failing issues stay inline — they ARE regressions and we
  // want them in the user's face alongside other active failures.
  const wontfix = issues.filter((i) => i.issue_status === 'wontfix');
  const solvedPassing = issues.filter(
    (i) => i.issue_status === 'resolved' && i.verdict !== 'fail',
  );
  const visible = issues.filter(
    (i) =>
      i.issue_status !== 'wontfix' &&
      !(i.issue_status === 'resolved' && i.verdict !== 'fail'),
  );

  // Count chips count active + resolved, wontfix excluded by request.
  const counted = issues.filter((i) => i.issue_status !== 'wontfix');
  const passCount    = counted.filter((i) => i.verdict === 'pass').length;
  const failCount    = counted.filter((i) => i.verdict === 'fail').length;
  const skippedCount = counted.filter((i) => i.verdict === 'skipped').length;
  const unknownCount = counted.filter((i) => i.verdict === 'unknown').length;

  const [solvedOpen, setSolvedOpen] = useState(false);

  return (
    <section
      className="rise rule-l pl-6"
      style={{ animationDelay: `${380 + index * 60}ms` }}
    >
      <header className="flex items-center justify-between gap-4 mb-3">
        <div className="flex items-baseline gap-3">
          <h2 className="text-[18px] font-medium tracking-tight text-[var(--text)]">{area}</h2>
          <span className="mono text-[11px] text-[var(--text-faint)] tabular">
            {counted.length} {counted.length === 1 ? 'issue' : 'issues'}
            {wontfix.length > 0 && (
              <span className="ml-2 opacity-70">
                · {wontfix.length} wontfix hidden
              </span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <CountChip n={passCount}    color="var(--pass)"    label="P" />
          <CountChip n={failCount}    color="var(--fail)"    label="F" />
          <CountChip n={skippedCount} color="var(--neutral)" label="S" />
          <CountChip n={unknownCount} color="var(--warn)"    label="U" />
        </div>
      </header>

      <div className="border border-[var(--border)] bg-[var(--bg-elev)]/40">
        {visible.length === 0 ? (
          <div className="px-4 py-3 text-[12.5px] text-[var(--text-faint)] mono">
            no active issues in this area
          </div>
        ) : (
          visible.map((issue) => (
            <IssueRow key={`${issue.id}-${issue.path}`} issue={issue} />
          ))
        )}

        {solvedPassing.length > 0 && (
          <div className="border-t border-[var(--border)]">
            <button
              type="button"
              onClick={() => setSolvedOpen((v) => !v)}
              aria-expanded={solvedOpen}
              className="w-full text-left px-4 py-2 row-hover flex items-center gap-2 cursor-pointer"
            >
              <span
                className="mono text-[10px] tabular font-semibold px-1.5 py-[1px] border"
                style={{
                  color: 'var(--pass)',
                  borderColor: 'rgba(74, 222, 128, 0.35)',
                  background: 'rgba(74, 222, 128, 0.08)',
                }}
              >
                ✓ {solvedPassing.length} SOLVED
              </span>
              <span className="text-[11.5px] text-[var(--text-faint)]">
                {solvedPassing.length === 1
                  ? 'issue marked resolved & passing — kept under regression watch'
                  : 'issues marked resolved & passing — kept under regression watch'}
              </span>
              <span className="ml-auto text-[var(--text-faint)]">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className={`transition-transform duration-200 ${solvedOpen ? 'rotate-90' : ''}`}
                >
                  <path d="M9 6l6 6-6 6" strokeLinecap="square" />
                </svg>
              </span>
            </button>
            {solvedOpen && (
              <div className="border-t border-[var(--border)]">
                {solvedPassing.map((issue) => (
                  <IssueRow key={`${issue.id}-${issue.path}`} issue={issue} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
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
