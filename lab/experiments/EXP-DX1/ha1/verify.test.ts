import assert from "node:assert/strict";
import test from "node:test";
import { Account } from "../../../../packages/datomic/test/ha1-account.ts";
import { Satellite } from "./satellite.ts";
import { projection } from "./projection.ts";
import { backupCut, vendorResult } from "./move.ts";
import { loopback } from "./common.ts";
test("recovery rejects a changed receipt, wrong tenant and corrupt feed interval", () => {
  const ac = new Account("test-run-scope", "http://" + loopback, "http://" + loopback);
  try {
    const i = ac.intent("alpha"),
      p = {
        operationId: i.operationId,
        position: { t: "long", v: "7" },
        t: { t: "long", v: "1081" },
        recordedAt: { t: "double", v: i.claims[0]!.timestamp },
      };
    ac.remember(i, p);
    assert.throws(() => ac.remember(i, { ...p, t: { t: "long", v: "1082" } }));
    assert.throws(() => ac.remember(i, { ...p, operationId: "another-scope" }));
    const row = {
      t: "1081",
      transaction: {
        positions: ["7"],
        txIds: [i.claims[0]!.txId],
        commandIds: [i.claims[0]!.commandId],
        operationId: i.operationId,
        stamp: String(i.claims[0]!.timestamp),
        stampStatus: "decided",
        changes: [
          {
            op: "assert",
            entity: i.rows[0]!.entity_id,
            attribute: i.rows[0]!.attribute,
            assertionId: i.rows[0]!.id,
            validFrom: 10,
            validTo: null,
            position: "7",
          },
        ],
      },
    };
    ac.checkEntry(row);
    row.transaction.changes[0]!.validFrom = 11;
    assert.throws(() => ac.checkEntry(row));
  } finally {
    ac.close();
  }
});
test("selects a listed backup which covers the acknowledged cut", () => {
  assert.equal(backupCut("(1118 1111)", "1113"), "1118");
  assert.throws(() => backupCut("nothing listed, duration 1119", "1113"));
  assert.throws(() => backupCut("(1111)", "1113"));
});
test("size model withholds an extrapolation when the third rung disagrees", () => {
  const points = [2, 4, 10].map((n) => ({
    seedFacts: 160 * n,
    finalBytes: 100 + n * 100,
    pauseMs: n === 10 ? 250 : 9 * n,
    setupThroughCutoverMs: 1000 + n * 100,
  }));
  const out = projection(points);
  assert("slopes" in out && out.slopes);
  const p = out.slopes as Record<string, { conditionalRange: number[] | null }>;
  assert(p["finalBytes"]!.conditionalRange);
  assert.equal(p["pauseMs"]!.conditionalRange, null);
});

test("vendor verification binds the cut and rejects unreadable segments even on a zero exit", () => {
  const line =
    "{:t 1818, :total-segments 36, :missing-segments #{}, :unreadable-segments (), :event :verify-backup/complete}";
  const args = ["file:/tmp/test", "true", "1818"];
  vendorResult("verify-backup", line, args, "s2-test");
  assert.throws(() => vendorResult("verify-backup", line.replace("1818", "1820"), args, "s2-test"));
  assert.throws(() => vendorResult("verify-backup", line.replace("()", "(bad)"), args, "s2-test"));
  assert.throws(() =>
    vendorResult(
      "restore-db",
      ":succeeded\n{:event :restore, :db s2-other, :basis-t 1818}",
      args,
      "s2-test",
    ),
  );
});

test("second host only mutates the container created for this attempt", async () => {
  const nonce = "new-attempt",
    prefix = "tx2-ha1-test",
    image = "sha256:" + "a".repeat(64),
    id = "b".repeat(64),
    net = "c".repeat(64);
  const sat = new Satellite(nonce, prefix, "/trial", [image]);
  await sat.call(["network", "create", "--label", "ha1.attempt=" + nonce, prefix], async () => net);
  await sat.call(
    [
      "create",
      "--pull",
      "never",
      "--name",
      prefix + "-target",
      "--network",
      net,
      "--label",
      "ha1.attempt=" + nonce,
      "--entrypoint",
      "sh",
      image,
      "-c",
      "true",
    ],
    async () => id,
  );
  await sat.call(["kill", "--signal", "KILL", id], async () => "done");
  await assert.rejects(
    sat.call(["rm", "-fv", "foreign", id], async () => {
      throw Error("dispatched");
    }),
    { name: "AssertionError" },
  );
  await assert.rejects(
    sat.call(["start", "foreign"], async () => {
      throw Error("dispatched");
    }),
    { name: "AssertionError" },
  );
});
