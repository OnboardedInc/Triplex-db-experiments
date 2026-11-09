import { createServer } from "node:http";
import type { Socket } from "node:net";
import { afterEach, expect, it, vi } from "vitest";
import { makeQleverClient, qleverConnectionModeOf } from "../src/QleverClient.js";

afterEach(() => vi.unstubAllEnvs());

it("defaults to keep-alive, accepts explicit selection and refuses typos", () => {
  vi.stubEnv("TRIPLEX_QLEVER_CONNECTION_MODE", undefined);
  expect(qleverConnectionModeOf()).toBe("keep-alive");
  vi.stubEnv("TRIPLEX_QLEVER_CONNECTION_MODE", "per-request");
  expect(qleverConnectionModeOf()).toBe("per-request");
  expect(qleverConnectionModeOf("keep-alive")).toBe("keep-alive");
  expect(() => qleverConnectionModeOf("typo")).toThrow(TypeError);
  expect(() => makeQleverClient("http://localhost", { connectionMode: "typo" as any })).toThrow(
    TypeError,
  );
});

it.each(["keep-alive", "per-request"] as const)(
  "%s applies to queries, updates and commands",
  async (connectionMode) => {
    const sockets: Socket[] = [];
    const headers: (string | undefined)[] = [];
    const server = createServer((req, res) => {
      sockets.push(req.socket);
      headers.push(req.headers.connection);
      req.resume();
      req.on("end", () => {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.write('{"results":{"bindings":');
        res.end('[{"x":{"type":"literal","value":"ok"}}]}}');
      });
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address() as { port: number };
    const client = makeQleverClient(`http://127.0.0.1:${address.port}`, { connectionMode });
    try {
      for (let i = 0; i < 4; i++) {
        expect(await client.query("SELECT ?x WHERE {}")).toEqual([
          { x: { type: "literal", value: "ok" } },
        ]);
        await client.update("INSERT DATA {}");
        await client.command("stats");
      }
      expect(
        headers.every((h) => h === (connectionMode === "per-request" ? "close" : "keep-alive")),
      ).toBe(true);
      expect(new Set(sockets).size)[connectionMode === "per-request" ? "toBe" : "toBeLessThan"](
        sockets.length,
      );
    } finally {
      await client.close();
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  },
);

it("fresh requests do not borrow an existing fetch socket", async () => {
  const sockets: Socket[] = [];
  const server = createServer((req, res) => {
    sockets.push(req.socket);
    req.resume();
    req.on("end", () => res.end('{"results":{"bindings":[]}}'));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as { port: number };
  const url = `http://127.0.0.1:${address.port}`;
  try {
    await makeQleverClient(url, { connectionMode: "keep-alive" }).query("SELECT ?x WHERE {}");
    await new Promise((resolve) => setTimeout(resolve, 5));
    const fresh = makeQleverClient(url, { connectionMode: "per-request" });
    await fresh.query("SELECT ?x WHERE {}");
    await fresh.query("SELECT ?x WHERE {}");
    expect(new Set(sockets).size).toBe(3);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

it.each(["keep-alive", "per-request"] as const)(
  "%s preserves errors, byte limits and abort",
  async (connectionMode) => {
    const server = createServer((req, res) => {
      req.resume();
      req.on("end", () => {
        if (req.url?.includes("fail")) {
          res.writeHead(403);
          res.end('{"error":"denied"}');
        } else if (req.url?.includes("empty")) {
          res.writeHead(204);
          res.end();
        } else if (req.url?.includes("wait")) {
          /* Wait for the caller's abort. */
        } else res.end('{"results":{"bindings":[]}}');
      });
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address() as { port: number };
    const client = makeQleverClient(`http://127.0.0.1:${address.port}`, { connectionMode });
    try {
      await expect(client.command("fail")).rejects.toMatchObject({
        status: 403,
        body: { error: "denied" },
      });
      await expect(client.command("empty")).resolves.toBe("");
      await expect(client.query("SELECT ?x WHERE {}", { maxResponseBytes: 2 })).rejects.toThrow(
        RangeError,
      );
      await expect(client.command("wait", { timeoutMs: 10 })).rejects.toThrow();
    } finally {
      await client.close();
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  },
);
