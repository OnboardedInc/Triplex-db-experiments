import { expect, it } from "vitest";
import { stringifyExact, stringifyNativeExact, isPlainJsonData } from "../src/codec.js";
import { canonicalJson, createPackedRow, packValue, packValueOnce } from "../src/rows.js";
import { encodeRowText, encodeRowTextFast } from "../src/rowText.js";
import { DatomicClient } from "../src/DatomicClient.js";

it("native encoding preserves bytes including -0, surrogates, getters and non-data fallbacks", () => {
  let seed = 12345;
  const next = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed;
  };
  const atoms = [
    null,
    true,
    false,
    0,
    -0,
    Number.MIN_VALUE,
    Number.MAX_SAFE_INTEGER,
    '😀\ud800\udfff\n\\"',
    "-0",
  ];
  for (let i = 0; i < 2000; i++) {
    const value = {
      operationId: String(i),
      rows: Array.from({ length: next() % 20 }, () => [
        atoms[next() % atoms.length],
        { a: atoms[next() % atoms.length] },
      ]),
    };
    expect(stringifyNativeExact(value)).toBe(stringifyExact(value));
  }
  for (const make of [
    () => {
      let n = 0;
      return {
        get x() {
          return ++n;
        },
      };
    },
    () => ({ toJSON: () => ({ x: 1 }) }),
    () => new String("boxed"),
    () => Array(3),
    () => new Proxy({ x: 1 }, {}),
  ]) {
    expect(isPlainJsonData(make())).toBe(false);
    try {
      const before = stringifyExact(make());
      expect(stringifyNativeExact(make())).toBe(before);
    } catch {
      expect(() => stringifyNativeExact(make())).toThrow();
    }
  }
  for (const bad of [NaN, Infinity, undefined, 1n, { a: undefined }])
    expect(() => stringifyNativeExact(bad)).toThrow();
});

it("packs JSON once without changing canonical bytes or getter behavior", () => {
  for (const value of [null, { z: [0, "x", true], a: { quote: "😀" } }, [1, 2, { a: 3 }]]) {
    expect(packValueOnce({ type: "json", value })).toEqual(packValue({ type: "json", value }));
    expect(packValueOnce({ type: "json", value }).value_json).toBe(canonicalJson(value));
  }
  const make = () => {
    let n = 0;
    return {
      get a() {
        return ++n;
      },
    };
  };
  expect(() => packValueOnce({ type: "json", value: make() })).toThrow();
  expect(() => packValue({ type: "json", value: make() })).toThrow();
  expect(() => packValueOnce({ type: "number", value: -0 })).toThrow();
});

it("only immutable constructor rows skip redundant decoding; untrusted rows still validate", () => {
  for (const value of [
    { type: "number" as const, value: 0 },
    { type: "json" as const, value: { z: ["x", 1] } },
    { type: "string" as const, value: "😀" },
  ]) {
    const row = createPackedRow(
      { entityId: "root", attribute: ":a", value, validFrom: -0 } as any,
      "tx",
      -0,
      "row",
      0,
      true,
    );
    expect(Object.isFrozen(row)).toBe(true);
    for (const version of ["1", "2"] as const)
      expect(encodeRowTextFast(row, version)).toBe(encodeRowText(row, version));
    expect(() => Object.assign(row, { value_type: "forged" })).toThrow();
    expect(() => encodeRowTextFast({ ...row, value_type: "forged" } as any)).toThrow();
    expect(() => encodeRowTextFast({ ...row, value_number: NaN })).toThrow();
  }
});

it("reports the smaller bounded client cache budgets and clears them on close", () => {
  const client = new DatomicClient("http://127.0.0.1:1");
  const d = client.cacheDiagnostics();
  expect([
    d.reach.budgetBytes,
    d.rows.budgetBytes,
    d.predecessors.budgetBytes,
    d.reachKeys.budgetBytes,
  ]).toEqual([16, 8, 32, 4].map((x) => x * 1024 ** 2));
  client.close();
  expect(client.cacheDiagnostics().rows.entries).toBe(0);
});
