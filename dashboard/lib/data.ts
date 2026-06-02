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
