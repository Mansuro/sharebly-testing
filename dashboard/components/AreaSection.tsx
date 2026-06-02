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
  const passCount = issues.filter((i) => i.verdict === 'pass').length;
  const failCount = issues.filter((i) => i.verdict === 'fail').length;
  const skippedCount = issues.filter((i) => i.verdict === 'skipped').length;
  const unknownCount = issues.filter((i) => i.verdict === 'unknown').length;

  return (
    <section
      className="rise rule-l pl-6"
      style={{ animationDelay: `${380 + index * 60}ms` }}
    >
      <header className="flex items-center justify-between gap-4 mb-3">
        <div className="flex items-baseline gap-3">
          <h2 className="text-[18px] font-medium tracking-tight text-[var(--text)]">{area}</h2>
          <span className="mono text-[11px] text-[var(--text-faint)] tabular">
            {issues.length} {issues.length === 1 ? 'issue' : 'issues'}
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
        {issues.map((issue) => (
          <IssueRow key={`${issue.id}-${issue.path}`} issue={issue} />
        ))}
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
