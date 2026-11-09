// [EXP-QH1-R3] Why: step 3 replaced the base32 id conversion, the per-entity sort and the Number() calls with faster code; each must give
// exactly the answers of the code it replaced. Rejected: trusting the 100,000-pull digest alone (W0 ids are all uppercase and tied).
import { it, expect } from "vitest";
import { Option } from "effect";
import {
  h1Entity,
  h1IdFromHex,
  h1IdFromHexReference,
  sortTriples,
  h1Decode,
  type H1Dict,
} from "../../../packages/qlever/src/broker/h1.js";

it("fast base32 id conversion equals the reference for edge and 300,000 random ids", () => {
  const edges = [
    "00".repeat(16),
    "ff".repeat(16),
    "01".repeat(16),
    "80" + "00".repeat(15),
    "7f" + "ff".repeat(15),
    "3f" + "ff".repeat(15),
    "0142127424" + "00".repeat(5) + "0000000001",
  ];
  let seed = 99;
  const next = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0);
  const ids = [...edges];
  for (let i = 0; i < 300000; i++) {
    let hex = "";
    for (let j = 0; j < 4; j++) hex += next().toString(16).padStart(8, "0");
    ids.push(i % 2 ? hex.toUpperCase() : hex);
  }
  for (const hex of ids) expect(h1IdFromHex(hex)).toBe(h1IdFromHexReference(hex));
  // Non-16-byte input uses the reference path.
  expect(h1IdFromHex("0A0B")).toBe(h1IdFromHexReference("0A0B"));
});

// [EXP-P4N] Why: the tuple is now ids only (short form of nine fields) and the instant, transaction name, attribute and creator names come from
// per-pull dictionaries; each test row registers its own transaction position in a shared dictionary.
const dict: H1Dict = {
  txAt: new Map(),
  txId: new Map(),
  attr: new Map([[1, ":a"]]),
  str: new Map([[1, "creator"]]),
  strOpt: new Map([[1, Option.some("creator")]]),
};
let nextPos = 1;
const tuple = (
  id: string,
  blob: boolean,
  recordedAt: number | string,
  extra: Partial<Record<number, any>> = {},
): any[] => {
  const pos = nextPos++;
  dict.txAt.set(pos, Number(recordedAt));
  dict.txId.set(pos, Option.some("tx"));
  // short: [blob, id, entity, attrId, kind, value, position, validFromOffset, creatorId]
  const t: any[] = [blob ? 1 : 0, id, "e", 1, 0, "v", pos, 1, 1];
  for (const [k, v] of Object.entries(extra)) t[Number(k)] = v;
  return t;
};
const basis = { validAt: 10 };
const reference = (tuples: any[]) =>
  sortTriples(tuples.map((t) => h1Decode(t, basis, dict)!).filter(Boolean));

it("the ordered fast path returns the row route's order, including ties, descending record times, lowercase and punctuation ids", () => {
  const cases: any[][] = [
    // ascending ids, all tied record times (W0 shape)
    [tuple("A", false, 5), tuple("B", false, 5), tuple("C", false, 5)],
    // descending ids, tied
    [tuple("C", false, 5), tuple("B", false, 5), tuple("A", false, 5)],
    // record time descending
    [tuple("A", false, 9), tuple("B", false, 5)],
    // lowercase vs uppercase: code unit order and localeCompare disagree
    [tuple("B", false, 5), tuple("a", false, 5)],
    [tuple("a", false, 5), tuple("B", false, 5)],
    // punctuation
    [tuple("A_1", false, 5), tuple("A1", false, 5), tuple("A-1", false, 5)],
    // REAL record time as text
    [tuple("A", false, "5.5"), tuple("B", false, 5.25), tuple("C", false, "5.25")],
    // blob ids converted from hex
    [
      tuple("0142127424000000000000000000000F", true, 5),
      tuple("01421274240000000000000000000001", true, 5),
    ],
    [
      tuple("01421274240000000000000000000001", true, 5),
      tuple("0142127424000000000000000000000F", true, 5),
    ],
    // mixed blob and text
    [
      tuple("01421274240000000000000000000001", true, 5),
      tuple("0188978900000000000000001L", false, 5),
    ],
  ];
  for (const tuples of cases)
    expect(h1Entity(tuples, basis, dict).map((t) => t.id)).toEqual(reference(tuples).map((t) => t.id));
  // random shuffles over a mixed alphabet
  let seed = 7;
  const next = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0);
  const alphabet = "0123456789ABCXYZabcxyz_-";
  for (let k = 0; k < 20000; k++) {
    const n = 1 + (next() % 6);
    const tuples = Array.from({ length: n }, (_, i) => {
      let id = "";
      const len = 1 + (next() % 4);
      for (let j = 0; j < len; j++) id += alphabet[next() % alphabet.length];
      return tuple(id + i, false, next() % 3);
    });
    expect(h1Entity(tuples, basis, dict).map((t) => t.id)).toEqual(reference(tuples).map((t) => t.id));
  }
});

it("integer and REAL-text numeric fields decode to the same numbers", () => {
  // index 7 is the valid-from offset: valid-from = instant + offset
  const a = h1Decode(tuple("A", false, 5, { 7: 2 }), basis, dict)!;
  const b = h1Decode(tuple("A", false, 5, { 7: "2.0" }), basis, dict)!;
  expect([a.recordedAt, a.validFrom]).toEqual([b.recordedAt, b.validFrom]);
  expect(a.validFrom).toBe(7);
  expect(h1Decode(tuple("A", false, 5, { 7: 6 }), basis, dict)).toBeUndefined();
  // long form: valid-to at index 9 (expired at 10), entity type id 10, schema version 11
  expect(h1Decode(tuple("A", false, 5, { 7: 2, 9: 10, 10: null, 11: 1, 12: null }), basis, dict)).toBeUndefined();
  const long = h1Decode(tuple("A", false, 5, { 7: 2, 9: 11, 10: 1, 11: 3, 12: null }), basis, dict)!;
  expect([Option.getOrNull(long.entityType), Option.getOrNull(long.schemaVersion), Option.getOrNull(long.validTo)]).toEqual(["creator", 3, 11]);
  const short = h1Decode(tuple("A", false, 5, { 7: 2 }), basis, dict)!;
  expect([Option.getOrNull(short.createdBy), Option.getOrNull(short.schemaVersion), Option.getOrNull(short.validTo), Option.isNone(short.entityType)]).toEqual(["creator", 1, null, true]);
  const real = h1Decode(tuple("A", false, "1000.0000000000001", { 7: 0 }), { validAt: 2000 }, dict)!;
  expect(real.recordedAt).toBe(1000.0000000000001);
});
