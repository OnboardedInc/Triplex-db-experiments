import { once } from "node:events";
import http from "node:http";
import { expect, it } from "vitest";
import { commitClientIdFor, registerCommit, sendCommit } from "../src/CommitOrder.js";
import { DatomicClient } from "../src/DatomicClient.js";

it("keeps the valid ordered suffix after a definitive oversize preflight", async () => {
  const cap = 4 * 1024 * 1024;
  const wire: { id: string; bytes: number; sequence: number }[] = [];
  const server = http.createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk);
    const data = Buffer.concat(chunks);
    const body = JSON.parse(data.toString("utf8"));
    const entry = { id: body.operationId, bytes: data.length, sequence: body.sendSequence };
    wire.push(entry);
    const expected = wire.filter((r) => r.bytes <= cap).length;
    if (data.length > cap)
      res.writeHead(400).end('{"code":"InvalidValue","message":"Request too large"}');
    else if (entry.sequence !== expected)
      res.writeHead(409).end('{"code":"CommitOrderGap","message":"Missing predecessor"}');
    else res.end(JSON.stringify({ operationId: entry.id, sequence: entry.sequence }));
  });
  server.listen(0, "localhost");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No test address");
  const client = new DatomicClient(`http://localhost:${address.port}`);
  try {
    const clientId = commitClientIdFor(client);
    const base = { sourceK: null, position: 1, claims: [], rows: [], newIds: [], attemptId: "" };
    const bytesFor = (operationId: string) =>
      Buffer.byteLength(
        JSON.stringify({ ...base, operationId, clientId, sendSequence: 1, rowTexts: {} }),
      );
    const pad = (bytes: number) => "é".repeat(Math.floor(bytes / 2)) + "x".repeat(bytes % 2);
    const offers = [
      registerCommit(1000, client),
      registerCommit(1001, client),
      registerCommit(1002, client),
    ];
    const send = (index: number, operationId: string, attemptId: string) =>
      sendCommit(offers[index]!, (sendSequence, onSent) =>
        client.transact("s2-test", {
          ...base,
          operationId,
          attemptId,
          clientId,
          onSent,
          sendSequence,
        }),
      );
    const results = await Promise.allSettled([
      send(0, "large", pad(cap + 1 - bytesFor("large"))),
      send(1, "limit", pad(cap - bytesFor("limit"))),
      send(2, "next", ""),
    ]);
    expect(results).toEqual([
      {
        status: "rejected",
        reason: expect.objectContaining({ status: 400, code: "InvalidValue" }),
      },
      { status: "fulfilled", value: { operationId: "limit", sequence: 1 } },
      { status: "fulfilled", value: { operationId: "next", sequence: 2 } },
    ]);
    expect(wire.map((r) => [r.id, r.sequence])).toEqual([
      ["limit", 1],
      ["next", 2],
    ]);
    expect(wire[0]?.bytes).toBe(cap);
  } finally {
    client.close();
    server.closeAllConnections();
    server.close();
    await once(server, "close");
  }
});
