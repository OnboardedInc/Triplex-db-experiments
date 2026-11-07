// [EXP-F02b] RULINGS Q30d: a `_native` shadow counts as exact only if it survives QLever's export
// bit for bit (not -0, low 4 mantissa bits clear, `%.13g` parses back; integers within +-2^59).
// The failing values are EXP-F02's `native-ledger/value_number_native` and
// `native-ledger/value_datetime_native` records (lab/experiments/EXP-F02-wire-exactness/results.json).
import type { TripleRow } from "@triplex-build/triplex/runtime";
import { describe, expect, it } from "vitest";

import { makeQleverNativeContext } from "../src/native/NativeContext.js";
import { nativeNumeric, numericShadowIsExact, packValue, rowFields } from "../src/rdf.js";

/** EXP-F02 values whose shadow was flagged exact but exported changed. */
const changedByExport = [
  { id: "neg-zero", value: -0, exported: 0 },
  { id: "min-normal", value: 2.2250738585072014e-308, exported: 2.225073858507e-308 },
  { id: "bit-5", value: 1 + 2 ** -48, exported: 1 },
  { id: "1+2^-40", value: 1 + 2 ** -40, exported: 1.000000000001 },
  { id: "half-ms instant", value: 1_731_000_000_123.5, exported: 1_731_000_000_124 },
];

/** EXP-F02 values whose shadow came back exact; they stay admitted. */
const keptExact = [
  0,
  1,
  -1,
  16.5,
  -1.5,
  123456789.125,
  1e21,
  2 ** 53,
  2 ** 53 + 2,
  1_731_000_000_123,
];

describe("numericShadowIsExact (Q30d)", () => {
  it.each(changedByExport)("flags $id inexact", ({ value, exported }) => {
    expect(Number(value.toPrecision(13)) === value && !Object.is(value, -0)).toBe(false);
    expect(Object.is(Number(value.toPrecision(13)), exported) || Object.is(value, -0)).toBe(true);
    expect(numericShadowIsExact(value)).toBe(false);
  });

  it("keeps integers inside the 60-bit range and short doubles with clear low bits", () => {
    for (const value of keptExact) expect(numericShadowIsExact(value)).toBe(true);
    expect(numericShadowIsExact(-(2 ** 59))).toBe(true);
    expect(numericShadowIsExact(2 ** 59 - 1024)).toBe(true);
  });

  it("refuses non-finite values, dropped low bits, and integral doubles past 2^59 that %.13g changes", () => {
    for (const value of [Number.NaN, Infinity, -Infinity, 1.0000000000000002, 0.1, 2 ** 60])
      expect(numericShadowIsExact(value)).toBe(false);
  });

  it("rowFields writes no `_native` shadow for those values and flags them inexact", () => {
    const row = (value: number, type: "number" | "datetime"): TripleRow => ({
      id: "a",
      entity_id: "e",
      attribute: ":f02b/v",
      ...packValue({ type, value }),
      recorded_at: 1,
      recorded_position: 1,
      valid_from: 1,
      valid_to: null,
      created_by: null,
      retracted_at: null,
      retracted_position: null,
      retract_tx_id: null,
      entity_type: null,
      schema_version: null,
      tx_id: null,
    });
    for (const { value } of changedByExport) {
      for (const type of ["number", "datetime"] as const) {
        const column = type === "number" ? "value_number" : "value_datetime";
        const fields = new Map(rowFields(row(value, type)));
        expect(fields.has(`${column}_native`)).toBe(false);
        expect(fields.get(`${column}_exact`)).toBe('"false"');
        // The lexical channel stays authoritative and exact.
        expect(fields.get(column)).toBe(
          JSON.stringify(Object.is(value, -0) ? "-0" : String(value)),
        );
      }
    }
    const kept = new Map(rowFields(row(16.5, "number")));
    expect(kept.get("value_number_native")).toBe(nativeNumeric(16.5));
    expect(kept.get("value_number_exact")).toBe('"true"');
  });

  it("native parameters use the same predicate and encoder (NativeContext.nativeNumber)", () => {
    const view = makeQleverNativeContext({ scope: "f02b", recordedPosition: 1, validAt: 10 });
    for (const { value } of changedByExport)
      expect(() => view.nativeNumber(value)).toThrow(RangeError);
    for (const value of keptExact) expect(view.nativeNumber(value)).toBe(nativeNumeric(value));
  });
});
