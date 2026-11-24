import assert from "node:assert/strict";
import test from "node:test";
import { orderedSaveIdentity, wideOrderedSaveIdentity } from "../../../../packages/datomic/dist/index.js";
import { TripleId, TransactionId } from "../../../../packages/core/dist/index.js";
import { command } from "../w1/group/workload.ts";

test("a wide block keeps the 26-character TripleId, numbers 4,096 assertions and is rebuilt from its token", () => {
  const wide = wideOrderedSaveIdentity();
  assert.equal(wide.token.length, 23);
  assert.equal(wide.capacity, 4096);
  assert.match(wide.transactionId, /^_tx\/[0-7][0-9A-HJKMNP-TV-Z]{22}W00$/);
  assert.equal(TransactionId.make(wide.transactionId), wide.transactionId);
  for (const i of [0, 9, 10, 255, 256, 4095]) assert.equal(TripleId.make(wide.assertionId(i)), wide.assertionId(i));
  for (let i = 1; i < 4096; i++) assert(wide.assertionId(i - 1) < wide.assertionId(i));
  assert.throws(() => wide.assertionId(4096), RangeError);
  assert.throws(() => wide.assertionId(-1), RangeError);
  // A resend reconstructs the block from the retained token alone, through either entry point.
  assert.deepEqual([0, 300].map(orderedSaveIdentity(wide.token).assertionId), [0, 300].map(wide.assertionId));
  assert.equal(orderedSaveIdentity(wide.token).transactionId, wide.transactionId);
  assert.throws(() => wideOrderedSaveIdentity(wide.token + "0"), TypeError);
});

test("one-byte blocks are unchanged and never share a 23-character prefix with a wide block from this process", () => {
  const a = orderedSaveIdentity(), w = wideOrderedSaveIdentity(), b = orderedSaveIdentity(), v = wideOrderedSaveIdentity();
  assert.equal(a.capacity, 256);
  assert.equal(a.token.length, 24);
  assert.match(a.transactionId, /^_tx\/[0-7][0-9A-HJKMNP-TV-Z]{23}00$/);
  assert.throws(() => a.assertionId(256), RangeError);
  assert(a.assertionId(255) < w.assertionId(0));
  assert(w.assertionId(4095) < b.assertionId(0));
  assert(b.assertionId(255) < v.assertionId(0));
  for (const narrow of [a, b]) for (const block of [w, v]) assert(!narrow.token.startsWith(block.token));
  // The wide journal cannot be read as a one-byte journal of the same IDs: its 24th character is W, not a hex digit.
  assert(!/^[0-9A-F]$/.test(w.transactionId.slice(4 + 23, 4 + 24)));
});

test("the lab command builder numbers a 120-fact save in one wide block", () => {
  const wide = wideOrderedSaveIdentity("01J00000000000000000001");
  const facts = Array.from({ length: 120 }, (_, i) => ({ e: "acct/a/subject", a: ":field/f" + i, v: { type: "string", value: "v" + i } }));
  const save = command("wide-command", facts, [], true, false, wide);
  assert.equal(save.claims[0].txId, wide.transactionId);
  assert.deepEqual(save.newIds, save.newIds.map((_, i) => wide.assertionId(i)));
  assert.equal(save.newIds.length, 2 * 120 + 4); // 120 facts, one change each, four fixed journal rows
});
