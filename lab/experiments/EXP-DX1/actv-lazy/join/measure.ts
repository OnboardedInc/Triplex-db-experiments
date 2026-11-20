import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { lstatSync, mkdirSync, rmdirSync, unlinkSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

export const macDiagnostic =
  process.platform === "darwin" || process.env.DX_JOIN_MAC_DIAGNOSTIC === "1";

// [DX-ACT1] Why: native Mac checks share the ordinary heavy pool and their clocks are diagnostic. Rejected: freezing other builders to get a quiet laptop sample.
export async function measure<T>(run: () => Promise<T>) {
  if (macDiagnostic) return run();
  const dir = process.env.DX_JOIN_TIMING_DIR;
  if (!dir) return run();
  const handedOff = process.env.DX_JOIN_LEASE_TOKEN;
  const token = handedOff ?? join(dir, "lazy-settle-" + randomUUID());
  if (handedOff) {
    // [DX-ACT1] Why: after a cold reopen, use the admission that the runner already holds through the timed blocks. Rejected: trying to acquire its own directory and waiting on both locks again.
    assert(dirname(token) === dir && /^lazy-block-[a-f0-9]+$/.test(basename(token)));
  } else {
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
    writeFileSync(token, "", { flag: "wx" });
  }
  const sample = lstatSync(token),
    left = 14 * 60 * 1000 - (Date.now() - sample.mtimeMs);
  assert(sample.isFile());
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
  const limit = setTimeout(stop, Math.max(0, left));
  process.once("SIGTERM", stop);
  try {
    assert(left > 0, "Mac measurement window expired before traffic");
    return await run();
  } finally {
    clearTimeout(limit);
    process.off("SIGTERM", stop);
    release();
  }
}
