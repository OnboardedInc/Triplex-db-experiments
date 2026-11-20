import assert from "node:assert/strict";
import { test } from "node:test";
import { verifyWriteOptions } from "./write-options.ts";

test("a range arm needs the exact scope, fresh attempt, options and selected function", () => {
  const options = {
    predecessorLookup: true,
    groupCommit: false,
    livePriority: false,
    fieldCoalesce: false,
    queueClock: false,
    stageClock: false,
    smallRows: false,
    reusePrepared: false,
    maxMembers: 8,
    budgetMicros: null,
    bulkRows: 96,
    bulkBytes: 65536,
    ledger: false,
    packedJournal: false,
    fastReply: false,
  };
  const expected = {
    source: "c".repeat(40),
    slot: "proof",
    attempt: "fresh",
    gatewaySourceHash: "a".repeat(64),
    historyRange: true,
    options,
  };
  const observed = {
    attempt: "fresh",
    database: "s2-test",
    gatewaySourceHash: expected.gatewaySourceHash,
    position: 0,
    t: "1012",
    strictRecordClocks: true,
    rowsVersion: 3,
    commitFunction: ":triplex.write/v-" + "b".repeat(24),
    baseFunctionHash: "c".repeat(64),
    commitFunctionInstalled: true,
    options,
  };
  const verify = (value, history = true) => verifyWriteOptions(value, "s2-test", expected, history);
  verify(observed);
  for (const change of [
    { attempt: "stale" },
    { database: "s2-other" },
    { commitFunction: ":triplex/commit" },
    { commitFunctionInstalled: false },
    { options: { ...options, predecessorLookup: false } },
    { options: { ...options, packedJournal: true } },
  ]) {
    assert.throws(() => verify({ ...observed, ...change }));
  }
  assert.throws(() => verify(observed, false));
  verifyWriteOptions(observed, "s2-test", { ...expected, historyRange: false }, false);
});
