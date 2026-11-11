import { expect, it } from "vitest";
import { datomicReplicaSource } from "../src/replica/source.js";
import { encodeRowText } from "../src/rowText.js";
import type { DatomicClient } from "../src/DatomicClient.js";
import type { TripleRow } from "@triplex-build/triplex/runtime";
const tx = "_tx/00000000000000000000000001";
const wire = (id: string, attribute: string, value: { type: string; value: unknown }) =>
  encodeRowText({
    id,
    entity_id: tx,
    attribute,
    value_type: value.type,
    value_string: value.type === "ref" || value.type === "string" ? value.value : null,
    value_number: value.type === "number" ? value.value : null,
    value_boolean: null,
    value_datetime: null,
    value_json: value.type === "json" ? JSON.stringify(value.value) : null,
    recorded_position: 1,
    recorded_at: 100,
    valid_from: 0,
    valid_to: null,
    created_by: "test",
    entity_type: "_Transaction",
    schema_version: 1,
    tx_id: null,
    retracted_at: null,
    retracted_position: null,
    retract_tx_id: null,
  } as TripleRow);
const journal = () => [
  wire("p", ":_tx/position", { type: "number", value: 1 }),
  wire("e", ":_tx/changed-entity", { type: "ref", value: "root" }),
  wire("c", ":_tx/change", {
    type: "json",
    value: { op: "retract", entityId: "root", tripleId: "retired", attribute: "value" },
  }),
];
it("reads the indexed journal and requests only changed entities at an exact cut", async () => {
  const requests: any[] = [];
  const client = {
    request: async (...args: any[]) => {
      requests.push(args);
      return args[1].endsWith("/transactions")
        ? { head: 1, transactions: [[tx, 1, journal()]] }
        : { position: 1 };
    },
  } as unknown as DatomicClient;
  const source = datomicReplicaSource(client, "s2-dGVzdA", async () => 1);
  expect(await source.feed(0, 1000, 1000)).toEqual({
    head: 1,
    transactions: [{ position: 1, entities: ["root"] }],
  });
  const basis = { recordedPosition: 1, validAt: 200 };
  await source.page(["root"], basis, true);
  expect(requests[0][2]).toEqual({ after: 0, limit: 1000, waitMs: 1000 });
  expect(requests[1][2]).toEqual({
    roots: ["root"],
    need: ["root"],
    basis,
    rowPage: true,
    full: true,
  });
});
it("declines malformed, incomplete and misbound journal content", async () => {
  const pages = [
    { declined: "irregular" },
    { head: 1, transactions: [[tx, 2, journal()]] },
    { head: 1, transactions: [[tx, 1, journal().slice(1)]] },
    {
      head: 1,
      transactions: [
        [
          tx,
          1,
          [
            wire("p", ":_tx/position", { type: "number", value: 1 }),
            wire("c", ":_tx/change", {
              type: "json",
              value: { op: "assert", entityId: "missing" },
            }),
          ],
        ],
      ],
    },
  ];
  for (const page of pages) {
    const client = { request: async () => page } as unknown as DatomicClient;
    await expect(
      datomicReplicaSource(client, "s2-dGVzdA", async () => 1).feed(0, 1, 0),
    ).rejects.toThrow();
  }
});
