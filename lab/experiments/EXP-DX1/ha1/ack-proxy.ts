import assert from "node:assert/strict";
import http from "node:http";
import { loopback, until } from "./common.ts";
// [DX-HA1] Why: withhold real replies on the transport while preserving upstream bytes for the audit. Rejected: pretending a returned success was lost inside the writer.
type Held = {
  sent: boolean;
  requestBytes: string;
  responseBytes?: string;
  reply?: any;
  status?: number;
  release: () => void;
};
export async function ackProxy(endpoint: string) {
  const unsent = new Set<string>();
  const requests = new Map<string, Held>();
  const server = http.createServer(async (req, res) => {
    const parts: Buffer[] = [];
    for await (const c of req) parts.push(c);
    const body = Buffer.concat(parts),
      op = JSON.parse(body.toString()).operationId;
    assert(
      req.method === "POST" &&
        req.url?.endsWith("/transact") &&
        typeof op === "string" &&
        !requests.has(op),
    );
    const state: Held = {
      sent: false,
      requestBytes: body.toString("base64"),
      release: () => res.destroy(),
    };
    requests.set(op, state);
    if (unsent.has(op)) return;
    const fwd = http.request(
      new URL(req.url!, endpoint),
      {
        method: "POST",
        headers: { "content-type": "application/json", "content-length": body.length },
      },
      async (r) => {
        try {
          const out: Buffer[] = [];
          for await (const c of r) out.push(c);
          assert(r.statusCode);
          state.status = r.statusCode;
          state.responseBytes = Buffer.concat(out).toString("base64");
          state.reply = JSON.parse(Buffer.concat(out).toString());
        } catch {
          // [DX-HA1] Why: a reset can interrupt the upstream response body. Rejected: inventing an ACK for a partial response.
        }
      },
    );
    fwd.once("finish", () => {
      state.sent = true;
    });
    fwd.on("error", () => {});
    fwd.setTimeout(15000, () => fwd.destroy());
    fwd.end(body);
  });
  await new Promise<void>((ok, reject) => {
    server.once("error", reject);
    server.listen(0, loopback, ok);
  });
  const addr = server.address();
  assert(addr && typeof addr === "object");
  return {
    url: "http://" + loopback + ":" + addr.port,
    requests,
    hold: (op: string) => unsent.add(op),
    wait: (ids: string[], reply: boolean) =>
      until(
        "upstream sends",
        async () =>
          ids.every((op) =>
            reply ? requests.get(op)?.reply !== undefined : requests.get(op)?.sent,
          )
            ? true
            : undefined,
        30000,
      ),
    drop: () => {
      for (const req of requests.values()) req.release();
    },
    close: () => {
      server.closeAllConnections();
      server.close();
    },
  };
}
