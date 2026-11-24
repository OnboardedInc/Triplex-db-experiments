import http from "node:http";
import { once } from "node:events";
import { afterEach, expect, it } from "vitest";
import { DatomicClient, DatomicHttpError } from "../src/index.js";

// [DX-W3] What the client does with the gateway's "ReadBusy" answer (TX2_READ_WAIT_LIMIT): a read is retried after the
// suggested delay within its own deadline; a write and any other 503 are never retried.
const servers: http.Server[] = [];
afterEach(() => {
  for (const server of servers.splice(0)) server.close();
});

async function gateway(answer: (path: string, call: number) => { status: number; body: unknown }) {
  const calls: string[] = [];
  const server = http.createServer((req, res) => {
    req.resume();
    req.on("end", () => {
      calls.push(req.url ?? "");
      const { status, body } = answer(req.url ?? "", calls.length);
      res.statusCode = status;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(body));
    });
  });
  servers.push(server);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw Error("No address");
  return { url: `http://127.0.0.1:${address.port}`, calls };
}

const busy = { status: 503, body: { code: "ReadBusy", message: "Read gateway busy", retryAfterMs: 5 } };

it("retries a busy read after the suggested delay and returns the answer", async () => {
  const { url, calls } = await gateway((_, call) => (call <= 2 ? busy : { status: 200, body: { rows: [] } }));
  const client = new DatomicClient(url, 2000);
  try {
    await expect(client.request("POST", "/v1/db/s2-x/read", { entityIds: ["a"] })).resolves.toEqual({ rows: [] });
    expect(calls).toEqual(["/v1/db/s2-x/read", "/v1/db/s2-x/read", "/v1/db/s2-x/read"]);
    expect(client.readBusyRetries).toBe(2);
  } finally {
    client.close();
  }
});

it("gives up with the busy error when the read's deadline would pass", async () => {
  const { url, calls } = await gateway(() => ({ ...busy, body: { ...busy.body, retryAfterMs: 40 } }));
  const client = new DatomicClient(url, 100);
  try {
    const error = await client.request("POST", "/v2/db/s2-x/reach-many", { roots: [] }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(DatomicHttpError);
    expect([(error as DatomicHttpError).status, (error as DatomicHttpError).code]).toEqual([503, "ReadBusy"]);
    expect((error as DatomicHttpError).retryAfterMs).toBe(40);
    expect(calls.length).toBeGreaterThanOrEqual(1);
    expect(calls.length).toBeLessThanOrEqual(3);
  } finally {
    client.close();
  }
});

it("never retries a write or a different 503", async () => {
  const { url, calls } = await gateway((path) =>
    path.endsWith("/transact") ? busy : { status: 503, body: { code: "SyncTimeout", message: "x" } });
  const client = new DatomicClient(url, 2000);
  try {
    await expect(client.request("POST", "/v1/db/s2-x/transact", { operationId: "op" })).rejects.toMatchObject({
      status: 503, code: "ReadBusy",
    });
    await expect(client.request("POST", "/v1/db/s2-x/read", {})).rejects.toMatchObject({
      status: 503, code: "SyncTimeout",
    });
    expect(calls).toEqual(["/v1/db/s2-x/transact", "/v1/db/s2-x/read"]);
    expect(client.readBusyRetries).toBe(0);
  } finally {
    client.close();
  }
});
