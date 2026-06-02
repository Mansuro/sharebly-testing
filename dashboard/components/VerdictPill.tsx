import type { Verdict } from '@/lib/data';

const STYLES: Record<Verdict, { label: string; bg: string; text: string; border: string; dot: string }> = {
  pass:    { label: 'PASS',    bg: 'bg-[var(--pass-dim)]',    text: 'text-[var(--pass)]',    border: 'border-[var(--pass)]/30',    dot: 'bg-[var(--pass)]' },
  fail:    { label: 'FAIL',    bg: 'bg-[var(--fail-dim)]',    text: 'text-[var(--fail)]',    border: 'border-[var(--fail)]/30',    dot: 'bg-[var(--fail)]' },
  skipped: { label: 'SKIP',    bg: 'bg-[var(--neutral-dim)]', text: 'text-[var(--neutral)]', border: 'border-[var(--neutral)]/30', dot: 'bg-[var(--neutral)]' },
  unknown: { label: 'UNKNOWN', bg: 'bg-[var(--warn-dim)]',    text: 'text-[var(--warn)]',    border: 'border-[var(--warn)]/30',    dot: 'bg-[var(--warn)]' },
};

export function VerdictPill({ verdict, size = 'sm' }: { verdict: Verdict; size?: 'sm' | 'xs' }) {
  const s = STYLES[verdict];
  const sizing =
    size === 'xs'
      ? 'text-[9px] px-1.5 py-[2px] gap-1'
      : 'text-[10px] px-2 py-[3px] gap-1.5';
  return (
    <span
      className={`mono inline-flex items-center font-semibold tracking-wider border ${s.bg} ${s.text} ${s.border} ${sizing}`}
    >
      <span className={`inline-block w-1 h-1 ${s.dot}`} />
      {s.label}
    </span>
  );
}
