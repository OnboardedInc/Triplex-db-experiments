import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { openStore } from "./store.ts";
import { LazyReader } from "./read.ts";
const { scope, format, subject, validTime, nonce } = JSON.parse(readFileSync(0, "utf8"));
assert(typeof nonce === "string" && nonce.length > 8);
const s = await openStore(scope, format);
try {
  const begin = performance.now();
  const r = await new LazyReader(s, format, 2 << 20, () => validTime).readAt(subject);
  console.log(
    JSON.stringify({
      nonce,
      scope,
      result: r,
      callMs: performance.now() - begin,
      pid: process.pid,
    }),
  );
} finally {
  await s.close();
}
