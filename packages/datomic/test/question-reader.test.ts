import { createServer } from "node:http";
import { once } from "node:events";
import { describe, expect, it } from "vitest";
import { DatomicClient, DatomicHttpError, questionRoute } from "../src/DatomicClient.js";
import { sweepPage } from "../src/sweep.js";

// [DX-XQ7] The SDK's one option for the question reader: ID lists, sweeps and find go to `questionReaderUrl`, every
// other call to the main URL; without the option every call goes to the main URL as before. Two scripted gateways
// record what reaches each. The gateway side (421 refusals, routes) is gated on a stack (lab/experiments/EXP-DX1/xq7).
async function gateway(name: string) {
  const seen: string[] = [];
  const server = createServer(async (req, res) => {
    for await (const _ of req) void _;
    seen.push(`${req.method} ${req.url}`);
    const path = req.url ?? "";
    if (path.endsWith("/sweep"))
      return res.end(JSON.stringify({ database: "s2-x", account: "a", position: 5, t: "5", head: 5, validAt: 1, facts: "stored",
        result: "count", complete: true, stopped: "end", examined: 0, listed: 0, subjects: 0, matched: 0, rows: 0,
        segmentsLoaded: 0, micros: { total: 0, list: 0, read: 0, evaluate: 0, queue: 0 }, cpuMicros: 0, count: 0,
        countComplete: true, next: null, served: name }));
    if (path.endsWith("/ids"))
      return res.end(JSON.stringify({ database: "s2-x", account: "a", position: 5, t: "5", head: 5, validAt: null, trailingBy: 0,
        result: "ids", ids: [], examined: 0, segmentsLoaded: 0, scanMicros: 0, stopped: "end", next: null }));
    if (path.endsWith("/find")) return res.end(JSON.stringify({ served: name }));
    res.statusCode = 404;
    return res.end(JSON.stringify({ code: "NotFound" }));
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address() as { port: number };
  return { url: `http://127.0.0.1:${port}`, seen, close: () => server.close() };
}

describe("question reader routing in the SDK", () => {
  it("names exactly the question routes", () => {
    for (const p of ["/v2/db/s2-abc/ids", "/v2/db/s2-abc/sweep", "/v2/db/s-0123/find"]) expect(questionRoute.test(p)).toBe(true);
    for (const p of ["/v1/db/s2-abc/read", "/v2/db/s2-abc/reach", "/v1/db/s2-abc/basis", "/v2/db/s2-abc/index-declaration",
      "/v2/db/s2-abc/index-backfill", "/v2/db/s2-abc/ids/x", "/v1/db/s2-abc/transact", "/v2/db/s2-abc/transactions"])
      expect(questionRoute.test(p)).toBe(false);
  });

  it("sends questions to the question reader and everything else to the main URL", async () => {
    const main = await gateway("main"), question = await gateway("question");
    try {
      const client = new DatomicClient(main.url, 5000, undefined, { questionReaderUrl: question.url });
      await client.listIds("s2-x", { account: "a" });
      await sweepPage(client, "s2-x", { account: "a", result: "count" });
      expect(await client.request("POST", "/v2/db/s2-x/find", {})).toEqual({ served: "question" });
      await expect(client.request("POST", "/v1/db/s2-x/read", {})).rejects.toBeInstanceOf(DatomicHttpError);
      await expect(client.request("GET", "/v1/db/s2-x/basis")).rejects.toBeInstanceOf(DatomicHttpError);
      expect(question.seen).toEqual(["POST /v2/db/s2-x/ids", "POST /v2/db/s2-x/sweep", "POST /v2/db/s2-x/find"]);
      expect(main.seen).toEqual(["POST /v1/db/s2-x/read", "GET /v1/db/s2-x/basis"]);
      client.close();
    } finally {
      main.close(); question.close();
    }
  });

  it("without the option sends every call to the main URL, as before", async () => {
    const main = await gateway("main");
    try {
      const client = new DatomicClient(main.url, 5000);
      await client.listIds("s2-x", { account: "a" });
      await sweepPage(client, "s2-x", { account: "a", result: "count" });
      expect(main.seen).toEqual(["POST /v2/db/s2-x/ids", "POST /v2/db/s2-x/sweep"]);
      expect(client.endpointFor("/v2/db/s2-x/sweep").href).toBe(new URL(main.url).href);
      client.close();
    } finally {
      main.close();
    }
  });

  it("refuses a question reader URL with credentials or another scheme", () => {
    expect(() => new DatomicClient("http://127.0.0.1:1", 5000, undefined, { questionReaderUrl: "http://u:p@127.0.0.1:2" })).toThrow(/question reader/);
    expect(() => new DatomicClient("http://127.0.0.1:1", 5000, undefined, { questionReaderUrl: "file:///x" })).toThrow(/question reader/);
  });
});
