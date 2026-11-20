import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import { microDuration } from "./micro.ts";

export const pipelineHz = 240;
export const pipelineArms = [
  "pipeline-0-a",
  "pipeline-16-2",
  "pipeline-24-2",
  "pipeline-16-1",
  "pipeline-24-1",
  "pipeline-16-4",
  "pipeline-24-4",
  "pipeline-16-8",
  "pipeline-24-8",
  "pipeline-0-b",
];
export const pipelineDuration = (mac: boolean) => (mac ? 18000 : microDuration);

// [DX-HA1] Why: each admitted HTTP frame owns a credit through recovery and durable checkpoint.
// Rejected: releasing credit at send (an overloaded peer could collect an unbounded suffix).
export function pipelineLimit(depth: number, pendingSaves: number) {
  assert([1, 2, 4, 8].includes(depth));
  return pendingSaves >= 4 ? 1 : pendingSaves >= 2 ? Math.max(1, depth / 2) : depth;
}

export class PipelineCredits {
  private due: number;
  constructor(start: number) {
    this.due = start;
  }
  async wait(end: number) {
    while (performance.now() < Math.min(this.due, end))
      await delay(Math.max(1, Math.min(end, this.due) - performance.now()));
  }
  consume(at: number) {
    this.due = Math.max(this.due + 1000 / pipelineHz, at);
  }
}

type Neighbour = {
  save: { offered: number; ok: number; p99Ms: number | null };
  read: { offered: number; ok: number; p99Ms: number | null };
};
type Cell = { arm: string; neighbors: Record<string, Neighbour>; queryableFacts: number };

// [DX-HA1] Why: publish both controls for each account and count unavailable latency samples.
// Rejected: a single pooled percentile or classifying a dropped offer as a fast operation.
export function pipelineComparison(
  cells: Cell[],
  bookends = ["pipeline-0-a", "pipeline-0-b"],
  duration = microDuration,
) {
  const before = cells[0]!;
  const after = cells.at(-1)?.arm === bookends[1] ? cells.at(-1) : undefined;
  assert.equal(before.arm, bookends[0]);
  return cells.slice(1, after ? -1 : undefined).map((cell) => {
    const accounts = Object.entries(cell.neighbors).map(([account, values]) => {
      return {
        account,
        operations: (["save", "read"] as const).map((kind) => {
          const own = values[kind];
          const compare = (control: Cell | undefined) => {
            const base = control?.neighbors[account]?.[kind];
            return !base
              ? null
              : {
                  ...base,
                  ratio: own.p99Ms !== null && base.p99Ms ? own.p99Ms / base.p99Ms : null,
                };
          };
          return { kind, ...own, before: compare(before), after: compare(after) };
        }),
      };
    });
    assert.equal(accounts.length, 11);
    return {
      arm: cell.arm,
      queryableFactsPerSecond: (cell.queryableFacts * 1000) / duration,
      accounts,
    };
  });
}
