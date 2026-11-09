// [EXP-QH1] Why: differential admission covers both sides, not only valid W0 values.
// Rejected: benchmarking a decoder which silently stops checking the storage domain.
import { expect, it } from "vitest";
import {
  decodedPrimitiveValue,
  assertValueInDomain,
  ValueDomains,
} from "../../../packages/core/src/ValueDomain.js";

it("100000 constructed decoder values have exactly the full check's accept/reject set", () => {
  let seed = 98124;
  const random = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0);
  const bytes = new DataView(new ArrayBuffer(8));
  const domains = Object.values(ValueDomains);
  const types = [
    "string",
    "ref",
    "integer",
    "number",
    "datetime",
    "boolean",
    "json",
    "no-such-type",
  ];
  const edges: any[] = [
    undefined,
    null,
    true,
    false,
    0,
    -0,
    NaN,
    Infinity,
    -Infinity,
    Number.MAX_VALUE,
    5e-324,
    2 ** 53,
    -(2 ** 53),
    "",
    "\0",
    "hé😀",
    "\ud800",
    "0",
    "-0",
    "01",
    "+1",
    "9223372036854775807",
    "-9223372036854775808",
    "9223372036854775808",
    { x: 1 },
    [],
    1n,
  ];
  const accepts = (f: () => unknown) => {
    try {
      f();
      return true;
    } catch {
      return false;
    }
  };
  for (let i = 0; i < 100000; i++) {
    bytes.setUint32(0, random());
    bytes.setUint32(4, random());
    const type = types[i % types.length]!,
      payload = i % 3 === 0 ? bytes.getFloat64(0) : edges[random() % edges.length],
      d = domains[random() % domains.length]!;
    const full = accepts(() => assertValueInDomain({ type, value: payload }, d));
    expect(
      accepts(() => decodedPrimitiveValue(type, payload, d)),
      `case ${i} ${d.id}/${type}`,
    ).toBe(full);
  }
  for (const d of domains)
    for (const length of [0, 1365, 4096, 349525, 1048576, 1048577])
      for (const char of ["a", "é", "界", "\n"]) {
        const payload = char.repeat(length);
        expect(accepts(() => decodedPrimitiveValue("string", payload, d))).toBe(
          accepts(() => assertValueInDomain({ type: "string", value: payload }, d)),
        );
      }
});
