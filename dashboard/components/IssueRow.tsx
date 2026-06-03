'use client';

import { useState } from 'react';
import type { IssueResult, IssueStatus } from '@/lib/data';
import { VerdictPill } from './VerdictPill';
import { Path } from './Path';

function StatusBadge({ status }: { status: IssueStatus }) {
  if (status === 'resolved') {
    return (
      <span
        className="mono text-[10px] tabular font-semibold px-1.5 py-[1px] border"
        style={{
          color: 'var(--pass)',
          borderColor: 'rgba(74, 222, 128, 0.35)',
          background: 'rgba(74, 222, 128, 0.08)',
        }}
        title="Marked as resolved — runner still checks for regressions"
      >
        ✓ SOLVED
      </span>
    );
  }
  if (status === 'wontfix') {
    return (
      <span
        className="mono text-[10px] tabular font-semibold px-1.5 py-[1px] border"
        style={{
          color: 'var(--neutral)',
          borderColor: 'var(--border)',
          background: 'transparent',
        }}
        title="Accepted as-is — runner skips this page"
      >
        · WONTFIX
      </span>
    );
  }
  return null;
}

export function IssueRow({ issue }: { issue: IssueResult }) {
  const [open, setOpen] = useState(false);

  const failedGeneric = issue.generic_checks.filter((c) => !c.ok);
  const hasDetails =
    failedGeneric.length > 0 ||
    issue.rule_check !== null ||
    issue.page_data !== null ||
    issue.reason !== undefined;

  return (
    <div className="border-b border-[var(--border)] last:border-b-0">
      <button
        type="button"
        onClick={() => hasDetails && setOpen((v) => !v)}
        disabled={!hasDetails}
        aria-expanded={open}
        className={`w-full text-left px-4 py-3 row-hover flex items-start gap-4 ${
          hasDetails ? 'cursor-pointer' : 'cursor-default'
        }`}
      >
        {/* Verdict */}
        <div className="shrink-0 pt-[2px]">
          <VerdictPill verdict={issue.verdict} />
        </div>

        {/* Main content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="mono text-[12px] font-medium text-[var(--text)]">{issue.id}</span>
            <StatusBadge status={issue.issue_status} />
            <Path path={issue.path} className="text-[var(--text-dim)] truncate" />
          </div>
          <div className="text-[13px] text-[var(--text-dim)] mt-1 leading-snug">{issue.description}</div>
          {issue.source && (
            <div className="text-[10.5px] text-[var(--text-faint)] mono mt-1 flex items-baseline gap-1.5 flex-wrap">
              <span className="tracking-wider uppercase">From</span>
              <a
                href={issue.source.sheet_url}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-[var(--text-dim)] hover:text-[var(--accent)] underline decoration-dotted underline-offset-[3px] transition-colors"
              >
                {issue.source.sheet_section}
                <span className="ml-1">↗</span>
              </a>
            </div>
          )}
        </div>

        {/* Chevron / details indicator */}
        {hasDetails && (
          <div className="shrink-0 pt-1 text-[var(--text-faint)]">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={`transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
            >
              <path d="M9 6l6 6-6 6" strokeLinecap="square" />
            </svg>
          </div>
        )}
      </button>

      {open && (
        <div className="px-4 pb-4 pl-[68px] space-y-3 bg-[var(--bg-elev)]/40 border-t border-[var(--border)]">
          {issue.reason && (
            <DetailBlock label="REASON">
              <span className="text-[var(--text-dim)] text-[12.5px]">{issue.reason}</span>
            </DetailBlock>
          )}

          {issue.page_data && (
            <DetailBlock label="PAGE">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-1.5 text-[12px]">
                <Metric label="HTTP" value={String(issue.page_data.http_status)} highlight={issue.page_data.http_status >= 400} />
                <Metric
                  label="IMAGES"
                  value={`${issue.page_data.total_images - issue.page_data.broken_images}/${issue.page_data.total_images}`}
                  highlight={issue.page_data.broken_images > 0}
                />
                <Metric
                  label="CONSOLE ERR"
                  value={String(issue.page_data.console_error_count)}
                  highlight={issue.page_data.console_error_count > 0}
                />
                <Metric
                  label="PAGE ERR"
                  value={String(issue.page_data.page_error_count)}
                  highlight={issue.page_data.page_error_count > 0}
                />
                {issue.page_data.final_path && (
                  <div className="col-span-full flex gap-2 items-baseline">
                    <span className="eyebrow shrink-0">FINAL</span>
                    <Path path={issue.page_data.final_path} className="text-[var(--text-dim)]" />
                  </div>
                )}
                {issue.page_data.nav_error && (
                  <div className="col-span-full flex gap-2 items-baseline">
                    <span className="eyebrow shrink-0 text-[var(--fail)]">NAV ERROR</span>
                    <span className="mono text-[11.5px] text-[var(--fail)]">{issue.page_data.nav_error}</span>
                  </div>
                )}
              </div>
            </DetailBlock>
          )}

          {failedGeneric.length > 0 && (
            <DetailBlock label="GENERIC CHECKS FAILED">
              <ul className="space-y-1.5">
                {failedGeneric.map((c) => (
                  <li key={c.name} className="flex items-baseline gap-2 text-[12px]">
                    <span className="mono shrink-0 text-[var(--fail)] font-semibold">×</span>
                    <span className="mono text-[var(--text)]">{c.name}</span>
                    <span className="text-[var(--text-dim)]">— {c.detail}</span>
                  </li>
                ))}
              </ul>
            </DetailBlock>
          )}

          {issue.rule_check && (
            <DetailBlock label={`RULE · ${issue.rule_check.name}`}>
              <div className="flex items-baseline gap-2 text-[12px]">
                <span
                  className={`mono shrink-0 font-semibold ${
                    issue.rule_check.ok ? 'text-[var(--pass)]' : 'text-[var(--fail)]'
                  }`}
                >
                  {issue.rule_check.ok ? '✓' : '×'}
                </span>
                <span className="text-[var(--text-dim)]">{issue.rule_check.detail}</span>
              </div>
            </DetailBlock>
          )}
        </div>
      )}
    </div>
  );
}

function DetailBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="pt-3">
      <div className="eyebrow mb-1.5">{label}</div>
      {children}
    </div>
  );
}

function Metric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="eyebrow shrink-0">{label}</span>
      <span
        className={`mono tabular text-[12.5px] ${
          highlight ? 'text-[var(--fail)]' : 'text-[var(--text)]'
        }`}
      >
        {value}
      </span>
    </div>
  );
}
