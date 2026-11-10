import { it, expect } from "vitest";
import { packEntity, unpackEntity } from "../src/replica/packed.js";
import type { SweepRow } from "../src/sweepRows.js";
const row = (e: string, id: string, value: SweepRow["value"], p = 1): SweepRow => ({
  id,
  entityId: e,
  attribute: "value",
  value,
  position: p,
  validFrom: 0,
});
it("round trips every value kind, signed zero, intervals and unusual strings", () => {
  const values: SweepRow["value"][] = [
    { type: "string", value: '\ud800😀"\\' },
    { type: "ref", value: "target" },
    { type: "integer", value: "9007199254740993" },
    { type: "number", value: -0 },
    { type: "boolean", value: false },
    { type: "datetime", value: -0 },
    { type: "json", value: { a: [-0, { ["__proto__"]: "x" }] } },
    { type: "blob", value: "YWJj", mimeType: "text/plain", size: 3, filename: "a.txt" },
  ];
  values.push({ type: "json", value: "a primitive" }, { type: "json", value: null });
  const rows = values.map((v, i) => row("root", String(i), v));
  const packed = packEntity(17, rows);
  expect(packed.buffer).toBeInstanceOf(SharedArrayBuffer);
  expect(unpackEntity("root", packed, 0)).toEqual(rows);
  expect(unpackEntity("root", packEntity(1, [{ ...rows[0]!, validTo: 5 }]), 5)).toEqual([]);
});
