// [EXP-F02b] RULINGS Q30a: a JSON value containing -0, a non-finite number, or a number that is not
// exactly a binary64 value is found before CanonicalJson runs. Values are EXP-F02's json domain
// (lab/falsifiers/wire/domain.mjs) plus text-route cases.
import { describe, expect, it } from "vitest";

import { CanonicalJson, ExactJson } from "../../src/content/index.js";

describe("ExactJson.firstInexactNumber (in-memory values)", () => {
  it("finds -0 anywhere in the value, with its path (F02 neg-zero-in-object, neg-zero-in-list)", () => {
    expect(ExactJson.firstInexactNumber({ amount: -0 })).toEqual({
      path: "$.amount",
      reason: "negative-zero",
      text: "-0",
    });
    expect(ExactJson.firstInexactNumber([0, -0, 1])).toEqual({
      path: "$[1]",
      reason: "negative-zero",
      text: "-0",
    });
    expect(ExactJson.firstInexactNumber({ a: [{ "b c": [1, { d: -0 }] }] })?.path).toBe(
      '$.a[0]["b c"][1].d',
    );
    expect(ExactJson.firstInexactNumber(-0)?.path).toBe("$");
  });

  it("finds non-finite numbers (F02 NaN-in-list)", () => {
    expect(ExactJson.firstInexactNumber([Number.NaN])).toEqual({
      path: "$[0]",
      reason: "non-finite",
      text: "NaN",
    });
    expect(ExactJson.firstInexactNumber({ v: -Infinity })?.text).toBe("-Infinity");
  });

  it("accepts every other binary64, which JSON carries exactly (F02 values that came back exact)", () => {
    for (const value of [
      { a: 1, b: "x" },
      [1.0000000000000002, 1 + 2 ** -40],
      { v: 5e-324 },
      { v: 2 ** 53 + 2 },
      { v: 1e21 },
      { s: "-0" },
      { a: [{ b: [null, true, false] }], c: {} },
      0,
    ])
      expect(ExactJson.firstInexactNumber(value)).toBeUndefined();
  });

  it("leaves canonical identity alone: CanonicalJson still hashes -0 and 0 alike (Q14b)", () => {
    expect(CanonicalJson.encodeOrThrow({ v: -0 })).toBe(CanonicalJson.encodeOrThrow({ v: 0 }));
  });
});

describe("ExactJson.stringify (lane JSON payload; the journal embeds typed values, Q34c)", () => {
  it("writes -0 so JSON.parse gives -0 back; the journal change of a number -0 survives", () => {
    const change = { op: "assert", value: { type: "number", value: -0 }, list: [0, -0] };
    const text = ExactJson.stringify(change);
    expect(text).toBe('{"op":"assert","value":{"type":"number","value":-0},"list":[0,-0]}');
    const back = JSON.parse(text);
    expect(Object.is(back.value.value, -0)).toBe(true);
    expect(Object.is(back.list[1], -0)).toBe(true);
  });

  it("is byte-identical to JSON.stringify for every value without -0 (key order kept)", () => {
    for (const value of [
      { z: 1, a: [null, true, "x", 1.5, 1e21, 5e-324], b: { c: {} } },
      [1, [2, [3]]],
      "text",
      0,
      null,
    ])
      expect(ExactJson.stringify(value)).toBe(JSON.stringify(value));
    expect(ExactJson.stringify({ a: -0, b: undefined, c: [undefined] })).toBe(
      '{"a":-0,"c":[null]}',
    );
  });
});

describe("ExactJson.firstInexactNumberText (bulk import, replay and restore text)", () => {
  it("rejects literals JSON.parse would turn into -0", () => {
    for (const text of ["-0", '{"v":-0.0}', "[1,-0e5]", "-1e-400"])
      expect(ExactJson.firstInexactNumberText(text)?.reason).toBe("negative-zero");
  });

  it("rejects literals that overflow to Infinity", () => {
    expect(ExactJson.firstInexactNumberText('{"v":1e400}')).toEqual({
      path: "number #0 at offset 5",
      reason: "non-finite",
      text: "1e400",
    });
  });

  it("rejects literals whose digits a binary64 cannot hold", () => {
    for (const text of [
      "0.10000000000000000001",
      "12345678901234567890",
      "9007199254740993",
      '{"a":1,"b":[2,1e-400]}',
    ])
      expect(ExactJson.firstInexactNumberText(text)?.reason).toBe("not-binary64");
  });

  it("accepts literals equal to the shortest form of the double they parse to", () => {
    for (const text of [
      "0.1",
      "1.0",
      "1E21",
      "1e+21",
      "5e-324",
      "2.2250738585072014e-308",
      "9007199254740994",
      "-1.5",
      "0",
      "1.0000000000000002",
      '{"s":"-0 and 1e400 inside a string","t":"\\"-0\\""}',
      "[]",
    ])
      expect(ExactJson.firstInexactNumberText(text)).toBeUndefined();
  });
});
