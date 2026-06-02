import type { Verdict } from '@/lib/data';

export function HealthSummary({
  counts,
  total,
}: {
  counts: Record<Verdict, number>;
  total: number;
}) {
  // Health % treats skipped as neutral (excluded from denominator) and unknown
  // as failed (a page that wouldn't even load is not "healthy").
  const evaluable = counts.pass + counts.fail + counts.unknown;
  const healthPct = evaluable === 0 ? 100 : Math.round((counts.pass / evaluable) * 100);
  const healthState =
    healthPct >= 90 ? 'pass' : healthPct >= 60 ? 'warn' : 'fail';

  const healthColor = {
    pass: 'var(--pass)',
    warn: 'var(--warn)',
    fail: 'var(--fail)',
  }[healthState];

  return (
    <section className="border-b border-[var(--border)]">
      <div className="max-w-[1200px] mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-6">
          {/* Health gauge — the centerpiece */}
          <div
            className="rise relative border border-[var(--border)] bg-[var(--bg-elev)] p-6 overflow-hidden"
            style={{ animationDelay: '160ms' }}
          >
            {/* Corner brackets — mission control flourish */}
            <CornerBracket position="tl" />
            <CornerBracket position="tr" />
            <CornerBracket position="bl" />
            <CornerBracket position="br" />

            <div className="flex items-center gap-6">
              <HealthRing pct={healthPct} color={healthColor} />
              <div>
                <div className="eyebrow mb-2">Overall Health</div>
                <div
                  className="mono tabular text-[56px] leading-none font-semibold"
                  style={{ color: healthColor }}
                >
                  {healthPct}
                  <span className="text-[28px] text-[var(--text-faint)] ml-1">%</span>
                </div>
                <div className="mono text-[11px] text-[var(--text-dim)] mt-2">
                  {counts.pass} of {evaluable} evaluable issues passing
                </div>
              </div>
            </div>
          </div>

          {/* Verdict tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <VerdictTile label="Pass"    value={counts.pass}    total={total} color="var(--pass)"    delay={180} />
            <VerdictTile label="Fail"    value={counts.fail}    total={total} color="var(--fail)"    delay={220} />
            <VerdictTile label="Skipped" value={counts.skipped} total={total} color="var(--neutral)" delay={260} />
            <VerdictTile label="Unknown" value={counts.unknown} total={total} color="var(--warn)"    delay={300} />
          </div>
        </div>
      </div>
    </section>
  );
}

function HealthRing({ pct, color }: { pct: number; color: string }) {
  const size = 96;
  const stroke = 6;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct / 100);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={stroke}
        />
        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="butt"
          style={{ transition: 'stroke-dashoffset 800ms cubic-bezier(0.16,1,0.3,1)' }}
        />
        {/* Tick marks every 10% */}
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i / 12) * 360;
          const x1 = size / 2 + (r - stroke / 2 - 4) * Math.cos((angle * Math.PI) / 180);
          const y1 = size / 2 + (r - stroke / 2 - 4) * Math.sin((angle * Math.PI) / 180);
          const x2 = size / 2 + (r - stroke / 2 - 1) * Math.cos((angle * Math.PI) / 180);
          const y2 = size / 2 + (r - stroke / 2 - 1) * Math.sin((angle * Math.PI) / 180);
          return (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 12px ${color}` }} />
      </div>
    </div>
  );
}

function VerdictTile({
  label,
  value,
  total,
  color,
  delay,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
  delay: number;
}) {
  const pct = total === 0 ? 0 : Math.round((value / total) * 100);

  return (
    <div
      className="rise relative border border-[var(--border)] bg-[var(--bg-elev)] p-4 overflow-hidden group"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Top accent bar */}
      <div className="absolute top-0 left-0 h-[2px] transition-all duration-500" style={{ width: `${pct}%`, background: color }} />

      <div className="flex items-center justify-between mb-3">
        <span className="eyebrow no-select">{label}</span>
        <span className="w-1.5 h-1.5" style={{ background: color }} />
      </div>
      <div className="flex items-baseline gap-1.5">
        <span
          className="mono tabular text-[32px] leading-none font-semibold"
          style={{ color: value > 0 ? color : 'var(--text-faint)' }}
        >
          {value}
        </span>
        <span className="mono text-[11px] text-[var(--text-faint)]">/ {total}</span>
      </div>
      <div className="mono text-[10px] text-[var(--text-faint)] mt-2 tabular">{pct}%</div>
    </div>
  );
}

function CornerBracket({ position }: { position: 'tl' | 'tr' | 'bl' | 'br' }) {
  const cls = {
    tl: 'top-2 left-2 border-l border-t',
    tr: 'top-2 right-2 border-r border-t',
    bl: 'bottom-2 left-2 border-l border-b',
    br: 'bottom-2 right-2 border-r border-b',
  }[position];
  return <div className={`absolute w-2 h-2 border-[var(--border-bright)] ${cls}`} />;
}
