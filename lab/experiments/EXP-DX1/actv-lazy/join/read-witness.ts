import assert from "node:assert/strict";
import { openStore } from "../store.ts";
import { LazyReader } from "../read.ts";

const [scope, profile, nonce, time, position, ...ids] = process.argv.slice(2);
assert(scope && nonce && time && ids.length && (profile === "w0" || profile === "act2-deep"));
const pinned = position === "current" ? undefined : Number(position);
assert(pinned === undefined || (Number.isSafeInteger(pinned) && pinned >= 0));
const store = await openStore(scope, profile, "read");
try {
  const reader = new LazyReader(store, profile, 0, undefined, "shared-cut");
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
  const current = await sample(),
    reads = pinned === undefined ? current : await sample(pinned);
  process.stdout.write(JSON.stringify({ scope, nonce, profile, pid: process.pid, current, reads }));
} finally {
  await store.close();
}
