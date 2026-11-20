import assert from "node:assert/strict";
import { openStore } from "../store.ts";
import { LazyReader } from "../read.ts";
import { setTimeout as sleep } from "node:timers/promises";

const [scope, profile, nonce, time, position, ...ids] = process.argv.slice(2);
assert(scope && nonce && time && ids.length && (profile === "w0" || profile === "act2-deep"));
const target = position?.startsWith("at-") ? Number(position.slice(3)) : undefined;
assert(target === undefined || Number.isFinite(target));
const pinned = position === "current" || target !== undefined ? undefined : Number(position);
assert(pinned === undefined || (Number.isSafeInteger(pinned) && pinned >= 0));
const store = await openStore(scope, profile, "read");
try {
  const reader = new LazyReader(store, profile, 0, undefined, "shared-cut");
  const untouched = { memoBytes: reader.bytes, memory: process.memoryUsage() };
  async function sample(position?: number) {
    const results = [];
    for (const subject of ids) {
      const start = performance.now();
      const read = await reader.readAt(
        subject,
        position === undefined ? { validTime: time } : { validTime: time!, position },
      );
      results.push({ ...read, ms: performance.now() - start });
    }
    return results;
  }
  const clock = () => performance.timeOrigin + performance.now();
  if (target !== undefined) {
    while (clock() < target) await sleep(Math.max(1, target - clock()));
    const started = clock(),
      position = await store.head(),
      headObserved = clock(),
      reads = await sample(position),
      finished = clock();
    process.stdout.write(
      JSON.stringify({
        scope,
        nonce,
        profile,
        pid: process.pid,
        position,
        started,
        headObserved,
        finished,
        reads,
      }),
    );
  } else {
    const current = await sample(),
      reads = pinned === undefined ? current : await sample(pinned);
    process.stdout.write(
      JSON.stringify({ scope, nonce, profile, pid: process.pid, untouched, current, reads }),
    );
  }
} finally {
  await store.close();
}
