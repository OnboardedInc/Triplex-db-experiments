import { createServer, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { gzipSync } from "node:zlib";
import { expect, it, vi } from "vitest";
import {
  makeQleverClient,
  QleverHttpError,
  QleverRequestError,
  type QleverConnectionMode,
} from "../src/QleverClient.js";

// [EXP-QNODELAY] Why: identical bytes and structured error identities must survive
// a socket-lifetime choice (QA F1/F3). Rejected: comparing rejection alone, or
// using error-message prose as the fallback classifier.
const cases = [
  "plain",
  "chunked",
  "gzip",
  "gzip-chunked",
  "gzip-http400",
  "gzip-http500",
  "gzip-budget",
  "bad-gzip",
  "bad-json",
  "empty204",
  "http400",
  "http403",
  "http500",
  "reset",
  "truncated",
  "timeout-headers",
  "timeout-body",
  "abort-default",
  "abort-error",
  "abort-string",
  "preabort-default",
  "preabort-error",
  "preabort-string",
  "body-abort-default",
  "body-abort-error",
  "body-abort-string",
] as const;

type Scenario = (typeof cases)[number];
const rows = (nonce: string) => [{ x: { type: "literal", value: nonce } }];
const chain = (error: unknown): unknown[] => {
  const result: unknown[] = [],
    seen = new Set<unknown>();
  for (let e: any = error; e != null && !seen.has(e); e = e.cause) {
    seen.add(e);
    result.push(
      typeof e === "object"
        ? {
            name: e.name,
            code: e.code ?? null,
            message: e.message,
            status: e.status ?? null,
            body: e.body ?? null,
          }
        : { primitive: e },
    );
  }
  return result;
};
const classify = (error: any) => {
  // [CX-A01-040] Why: main exposes typed request failures; preserve that contract in both transport modes. Rejected: expecting only the pre-integration raw DOM timeout.
  if (error instanceof QleverRequestError) return error.kind === "timeout" ? "timeout" : "abort";
  if (error instanceof QleverHttpError) return error.status >= 500 ? "http-server" : "http-client";
  if (error instanceof DOMException && error.name === "TimeoutError") return "timeout";
  if (error instanceof DOMException && error.name === "AbortError") return "abort";
  if (error instanceof RangeError) return "byte-budget";
  if (error?.cause?.code === "UND_ERR_SOCKET") return "transport";
  return "other";
};

it.each(cases)("same response path in both modes: %s", async (scenario: Scenario) => {
  const nonce = randomUUID() + (scenario === "gzip-budget" ? "x".repeat(4096) : ""),
    body = JSON.stringify({ results: { bindings: rows(nonce) } });
  const send = (res: ServerResponse, bytes: Buffer | string) => {
    if (scenario.includes("chunked")) {
      const b = Buffer.from(bytes),
        mid = Math.floor(b.length / 2);
      res.write(b.subarray(0, mid));
      setImmediate(() => res.end(b.subarray(mid)));
    } else res.end(bytes);
  };
  const server = createServer((req, res) => {
    req.resume();
    req.on("end", () => {
      if (scenario === "reset") {
        req.socket.destroy();
        return;
      }
      if (scenario === "truncated") {
        res.writeHead(200, { "Content-Length": "10000" });
        res.write('{"results":');
        setImmediate(() => res.destroy());
        return;
      }
      if (
        scenario === "timeout-headers" ||
        scenario.startsWith("abort") ||
        scenario.startsWith("preabort")
      )
        return;
      if (scenario === "timeout-body" || scenario.startsWith("body-abort")) {
        res.writeHead(200);
        res.write('{"results":');
        return;
      }
      if (scenario === "empty204") {
        res.writeHead(204);
        res.end();
        return;
      }
      const http = /http(\d+)/.exec(scenario),
        status = http ? Number(http[1]) : 200;
      const json = http ? JSON.stringify({ error: "fixture", nonce }) : body;
      if (scenario.includes("gzip")) {
        res.writeHead(status, { "Content-Encoding": "gzip" });
        send(res, scenario === "bad-gzip" ? "invalid-compressed-data" : gzipSync(json));
      } else {
        res.writeHead(status);
        send(res, scenario === "bad-json" ? "not json" : json);
      }
    });
  });
  // Native query cancellation is separate from the timed HTTP transport fixture.
  server.on("upgrade", (_req, socket) =>
    socket.end("HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n"),
  );
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const outcomes: unknown[] = [];
  try {
    for (const connectionMode of ["keep-alive", "per-request"] as QleverConnectionMode[]) {
      const client = makeQleverClient(url, { connectionMode }),
        controller = new AbortController();
      const reason = scenario.endsWith("error")
        ? new Error("caller-stop")
        : scenario.endsWith("string")
          ? "caller-stop"
          : undefined;
      const abort = () => controller.abort(reason);
      let observedBodyChunk = false;
      const originalFetch = globalThis.fetch;
      const spy = scenario.startsWith("body-abort")
        ? vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
            const response = await originalFetch(input, init);
            const stream = response.body!;
            const getReader = stream.getReader.bind(stream);
            stream.getReader = (() => {
              const reader = getReader(),
                read = reader.read.bind(reader);
              reader.read = async () => {
                const chunk = await read();
                if (!chunk.done) {
                  observedBodyChunk = true;
                  queueMicrotask(abort);
                }
                return chunk;
              };
              return reader;
            }) as typeof stream.getReader;
            return response;
          })
        : undefined;
      let timer: ReturnType<typeof setTimeout> | undefined;
      if (scenario.startsWith("preabort")) abort();
      else if (scenario.startsWith("abort")) timer = setTimeout(abort, 40);
      try {
        const value = await client.query("SELECT ?x WHERE {}", {
          queryId: nonce,
          signal: controller.signal,
          timeoutMs: scenario.startsWith("timeout") ? 40 : 2000,
          ...(scenario === "gzip-budget" ? { maxResponseBytes: Buffer.byteLength(body) - 1 } : {}),
        });
        expect(value).toEqual(rows(nonce));
        outcomes.push({ outcome: "rows", decodedBytes: JSON.stringify(value) });
      } catch (error) {
        if (scenario.startsWith("timeout")) {
          expect(error).toBeInstanceOf(QleverRequestError);
          expect((error as QleverRequestError).kind).toBe("timeout");
        }
        outcomes.push({ outcome: "error", classification: classify(error), chain: chain(error) });
      } finally {
        clearTimeout(timer);
        spy?.mockRestore();
        await client.close();
        if (scenario.startsWith("body-abort")) expect(observedBodyChunk).toBe(true);
      }
    }
    expect(outcomes[1], JSON.stringify(outcomes, null, 2)).toEqual(outcomes[0]);
    const result = outcomes[0] as any;
    if (["plain", "chunked", "gzip", "gzip-chunked"].includes(scenario))
      expect(result.outcome).toBe("rows");
    else expect(result.outcome).toBe("error");
    if (scenario === "gzip-budget") expect(result.classification).toBe("byte-budget");
    if (scenario.startsWith("timeout")) expect(result.classification).toBe("timeout");
    if (scenario.endsWith("http400"))
      expect(result.chain[0]).toMatchObject({ status: 400, body: { error: "fixture", nonce } });
    if (scenario.endsWith("http500"))
      expect(result.chain[0]).toMatchObject({ status: 500, body: { error: "fixture", nonce } });
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
