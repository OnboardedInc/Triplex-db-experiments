import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdirSync, rmdirSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

// [DX-ACT1] Why: load the fixture before taking the Mac measurement window and release before oracle work. Rejected: holding the shared lock across seeding or post-run verification.
export async function measure<T>(run: () => Promise<T>) {
  const dir = process.env.DX_JOIN_TIMING_DIR;
  if (!dir) return run();
  // @ts-expect-error The native lab reservation manager has no TypeScript declarations.
  const { readMeasureLease } = await import("../../../../bin/heavy-lock.mjs");
  const waiting = performance.now();
  for (;;) {
    try {
      mkdirSync(dir);
      break;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
      // [DX-ACT1] Why: a paired reservation can hold the timing directory while it drains this job's heavy token. Rejected: waiting for the ordinary timing deadline with both reservations held.
      const draining = readMeasureLease();
      if (draining && !draining.stale)
        throw Error("Measurement requester is draining heavy tokens; release this attempt");
    }
    assert(performance.now() - waiting < 15 * 60 * 1000, "Mac measurement window did not open");
    await sleep(5000);
  }
  const token = join(dir, "lazy-settle-" + randomUUID());
  writeFileSync(token, "", { flag: "wx" });
  let held = true;
  const release = () => {
    if (!held) return;
    held = false;
    unlinkSync(token);
    rmdirSync(dir);
  };
  const stop = () => {
    release();
    process.exit(124);
  };
  const limit = setTimeout(stop, 14 * 60 * 1000);
  process.once("SIGTERM", stop);
  try {
    return await run();
  } finally {
    clearTimeout(limit);
    process.off("SIGTERM", stop);
    release();
  }
}
