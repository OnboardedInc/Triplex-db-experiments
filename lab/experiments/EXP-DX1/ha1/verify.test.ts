import assert from "node:assert/strict";
import test from "node:test";
import { Account } from "../../../../packages/datomic/test/ha1-account.ts";
import { projection } from "./projection.ts";
import { backupCut } from "./move.ts";
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
  assert.equal(
    backupCut('{:backups [{:t 1118, :connect-uri "one"} {:t 1111, :connect-uri "two"}]}', "1113"),
    "1118",
  );
  assert.throws(() => backupCut("nothing listed, duration 1119", "1113"));
  assert.throws(() => backupCut('{:backups [{:t 1111, :connect-uri "one"}]}', "1113"));
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
