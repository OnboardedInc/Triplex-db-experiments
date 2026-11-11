import assert from "node:assert/strict";
import { canonicalWorld } from "../../../bench/lib/canonical.ts";
import { DatomicClient } from "../../../../packages/datomic/dist/index.js";
import { runtimeApi } from "../../../bench/lib/triplex.ts";

// [DX-R3] Why: the differential's source guarantee must be exercised through real non-replay-safe SPI writes.
// Rejected: proving only the reader's conservative policy with fabricated capability responses.
export async function proveStrictSource(endpoint: string) {
  const client = new DatomicClient(endpoint);
  try {
    for (const strict of [false, true]) {
      const scope = runtimeApi.DatabaseScope.test(`dxr3-clock-probe-${Date.now()}-${strict}`);
      const db = await client.create(scope, "lean", strict);
      assert.equal(db.created, true, "source probe requires its own fresh scope");
      try {
        assert.equal(db.strictRecordClocks, strict);
        assert.equal((await client.create(scope, "lean", !strict)).strictRecordClocks, strict);
        const row = (position: number, recordedAt: number, suffix = "") => ({
          id: `row-${position}${suffix}`, entity_id: "root", attribute: ":v", value_type: "string",
          value_string: "probe", value_number: null, value_boolean: null, value_datetime: null, value_json: null,
          recorded_at: recordedAt, recorded_position: position, valid_from: 0, valid_to: null,
          created_by: null, entity_type: null, schema_version: 1, tx_id: `tx-${position}`,
          retracted_at: null, retracted_position: null, retract_tx_id: null,
        });
        const write = (position: number, clocks: number[]) => client.transact(db.db, {
          sourceK: position - 1, position, operationId: `probe-${position}-${clocks.join("-")}`,
          attemptId: "probe", replaySafe: false,
          rows: clocks.map((t, i) => row(position, t, `-${i}`)) as any,
          newIds: clocks.map((_, i) => `row-${position}-${i}`),
          claims: [{ commandId: `command-${position}`, txId: `tx-${position}`, timestamp: clocks[0]! }],
        });
        await write(1, [100]); await write(2, [101]);
        const expected = [row(1, 100, "-0"), row(2, 101, "-0")];
        const checkRows = async (position: number) => assert.equal(canonicalWorld(await client.rows(db.db, {
          entityIds: ["root"], basis: { recordedPosition: position, validAt: 0 },
        })), canonicalWorld(expected));
        await checkRows(2);
        const cap: any = await client.request("POST", `/v2/db/${db.db}/reach-many`, {
          replicaCapability: true, basis: { recordedPosition: 2, validAt: 0 },
        });
        assert.equal(cap.supported, true); assert.equal(cap.strictRecordClocks, strict);
        if (strict) {
          for (const clock of [100, 101]) await assert.rejects(write(3, [clock]),
            (e: any) => e.code === "ClockConflict" && e.maximum === 101);
          await assert.rejects(write(3, [102, 103]), (e: any) => e.code === "TransactionRejected");
          assert.equal((await client.basis(db.db)).position.v, "2");
          await client.transact(db.db, { sourceK: 2, position: 3, operationId: "claim-only", attemptId: "probe",
            replaySafe: false, rows: [], newIds: [], claims: [{ commandId: "claim-only", txId: "claim", timestamp: 102 }] });
          await assert.rejects(write(4, [102]), (e: any) => e.code === "ClockConflict" && e.maximum === 102);
        } else { await write(3, [100]); expected.push(row(3, 100, "-0")); }
        await checkRows(3);
        assert.equal((await client.basis(db.db)).position.v, "3");
        console.log(JSON.stringify({ kind: "native-strict-clock-source", strict, head: 3,
          capability: cap, regression: strict ? "rejected" : "accepted", mixedClockGuard: strict ? "rejected" : "not-requested" }));
      } finally { assert.equal((await client.delete(scope)).deleted, true); }
    }
  } finally { client.close(); }
}
