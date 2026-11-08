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
