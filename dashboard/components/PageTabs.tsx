'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type Tab = {
  href: string;
  label: string;
  count?: number;
};

export function PageTabs({ tabs }: { tabs: Tab[] }) {
  const pathname = usePathname();

  return (
    <nav className="border-b border-[var(--border)]">
      <div className="max-w-[1200px] mx-auto px-6 flex items-center gap-0">
        {tabs.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              prefetch
              className={`mono text-[11px] uppercase tracking-[0.12em] px-4 py-3 border-b-2 transition-colors flex items-center gap-2 ${
                active
                  ? 'border-[var(--accent)] text-[var(--accent)]'
                  : 'border-transparent text-[var(--text-dim)] hover:text-[var(--text)]'
              }`}
              aria-current={active ? 'page' : undefined}
            >
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span
                  className={`tabular text-[10px] ${
                    active ? 'text-[var(--accent)] opacity-80' : 'text-[var(--text-faint)]'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
