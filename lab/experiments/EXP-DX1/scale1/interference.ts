import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import { Rng, seedOf } from "../../../bench/lib/rng.ts";
import { DEEP_RATE, deepEdits, type DeepEvent } from "../../../bench/lib/deep-trace.ts";
import { frozenDeep } from "../../../bench/lib/deep-profile.ts";

export const interferenceId = "deep-interference/1";
export const windows = [
  { name: "one", scopes: 1, burst: "none" },
  { name: "two", scopes: 2, burst: "none" },
  { name: "five", scopes: 5, burst: "none" },
  { name: "ten", scopes: 10, burst: "none" },
  { name: "one-burst", scopes: 10, burst: "sentinel" },
  { name: "all-burst", scopes: 10, burst: "all" },
] as const;
export const windowSeconds = 360;
export const interferenceSeconds = windowSeconds * windows.length;
export const interferenceReaders = 64;
const traceFile = new URL("./interference-pins.json", import.meta.url);
export function interferencePhases(account: number) {
  return windows.flatMap((p, i) => {
    const parts =
      p.burst === "none"
        ? [[p.name, 0, windowSeconds] as const]
        : ([
            [p.name + "-before", 0, 120],
            [p.name, 120, 60],
            [p.name + "-recovery", 180, 180],
          ] as const);
    return parts.map(([name, start, seconds]) => ({
      name,
      seconds,
      readers: account < p.scopes ? interferenceReaders : 0,
      measured: true,
      mode: "mixed" as const,
      traceFromS: i * windowSeconds + start,
    }));
  });
}
// [DX-SCALE1] Why: the sentinel needs identical offer times and reader concurrency as its neighbors join. Rejected: letting faster completions increase its offered rate, resetting task progress, or averaging different accounts' percentiles.
export function interferenceTrace(account: number, checkPin = true) {
  const base = frozenDeep(account, 10000);
  const primaries = base.events.filter((e) => !e.resend);
  const retries = new Map(base.events.filter((e) => e.resend).map((e) => [e.seq, e]));
  const events: DeepEvent[] = [],
    digest = createHash("sha256");
  const cohortCounts: number[] = [];
  let issued = 0;
  for (const [i, phase] of windows.entries()) {
    const before = issued;
    if (account < phase.scopes) {
      const burst = phase.burst === "all" || (phase.burst === "sentinel" && account === 0);
      for (const [a, b, hot] of [
        [0, 120, false],
        [120, 180, burst],
        [180, 360, false],
      ] as const) {
        const rng = new Rng(seedOf(interferenceId + "/" + account + "/" + a + "/" + hot));
        const rate = DEEP_RATE * (hot ? 50 : 1);
        for (let second = a + rng.exp(rate); second < b; second += rng.exp(rate)) {
          const original = primaries[issued++]!;
          const atMs = i * windowSeconds * 1000 + Math.round(second * 1e6) / 1000;
          const e = { ...original, atMs, burst: hot };
          events.push(e);
          const retry = retries.get(original.seq);
          if (retry) {
            const retryAt = atMs + Math.max(0, retry.atMs - original.atMs);
            if (retryAt < interferenceSeconds * 1000)
              events.push({ ...retry, atMs: retryAt, burst: hot });
          }
        }
      }
    }
    cohortCounts.push(issued - before);
  }
  events.sort((a, b) => a.atMs - b.atMs || a.seq - b.seq || Number(a.resend) - Number(b.resend));
  for (const e of events)
    digest.update(
      JSON.stringify([e, e.resend ? null : deepEdits(e.subject, e.seq, e.kind, e.deep)]) + "\n",
    );
  const sha256 = digest.digest("hex");
  if (checkPin)
    assert.equal(sha256, JSON.parse(fs.readFileSync(traceFile, "utf8"))[account].sha256);
  return {
    ...base,
    events,
    sha256,
    activeSubjects: new Set(events.map((e) => e.subject)),
    cohortCounts,
  };
}
