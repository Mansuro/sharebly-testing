// SolvedRegressionAlert
//
// Top-of-page alert for the worst kind of failure: an issue that was
// previously marked as `resolved` by a human, but is now failing again.
// That means a regression slipped past the fix. Styled like DiffCallout
// with kind="broken" so it inherits the visual language of "newly broken"
// without sharing the same component (this one has its own copy + eyebrow).

import type { IssueResult } from '@/lib/data';
import { Path } from './Path';

const COLOR = 'var(--fail)';
const BORDER = 'rgba(248, 113, 113, 0.45)';

export function SolvedRegressionAlert({
  issues,
  delay = 0,
}: {
  issues: IssueResult[];
  delay?: number;
}) {
  if (issues.length === 0) return null;

  return (
    <div
      className="rise border bg-[var(--bg-elev)] p-5 md:col-span-2"
      style={{
        animationDelay: `${delay}ms`,
        borderColor: BORDER,
        boxShadow: `inset 3px 0 0 0 ${COLOR}`,
      }}
    >
      <div className="flex items-center gap-2 mb-4">
        <span style={{ color: COLOR }}>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path
              d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span className="eyebrow" style={{ color: COLOR, opacity: 0.9 }}>
          REGRESSION DETECTED
        </span>
        <span className="mono text-[10px] text-[var(--text-faint)] ml-auto tabular">
          {issues.length} {issues.length === 1 ? 'item' : 'items'}
        </span>
      </div>
      <h3 className="text-[15px] font-medium text-[var(--text)] mb-4">
        Solved issues that are failing again
      </h3>
      <ul className="space-y-2.5">
        {issues.map((issue) => (
          <li
            key={issue.id}
            className="flex items-start gap-3 text-[13px] leading-snug"
          >
            <span
              className="mono shrink-0 mt-[3px] inline-block w-1.5 h-1.5"
              style={{ background: COLOR }}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="mono text-[11px] font-semibold"
                  style={{ color: COLOR }}
                >
                  {issue.id}
                </span>
                <Path path={issue.path} className="text-[var(--text-dim)]" />
              </div>
              <div className="text-[var(--text-dim)] mt-0.5 text-[12.5px]">
                {issue.description}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
