import { readFileSync } from "node:fs";
import http from "node:http";
import { once } from "node:events";
import { describe, expect, it } from "vitest";
import {
  DatomicClient,
  DatomicHttpError,
  DatomicTransportError,
  decodeTagged,
  encodeTagged,
  validateTagged,
  type TaggedValue,
} from "../src/index.js";

// [EXP-DA00] Why: identical external vectors test both implementations. Rejected: TS-only happy-path fixtures.
describe("tagged codec", () => {
  const vectors = JSON.parse(
    readFileSync(new URL("../gateway/codec-vectors.json", import.meta.url), "utf8"),
  ) as TaggedValue[];
  for (const wire of vectors)
    it(`round trips ${wire.t} ${wire.v}`, () => {
      const result = decodeTagged(encodeTagged(wire));
      expect(result).toEqual(wire);
      expect(Object.is(result.v, wire.v)).toBe(true);
    });
  const cases = JSON.parse(
    readFileSync(new URL("../gateway/codec-cases.json", import.meta.url), "utf8"),
  ) as { wire: unknown; expected: string }[];
  for (const { wire, expected } of cases)
    it(`shared acceptance ${JSON.stringify(wire)}`, () => {
      if (expected === "reject") {
        expect(() => validateTagged(wire)).toThrow();
        expect(() => decodeTagged(JSON.stringify(wire))).toThrow();
      } else expect(() => validateTagged(wire)).not.toThrow();
    });
  for (const v of [NaN, Infinity, -Infinity])
    it(`rejects ${v}`, () => expect(() => validateTagged({ t: "double", v })).toThrow());
  for (const wire of [
    { t: "long", v: "9223372036854775808" },
    { t: "long", v: 1 },
    { t: "bool", v: "true" },
    { t: "ref", v: "01" },
  ])
    it(`rejects malformed ${JSON.stringify(wire)}`, () =>
      expect(() => validateTagged(wire)).toThrow());
});
it("uses keepalive, exact JSON, typed HTTP errors, and a total deadline", async () => {
  let received = "";
  const server = http.createServer((req, res) => {
    if (req.url === "/timeout") return;
    req.on("data", (chunk) => {
      received += chunk;
    });
    req.on("end", () => {
      res.writeHead(409, { "Content-Type": "application/json" });
      res.end('{"code":"ScopeCollision","message":"collision"}');
    });
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No address");
  const client = new DatomicClient(`http://127.0.0.1:${address.port}`, 100);
  try {
    expect(client.agent.maxSockets).toBeGreaterThanOrEqual(512);
    await expect(client.request("POST", "/", { t: "double", v: -0 })).rejects.toBeInstanceOf(
      DatomicHttpError,
    );
    expect(received).toContain('"v":-0.0');
    await expect(client.request("GET", "/timeout")).rejects.toBeInstanceOf(DatomicTransportError);
  } finally {
    client.close();
    server.closeAllConnections();
    server.close();
  }
});

// [EXP-DA01] Why: a full shared-scope journal exceeds DA00's health-only 1 MiB cap; overflow still fails explicitly. Rejected: truncating JSON or unbounded response buffering.
it("fails with a typed transport error when the configured response budget is exceeded", async () => {
  const server = http.createServer((_req, res) =>
    res.end(JSON.stringify({ data: "x".repeat(256) })),
  );
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No address");
  const client = new DatomicClient(`http://127.0.0.1:${address.port}`, 1000, 128);
  try {
    await expect(client.request("GET", "/")).rejects.toBeInstanceOf(DatomicTransportError);
  } finally {
    client.close();
    server.closeAllConnections();
    server.close();
  }
});

// [EXP-DX1] Why: only the exact database/position of our last ACK may reuse its local peer t.
// Rejected: position-only caching (another scope can have the same logical position).
it("sends basisT only for its own acknowledged database and position", async () => {
  const received: Record<string, unknown>[] = [];
  const server = http.createServer(async (req, res) => {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    received.push(JSON.parse(raw));
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify(
        req.url!.endsWith("transact")
          ? { t: { t: "long", v: "1001" }, position: { t: "long", v: "1" } }
          : { rows: [] },
      ),
    );
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw Error("No address");
  const client = new DatomicClient(`http://127.0.0.1:${address.port}`);
  try {
    await client.transact("s2-first", {
      sourceK: 0,
      position: 1,
      operationId: "op",
      attemptId: "attempt",
      rows: [],
      newIds: [],
      claims: [],
    });
    await client.rows("s2-first", { basis: { recordedPosition: 1, validAt: 100 } });
    await client.rows("s2-other", { basis: { recordedPosition: 1, validAt: 100 } });
    await client.rows("s2-first", { basis: { recordedPosition: 0, validAt: 100 } });
    expect(received[1]!["basisT"]).toBe("1001");
    expect(received[2]).not.toHaveProperty("basisT");
    expect(received[3]).not.toHaveProperty("basisT");
  } finally {
    client.close();
    server.closeAllConnections();
    server.close();
  }
});
