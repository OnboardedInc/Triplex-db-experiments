import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { DeepCommitMeter } from "../../../bench/lib/deep-commit-meter.ts";
import { fileHash } from "./measurements.ts";

test("logical saves, physical commits, journalled changes and native datoms use separate denominators", async () => {
  const db = "fixture",
    meter = new DeepCommitMeter(db);
  const put = (p: number, group: string, size: number, changes: number) => {
    const operationId = "op-" + p;
    const input = {
      position: p - 1,
      operationId,
      rows: [
        ...Array.from({ length: changes }, () => ({
          entity_type: "_Transaction",
          attribute: ":_tx/change",
        })),
        { entity_type: "_Transaction", attribute: ":_tx/position" },
        { entity_type: "person", attribute: ":subject/account" },
      ],
    };
    const result = {
      t: { t: "long", v: group },
      position: { t: "long", v: String(p) },
      delta: 1,
      groupSize: size,
      datoms: 10,
      operationId,
    };
    meter.observe(db, input, result, p, ["cmd-" + p]);
  };
  put(1, "100", 1, 1);
  put(3, "101", 2, 4);
  const gap = meter.release(1, 3, 1000, "cmd-1");
  assert.equal(gap.qualified, false);
  assert.equal(gap.physicalPerS, null);
  put(2, "101", 2, 3);
  put(2, "101", 2, 3);
  const release = meter.release(1, 3, 1000, "cmd-1");
  assert.deepEqual(
    [release.logicalPerS, release.physicalPerS, release.changedFactsPerS, release.datomsPerS],
    [3, 2, 8, 20],
  );
  const writes = [1, 2, 3].map((p) => ({
    position: p,
    commandId: "cmd-" + p,
    stream: "background",
    outcome: "committed",
    ackPublishedAt: 100 + p,
    resend: false,
  }));
  const burst = meter.burst([...writes, { ...writes[0]!, resend: true }], 102, 104);
  assert.equal(burst.observed, 2);
  assert.equal(burst.physicalTransactions, 1);
  assert.equal(burst.multiCommandTransactions, 1);
  assert.throws(() => meter.burst([{ ...writes[0]!, commandId: "foreign" }], 100, 104));
  assert.throws(() => meter.release(1, 3, 1000, "foreign"));
  assert.throws(() => put(2, "102", 1, 3));
  const identity = {
    source: "a".repeat(40),
    slot: "tx2-dxscale1-test",
    nonce: randomUUID(),
    account: 0,
    people: 10000,
    arm: "activation" as const,
  };
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "deep-cost-")),
    file = path.join(dir, "receipts.jsonl");
  try {
    const seal = meter.seal(file, identity);
    assert.equal(seal.sha256, await fileHash(file));
    assert.throws(() => meter.seal(file, identity));
    const restored = await DeepCommitMeter.read(file, identity, db, 3);
    assert.deepEqual(restored.release(1, 3, 1000, "cmd-1"), release);
    await assert.rejects(DeepCommitMeter.read(file, { ...identity, nonce: randomUUID() }, db, 3));
    await assert.rejects(DeepCommitMeter.read(file, identity, "foreign", 3));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
