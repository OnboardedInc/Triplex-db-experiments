import { Effect } from "effect";
import { expect, it } from "vitest";
import { DatabaseScope, type TripleRow } from "@triplex-build/triplex/runtime";
import { DatomicClient } from "../src/DatomicClient.js";
import { makeDatomicStorageAdapter } from "../src/DatomicStorageAdapter.js";
import { encodeRowText } from "../src/rowText.js";
// [DX-B5-L4] Why: incomplete graph coverage must decline identically for raw rows and triples.
// Rejected: checking only response array shape (a referenced entity can still be missing).
it("declines malformed graph coverage without an Effect defect from either row getter", async () => {
  const client = new DatomicClient("http://127.0.0.1:1");
  const row: TripleRow = {
    id: "r",
    entity_id: "root",
    attribute: ":ref",
    value_type: "ref",
    value_string: "missing",
    value_number: null,
    value_boolean: null,
    value_datetime: null,
    value_json: null,
    recorded_at: 1,
    recorded_position: 1,
    valid_from: 0,
    valid_to: null,
    created_by: null,
    retracted_at: null,
    retracted_position: null,
    retract_tx_id: null,
    entity_type: null,
    schema_version: 1,
    tx_id: null,
  };
  client.request = async <T>() =>
    ({
      position: 1,
      t: "1",
      reset: false,
      entities: [["root", 1, [encodeRowText(row)]]],
      closures: [["root", ["root"]]],
    }) as T;
  const adapter = makeDatomicStorageAdapter(client, DatabaseScope.test("b5-row-fault")),
    basis = { validAt: 2 };
  try {
    expect(await Effect.runPromise(adapter.getReachTriples!("root", basis))).toBeUndefined();
    expect(await Effect.runPromise(adapter.getReachRows!("root", basis))).toBeUndefined();
    expect(await Effect.runPromise(adapter.getReachRowsMany!(["root"], basis))).toBeUndefined();
    expect(client.reachDiagnostics.faults).toBe(3);
  } finally {
    await Effect.runPromise(adapter.close());
    client.close();
  }
});
