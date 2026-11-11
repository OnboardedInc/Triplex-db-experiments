import { test } from "node:test";
import assert from "node:assert/strict";
import { ReaderLifecycle } from "../../../bench/lib/reader-lifecycle.ts";
test("reader completion requires drained ACK even on exit zero; post-ready errors stay failures", () => {
  const clean = new ReaderLifecycle(); clean.acknowledgeStop(); clean.exit(1);
  assert.deepEqual(clean.failures, []);
  const missing = new ReaderLifecycle(); missing.exit(0);
  assert.equal(missing.stopped, false); assert.match(missing.failures[0]!, /without a drained/);
  const failed = new ReaderLifecycle(); failed.error(Error("post-ready decoder failure")); failed.acknowledgeStop(); failed.exit(1);
  assert.equal(failed.stopped, true); assert.match(failed.failures[0]!, /post-ready decoder failure/);
});
