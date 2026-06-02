// Data layer: TypeScript types matching verify/output/issue-results.json
// and a server-side fetcher that revalidates every 60s.

export type Verdict = 'pass' | 'fail' | 'skipped' | 'unknown';

export type GenericCheck = {
  name: string;
  ok: boolean;
  detail: string;
};

export type RuleCheck = {
  name: string;
  ok: boolean;
  detail: string;
};

export type PageData = {
  final_path: string | null;
  http_status: number;
  total_images: number;
  broken_images: number;
  console_error_count: number;
  page_error_count: number;
  nav_error: string | null;
};

export type IssueStatus = 'active' | 'resolved' | 'wontfix';

export type IssueResult = {
  id: string;
  path: string;
  area: string;
  description: string;
  rule: string | null;
  verdict: Verdict;
  reason?: string;
  generic_checks: GenericCheck[];
  rule_check: RuleCheck | null;
  page_data: PageData | null;
  issue_status: IssueStatus;
};

export type IssueResultsFile = {
  base_url: string;
  checked_at: string;
  total_issues: number;
  authenticated: boolean;
  results: IssueResult[];
  diff_vs_previous?: {
    newly_fixed: string[];
    newly_broken: string[];
  };
};

const DATA_URL =
  process.env.DATA_URL ||
  'https://raw.githubusercontent.com/REPLACE_ME/REPLACE_ME/data/issue-results.json';

/**
 * Fetch the latest verifier output. Cached and revalidated every 60s.
 * Returns null if the source is unreachable so the page can render an
 * empty-state instead of crashing.
 */
export async function getResults(): Promise<IssueResultsFile | null> {
  try {
    const res = await fetch(DATA_URL, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return (await res.json()) as IssueResultsFile;
  } catch {
    return null;
  }
}

export function countByVerdict(results: IssueResult[]): Record<Verdict, number> {
  const counts: Record<Verdict, number> = { pass: 0, fail: 0, skipped: 0, unknown: 0 };
  for (const r of results) counts[r.verdict]++;
  return counts;
}

export function groupByArea(results: IssueResult[]): Map<string, IssueResult[]> {
  const map = new Map<string, IssueResult[]>();
  for (const r of results) {
    if (!map.has(r.area)) map.set(r.area, []);
    map.get(r.area)!.push(r);
  }
  return map;
}

// ─── Scenarios (verify-scenarios.js output) ─────────────────────────────
//
// Mirrors the shape produced by verify/verify-scenarios.js. Step `ok` is
// tri-state: true = passed, false = failed, null = not run (skipped due to
// an earlier failure, or the whole scenario was auth-gated).

export type StepResult = {
  kind: string;
  params: Record<string, unknown>;
  ok: boolean | null;
  duration_ms: number;
  error: string | null;
  screenshot?: string;
};

export type ScenarioResult = {
  id: string;
  name: string;
  area: string;
  description: string;
  verdict: Verdict;
  reason?: string;
  step_results: StepResult[];
};

export type ScenarioResultsFile = {
  base_url: string;
  checked_at: string;
  authenticated: boolean;
  total_scenarios: number;
  results: ScenarioResult[];
  diff_vs_previous?: {
    newly_passing: string[];
    newly_failing: string[];
  };
};

const SCENARIOS_DATA_URL =
  process.env.SCENARIOS_DATA_URL ||
  'https://raw.githubusercontent.com/REPLACE_ME/REPLACE_ME/data/scenario-results.json';

/**
 * Fetch the latest scenario-runner output. Returns null if unreachable so
 * the dashboard can simply omit the scenarios section instead of crashing.
 */
export async function getScenarios(): Promise<ScenarioResultsFile | null> {
  try {
    const res = await fetch(SCENARIOS_DATA_URL, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return (await res.json()) as ScenarioResultsFile;
  } catch {
    return null;
  }
}

export function groupScenariosByArea(
  results: ScenarioResult[],
): Map<string, ScenarioResult[]> {
  const map = new Map<string, ScenarioResult[]>();
  for (const r of results) {
    if (!map.has(r.area)) map.set(r.area, []);
    map.get(r.area)!.push(r);
  }
  return map;
}

// ─── Routes (merged http + browser verdict per route) ──────────────────
//
// Mirrors the shape produced by verify/report.js (routes.status.json),
// then published to the `data` branch. Each record is the merged HTTP +
// browser verdict for a single route the verifier checked.
//
// Verdict values come straight from report.js:
//   pass | not-found | variant-works | auth-redirect |
//   blocked | unverifiable | error | unknown
//
// All fields beyond id/path/verdict are optional — the dashboard only
// renders what is present and degrades gracefully when fields drift.

export type RouteVerdict =
  | 'pass'
  | 'not-found'
  | 'variant-works'
  | 'auth-redirect'
  | 'blocked'
  | 'unverifiable'
  | 'error'
  | 'unknown';

export type RouteRecord = {
  id: string;
  path: string;
  verdict: RouteVerdict | string;
  component?: string;
  module?: string;
  auth?: boolean;
  priority?: string;
  inferred?: boolean;
  /** Canonical path (typically equal to `path`). */
  confirmed_path?: string | null;
  /** A working alternate path discovered by the verifier (for `variant-works`). */
  suggested_path?: string | null;
  /** Path the browser actually navigated to. */
  tested_path?: string | null;
  /** Final URL/path the browser landed on (after any redirects). */
  final_path?: string | null;
  redirected?: boolean;
  /** HTTP status from the HTTP probe, when available. */
  http_status?: number | null;
  notes?: string[];
};

export type RoutesFile = {
  base_url: string;
  checked_at: string;
  results: RouteRecord[];
};

const ROUTES_DATA_URL =
  process.env.ROUTES_DATA_URL ||
  'https://raw.githubusercontent.com/REPLACE_ME/REPLACE_ME/data/routes.status.json';

/**
 * Fetch the latest per-route verdicts. Returns null if unreachable so the
 * dashboard can omit the Route Health section instead of crashing.
 *
 * The upstream payload may use either `results` or the legacy `verdicts`
 * key (and `generated_at` instead of `checked_at`); we normalise both.
 */
export async function getRoutes(): Promise<RoutesFile | null> {
  try {
    const res = await fetch(ROUTES_DATA_URL, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    const raw = (await res.json()) as Partial<RoutesFile> & {
      verdicts?: RouteRecord[];
      generated_at?: string;
    };
    const results = raw.results ?? raw.verdicts ?? [];
    const checked_at = raw.checked_at ?? raw.generated_at ?? '';
    const base_url = raw.base_url ?? '';
    return { base_url, checked_at, results };
  } catch {
    return null;
  }
}

export function countRouteVerdicts(
  records: RouteRecord[],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const r of records) {
    const key = String(r.verdict);
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

// ─── Link sources (verify-link-sources.js output) ──────────────────────
//
// Mirrors the shape produced by verify/find-link-sources.js. Records
// every internal-link target the crawler observed across the pages it
// loaded, along with where each was found. Powers the "Linked from"
// hint on failing routes so users can locate the broken link.

export type LinkSource = {
  source_path: string;
  element_kind: 'link' | 'nav' | 'button' | 'form' | string;
  label: string;
  selector: string;
};

export type LinkSourcesFile = {
  base_url: string;
  checked_at: string;
  pages_crawled?: number;
  unique_targets?: number;
  sources_by_target: Record<string, LinkSource[]>;
};

const LINK_SOURCES_DATA_URL =
  process.env.LINK_SOURCES_DATA_URL ||
  'https://raw.githubusercontent.com/REPLACE_ME/REPLACE_ME/data/link-sources.json';

/**
 * Fetch the latest link-source crawl output. Returns null if unreachable
 * so the dashboard can simply omit the "Linked from" annotations rather
 * than crash.
 */
export async function getLinkSources(): Promise<LinkSourcesFile | null> {
  try {
    const res = await fetch(LINK_SOURCES_DATA_URL, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return (await res.json()) as LinkSourcesFile;
  } catch {
    return null;
  }
}

export function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const seconds = Math.round((now - then) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}
