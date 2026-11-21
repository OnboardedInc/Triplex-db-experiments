import assert from "node:assert/strict";
import { once } from "node:events";
import net from "node:net";
import { loopback } from "../ha1/common.ts";
import type { SyncPair } from "./pair.ts";

type Direction = "wal" | "reply";
export async function walLink(pair: SyncPair) {
  const s = pair.s;
  const local = s.a === s.b;
  const upstreamHost = s.a.privateAddress ?? loopback;
  const upstreamPort = Number((await s.view("pg")).NetworkSettings.Ports["5432/tcp"][0].HostPort);
  assert(Number.isSafeInteger(upstreamPort) && upstreamPort > 0);
  const sockets = new Set<net.Socket>();
  const counts = { wal: { sent: 0, dropped: 0 }, reply: { sent: 0, dropped: 0 } };
  let blocked: Direction | undefined;
  const server = net.createServer((b) => {
    const a = net.createConnection(upstreamPort, upstreamHost);
    for (const socket of [a, b]) {
      sockets.add(socket);
      socket.setNoDelay(true);
      socket.on("error", () => {});
      socket.once("close", () => {
        sockets.delete(socket);
        (socket === a ? b : a).destroy();
      });
    }
    const forward = (from: net.Socket, to: net.Socket, direction: Direction) => {
      from.on("data", (chunk: Buffer) => {
        // [DX-HASYNC1] Why: impair the established WAL stream in only one direction and count discarded bytes. Rejected: closing both ends or altering synchronous commit.
        if (blocked === direction) {
          counts[direction].dropped += chunk.length;
          return;
        }
        counts[direction].sent += chunk.length;
        if (!to.write(chunk)) {
          from.pause();
          to.once("drain", () => from.resume());
        }
      });
    };
    forward(a, b, "wal");
    forward(b, a, "reply");
  });
  server.listen(0, s.b.privateAddress ?? loopback);
  await once(server, "listening");
  const addr = server.address();
  assert(addr && typeof addr !== "string");
  return {
    host: local ? "host.docker.internal" : s.b.privateAddress!,
    port: addr.port,
    cut(direction: Direction) {
      assert(!blocked && sockets.size === 2, "Expected the established WAL connection");
      blocked = direction;
      return performance.now();
    },
    counters: () => structuredClone(counts),
    close() {
      for (const s of sockets) s.destroy();
      server.close();
    },
  };
}
