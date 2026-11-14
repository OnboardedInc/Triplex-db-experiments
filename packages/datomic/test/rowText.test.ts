import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import type { TripleRow } from "@triplex-build/triplex/runtime";
import { encodeRow, decodeRow } from "../src/protocol.js";
import { encodeRowText, decodeRowText, decodeRowTextColumns } from "../src/rowText.js";
import { validateTagged } from "../src/codec.js";
import { packValue } from "../src/rows.js";

// [EXP-DX1] Why: seeded UTF-16 fuzz includes JSON escaping, signed zero and safe integer edges.
// Rejected: only ASCII fixtures (miss header code-unit offsets and string "-0").
const base = (): TripleRow => ({
  id: "id",
  entity_id: "root",
  attribute: "a",
  ...packValue({ type: "number", value: 0 }),
  recorded_at: -0,
  recorded_position: 1,
  valid_from: -0,
  valid_to: null,
  created_by: null,
  retracted_at: null,
  retracted_position: null,
  retract_tx_id: null,
  entity_type: null,
  schema_version: 1,
  tx_id: null,
});
it("round trips 10,000 random live rows exactly like the tagged row codec", () => {
  let seed = 0x12345678;
  const rand = () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return seed >>> 0;
  };
  const chars = ['"', "\\", "\0", "\n", "😀", "\ud800", "-0", "é", "x"];
  const str = () =>
    Array.from({ length: rand() % 15 }, () => chars[rand() % chars.length]).join("");
  for (let i = 0; i < 10000; i++) {
    const row = {
      ...base(),
      id: str(),
      entity_id: str(),
      created_by: i % 2 ? str() : null,
      valid_to: i % 3 ? null : -0,
      recorded_position: i % 2 ? Number.MAX_SAFE_INTEGER : 1,
      schema_version: i % 2 ? Number.MAX_SAFE_INTEGER : 1,
    };
    Object.assign(
      row,
      packValue(
        i % 3 === 0
          ? { type: "ref", value: str().replaceAll("\0", "x").toWellFormed() || "target" }
          : i % 3 === 1
            ? { type: "string", value: str().replaceAll("\0", "x").toWellFormed() || "target" }
            : { type: "number", value: i % 2 ? 0 : Number.MIN_VALUE },
      ),
    );
    for (const version of ["1", "2"] as const)
      expect(decodeRowText(encodeRowText(row, version))).toEqual(decodeRow(encodeRow(row)));
  }
});
it("uses every accepted row-compatible codec vector and rejects invalid domains", () => {
  const vectors = JSON.parse(
    readFileSync(new URL("../gateway/codec-vectors.json", import.meta.url), "utf8"),
  );
  const cases = JSON.parse(
    readFileSync(new URL("../gateway/codec-cases.json", import.meta.url), "utf8"),
  );
  for (const v of [
    ...vectors,
    ...cases
      .filter((c: { expected: string }) => c.expected === "accept")
      .map((c: { wire: unknown }) => c.wire),
  ]) {
    const tag = validateTagged(v);
    if (
      tag.t === "double" ||
      tag.t === "string" ||
      (tag.t === "long" && Math.abs(Number(tag.v)) <= Number.MAX_SAFE_INTEGER)
    ) {
      if (tag.t === "double" && Object.is(tag.v, -0)) {
        expect(() => encodeRowText({ ...base(), value_number: -0 })).toThrow();
        continue;
      }
      const row = {
        ...base(),
        ...packValue(
          tag.t === "double"
            ? { type: "number", value: tag.v }
            : tag.t === "long"
              ? { type: "integer", value: tag.v as string }
              : { type: "string", value: tag.v as string },
        ),
      };
      for (const version of ["1", "2"] as const)
        expect(decodeRowText(encodeRowText(row, version))).toEqual(decodeRow(encodeRow(row)));
    }
  }
  for (const value of [Infinity, NaN])
    expect(() => encodeRowText({ ...base(), value_number: value })).toThrow();
  expect(() => encodeRowText({ ...base(), schema_version: 2 ** 53 })).toThrow();
  expect(() =>
    encodeRowText({
      ...base(),
      value_type: "integer",
      value_number: null,
      value_string: "9223372036854775808",
    }),
  ).toThrow();
});

// [EXP-DX1] Why: every stored value family must retain the tagged decoder's validation and exact bytes.
// Rejected: fuzzing only primitive families and assuming blob/JSON metadata follows them.
it("round trips every value family and preserves decoder rejection", () => {
  const values = [
    { type: "string", value: 'quotes"\\\n\u0001😀-0' },
    { type: "ref", value: "entity:😀" },
    { type: "integer", value: "-9223372036854775808" },
    { type: "integer", value: "9223372036854775807" },
    { type: "boolean", value: false },
    { type: "boolean", value: true },
    { type: "datetime", value: -8640000000000000 },
    { type: "datetime", value: 8640000000000000 },
    { type: "json", value: { nested: [null, true, "-0", 1.25, { quote: '"\\😀' }] } },
    {
      type: "blob",
      value: "sha256:example",
      mimeType: "application/octet-stream",
      size: Number.MAX_SAFE_INTEGER,
      filename: 'file"\\😀',
    },
  ] as const;
  for (const value of values) {
    const row = { ...base(), ...packValue(value as Parameters<typeof packValue>[0]) };
    for (const version of ["1", "2"] as const)
      expect(decodeRowText(encodeRowText(row, version))).toEqual(decodeRow(encodeRow(row)));
  }
  for (const patch of [
    { value_type: "number", value_number: -0 },
    { value_type: "string", value_number: null, value_string: "nul\0" },
    { value_type: "ref", value_number: null, value_string: "" },
    { value_type: "integer", value_number: null, value_string: "01" },
    { value_type: "datetime", value_number: null, value_datetime: Infinity },
    { value_type: "boolean", value_number: null, value_boolean: 2 },
    { value_type: "json", value_number: null, value_json: "[" },
    {
      value_type: "blob",
      value_number: null,
      value_string: "blob",
      value_json: '{"mimeType":"x","size":-1}',
    },
  ]) {
    const row = { ...base(), ...patch } as TripleRow;
    expect(() => decodeRow(encodeRow(row))).toThrow();
    expect(() => encodeRowText(row)).toThrow();
  }
});

// [DX-B3-M1] Why: the transactor patches only the fixed-width position, including journal values.
// Rejected: parsing and serializing row JSON inside the transactor.
it("patches the position digits without changing the row body", () => {
  for (const attribute of [":a", ":_tx/position"]) {
    const row = { ...base(), attribute, value_number: 1 };
    const text = encodeRowText(row);
    const offset = text.indexOf('["') + 2;
    expect(text.slice(offset, offset + 16)).toBe("0000000000000001");
    const decoded = decodeRowText(
      text.slice(0, offset) + "0000000000000123" + text.slice(offset + 16),
    );
    expect(decoded.recorded_position).toBe(123);
    expect(decoded.value_number).toBe(attribute === ":_tx/position" ? 123 : 1);
  }
});

it("keeps a sixteen-digit version 1 id distinct from the version 2 position", () => {
  const row = { ...base(), id: "0000000000000123" };
  expect(decodeRowText(encodeRowText(row, "1"))).toEqual(row);
});

it("rejects inconsistent journal position values before encoding", () => {
  expect(() =>
    encodeRowText({ ...base(), attribute: ":_tx/position", value_number: 123 }),
  ).toThrow();
  expect(() => encodeRowText({ ...base(), recorded_position: -1 })).toThrow();
});

it("rejects malformed modern wire positions and non-null journal placeholders", () => {
  const text = encodeRowText({ ...base(), attribute: ":_tx/position", value_number: 1 });
  const values = JSON.parse(text.slice(text.indexOf('["')));
  for (const p of [1, "1", "000000000000000x"])
    expect(() => decodeRowTextColumns([p, ...values.slice(1)], "2")).toThrow();
  values[6] = 1;
  expect(() => decodeRowTextColumns(values, "2")).toThrow();
});

// [DX-T1-5] Why: JVM-assigned clocks use equivalent JSON numbers; binding still checks the exact duplicated header.
// Rejected: accepting a forged ID, validity or reference header to accommodate serializer differences.
it("accepts JVM JSON numeric spelling while checking every header and column", () => {
  const row = { ...base(), recorded_at: 1000, valid_from: 10, value_number: 3 };
  const encoded = encodeRowText(row);
  const body = encoded.indexOf('["0000000000000001"');
  const numbers = encoded.slice(body).replace(",1000,10,", ",1.0E3,10.0,");
  const text = encoded.slice(0, body) + numbers;
  expect(text).not.toBe(encoded);
  expect(decodeRowText(text)).toEqual(row);
  expect(() => decodeRowText(text.replace("20002id", "20002xx"))).toThrow("header");
  expect(() => decodeRowText(text.slice(0, body) + numbers.replace(",10.0,", ",11.0,"))).toThrow(
    "header",
  );
  expect(() => decodeRowText(text.slice(0, body) + numbers.replace(",1.0E3,", ',"1000",'))).toThrow(
    "number",
  );
  expect(() => decodeRowText(text.slice(0, body) + numbers.replace("]", ",null]"))).toThrow(
    "columns",
  );
});
