import http from "node:http";
import { once } from "node:events";
import { expect, it } from "vitest";
import { DatomicClient, type DatomicCommitAttempt } from "../src/DatomicClient.js";
// [DX-B6-1] Why: overlapping responses must remain bound to their own commit, including conflict replies.
// Rejected: joining telemetry through a mutable last-response callback.
it("attributes actual overlapping HTTP calls and socket events to their observation", async () => {
  const server = http.createServer((req, res) => {
    let text = "";
    req.on("data", (chunk) => (text += chunk));
    req.on("end", () => {
      const body = JSON.parse(text);
      setTimeout(
        () => {
          res.statusCode = req.url === "/fail" ? 409 : 200;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify(
              req.url === "/fail"
                ? { code: "ClockConflict", maximum: 123 }
                : { operationId: body.operationId },
            ),
          );
        },
        req.url === "/slow" ? 20 : 1,
      );
    });
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address() as { port: number };
  const client = new DatomicClient(`http://127.0.0.1:${address.port}`);
  const observation = (): DatomicCommitAttempt => ({
    firstAdapterCall: performance.now(),
    optimistic: true,
    begin: false,
    httpCalls: 0,
    requests: [],
  });
  const slow = observation(),
    fast = observation(),
    failed = observation();
  try {
    const a = client.observeRequests(slow, () =>
      client.request("POST", "/slow", { operationId: "slow" }),
    );
    const b = client.observeRequests(fast, () =>
      client.request("POST", "/fast", { operationId: "fast" }),
    );
    expect(await b).toEqual({ operationId: "fast" });
    expect(await a).toEqual({ operationId: "slow" });
    await expect(
      client.observeRequests(failed, () =>
        client.request("POST", "/fail", { operationId: "failed" }),
      ),
    ).rejects.toMatchObject({ code: "ClockConflict", maximum: 123 });
    for (const [o, id, status] of [
      [slow, "slow", 200],
      [fast, "fast", 200],
      [failed, "failed", 409],
    ] as const) {
      expect(o.httpCalls).toBe(1);
      expect(o.requests).toHaveLength(1);
      const sample = o.requests[0]!;
      expect(sample).toMatchObject({ operationId: id, status });
      expect(sample.written).toBeGreaterThanOrEqual(sample.started);
      expect(sample.headers).toBeGreaterThanOrEqual(sample.written);
      expect(sample.finished).toBeGreaterThanOrEqual(sample.headers);
    }
  } finally {
    client.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
