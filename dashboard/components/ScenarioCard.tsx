'use client';

import { useState } from 'react';
import type { ScenarioResult, StepResult } from '@/lib/data';
import { VerdictPill } from './VerdictPill';

export function ScenarioCard({ scenario }: { scenario: ScenarioResult }) {
  const [open, setOpen] = useState(false);

  const totalSteps = scenario.step_results.length;
  const passedSteps = scenario.step_results.filter((s) => s.ok === true).length;
  const failedStep = scenario.step_results.find((s) => s.ok === false);
  const totalMs = scenario.step_results.reduce(
    (acc, s) => acc + (s.duration_ms || 0),
    0,
  );

  return (
    <div className="border border-[var(--border)] bg-[var(--bg-elev)]/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full text-left p-4 row-hover flex flex-col gap-3 cursor-pointer"
      >
        <div className="flex items-start gap-3">
          <div className="shrink-0 pt-[2px]">
            <VerdictPill verdict={scenario.verdict} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-[13.5px] text-[var(--text)] font-medium leading-tight">
                {scenario.name}
              </span>
              <span className="mono text-[10.5px] text-[var(--text-faint)]">
                {scenario.id}
              </span>
            </div>
            <div className="text-[12.5px] text-[var(--text-dim)] mt-1 leading-snug">
              {scenario.description}
            </div>
          </div>
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
        </div>

        <StepBar steps={scenario.step_results} />

        <div className="flex items-center justify-between mono text-[10.5px] tabular text-[var(--text-faint)]">
          <span>
            {passedSteps}/{totalSteps} steps
            <span className="mx-1.5 opacity-50">·</span>
            {totalMs}ms
          </span>
          {failedStep && (
            <span className="text-[var(--fail)]">
              failed at step {scenario.step_results.indexOf(failedStep) + 1}
            </span>
          )}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 space-y-2 border-t border-[var(--border)] bg-[var(--bg-elev)]/60">
          {scenario.reason && (
            <div className="pt-3">
              <div className="eyebrow mb-1.5">REASON</div>
              <div className="text-[var(--text-dim)] text-[12.5px]">
                {scenario.reason}
              </div>
            </div>
          )}
          <div className="pt-3">
            <div className="eyebrow mb-2">STEPS</div>
            <ol className="space-y-1.5">
              {scenario.step_results.map((step, i) => (
                <StepDetailRow key={i} step={step} index={i} />
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}

function StepBar({ steps }: { steps: StepResult[] }) {
  if (steps.length === 0) return null;
  return (
    <div className="flex items-center gap-[3px]">
      {steps.map((step, i) => {
        const color =
          step.ok === true ? 'var(--pass)'
          : step.ok === false ? 'var(--fail)'
          : 'var(--neutral)';
        const opacity = step.ok === null ? 0.35 : 1;
        return (
          <span
            key={i}
            title={`${i + 1}. ${step.kind}${step.error ? ` — ${step.error}` : ''}`}
            className="inline-block"
            style={{
              width: 8,
              height: 16,
              background: color,
              opacity,
            }}
          />
        );
      })}
    </div>
  );
}

function StepDetailRow({ step, index }: { step: StepResult; index: number }) {
  const color =
    step.ok === true ? 'var(--pass)'
    : step.ok === false ? 'var(--fail)'
    : 'var(--neutral)';
  const glyph =
    step.ok === true ? '✓'
    : step.ok === false ? '×'
    : '–';

  return (
    <li className="flex items-start gap-2.5 text-[12px]">
      <span className="mono shrink-0 text-[var(--text-faint)] tabular w-5">
        {String(index + 1).padStart(2, '0')}
      </span>
      <span
        className="mono shrink-0 font-semibold"
        style={{ color, width: 12 }}
      >
        {glyph}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="mono text-[var(--text)] font-medium">{step.kind}</span>
          <span className="mono text-[var(--text-dim)] truncate">
            {summarizeParams(step)}
          </span>
        </div>
        {step.error && (
          <div className="mono text-[11.5px] text-[var(--fail)] mt-0.5 leading-snug">
            {step.error}
          </div>
        )}
      </div>
      {step.ok !== null && (
        <span className="mono text-[10.5px] tabular text-[var(--text-faint)] shrink-0">
          {step.duration_ms}ms
        </span>
      )}
    </li>
  );
}

// Render a compact human-readable summary for a step's params, e.g.
// `goto /profile`, `fill input[type="password"] = $PASSWORD`, `expect_text "Welcome"`.
function summarizeParams(step: StepResult): string {
  const p = step.params || {};
  switch (step.kind) {
    case 'goto':
      return String(p.path ?? '');
    case 'click':
      if (p.selector) return String(p.selector);
      if (p.text) return `"${p.text}"`;
      return '';
    case 'fill': {
      const sel = p.selector ? String(p.selector) : '';
      const val = p.value !== undefined ? String(p.value) : '';
      return `${sel} = ${val}`;
    }
    case 'expect_text':
      return `"${p.text ?? ''}"`;
    case 'expect_url':
      return `contains "${p.contains ?? ''}"`;
    case 'expect_visible':
      return String(p.selector ?? '');
    case 'wait':
      return `${p.ms ?? 0}ms`;
    default:
      return JSON.stringify(p);
  }
}
