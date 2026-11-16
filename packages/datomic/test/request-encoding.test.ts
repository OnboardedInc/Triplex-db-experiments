import { expect, it } from "vitest";
import { setImmediate as yieldTurn } from "node:timers/promises";
import { encodeLargeRequest, largeRequestBody } from "../src/requestEncoding.js";
import { stringifyExact } from "../src/codec.js";
it("cooperatively encodes a stable snapshot with exactly the old bytes", async () => {
  const body = {
    rowOrder: Array.from({ length: 1200 }, (_, i) => String(i)),
    rowTexts: Object.fromEntries(
      Array.from({ length: 1200 }, (_, i) => [
        String(i),
        { text: '😀\\"'.repeat(100), n: i % 2 ? -0 : Number.MAX_SAFE_INTEGER },
      ]),
    ),
    tail: null,
  };
  const expected = stringifyExact(body);
  expect(largeRequestBody(body)).toBe(true);
  let yielded = false;
  void yieldTurn().then(() => {
    yielded = true;
  });
  const pending = encodeLargeRequest(body);
  body.rowTexts["0"]!.text = "changed after capture";
  expect(await pending).toBe(expected);
  expect(yielded).toBe(true);
});
it("preserves UTF-16 string spelling across every chunk boundary", async () => {
  for (const s of [
    "x".repeat(32767) + "😀" + "y".repeat(32769),
    "x".repeat(32767) + "\ud800" + "x".repeat(32768),
    '\\\n"\udfff'.repeat(20000),
  ])
    expect(await encodeLargeRequest({ s, n: -0 })).toBe(stringifyExact({ s, n: -0 }));
});
it("does not inspect getters twice or change non-data fallback behavior", async () => {
  const make = () => {
    let n = 0;
    return {
      get x() {
        return ++n;
      },
    };
  };
  expect(await encodeLargeRequest(make())).toBe(stringifyExact(make()));
  expect(largeRequestBody({ rows: [] })).toBe(false);
  const a = [1, 2];
  Object.defineProperty(a, "extra", {
    enumerable: true,
    get() {
      throw Error("must not inspect array extras");
    },
  });
  expect(await encodeLargeRequest({ a })).toBe(stringifyExact({ a }));
  await expect(encodeLargeRequest({ bad: NaN })).rejects.toThrow();
});
