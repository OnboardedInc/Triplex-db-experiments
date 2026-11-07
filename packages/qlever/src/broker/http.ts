/**
 * A QLever client that opens a new TCP connection per request (EXP-P2Q brief point 2).
 *
 * Why: QLever 0.6.0's HTTP server sets no TCP_NODELAY (only `reuse_address` on the acceptor,
 * `src/util/http/HttpServer.h:155-156 @ 6c5861a`), and R17 0.2 item 1 measured a reused keep-alive
 * connection at about 40 ms per response against 0.37 ms for a new connection. Node's `fetch` keeps
 * connections alive by default, so the broker's applier and the candidate's reads use `agent: false`
 * plus `Connection: close` instead. The default client (`QleverClient.ts`) is unchanged for A0.
 */
import http from "node:http";
import { randomUUID } from "node:crypto";
import {
  makeQleverClient,
  QleverHttpError,
  type QleverClient,
  type QleverRequestOptions,
  type SparqlBinding,
} from "../QleverClient.js";

export const makeFreshConnectionClient = (
  url: string,
  options: { readonly accessToken?: string; readonly timeoutMs?: number } = {},
): QleverClient => {
  const base = new URL(url);
  // Cancellation (a websocket to /watch) is not on any hot path; reuse the standard client's.
  const standard = makeQleverClient(url, options);
  const request = (
    kind: "query" | "update" | "command",
    sparql: string | undefined,
    requestOptions: QleverRequestOptions = {},
    command?: string,
  ): Promise<unknown> => {
    const timeoutMs = requestOptions.timeoutMs ?? options.timeoutMs ?? 30_000;
    const target = new URL(base);
    if (command) target.searchParams.set("cmd", command);
    target.searchParams.set("timeout", `${Math.ceil(timeoutMs)}ms`);
    const body = sparql === undefined ? undefined : Buffer.from(sparql, "utf8");
    const headers: Record<string, string | number> = {
      Connection: "close",
      "Query-Id": requestOptions.queryId ?? randomUUID(),
      Accept: kind === "query" ? "application/sparql-results+json" : "application/json",
    };
    if (options.accessToken) headers["Authorization"] = `Bearer ${options.accessToken}`;
    if (body) {
      headers["Content-Type"] = `application/sparql-${kind}`;
      headers["Content-Length"] = body.length;
    }
    const maxBytes = requestOptions.maxResponseBytes ?? 64 * 1024 * 1024;
    return new Promise((resolve, reject) => {
      const req = http.request(
        {
          host: target.hostname,
          port: target.port,
          path: `${target.pathname}${target.search}`,
          method: body ? "POST" : "GET",
          headers,
          agent: false,
          timeout: timeoutMs,
        },
        (res) => {
          const chunks: Buffer[] = [];
          let size = 0;
          res.on("data", (chunk: Buffer) => {
            size += chunk.length;
            if (size > maxBytes) {
              req.destroy(new RangeError("QLever response exceeds byte budget; no partial answer returned"));
              return;
            }
            chunks.push(chunk);
          });
          res.on("end", () => {
            const text = Buffer.concat(chunks).toString("utf8");
            let parsed: unknown;
            try {
              parsed = JSON.parse(text);
            } catch {
              parsed = text;
            }
            if ((res.statusCode ?? 500) >= 400) reject(new QleverHttpError(res.statusCode ?? 500, parsed));
            else resolve(parsed);
          });
          res.on("error", reject);
        },
      );
      req.setNoDelay(true);
      req.on("timeout", () => req.destroy(new Error(`QLever request deadline ${timeoutMs} ms exceeded`)));
      req.on("error", reject);
      const signal = requestOptions.signal;
      if (signal) {
        if (signal.aborted) req.destroy(signal.reason instanceof Error ? signal.reason : new Error("aborted"));
        else signal.addEventListener("abort", () => req.destroy(new Error("aborted")), { once: true });
      }
      if (body) req.end(body);
      else req.end();
    });
  };
  return {
    query: async (sparql, requestOptions) => {
      const result = (await request("query", sparql, requestOptions)) as {
        results?: { bindings?: SparqlBinding[] };
      };
      if (!Array.isArray(result.results?.bindings))
        throw new TypeError("QLever did not return a SPARQL SELECT result");
      return result.results.bindings;
    },
    update: (sparql, requestOptions) => request("update", sparql, requestOptions),
    command: (command, requestOptions) => request("command", undefined, requestOptions, command),
    cancel: (queryId) => standard.cancel(queryId),
    close: async () => {},
  };
};
