import { expect, it } from "vitest";
import { BasisWindow, suffixDelta, validateBasisBroadcast } from "../../../lab/bench/lib/basis-window.ts";
import { Histogram } from "../../../lab/bench/lib/hist.ts";

it("preserves every ordered basis and timestamp through retention, idle ticks and skipped windows", () => {
  const all: { at: number; position: number; txId: string }[] = [];
  const reader = new BasisWindow<(typeof all)[number]>();
  let previous: number | null = null;
  let sent = 0, snapshots = 0;
  for (let tick = 0; tick < 600; tick++) {
    if (tick % 7 !== 0) for (let j = 0; j < 10; j++) all.push({ at: tick, position: (tick * 7919 + j) % 6001, txId: `tx-${tick}-${j}` });
    const wanted = all.filter(r => tick - r.at <= 400).slice(-2000);
    const message = suffixDelta(wanted, all.length, previous);
    expect(reader.apply(structuredClone(message))).toEqual(wanted);
    previous = all.length; sent += message.added.length; snapshots += wanted.length;
  }
  expect(sent).toBe(all.length);
  expect(snapshots).toBeGreaterThan(sent * 100);
  const afterGap = Array.from({ length: 4000 }, (_, i) => ({ at: 7000 + i, position: i, txId: `later-${i}` }));
  all.push(...afterGap);
  const wanted = all.slice(-2000);
  expect(reader.apply(suffixDelta(wanted, all.length, previous))).toEqual(wanted);
});

it("rejects gaps, replays, regressions and truncated payloads instead of exposing a wrong pinned cohort", () => {
  const reader = new BasisWindow<number>();
  reader.apply(suffixDelta([1, 2], 2, null));
  const next = suffixDelta([1, 2, 3], 3, 2);
  expect(() => reader.apply({ ...next, from: 1 })).toThrow();
  expect(() => reader.apply({ ...next, added: [] })).toThrow();
  expect(reader.apply(next)).toEqual([1, 2, 3]);
  expect(() => reader.apply(next)).toThrow();
  expect(() => suffixDelta([1], 0, null)).toThrow();
});

it("binds broadcast savings to fresh writer intervals and recomputes their content", () => {
  const manifest = { tag: "run", source: "head", slot: "slot", startedAt: 100 };
  const event = { type: "event", name: "driver.reader-basis.broadcast", run: "run", source: "head", slot: "slot", thread: 0,
    start: 125, end: 126, attributes: { mode: "delta", workers: 3, added: 2, window: 2000, wallMs: 0.5 } };
  const histogram = new Histogram(); histogram.recordMs(0.5);
  const report = { mode: "delta", ticks: 1, messages: 3, ackItems: 6, wall: histogram.summary() };
  expect(() => validateBasisBroadcast(report, [event], manifest, 200)).not.toThrow();
  expect(() => validateBasisBroadcast({ ...report, ackItems: 5 }, [event], manifest, 200)).toThrow();
  expect(() => validateBasisBroadcast(report, [{ ...event, start: 99 }], manifest, 200)).toThrow();
  expect(() => validateBasisBroadcast(report, [{ ...event, source: "old" }], manifest, 200)).toThrow();
});
