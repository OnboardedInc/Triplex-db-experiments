import { expect, it } from "vitest";
import { setImmediate as yieldTurn } from "node:timers/promises";
import http from "node:http";
import { DatomicClient } from "../src/DatomicClient.js";
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
// [DX-T1-12] Why: the actual HTTP path must send the captured exact UTF-8 body with its byte length after cooperative encoding.
// Rejected: test the pure encoder alone and miss a string-length Content-Length regression on non-ASCII values.
it("sends the large captured body through HTTP with the exact byte length", async () => {
  let observed = "",
    length = "";
  const server = http.createServer((req, res) => {
    length = String(req.headers["content-length"]);
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      observed += chunk;
    });
    req.on("end", () => res.end("{}"));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const client = new DatomicClient(
    `http://127.0.0.1:${(server.address() as import("node:net").AddressInfo).port}`,
    5000,
  );
  try {
    const body = {
      rows: Array.from({ length: 1200 }, (_, i) => ({ id: i, text: "😀λ".repeat(100), n: -0 })),
    };
    const expected = stringifyExact(body),
      pending = client.request("POST", "/large", body);
    body.rows[0]!.text = "mutated after call";
    await pending;
    expect(observed).toBe(expected);
    expect(length).toBe(String(Buffer.byteLength(expected)));
  } finally {
    client.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
