import { integer } from "@triplex-build/triplex";
import { expect, it } from "vitest";
import { makeXtdbBrokerReplica, isXtdbReplicaUnavailable } from "../src/BrokerReplica.js";
import { ModelXtdbClient } from "./p2b/model.js";
import type { TripleRow } from "@triplex-build/triplex/runtime";

const row: TripleRow = {
  id: "r",
  entity_id: "s",
  attribute: ":p2b/value",
  value_type: "string",
  value_string: "x",
  value_number: null,
  value_boolean: null,
  value_datetime: null,
  value_json: null,
  recorded_at: 2,
  recorded_position: 2048,
  valid_from: 1,
  valid_to: null,
  created_by: null,
  retracted_at: null,
  retracted_position: null,
  retract_tx_id: null,
  entity_type: null,
  schema_version: 1,
  tx_id: "tx",
};
it("XTDB emits guarded fixed-valid-time atomic publication and reads marker with rows", async () => {
  const client = new ModelXtdbClient(),
    replica = makeXtdbBrokerReplica(client, "scope");
  expect(replica.maxFramesPerApply).toBe(1);
  const zero = await replica.marker();
  await replica.fence(zero, 1, "owner");
  const from = await replica.marker(),
    to = { ...from, position: 3071 };
  const member = {
    operationId: "o",
    attemptId: "a",
    positions: [2048],
    claims: [],
    rows: [row],
    priors: [],
    subjects: ["s"],
  };
  await replica.publish(from, to, [member]);
  expect(await replica.read({ pattern: { entityId: "s" } })).toEqual({ marker: to, rows: [row] });
  expect(client.transactions.at(-1)?.map((statement) => statement.sql.split(" ")[0])).toEqual([
    "ASSERT",
    "INSERT",
    "INSERT",
    "INSERT",
  ]);
  expect(client.snapshots).toHaveLength(1);
  expect(client.snapshots[0]).toHaveLength(2);
  await replica.publish(from, to, [member]);
  expect(await replica.marker()).toEqual(to);
  expect(client.rows.size).toBe(1);
});
it("a lost publication response can be retried with P0004, then resolved by its marker", async () => {
  const client = new ModelXtdbClient(),
    replica = makeXtdbBrokerReplica(client, "scope");
  await replica.fence(await replica.marker(), 1, "owner");
  const from = await replica.marker(),
    to = { ...from, position: 3071 };
  client.lostResponse = true;
  const members = [
    {
      operationId: "o",
      attemptId: "a",
      positions: [2048],
      claims: [],
      rows: [row],
      priors: [],
      subjects: ["s"],
    },
  ];
  await expect(replica.publish(from, to, members)).rejects.toMatchObject({ code: "ECONNRESET" });
  await replica.publish(from, to, members);
  expect(await replica.marker()).toEqual(to);
});
it("only connectivity errors permit fallback; a malformed marker refuses", async () => {
  expect(isXtdbReplicaUnavailable({ code: "ECONNREFUSED" })).toBe(true);
  expect(isXtdbReplicaUnavailable({ code: "ECONNRESET", cause: { code: "42601" } })).toBe(false);
  const client = new ModelXtdbClient(),
    replica = makeXtdbBrokerReplica(client, "scope");
  client.marker = { position: "bad", epoch: 1, incarnation: "owner" };
  await expect(replica.read({ pattern: {} })).rejects.toThrow("Invalid XTDB broker marker");
});

it("native broker reads wait/refuse before evaluating an ineligible replica", async () => {
  const { Effect } = await import("effect");
  const { TypeExpr } = await import("@triplex-build/triplex/config");
  const { DatabaseScope } = await import("@triplex-build/triplex/runtime");
  const { makeXtdbNativeQueries } = await import("../src/native/NativeQueries.js");
  const client = new ModelXtdbClient();
  let built = false;
  const native = makeXtdbNativeQueries(client, DatabaseScope.test("native-broker"), {
    broker: true,
    basisWaitMs: 0,
  });
  const contract = {
    name: "p2b/native",
    parameters: TypeExpr.struct({}),
    row: TypeExpr.struct({ count: TypeExpr.required(TypeExpr.int64) }),
  };
  await expect(
    Effect.runPromise(
      native.selectSql(
        contract,
        {},
        () => {
          built = true;
          return "SELECT 1 AS count";
        },
        { basis: { recordedPosition: 2048 } },
      ),
    ),
  ).rejects.toMatchObject({ reason: "basis-not-reached" });
  expect(built).toBe(false);
});

it("native broker reads refuse a reset after their answer, including a reset at the same position", async () => {
  const { Effect } = await import("effect");
  const { TypeExpr } = await import("@triplex-build/triplex/config");
  const { DatabaseScope } = await import("@triplex-build/triplex/runtime");
  const { makeXtdbNativeQueries } = await import("../src/native/NativeQueries.js");
  let probes = 0;
  const client = new ModelXtdbClient();
  const query = client.query;
  client.query = async (sql, params, basis, options) => {
    if (sql.includes("tx_broker_marker")) {
      client.marker = { position: 3071, epoch: 1, incarnation: ++probes === 1 ? "old" : "reset" };
      return query(sql, params, basis, options);
    }
    return [{ count: "1" }] as never;
  };
  const native = makeXtdbNativeQueries(client, DatabaseScope.test("native-broker"), {
    broker: true,
  });
  const contract = {
    name: "p2b/native",
    parameters: TypeExpr.struct({}),
    row: TypeExpr.struct({ count: TypeExpr.required(TypeExpr.int64) }),
  };
  await expect(
    Effect.runPromise(
      native.selectSql(contract, {}, () => "SELECT 1 AS count", {
        basis: { recordedPosition: 2048 },
      }),
    ),
  ).rejects.toMatchObject({ reason: "basis-not-reached" });
  expect(probes).toBe(2);
});

it("native broker reads report an exact named cut when the marker stays unchanged", async () => {
  const { Effect } = await import("effect");
  const { TypeExpr } = await import("@triplex-build/triplex/config");
  const { DatabaseScope } = await import("@triplex-build/triplex/runtime");
  const { makeXtdbNativeQueries } = await import("../src/native/NativeQueries.js");
  const client = new ModelXtdbClient();
  const query = client.query;
  client.marker = { position: 3071, epoch: 1, incarnation: "owner" };
  client.query = async (sql, params, basis, options) =>
    sql.includes("tx_broker_marker")
      ? query(sql, params, basis, options)
      : ([{ count: "1" }] as never);
  const native = makeXtdbNativeQueries(client, DatabaseScope.test("native-broker"), {
    broker: true,
  });
  const contract = {
    name: "p2b/native",
    parameters: TypeExpr.struct({}),
    row: TypeExpr.struct({ count: TypeExpr.required(TypeExpr.int64) }),
  };
  const answer = await Effect.runPromise(
    native.selectSql(contract, {}, () => "SELECT 1 AS count", {
      basis: { recordedPosition: 2048 },
    }),
  );
  expect(answer.basis.recordedPosition).toBe(2048);
  expect(answer.rows).toEqual([{ count: integer("1") }]);
});
