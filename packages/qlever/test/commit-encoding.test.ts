/**
 * EXP-J01 compact commit encoding on QLever: the omitted channels lose no information (`_row` keeps
 * every column) and nothing in the repository reads them. The reader scan below fails the day a query
 * starts reading an omitted channel, which would make `compact` scopes answer differently.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { TripleRow } from "@triplex-build/triplex/runtime";
import { UNREAD_CHANNELS, decodeRow, encodedRowFields, literal, rowFields } from "../src/rdf.js";

const base: TripleRow = {
  id: "01K9ZZZZZZZZZZZZZZZZZZZZZZ",
  entity_id: "subj:1",
  attribute: ":j01/f0",
  value_type: "string",
  value_string: "v1-0",
  value_number: null,
  value_boolean: null,
  value_datetime: null,
  value_json: null,
  recorded_at: 1_762_560_000_000,
  recorded_position: 7,
  valid_from: 1_762_560_000_000,
  valid_to: null,
  created_by: null,
  retracted_at: null,
  retracted_position: null,
  retract_tx_id: null,
  entity_type: "j01-subject",
  schema_version: 1,
  tx_id: "_tx/01K9ZZZZZZZZZZZZZZZZZZZZZZ",
};
const rows: Record<string, TripleRow> = {
  string: base,
  number: {
    ...base,
    attribute: ":_tx/position",
    value_type: "number",
    value_string: null,
    value_number: 7,
  },
  datetime: {
    ...base,
    attribute: ":_tx/instant",
    value_type: "datetime",
    value_string: null,
    value_datetime: 1_762_560_000_000,
  },
  json: {
    ...base,
    attribute: ":_tx/change",
    value_type: "json",
    value_string: null,
    value_json: '{"op":"assert"}',
  },
  integer: { ...base, value_type: "integer", value_string: "9007199254740993" },
  retracted: {
    ...base,
    retracted_at: 1_762_560_000_500,
    retracted_position: 9,
    retract_tx_id: "_tx/01K9ZZZZZZZZZZZZZZZZZZZZZY",
  },
  bounded: { ...base, valid_to: 1_762_560_900_000, created_by: "actor" },
};

describe("QLever compact commit encoding (EXP-J01)", () => {
  it("is A0 minus exactly the unread channels, for every row shape", () => {
    for (const [name, row] of Object.entries(rows)) {
      const a0 = rowFields(row);
      expect(encodedRowFields(row, "a0"), name).toEqual(a0);
      expect(encodedRowFields(row), name).toEqual(a0);
      const compact = encodedRowFields(row, "compact");
      expect(compact, name).toEqual(a0.filter(([column]) => !UNREAD_CHANNELS.has(column)));
      expect(
        compact.some(([column]) => UNREAD_CHANNELS.has(column)),
        name,
      ).toBe(false);
    }
  });

  it("writes 18 triples for a string, ref or json fact and 21 for a number or datetime fact (A0: 27 and 30)", () => {
    const counts = Object.fromEntries(
      Object.entries(rows).map(([name, row]) => [
        name,
        [rowFields(row).length, encodedRowFields(row, "compact").length],
      ]),
    );
    expect(counts["string"]).toEqual([27, 18]);
    expect(counts["json"]).toEqual([27, 18]);
    expect(counts["number"]).toEqual([30, 21]);
    expect(counts["datetime"]).toEqual([30, 21]);
    expect(counts["retracted"]).toEqual([36, 22]);
    // One 10-fact command: 10 string data facts, 10 json changes, position, instant, command id and
    // changed entity, plus claim (4), operation (3) and meta position (2).
    const command = (encoding: "a0" | "compact") =>
      10 * encodedRowFields(rows["string"]!, encoding).length +
      10 * encodedRowFields(rows["json"]!, encoding).length +
      encodedRowFields(rows["number"]!, encoding).length +
      encodedRowFields(rows["datetime"]!, encoding).length +
      2 * encodedRowFields(rows["string"]!, encoding).length +
      9;
    expect([command("a0"), command("compact")]).toEqual([663, 447]);
  });

  it("keeps every column recoverable from _row", () => {
    for (const [name, row] of Object.entries(rows)) {
      const field = encodedRowFields(row, "compact").find(([column]) => column === "_row");
      expect(field, name).toBeDefined();
      expect(decodeRow(JSON.parse(field![1]) as string), name).toEqual(row);
      expect(field![1]).toBe(literal(JSON.parse(field![1]) as string));
    }
  });

  it("omits only channels that no query in the repository reads", () => {
    const root = path.resolve(import.meta.dirname, "../..");
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        if (entry === "node_modules" || entry === "dist") continue;
        const full = path.join(dir, entry);
        if (statSync(full).isDirectory()) walk(full);
        else if (/\.(ts|mjs|js)$/.test(entry)) files.push(full);
      }
    };
    for (const dir of ["qlever/src", "qualification/src", "qualification/workloads"])
      walk(path.join(root, dir));
    const writer = path.join(root, "qlever/src/rdf.ts");
    const readers: string[] = [];
    for (const file of files) {
      if (file === writer) continue;
      // [CX-INT-Q] Why: the broker masks JSON row properties and writes claim metadata;
      // neither consumes the omitted fact RDF channels. Rejected: excluding broker files wholesale (would hide new query readers).
      let text = readFileSync(file, "utf8");
      if (file.endsWith("/broker/snapshot.ts"))
        text = text.replace(/"(?:recorded_position|retracted_position)" in/g, "");
      if (file.endsWith("/broker/sparql.ts"))
        text = text.replace('["recorded_at", String(claim.timestamp)]', "");
      for (const channel of UNREAD_CHANNELS)
        for (const spelling of [`"${channel}"`, `'${channel}'`, `field:${channel}>`])
          if (text.includes(spelling)) readers.push(`${path.relative(root, file)}: ${spelling}`);
    }
    expect(readers).toEqual([]);
  });
});
