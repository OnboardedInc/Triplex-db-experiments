import { test } from "node:test";
import assert from "node:assert/strict";
import { ReaderLifecycle, requireDrained, BatchSequence } from "../../../bench/lib/reader-lifecycle.ts";
test("reader completion requires drained ACK even on exit zero; post-ready errors stay failures", () => {
  const clean = new ReaderLifecycle(); clean.acknowledgeStop(); clean.exit(1);
  assert.deepEqual(clean.failures, []);
  const missing = new ReaderLifecycle(); missing.exit(0);
  assert.equal(missing.stopped, false); assert.match(missing.failures[0]!, /without a drained/);
  const failed = new ReaderLifecycle(); failed.error(Error("post-ready decoder failure")); failed.acknowledgeStop(); failed.exit(1);
  assert.equal(failed.stopped, true); assert.match(failed.failures[0]!, /post-ready decoder failure/);
});

test("stop acknowledgement refuses active live loops or sweep reads", () => {
  assert.doesNotThrow(() => requireDrained(0, 0));
  assert.throws(() => requireDrained(1, 0), /1 loops/);
  assert.throws(() => requireDrained(0, 1), /1 reads/);
});

test("producer sequence rejects duplicate, missing and reordered batches", () => {
  const ordered = new BatchSequence(); ordered.accept(1); ordered.accept(2); ordered.accept(3);
  const gap = new BatchSequence(); assert.throws(() => gap.accept(2), /sequence mismatch/);
  const duplicate = new BatchSequence(); duplicate.accept(1); assert.throws(() => duplicate.accept(1), /sequence mismatch/);
});
