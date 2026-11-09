import net from "node:net";
import { once } from "node:events";
import { test } from "node:test";
import assert from "node:assert/strict";
import { wireProxy } from "./wire.mjs";
const frame = (kind, payload) => {
  const length = Buffer.alloc(4);
  length.writeInt32BE(payload.length + 4);
  return Buffer.concat([Buffer.from(kind), length, payload]);
};
const startup = (code) => {
  const b = Buffer.alloc(8);
  b.writeInt32BE(8);
  b.writeInt32BE(code, 4);
  return b;
};
test(
  "wire counter observes simple and extended executions, SSL refusal and startup separately",
  { timeout: 3000 },
  async (t) => {
    const ready = frame("Z", Buffer.from("I"));
    const backendSockets = new Set();
    const backend = net.createServer((s) => {
      backendSockets.add(s);
      s.on("close", () => backendSockets.delete(s));
      let first = true;
      s.on("data", (b) => {
        if (first && b.readInt32BE(4) === 80877103) s.write("N");
        else {
          first = false;
          s.write(ready);
        }
      });
    });
    await new Promise((r) => backend.listen(0, "127.0.0.1", r));
    const events = [],
      proxy = await wireProxy(
        `postgres://client:client@127.0.0.1:${backend.address().port}/xtdb`,
        (e) => events.push(e),
      );
    t.after(async () => {
      for (const s of backendSockets) s.destroy();
      await proxy.close();
      backend.close();
    });
    const url = new URL(proxy.url),
      client = net.connect(Number(url.port), url.hostname);
    try {
      await once(client, "connect");
      let response = once(client, "data");
      client.write(startup(80877103));
      assert.equal((await response)[0].toString(), "N");
      response = once(client, "data");
      client.write(startup(196608));
      await response;
      const before = proxy.snapshot();
      assert.deepEqual(before, { executions: 0, ready: 1 });
      response = once(client, "data");
      client.write(frame("Q", Buffer.from("SELECT 1\0")));
      await response;
      const parse = frame("P", Buffer.from("\0SELECT 2\0\0\0"));
      const bind = frame("B", Buffer.from("\0\0\0\0\0\0\0\0"));
      const execute = frame("E", Buffer.from("\0\0\0\0\0"));
      response = once(client, "data");
      client.write(Buffer.concat([parse, bind, execute, frame("S", Buffer.alloc(0))]));
      await response;
      assert.deepEqual(proxy.snapshot(), { executions: 2, ready: 3 });
      assert.deepEqual(
        events.map((e) => e.sql),
        ["SELECT 1", "SELECT 2"],
      );
    } finally {
      client.destroy();
      await proxy.close();
      for (const socket of backendSockets) socket.destroy();
      await new Promise((r) => backend.close(r));
    }
  },
);
