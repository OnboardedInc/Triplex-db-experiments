import { expect, it } from "vitest";
import type { TripleRow } from "@triplex-build/triplex/runtime";
import { DatomicClient } from "../src/DatomicClient.js";
import { packValue } from "../src/rows.js";
import { decodeRowText } from "../src/rowText.js";

// [DX-B5-L6] Why: the actual immutable scope header selects compact writes, never the request.
// Rejected: compacting an existing legacy scope merely because its caller requested lean.
it.each(["lean", "legacy"] as const)(
  "binds compact payloads to the actual %s layout",
  async (layout) => {
    const client = new DatomicClient("http://127.0.0.1:1");
    const bodies: Record<string, any>[] = [];
    client.request = async <T>(_method: string, route: string, body?: unknown): Promise<T> => {
      if (route.endsWith("create"))
        return {
          db: "scope",
          created: false,
          schemaHash: "fixture",
          ...(layout === "lean" ? { layout } : {}),
        } as T;
      bodies.push(body as Record<string, any>);
      return { t: { t: "long", v: "1001" }, position: { t: "long", v: "1" }, delta: 0 } as T;
    };
    const row: TripleRow = {
      id: "new",
      entity_id: "root",
      entity_type: null,
      attribute: "a",
      ...packValue({ type: "string", value: "payload" }),
      recorded_at: 1,
      recorded_position: 1,
      valid_from: 0,
      valid_to: null,
      retracted_at: null,
      retracted_position: null,
      retract_tx_id: null,
      tx_id: "tx",
      created_by: null,
      schema_version: 1,
    };
    const retired = {
      ...row,
      id: "old",
      retracted_at: 2,
      retracted_position: 3,
      retract_tx_id: "retire",
    };
    try {
      await client.create("scope", "lean");
      await client.transact("scope", {
        sourceK: 0,
        position: 1,
        operationId: "op",
        attemptId: "attempt",
        rows: [retired, row],
        newIds: ["new"],
        claims: [],
      });
      const body = bodies[0]!;
      expect(decodeRowText(body.rowTexts.new)).toEqual(row);
      if (layout === "lean") {
        expect(body.rowMode).toBe("texts");
        expect(body.rowOrder).toEqual(["old", "new"]);
        expect(body.rows).toHaveLength(1);
        expect(Object.keys(body.rows[0]).sort()).toEqual([
          "entity_id",
          "entity_type",
          "id",
          "retract_tx_id",
          "retracted_at",
          "retracted_position",
        ]);
      } else {
        expect(body).not.toHaveProperty("rowMode");
        expect(body.rows).toHaveLength(2);
        expect(body.rows[0]).toHaveProperty("attribute");
      }
    } finally {
      client.close();
    }
  },
);
