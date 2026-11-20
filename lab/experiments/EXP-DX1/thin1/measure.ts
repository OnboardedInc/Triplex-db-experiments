import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { setTimeout as wait } from "node:timers/promises";

// [DX-THIN1] Why: long native imports hand the shared measurement window back between bounded batches.
// Rejected: holding a 15-minute lease for an entire million-row workflow or publishing a guest PID as the Mac owner's.
export function measurementWindow(binding: string, slot: string) {
  const dir = process.env.DX_THIN_MEASURE,
    pid = Number(process.env.DX_THIN_HOST_PID);
  let started = 0,
    grantedMs = 0,
    waitMs = 0,
    windows = 0,
    alarm: ReturnType<typeof setTimeout> | undefined;
  function release() {
    if (!dir || !started) return;
    const file = path.join(dir, "owner.json"),
      owner = JSON.parse(fs.readFileSync(file, "utf8"));
    assert(
      owner.binding === binding && owner.slot === slot && owner.pid === pid,
      "Measurement lease changed",
    );
    fs.unlinkSync(file);
    fs.rmdirSync(dir);
    grantedMs += performance.now() - started;
    started = 0;
    clearTimeout(alarm);
  }
  return {
    release,
    // [DX-THIN1] Why: the result is written before finally releases the last window. Rejected: reporting only earlier grants as total measurement time.
    stats: () => ({ windows, grantedMs: grantedMs + (started ? performance.now() - started : 0), waitMs }),
    async checkpoint() {
      if (!dir) return;
      assert(Number.isSafeInteger(pid) && pid > 1);
      if (started && performance.now() - started < 7 * 60_000) return;
      if (started) {
        release();
        await wait(5_000);
      }
      const entered = performance.now();
      for (;;) {
        try {
          fs.mkdirSync(dir);
          break;
        } catch (e) {
          if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
          await wait(5000);
        }
      }
      try {
        fs.writeFileSync(
          path.join(dir, "owner.json"),
          JSON.stringify({
            id: "DX-THIN1",
            pid,
            slot,
            binding,
            kind: "diagnostics",
            at: new Date().toISOString(),
          }),
          { flag: "wx" },
        );
      } catch (e) {
        fs.rmdirSync(dir);
        throw e;
      }
      started = performance.now();
      waitMs += started - entered;
      windows++;
      alarm = setTimeout(() => {
        release();
        process.exit(75);
      }, 14 * 60_000);
    },
  };
}
