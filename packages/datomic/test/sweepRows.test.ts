import { describe, it, expect } from "vitest";
import { decodeSweepRows } from "../src/sweepRows.js";
import { encodeRowText, rowTextColumns } from "../src/rowText.js";
const row: any = {
  id: "r",
  entity_id: "s",
  attribute: "a",
  value_type: "string",
  value_string: "v",
  value_number: null,
  value_boolean: null,
  value_datetime: null,
  value_json: null,
  recorded_at: 10,
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
const wire = () =>
  ({
    position: 1,
    t: "100",
    reset: false,
    entities: [
      [
        "s",
        1,
        [rowTextColumns.map((k) => (k === "recorded_position" ? "0000000000000001" : row[k]))],
      ],
    ],
    closures: [["s", ["s"]]],
  }) as any;
const basis = { recordedPosition: 1, validAt: 5 };
describe("uncached sweep rows", () => {
  it("preserves values and physical position for array and text wire forms", () => {
    const expected = [
      {
        id: "r",
        entityId: "s",
        attribute: "a",
        value: { type: "string", value: "v" },
        position: 1,
        validFrom: 0,
      },
    ];
    expect(decodeSweepRows(wire(), ["s"], basis)).toEqual(expected);
    const w = wire();
    w.entities[0][2] = [encodeRowText(row)];
    expect(decodeSweepRows(w, ["s"], basis)).toEqual(expected);
  });
  it("declines explicitly and rejects incomplete, duplicate, wrong-cut and wrong-root pages", () => {
    expect(decodeSweepRows({ declined: "unsupported" } as any, ["s"], basis)).toBeUndefined();
    for (const mutate of [
      (w: any) => w.position++,
      (w: any) => w.entities[0].pop(),
      (w: any) => w.entities.push(w.entities[0]),
      (w: any) => (w.closures[0][0] = "other"),
      (w: any) => w.entities[0][2].push(w.entities[0][2][0]),
    ]) {
      const w = wire();
      mutate(w);
      expect(() => decodeSweepRows(w, ["s"], basis)).toThrow();
    }
  });
  it("filters valid time and refuses missing referenced entities", () => {
    const w = wire();
    w.entities[0][2][0][12] = 4;
    expect(decodeSweepRows(w, ["s"], basis)).toEqual([]);
    const x = wire();
    x.entities[0][2][0][4] = "ref";
    x.entities[0][2][0][5] = "missing";
    expect(() => decodeSweepRows(x, ["s"], basis)).toThrow();
  });
});

// [DX-H6] Why: check the specialized fixed-column validator against the original codec on every column.
// Rejected: assuming unused metadata columns can be left unchecked.
it("matches original codec acceptance and values for mutations of every column", async () => {
  const { decodeRowTextColumns } = await import("../src/rowText.js");
  const { decodeValueColumns, storedValueDomain, ValueDomains } =
    await import("@triplex-build/triplex/runtime");
  const candidates = [
    null,
    0,
    1,
    -0,
    "-0",
    "bad",
    "0000000000000001",
    true,
    {},
    [],
    1.5,
    Number.MAX_SAFE_INTEGER + 1,
  ];
  for (let column = 0; column < 17; column++)
    for (const candidate of candidates) {
      const w = wire(),
        columns = w.entities[0][2][0];
      columns[column] = candidate;
      let expected: any,
        valid = true;
      try {
        const r = decodeRowTextColumns(columns, "2");
        if (
          r.entity_id !== "s" ||
          r.recorded_position < 1 ||
          r.recorded_position > 1 ||
          !Number.isFinite(r.recorded_at)
        )
          throw Error("binding");
        const value = decodeValueColumns(r, storedValueDomain(ValueDomains.datomic, r.attribute));
        if (value.type === "ref" && value.value !== "s" && value.value !== "v")
          throw Error("missing ref");
        expected =
          r.valid_from <= 5 && (r.valid_to === null || r.valid_to > 5)
            ? [
                {
                  id: r.id,
                  entityId: r.entity_id,
                  attribute: r.attribute,
                  value,
                  position: r.recorded_position,
                  validFrom: r.valid_from,
                  ...(r.valid_to === null ? {} : { validTo: r.valid_to }),
                },
              ]
            : [];
      } catch {
        valid = false;
      }
      w.entities.push(["v", 0, []]);
      w.closures[0][1].push("v");
      if (valid)
        expect(decodeSweepRows(w, ["s"], basis), `column ${column}: ${String(candidate)}`).toEqual(
          expected,
        );
      else
        expect(
          () => decodeSweepRows(w, ["s"], basis),
          `column ${column}: ${String(candidate)}`,
        ).toThrow();
    }
});

// [DX-B9-A] Why: reordering must not silently discard nonempty entities outside the visible root graph.
// Rejected: trusting a closure list without following the returned visible reference values.
it("rejects a nonempty unreachable entity instead of dropping its rows", () => {
  const w = wire();
  const extra = [...w.entities[0][2][0]];
  extra[1] = "foreign-row";
  extra[2] = "extra";
  w.entities.push(["extra", 1, [extra]]);
  w.closures[0][1].push("extra");
  expect(() => decodeSweepRows(w, ["s"], basis)).toThrow("unreachable");
});
