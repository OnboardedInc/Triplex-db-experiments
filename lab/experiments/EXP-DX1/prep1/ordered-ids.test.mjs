import assert from "node:assert/strict";
import test from "node:test";
import { orderedSaveIdentity } from "../../../../packages/datomic/dist/index.js";
import { command } from "../w1/group/workload.ts";

test("a client replays the same journal, assertion IDs, and change references", () => {
  const token = "01J00000000000000000000001";
  const create = () =>
    command(
      "same-command",
      [{ e: "acct/a/person", a: ":field/name", v: { type: "string", value: token } }],
      [],
      true,
      false,
      orderedSaveIdentity(token),
    );
  const first = create();
  assert.deepEqual(create(), first);
  assert.equal(first.claims[0].txId, "_tx/" + token);
  assert.deepEqual(
    first.newIds,
    first.rows.map((_, i) => token + "0" + i),
  );
  assert.equal(first.rows[0].value_string, token);
  const change = JSON.parse(first.rows.find((r) => r.attribute === ":_tx/change").value_json);
  assert.equal(change.tripleId, token + "00");
  assert.equal(change.assertionTxId, first.claims[0].txId);
});

test("ordered blocks advance with their tokens and enforce the ordinal boundary", () => {
  const a = orderedSaveIdentity(),
    b = orderedSaveIdentity();
  assert(a.assertionId(255) < b.assertionId(0));
  assert(a.transactionId < b.transactionId);
  assert(a.assertionId(9) < a.assertionId(10));
  assert.throws(() => a.assertionId(256), RangeError);
  assert.throws(() => a.assertionId(-1), RangeError);
  assert.throws(() => a.assertionId(0.5), RangeError);
  assert.throws(() => orderedSaveIdentity("command"), TypeError);
});
