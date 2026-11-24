import assert from "node:assert/strict";
import test from "node:test";
import { fillFrame, frameEstimate, frameMode, FrameTooLarge, windowOf, type Candidate, type Piece } from "./frames.ts";

// [DX-ACT4] The frame rule on synthetic sizes: each unit weighs 1, a closing piece 2, the bound is 10.
const c = (subject: string, units: number, closing = false): Candidate<number> => ({
  subject,
  units: Array.from({ length: units }, (_, i) => i),
  closing,
});
const weight = (cs: Candidate<number>[]) => (pieces: readonly Piece[]) =>
  pieces.reduce((n, p) => n + (p.to - p.from) + (p.close && cs[p.index]!.closing ? 2 : 0), 0) <= 10;

test("whole subjects while they fit, closed before the first that does not", () => {
  const cs = [c("a", 3), c("b", 4), c("c", 5)];
  assert.deepEqual(fillFrame(cs, 0, weight(cs)), {
    pieces: [
      { index: 0, from: 0, to: 3, close: true },
      { index: 1, from: 0, to: 4, close: true },
    ],
    advance: 2,
    tail: 0,
    split: false,
  });
});
test("a subject alone over the bound is split; the next frame continues at its next unit", () => {
  const cs = [c("a", 0), c("b", 23, true), c("c", 1)];
  const first = fillFrame(cs, 0, weight(cs));
  assert.deepEqual(first, {
    pieces: [
      { index: 0, from: 0, to: 0, close: true },
      { index: 1, from: 0, to: 10, close: false },
    ],
    advance: 1,
    tail: 10,
    split: true,
  });
  const rest = cs.slice(1);
  const second = fillFrame(rest, 10, weight(rest));
  assert.deepEqual(second.pieces, [{ index: 0, from: 10, to: 20, close: false }]);
  const third = fillFrame(rest, 20, weight(rest));
  // The last three units and the closing piece (weight 5), then subject c whole.
  assert.deepEqual(third.pieces, [
    { index: 0, from: 20, to: 23, close: true },
    { index: 1, from: 0, to: 1, close: true },
  ]);
});
test("the closing piece in a frame of its own when the units fill the frame", () => {
  const cs = [c("a", 10, true)];
  const first = fillFrame(cs, 0, weight(cs));
  assert.deepEqual(first, { pieces: [{ index: 0, from: 0, to: 10, close: false }], advance: 0, tail: 10, split: true });
  assert.deepEqual(fillFrame(cs, 10, weight(cs)).pieces, [{ index: 0, from: 10, to: 10, close: true }]);
});
test("one unit over the bound is refused", () => {
  const cs = [c("a", 1)];
  assert.throws(() => fillFrame(cs, 0, () => false), FrameTooLarge);
});
test("the writer's estimate and mode", () => {
  assert.equal(frameMode(undefined), "count");
  assert.equal(frameMode("bytes"), "bytes");
  assert.throws(() => frameMode("subjects"));
  const small = frameEstimate([{ op: "assert", value: "x" }]);
  assert(small.fits && small.us > 3500 && small.us < 8000);
  assert(!frameEstimate([{ op: "assert", value: "x".repeat(20000) }]).fits);
  assert.deepEqual(windowOf(70, 100, 64), { begin: 64, end: 100 });
  assert.deepEqual(windowOf(5, 200, 64), { begin: 0, end: 64 });
});
