import assert from "node:assert/strict";
import { test } from "node:test";
import http from "node:http";
import { DatomicClient } from "../../../../packages/datomic/dist/index.js";
import { measureW0Http } from "../../../bench/lib/w0-http.ts";
// [DX-H5] Why: observer context must distinguish overlapping pages and count actual response bytes/datoms.
// Rejected: testing only a mocked measurement function (would miss lost async request context).
test("concurrent request samples retain operation-local byte, gateway and datom observations", async () => {
  const body = JSON.stringify({ datoms: 37 });
  const server = http.createServer((_req, res) => {
    res.setHeader("x-tx2-gateway-micros", "123");
    res.end(body);
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const port = (server.address() as any).port,
    client = new DatomicClient("http://127.0.0.1:" + port);
  try {
    const [a, b] = await Promise.all([
      measureW0Http(async () => {
        await client.request("GET", "/a");
        await client.request("GET", "/b");
      }),
      measureW0Http(() => client.request("GET", "/c")),
    ]);
    assert.equal(a.requests, 2);
    assert.equal(b.requests, 1);
    assert.equal(a.responseBytes, 2 * Buffer.byteLength(body));
    assert.equal(b.responseBytes, Buffer.byteLength(body));
    assert.equal(a.gatewayMicros, 246);
    assert.equal(b.gatewayMicros, 123);
    assert.equal(a.datoms, 74);
    assert.equal(b.datoms, 37);
  } finally {
    client.close();
    await new Promise<void>((r) => server.close(() => r()));
  }
});

test("HTTP attempt count retains an error response omitted by successful samples", async () => {
  const server = http.createServer((req, res) => {
    res.statusCode = req.url === "/bad" ? 500 : 200;
    res.end(
      JSON.stringify(
        req.url === "/bad" ? { code: "expected", message: "test failure" } : { ok: true },
      ),
    );
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const client = new DatomicClient("http://127.0.0.1:" + (server.address() as any).port);
  try {
    const observed = await measureW0Http(async () => {
      await assert.rejects(client.request("GET", "/bad"));
      await client.request("GET", "/ok");
    });
    assert.equal(observed.requests, 2);
    assert.equal(observed.successfulRequestSamples, 1);
  } finally {
    client.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
