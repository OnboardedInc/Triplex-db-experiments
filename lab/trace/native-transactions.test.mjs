import assert from "node:assert/strict";
import test from "node:test";
import { bindNativeTransaction, nativeWaitLegs } from "./native-transactions.mjs";

const databaseHash = "a".repeat(64);
const binding = { source: "source", slot: "slot", run: "slot" };
const peer = {
  ...binding,
  traceId: "trace",
  root: "root",
  start: 15,
  end: 40,
  attributes: { databaseHash, datomicT: "111" },
  spans: [{ name: "peer.transact-await", id: "await" }],
};
const native = {
  ...binding,
  process: "tx",
  nativeType: "triplex.NativeTransaction",
  databaseHash,
  datomicT: "111",
  start: 35,
  nativeStats: { msec: 10, "apply-msec": 7 },
};

test("exact database and native t retain the native duration and both residuals", () => {
  const found = bindNativeTransaction(peer, [native, { ...native, databaseHash: "b".repeat(64) }]);
  assert.equal(found.parent, "await");
  assert.deepEqual(
    nativeWaitLegs({ ...peer, gatewayRoot: peer.root, peerStart: 20, peerEnd: 38 }, found),
    {
      submitToNativeReadMs: 5,
      nativeProcessMs: 10,
      nativeToPeerMs: 3,
    },
  );
});

test("foreign, ambiguous and stale native evidence cannot bind", () => {
  for (const specimen of [
    { ...native, source: "wrong" },
    { ...native, slot: "old" },
    { ...native, clockAlignmentQualified: false },
  ])
    assert.equal(bindNativeTransaction(peer, [specimen]), null);
  assert.throws(() => bindNativeTransaction(peer, [native, native]), /Duplicate/);
  assert.throws(() => bindNativeTransaction(peer, [{ ...native, start: 12 }]), /stale/);
});
