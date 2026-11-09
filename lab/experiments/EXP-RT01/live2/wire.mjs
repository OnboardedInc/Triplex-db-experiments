import net from "node:net";
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
// [EXP-RT01] Why: count actual protocol executions and ReadyForQuery cycles for both builds without editing either client. Rejected: reporting inferred client calls as observed wire round trips.
export async function wireProxy(endpoint, emit) {
  const target = new URL(endpoint),
    destination = { host: target.hostname, port: Number(target.port) },
    sockets = new Set();
  let executions = 0,
    ready = 0,
    seq = 0;
  const server = net.createServer((front) => {
    const back = net.connect(destination),
      id = ++seq;
    sockets.add(front);
    sockets.add(back);
    front.pipe(back);
    back.pipe(front);
    front.on("error", () => back.destroy());
    back.on("error", () => front.destroy());
    front.on("close", () => {
      sockets.delete(front);
      back.destroy();
    });
    back.on("close", () => {
      sockets.delete(back);
      front.destroy();
    });
    let startup = true,
      sslReply = false,
      fb = Buffer.alloc(0),
      bb = Buffer.alloc(0);
    const statements = new Map(),
      portals = new Map(),
      pending = [];
    const cstring = (buf, offset) => {
      const end = buf.indexOf(0, offset);
      assert.ok(end >= offset);
      return [buf.toString("utf8", offset, end), end + 1];
    };
    front.on("data", (bytes) => {
      fb = Buffer.concat([fb, bytes]);
      while (fb.length >= (startup ? 4 : 5)) {
        const size = fb.readInt32BE(startup ? 0 : 1) + (startup ? 0 : 1);
        assert.ok(size >= 4 && size < 64 * 1024 ** 2);
        if (fb.length < size) break;
        const msg = fb.subarray(0, size);
        fb = fb.subarray(size);
        if (startup) {
          const code = msg.readInt32BE(4);
          if (code === 80877103) {
            sslReply = true;
            continue;
          }
          startup = false;
          continue;
        }
        const kind = String.fromCharCode(msg[0]);
        if (kind === "P") {
          const [name, offset] = cstring(msg, 5);
          statements.set(name, cstring(msg, offset)[0]);
        }
        if (kind === "B") {
          const [portal, offset] = cstring(msg, 5);
          portals.set(portal, statements.get(cstring(msg, offset)[0]));
        }
        if (kind === "E" || kind === "Q") {
          const sql = kind === "Q" ? cstring(msg, 5)[0] : portals.get(cstring(msg, 5)[0]);
          assert.equal(typeof sql, "string");
          executions++;
          pending.push({ id, sql, start: performance.now() });
        }
      }
    });
    back.on("data", (bytes) => {
      bb = Buffer.concat([bb, bytes]);
      if (sslReply && bb.length) {
        assert.equal(bb[0], 78);
        bb = bb.subarray(1);
        sslReply = false;
      }
      while (bb.length >= 5) {
        const size = bb.readInt32BE(1) + 1;
        assert.ok(size >= 5 && size < 64 * 1024 ** 2);
        if (bb.length < size) break;
        const kind = String.fromCharCode(bb[0]);
        bb = bb.subarray(size);
        if (kind === "Z") {
          ready++;
          for (const p of pending.splice(0))
            emit({
              kind: "wire-complete",
              connection: id,
              sql: p.sql,
              ms: performance.now() - p.start,
            });
        }
      }
    });
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert.ok(typeof address === "object" && address);
  target.hostname = "127.0.0.1";
  target.port = String(address.port);
  return {
    url: target.toString(),
    snapshot: () => ({ executions, ready }),
    close: async () => {
      for (const s of sockets) s.destroy();
      await new Promise((resolve) => server.close(resolve));
    },
  };
}
