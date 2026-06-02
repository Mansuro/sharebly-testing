import type { ScenarioResult } from '@/lib/data';
import { groupScenariosByArea } from '@/lib/data';
import { ScenarioCard } from './ScenarioCard';

export function ScenariosSection({ results }: { results: ScenarioResult[] }) {
  const grouped = groupScenariosByArea(results);
  const areas = Array.from(grouped.entries());

  return (
    <section className="max-w-[1200px] mx-auto px-6 py-10 border-b border-[var(--border)]">
      <div
        className="rise flex items-center justify-between mb-8 flex-wrap gap-3"
        style={{ animationDelay: '330ms' }}
      >
        <div>
          <div className="eyebrow mb-1.5">End-to-End Workflows</div>
          <h2 className="text-[22px] font-light tracking-tight text-[var(--text)]">
            Workflow Scenarios
          </h2>
        </div>
        <StepLegend />
      </div>

      <div className="space-y-10">
        {areas.map(([area, scenarios], i) => (
          <ScenarioArea key={area} area={area} scenarios={scenarios} index={i} />
        ))}
      </div>
    </section>
  );
}

function ScenarioArea({
  area,
  scenarios,
  index,
}: {
  area: string;
  scenarios: ScenarioResult[];
  index: number;
}) {
  const passCount = scenarios.filter((s) => s.verdict === 'pass').length;
  const failCount = scenarios.filter((s) => s.verdict === 'fail').length;
  const skippedCount = scenarios.filter((s) => s.verdict === 'skipped').length;
  const unknownCount = scenarios.filter((s) => s.verdict === 'unknown').length;

  return (
    <section
      className="rise rule-l pl-6"
      style={{ animationDelay: `${360 + index * 60}ms` }}
    >
      <header className="flex items-center justify-between gap-4 mb-3">
        <div className="flex items-baseline gap-3">
          <h3 className="text-[18px] font-medium tracking-tight text-[var(--text)]">
            {area}
          </h3>
          <span className="mono text-[11px] text-[var(--text-faint)] tabular">
            {scenarios.length} {scenarios.length === 1 ? 'scenario' : 'scenarios'}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <CountChip n={passCount}    color="var(--pass)"    label="P" />
          <CountChip n={failCount}    color="var(--fail)"    label="F" />
          <CountChip n={skippedCount} color="var(--neutral)" label="S" />
          <CountChip n={unknownCount} color="var(--warn)"    label="U" />
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {scenarios.map((scenario) => (
          <ScenarioCard key={scenario.id} scenario={scenario} />
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

// Step-bar legend: maps the per-step cell colors used inside each card.
function StepLegend() {
  return (
    <div className="flex items-center gap-3 mono text-[10px] tracking-wider">
      <span className="eyebrow no-select mr-1">Step</span>
      {[
        ['PASS', 'var(--pass)'],
        ['FAIL', 'var(--fail)'],
        ['NOT RUN', 'var(--neutral)'],
      ].map(([label, color]) => (
        <span key={label} className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-3" style={{ background: color }} />
          <span className="text-[var(--text-dim)]">{label}</span>
        </span>
      ))}
    </div>
  );
}
