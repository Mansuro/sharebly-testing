export function EmptyState({ dataUrl }: { dataUrl: string }) {
  const displayUrl =
    dataUrl === 'https://raw.githubusercontent.com/REPLACE_ME/REPLACE_ME/data/issue-results.json'
      ? null
      : dataUrl;

  return (
    <div className="max-w-[720px] mx-auto px-6 py-24">
      <div className="rise border border-[var(--border)] bg-[var(--bg-elev)] p-8 relative overflow-hidden">
        <CornerBracket position="tl" />
        <CornerBracket position="tr" />
        <CornerBracket position="bl" />
        <CornerBracket position="br" />

        <div className="flex items-center gap-3 mb-4">
          <div className="w-2 h-2 bg-[var(--warn)] pulse-dot" />
          <span className="eyebrow text-[var(--warn)]">NO DATA · STANDBY</span>
        </div>

        <h2 className="text-[24px] font-light text-[var(--text)] mb-3 tracking-tight">
          Waiting on first verification run.
        </h2>

        <p className="text-[14px] text-[var(--text-dim)] leading-relaxed mb-6 max-w-[58ch]">
          The dashboard could not reach <span className="mono text-[var(--text)]">DATA_URL</span>.
          This is expected before the GitHub Action has published its first{' '}
          <span className="mono text-[var(--text)]">issue-results.json</span> to the{' '}
          <span className="mono text-[var(--accent)]">data</span> branch.
        </p>

        <div className="space-y-3 text-[12.5px]">
          <Checklist
            done={displayUrl !== null}
            label="Set DATA_URL env var on your Vercel deployment"
          />
          <Checklist
            done={false}
            label="Trigger the verify workflow at least once (Actions tab → Run workflow)"
          />
          <Checklist
            done={false}
            label="Confirm the data branch contains issue-results.json"
          />
        </div>

        {displayUrl && (
          <div className="mt-6 pt-6 border-t border-[var(--border)]">
            <div className="eyebrow mb-2">CONFIGURED DATA URL</div>
            <div className="mono text-[11px] text-[var(--text-dim)] break-all scrollbar-thin">
              {displayUrl}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Checklist({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`shrink-0 w-4 h-4 border flex items-center justify-center ${
          done ? 'border-[var(--pass)] bg-[var(--pass-dim)]' : 'border-[var(--border-bright)]'
        }`}
      >
        {done && (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--pass)" strokeWidth="3">
            <path d="M20 6L9 17l-5-5" strokeLinecap="square" />
          </svg>
        )}
      </span>
      <span className={done ? 'text-[var(--text-dim)] line-through' : 'text-[var(--text)]'}>
        {label}
      </span>
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
