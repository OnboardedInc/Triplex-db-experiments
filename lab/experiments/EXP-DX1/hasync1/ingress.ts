import assert from "node:assert/strict";
import http from "node:http";
import { once } from "node:events";
import { loopback } from "../ha1/common.ts";
import { timeouts, wait } from "./supervisor.ts";

export async function ingress(first: string, distinguishSealed = false) {
  let writer = new URL(first);
  let sealed = false;
  let generation = 0;
  let inFlight = 0;
  const acknowledgements = new Map<string, number>();
  const agent = new http.Agent({ keepAlive: true, maxSockets: 128 });
  const server = http.createServer((req, res) => {
    const unavailable = (blockedBeforeSend = false) => {
      res.writeHead(503, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          code: blockedBeforeSend && distinguishSealed ? "WriterSealed" : "SyncTimeout",
          message: "Writer unavailable during cutover",
        }),
      );
    };
    if (sealed) {
      req.resume();
      unavailable(true);
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
          const payload = Buffer.concat(chunks);
          if (distinguishSealed && reply.statusCode === 200 && req.url?.endsWith("/transact")) {
            try {
              const { operationId } = JSON.parse(payload.toString("utf8"));
              if (typeof operationId === "string") acknowledgements.set(operationId, offeredTo);
            } catch {
              return unavailable();
            }
          }
          res.writeHead(reply.statusCode!, reply.headers);
          res.end(payload);
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
    // [DX-HASYNC1] Why: attribute the delivered receipt to the exact route that forwarded it.
    // Rejected: classifying by the caller start time (a socket can dispatch across the change).
    receiptEpoch(id: string) {
      const epoch = acknowledgements.get(id);
      acknowledgements.delete(id);
      return epoch;
    },
    currentEpoch: () => generation,
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
