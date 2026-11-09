import assert from "node:assert/strict";
import http from "node:http";
import { test } from "node:test";
import { countHttp, httpCounts } from "../lib/http-counts.ts";

test("HTTP counts follow concurrent operations and count actual Agent requests", async () => {
  const server = http.createServer((_req, res) => res.end("ok"));
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as { port: number };
  const agent = new http.Agent({ keepAlive: true });
  const get = () => new Promise<void>((resolve, reject) => {
    http.get(`http://127.0.0.1:${address.port}`, { agent }, res => { res.resume(); res.on("end", resolve); }).on("error", reject);
  });
  try {
    await Promise.all([
      countHttp("commit-test", async () => { await get(); await get(); }),
      countHttp("pull-test", async () => { await get(); }),
    ]);
    await assert.rejects(countHttp("failure-test", async () => { await get(); throw Error("expected"); }));
    assert.deepEqual(httpCounts()["commit-test"], { operations: 1, requests: 2, failed: 0 });
    assert.deepEqual(httpCounts()["pull-test"], { operations: 1, requests: 1, failed: 0 });
    assert.deepEqual(httpCounts()["failure-test"], { operations: 1, requests: 1, failed: 1 });
  } finally {
    agent.destroy();
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});
