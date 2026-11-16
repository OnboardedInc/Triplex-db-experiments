// [DX-T1-10] Why: the JS report boundary validates heterogeneous recorded JSON at runtime; TypeScript callers retain a declaration.
// Rejected: suppressing the import error or pretending an unvalidated recorded fixture has a static domain type.
export interface CommitClocks {
  latencyToAckMs: number;
  latencyCorrectedMs: number;
  timerLatenessMs: number;
  postAckMs: number;
}
export function commitClocks(row: unknown): CommitClocks;
export function instrumentMetrics(
  bench: unknown,
  writes: readonly unknown[],
  baseline: readonly unknown[] | null,
  histogram: unknown,
): any;
export function idleAndPhaseMetrics(
  writes: readonly unknown[],
  phases: readonly unknown[],
  requests?: readonly unknown[],
): any;
export function instrumentMarkdown(metrics: unknown): string;
