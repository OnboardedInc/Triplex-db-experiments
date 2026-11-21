import assert from "node:assert/strict";
import http from "node:http";
import { once } from "node:events";
import { loopback } from "../ha1/common.ts";
import { timeouts, wait } from "./supervisor.ts";

export async function ingress(first: string) {
  let writer = new URL(first);
  let sealed = false;
  let generation = 0;
  let inFlight = 0;
  const agent = new http.Agent({ keepAlive: true, maxSockets: 128 });
  const server = http.createServer((req, res) => {
    const unavailable = () => {
      res.writeHead(503, { "content-type": "application/json" });
      res.end('{"code":"SyncTimeout","message":"Writer unavailable during cutover"}');
    };
    if (sealed) {
      req.resume();
      unavailable();
      return;
    }
    const offeredTo = generation;
    inFlight++;
    const upstream = http.request(
      {
        hostname: writer.hostname,
        port: writer.port,
        path: req.url,
        method: req.method,
        headers: { ...req.headers, host: writer.host },
        agent,
        signal: AbortSignal.timeout(timeouts.request),
      },
      (reply) => {
        const chunks: Buffer[] = [];
        let bytes = 0;
        reply.on("data", (chunk: Buffer) => {
          bytes += chunk.length;
          if (bytes > 16 * 2 ** 20) upstream.destroy(Error("Gateway response exceeded limit"));
          else chunks.push(chunk);
        });
        reply.on("error", () => upstream.destroy());
        reply.once("end", () => {
          if (res.destroyed || res.writableEnded) return;
          // [DX-HASYNC1] Why: no old-route response can escape after the cut. Rejected: streaming an ACK across a generation change.
          if (offeredTo !== generation) return unavailable();
          res.writeHead(reply.statusCode!, reply.headers);
          res.end(Buffer.concat(chunks));
        });
      },
    );
    upstream.once("error", () => {
      if (!res.destroyed && !res.writableEnded) unavailable();
    });
    upstream.once("close", () => inFlight--);
    res.once("close", () => {
      // An HTTP disconnect is an unknown outcome, never a database-level cancellation.
      if (!req.complete) upstream.destroy();
    });
    req.pipe(upstream);
  });
  server.listen(0, loopback);
  await once(server, "listening");
  const addr = server.address();
  assert(addr && typeof addr !== "string");
  return {
    url: "http://" + loopback + ":" + addr.port,
    seal() {
      sealed = true;
      generation++;
    },
    async drain() {
      await wait("routed requests to settle", timeouts.drain, async () => !inFlight || undefined);
    },
    publish(endpoint: string) {
      assert(sealed);
      writer = new URL(endpoint);
      sealed = false;
    },
    close() {
      agent.destroy();
      server.close();
      server.closeAllConnections();
    },
  };
}
