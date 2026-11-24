import assert from "node:assert/strict";
import { canonical } from "../../../../bench/lib/w0-world.ts";
import { bulkUs, bulkWireLimit } from "./bulk.ts";

// [DX-ACT4] Why: the two settlement writers packed a fixed number of subjects per frame (16 values, 4 notices), so a
// release that owes many forms made every frame exceed the writer's own bound and settlement stopped at the first one.
// `TX2_SETTLE_FRAMES=bytes` fills each frame subject by subject up to that same bound, splits a subject whose changes
// alone exceed it, and stores each subject's changes without the full answer beside them. Unset, both writers are
// exactly as before. Rejected: raising the bound (it caps how long one frame holds the single writer, which live saves
// wait behind) or a fixed smaller subject count (it would still fail for a larger release).
export type FrameMode = "count" | "bytes";
export function frameMode(value = process.env.TX2_SETTLE_FRAMES): FrameMode {
  assert(value === undefined || value === "" || value === "bytes", "TX2_SETTLE_FRAMES is unset or bytes");
  return value === "bytes" ? "bytes" : "count";
}

/** The writer's own bound, as `Archive.write` checks it before a frame is queued. */
export const frameBoundUs = 8000;
export function frameEstimate(ops: readonly unknown[]) {
  const wire = 4096 + 3 * Buffer.byteLength(canonical(ops));
  const us = bulkUs(ops.length * 5 + 16, wire);
  return { wire, us, rows: ops.length, fits: wire < bulkWireLimit && us <= frameBoundUs };
}

/** A frame's candidates are the rest of the current census page of 64 subjects (frames never cross a page, so one
 * page read serves them). The writers keep the page's evaluated subjects in memory, keyed by the release, the removal
 * sequence and the page, so each subject is read and evaluated once per page however many frames the page takes; the
 * frame itself depends only on the durable progress and the data, so a retried frame is the same frame. */
export function windowOf(start: number, size: number, width: number) {
  const begin = Math.floor(start / width) * width;
  return { begin, end: Math.min(begin + width, size) };
}

/** One candidate subject: its units in order (changed values, or notice deliveries) and whether it has a closing
 * piece that must travel with its last units (the notice ledger change; values have none). */
export type Candidate<U> = { subject: string; units: readonly U[]; closing: boolean };
/** A piece of a frame: units [from, to) of candidate `index`, with its closing piece when `close`. */
export type Piece = { index: number; from: number; to: number; close: boolean };
export type Filled = {
  pieces: Piece[];
  /** Candidates fully written by this frame (the frame's end is candidate `advance` at unit `tail`). */
  advance: number;
  tail: number;
  split: boolean;
};
export class FrameTooLarge extends Error {}

/**
 * The frame rule. Subjects are taken in census order. The frame takes the longest run of whole subjects (each with its
 * remaining units and its closing piece) that, built exactly as it will be written, stays within the writer's bound;
 * the next frame starts at the first subject left out. If that subject is the first one in the frame with anything to
 * write, it alone exceeds the bound and is split: this frame also takes the longest run of its next units that fits
 * (without its closing piece), and the next frame continues it at the following unit. The closing piece goes in the
 * frame that holds the subject's last unit, or in a frame of its own after it. A single unit, or a closing piece alone,
 * that exceeds the bound is refused as before (FrameTooLarge). Both runs are found by doubling then bisection over the
 * candidate count and the unit count; every frame returned was itself checked against the bound.
 */
export function fillFrame<U>(
  candidates: readonly Candidate<U>[],
  part: number,
  fits: (pieces: readonly Piece[]) => boolean,
): Filled {
  assert(candidates.length >= 1 && part >= 0 && part <= candidates[0]!.units.length);
  const whole = (index: number): Piece => ({
    index,
    from: index === 0 ? part : 0,
    to: candidates[index]!.units.length,
    close: true,
  });
  const run = (k: number) => Array.from({ length: k }, (_, i) => whole(i));
  // Gallop (1, 2, 4, ...) then bisect, so the work follows the frame's size rather than the page's.
  let lo = 0,
    hi = 1;
  while (hi <= candidates.length && fits(run(hi))) {
    lo = hi;
    hi *= 2;
  }
  hi = Math.min(hi - 1, candidates.length);
  while (lo < hi) {
    const k = Math.ceil((lo + hi) / 2);
    if (fits(run(k))) lo = k;
    else hi = k - 1;
  }
  const pieces = run(lo);
  if (lo === candidates.length) return { pieces, advance: lo, tail: 0, split: false };
  const content = (p: Piece) => p.to > p.from || (p.close && candidates[p.index]!.closing);
  const from = lo === 0 ? part : 0;
  if (pieces.some(content)) return { pieces, advance: lo, tail: from, split: false };
  // Candidate `lo` alone exceeds the bound: the longest run of its next units that fits.
  const c = candidates[lo]!,
    remaining = c.units.length - from;
  let m = 0,
    top = 1;
  while (top <= remaining && fits([...pieces, { index: lo, from, to: from + top, close: false }])) {
    m = top;
    top *= 2;
  }
  top = Math.min(top - 1, remaining);
  while (m < top) {
    const t = Math.ceil((m + top) / 2);
    if (fits([...pieces, { index: lo, from, to: from + t, close: false }])) m = t;
    else top = t - 1;
  }
  if (m === 0)
    throw new FrameTooLarge(
      "Subject " + c.subject + (remaining ? ": one unit" : ": its closing piece") + " alone exceeds the writer's bound",
    );
  pieces.push({ index: lo, from, to: from + m, close: false });
  return { pieces, advance: lo, tail: from + m, split: true };
}

// [DX-ACT5] Why: every settlement frame used to commit only if the whole database's head was still the one the frame
// read (one database holds every account), so beside live saves in any account frames were refused and retried. A
// frame's content depends only on the release's own cut and the writer's own durable progress (SETTLEMENT-LIVE.md
// section 2), so `TX2_SETTLE_PRECONDITION=progress` makes a frame commit only if its writer's progress row (the release's
// values progress, or the account's notice cursor) still holds exactly the facts the frame followed. Unset or `head`,
// unchanged. Rejected: a per-subject check (a save after the release's cut cannot change any frame's content) and
// keeping the head check for the first frame only (at 394 saves/s in one database it would almost never commit).
export type Precondition = "head" | "progress";
export function preconditionMode(value = process.env.TX2_SETTLE_PRECONDITION): Precondition {
  assert(
    value === undefined || value === "" || value === "head" || value === "progress",
    "TX2_SETTLE_PRECONDITION is unset, head or progress",
  );
  return value === "progress" ? "progress" : "head";
}
