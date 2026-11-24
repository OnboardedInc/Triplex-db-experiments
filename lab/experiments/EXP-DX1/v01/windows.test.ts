import assert from "node:assert/strict";
import { test } from "node:test";
import { windowStats } from "./windows.ts";
import { fullCellTape } from "./production-card.ts";
import { ratedTape, serverRates } from "./server-workload.ts";
import { assemblyFile, rendererDiff } from "./renderer.ts";

// [DX-CARD1] The row that stopped the 1 billion production-S card's assembly (2026-11-24 00:16 UTC): cell
// p6-50-loaded, account 2, save 2/27, tape offset 89,999.99999251067 ms of a 90 s cell, cell start
// 1,795,477,169,887.094 ms. start + offset rounds to exactly start + 90,000, the cell's end.
const start = 1795477169887.094, offset = 89999.99999251067;
const receipt = { p: 28312016, t: "t", clock: 0, tx: "tx", digest: "digest", size: 1 };
const real = { due: 1795477259887.094, enqueued: 1795477259887.6497, dispatched: 1795477259887.9333,
  end: 1795477259920.2002, status: "acked" as const, receipt };

test("the failing production-S row: its due is the cell end, its tape offset is inside the cell", () => {
  assert.equal(start + offset, real.due);
  assert.equal(real.due, start + 90 * 1000);
  assert(offset < 90 * 1000);
  // Without the tape the row is refused, exactly as before.
  assert.throws(() => windowStats([real], start, 90), /due lies outside its cell/);
  // With its offset it counts once, in the whole cell and the second half, and is reported as an edge row.
  const [whole, first, second] = windowStats([{ ...real, offset }], start, 90);
  assert.deepEqual([whole!.offered, first!.offered, second!.offered], [1, 0, 1]);
  assert.deepEqual([whole!.edge, first!.edge, second!.edge], [1, 0, 1]);
  assert.deepEqual([whole!.latency.count, second!.latency.count], [1, 1]);
  // Its acknowledgement came after the cell end, so it earns no in-window ACK credit.
  assert.deepEqual([whole!.acked, second!.acked], [0, 0]);
});

test("rows truly outside their cell still fail with or without the tape", () => {
  const row = (due: number, extra: object = {}) => ({ due, end: due + 5, status: "acked" as const, receipt, ...extra });
  assert.throws(() => windowStats([row(start + 90_000.5)], start, 90), /due lies outside/);
  assert.throws(() => windowStats([row(start - 1)], start, 90), /due lies outside/);
  assert.throws(() => windowStats([row(start + 90_000, { offset: 90_000 })], start, 90), /offset lies outside/);
  assert.throws(() => windowStats([row(start + 90_066, { offset: 90_066 })], start, 90), /offset lies outside/);
  assert.throws(() => windowStats([row(start - 1, { offset: -1 })], start, 90), /offset lies outside/);
  // A due that is not the tape offset on the cell clock (a late or misplaced offer) fails.
  assert.throws(() => windowStats([row(start + 90_000, { offset: 89_000 })], start, 90), /differs from its tape offset/);
});

test("rows with offsets give the same windows as rows placed by due when nothing rounds", () => {
  const rows = [10, 1900, 2000, 3750].map((ms, i) => ({ due: 1000 + ms, end: 1000 + ms + 100 * (i + 1),
    dispatched: 1000 + ms + 1, status: "acked" as const, receipt }));
  const plain = windowStats(rows, 1000, 4), placed = windowStats(rows.map((r, i) => ({ ...r, offset: [10, 1900, 2000, 3750][i]! })), 1000, 4);
  assert.deepEqual(placed, plain);
  assert(plain.every((w) => w.edge === 0));
});

test("which tapes schedule rows at or past a 90 s cell's end", () => {
  const end = 90_000;
  for (const rate of serverRates) {
    const cell = { rate, loaded: true } as const;
    // Shape S: one commit per neighbour account sits within 1e-4 ms of the end (under half a floating-point step at
    // epoch-millisecond starts near 1.8e12, 1.22e-4 ms), so its due rounds to the end.
    const s = fullCellTape("S", cell, 90);
    assert.equal(s.filter((e) => e.ms >= end).length, 0);
    assert.equal(s.filter((e) => end - e.ms < 1e-4).length, 9);
    // Shape R: the same save's later rows are spaced past the end. The window check refuses these rows; an R card
    // at this tape cannot be assembled until the tape keeps every row inside the cell.
    assert(fullCellTape("R", cell, 90).filter((e) => e.ms >= end).length > 0);
    // Saturday's tape: every offer ends more than a millisecond before the end, far above one floating-point step.
    for (const seconds of [90, 300] as const) {
      const margin = ratedTape(100_000, cell, seconds).reduce((m, e) => Math.min(m, seconds * 1000 - e.ms), Infinity);
      assert(margin > 1, `Saturday ${rate}/${seconds}: margin ${margin}`);
    }
  }
});

test("a later renderer may change only assembly files", () => {
  const a = "a".repeat(40), b = "b".repeat(40);
  const fake = (files: string[], ancestor = true) => (...args: string[]) => {
    if (args[0] === "merge-base") { if (!ancestor) throw new Error("not an ancestor"); return ""; }
    return files.join("\n");
  };
  assert.deepEqual(rendererDiff(a, b, fake(["lab/experiments/EXP-DX1/v01/windows.ts", "lab/experiments/EXP-DX1/v01/PRODUCTION-CARD.md"])),
    { commit: b, files: ["lab/experiments/EXP-DX1/v01/PRODUCTION-CARD.md", "lab/experiments/EXP-DX1/v01/windows.ts"] });
  assert.throws(() => rendererDiff(a, b, fake(["lab/experiments/EXP-DX1/v01/adopted.ts"])), /changes files the campaign ran/);
  assert.throws(() => rendererDiff(a, b, fake([], false)), /does not descend/);
  assert.throws(() => rendererDiff(a, a, fake([])), /assemble without --renderer/);
  assert(!assemblyFile("lab/experiments/EXP-DX1/w1/field/production.ts"));
});
