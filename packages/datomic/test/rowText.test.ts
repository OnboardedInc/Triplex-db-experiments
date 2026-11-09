import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import type { TripleRow } from "@triplex-build/triplex/runtime";
import { encodeRow, decodeRow } from "../src/protocol.js";
import { encodeRowText, decodeRowText } from "../src/rowText.js";
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
    expect(decodeRowText(encodeRowText(row))).toEqual(decodeRow(encodeRow(row)));
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
      expect(decodeRowText(encodeRowText(row))).toEqual(decodeRow(encodeRow(row)));
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
