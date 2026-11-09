import { it, expect } from "vitest";
import { Option } from "effect";
import {
  metadataInputs,
  transactionRecordFromTriples,
} from "../../src/store/transactionMetadata.js";
import { unsafe } from "../../src/Branded.js";
import type { Triple } from "../../src/Triple.js";

it("decodes v2 journal from position stamp and preserves v1 legacy bytes", () => {
  const txId = unsafe.transactionId("_tx/00000000000000000000000001");
  const change = {
    op: "assert" as const,
    tripleId: unsafe.tripleId("00000000000000000000000002"),
    entityId: unsafe.entityId("journal:subject"),
    attribute: ":value",
    value: { type: "string" as const, value: "v" },
    validFrom: 1000,
    recordedAt: 1000.001,
  };
  const inputs = metadataInputs(txId, 1, 1000, undefined, [change]);
  expect(inputs.some((input) => input.attribute === ":_tx/instant")).toBe(false);
  const rows: Triple[] = inputs.map((input, i) => ({
    ...input,
    id: unsafe.tripleId(String(i).padStart(26, "0")),
    entityId: txId,
    attribute: input.attribute as never,
    recordedAt: 1000.001,
    validFrom: input.validFrom!,
    validTo: Option.none(),
    createdBy: Option.none(),
    retractedAt: Option.none(),
    entityType: Option.some("_Transaction"),
    schemaVersion: Option.some(1),
    txId: Option.some(txId),
    retractTxId: Option.none(),
  }));
  expect(transactionRecordFromTriples(txId, rows)?.changes).toEqual([change]);
  const legacy = rows.map((row) =>
    row.attribute === ":_tx/change"
      ? { ...row, value: { type: "json" as const, value: change } }
      : row,
  );
  legacy.push({
    ...rows[0]!,
    attribute: ":_tx/instant" as never,
    value: { type: "datetime", value: 1000.001 },
  });
  expect(transactionRecordFromTriples(txId, legacy)?.changes).toEqual([change]);
  expect(transactionRecordFromTriples(txId, legacy)?.instant).toBe(1000.001);
});
