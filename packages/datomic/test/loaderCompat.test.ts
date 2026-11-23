import { afterEach, expect, it } from "vitest";
import type { TripleRow } from "@triplex-build/triplex/runtime";
import { decodeRowText, decodeRowTextColumns, encodeRowText } from "../src/rowText.js";
import { acceptLoaderPositionRows } from "../src/loaderPositionRows.js";
import { packValue } from "../src/rows.js";

// [DX-DEMO1] Why: the one billion database's aging loader wrote journal position rows in the test fixture's form.
// The product reader keeps refusing them; a reader that opts in reads exactly that form and nothing else.
const row = (position: number): TripleRow => ({
  id: "_tx/T1/p", entity_id: "_tx/T1", attribute: ":_tx/position", ...packValue({ type: "number", value: position }),
  recorded_at: 1000, recorded_position: position, valid_from: 0, valid_to: null, created_by: null, retracted_at: null,
  retracted_position: null, retract_tx_id: null, entity_type: "_Transaction", schema_version: 0, tx_id: "_tx/T1",
});
// The fixture encoder's spelling: the ordinary "-" marker and the position itself as the payload.
const fixtureText = (position: number, payload: number) => {
  const text = encodeRowText(row(position));
  const body = text.indexOf('["');
  const values = JSON.parse(text.slice(body));
  values[6] = payload;
  return text.slice(0, body - 1) + "-" + JSON.stringify(values);
};
afterEach(() => acceptLoaderPositionRows(false));

it("refuses loader-written position rows by default", () => {
  expect(() => decodeRowText(fixtureText(87_003, 87_003))).toThrow("Journal position payload must be null");
  expect(() => decodeRowTextColumns(JSON.parse(fixtureText(5, 5).slice(fixtureText(5, 5).indexOf('["'))), "2")).toThrow();
});

it("reads them with the compatibility option, as the canonical row", () => {
  acceptLoaderPositionRows(true);
  expect(decodeRowText(fixtureText(87_003, 87_003))).toEqual(decodeRowText(encodeRowText(row(87_003))));
});

it("still refuses any other payload, and any payload under the product marker", () => {
  acceptLoaderPositionRows(true);
  expect(() => decodeRowText(fixtureText(87_003, 87_004))).toThrow();
  const text = encodeRowText(row(9));
  const body = text.indexOf('["');
  const values = JSON.parse(text.slice(body));
  values[6] = 9;
  expect(() => decodeRowText(text.slice(0, body) + JSON.stringify(values))).toThrow();
});
