import { randomUUID } from "node:crypto";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { Readable } from "node:stream";

// [EXP-QNODELAY] Why: agent:false allocates a fresh socket even if another client
// has idle keep-alive sockets for this origin. Rejected: Connection:close on the
// shared fetch pool (its first request can still borrow an existing socket).
const requestFresh = (
  target: URL,
  init: { method: string; headers: Record<string, string>; body?: string; signal: AbortSignal },
): Promise<Response> =>
  new Promise((resolve, reject) => {
    const transport = target.protocol === "https:" ? httpsRequest : httpRequest;
    const req = transport(
      target,
      { method: init.method, headers: init.headers, signal: init.signal, agent: false },
      (res) => {
        resolve(
          new Response(
            [204, 205, 304].includes(res.statusCode ?? 500)
              ? null
              : (Readable.toWeb(res) as ReadableStream<Uint8Array>),
            {
              status: res.statusCode ?? 500,
              headers: Object.fromEntries(
                Object.entries(res.headers)
                  .filter((entry) => entry[1] !== undefined)
                  .map(([key, value]) => [
                    key,
                    Array.isArray(value) ? value.join(", ") : (value as string),
                  ]),
              ),
            },
          ),
        );
      },
    );
    req.on("error", reject);
    req.end(init.body);
  });

export interface SparqlTerm {
  readonly type: string;
  readonly value: string;
  readonly datatype?: string;
  readonly "xml:lang"?: string;
}
export type SparqlBinding = Record<string, SparqlTerm>;
export type QleverConnectionMode = "keep-alive" | "per-request";

/** Explicit options take precedence over the lab environment; absent selection preserves keep-alive. */
export const qleverConnectionModeOf = (
  requested: string | undefined = process.env["TRIPLEX_QLEVER_CONNECTION_MODE"],
): QleverConnectionMode => {
  const mode = requested ?? "keep-alive";
  if (mode !== "keep-alive" && mode !== "per-request")
    throw new TypeError("Unknown QLever connection mode; choose keep-alive or per-request");
  return mode;
};

export interface QleverRequestOptions {
  readonly signal?: AbortSignal;
  readonly timeoutMs?: number;
  readonly queryId?: string;
  readonly maxResponseBytes?: number;
}
export interface QleverClient {
  query(sparql: string, options?: QleverRequestOptions): Promise<SparqlBinding[]>;
  update(sparql: string, options?: QleverRequestOptions): Promise<unknown>;
  command(command: string, options?: QleverRequestOptions): Promise<unknown>;
  /** Requests native cancellation; completion must be observed independently. */
  cancel(queryId: string): Promise<void>;
  close(): Promise<void>;
}
export class QleverHttpError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
  ) {
    super(`QLever HTTP ${status}: ${JSON.stringify(body)}`);
  }
}
export const makeQleverClient = (
  url: string,
  options: {
    readonly accessToken?: string;
    readonly timeoutMs?: number;
    readonly connectionMode?: QleverConnectionMode;
  } = {},
): QleverClient => {
  const connectionMode = qleverConnectionModeOf(options.connectionMode);
  const base = new URL(url);
  const cancel = async (queryId: string) => {
    const target = new URL(`/watch/${encodeURIComponent(queryId)}`, base);
    target.protocol = target.protocol === "https:" ? "wss:" : "ws:";
    await new Promise<void>((resolve, reject) => {
      const socket = new WebSocket(target);
      const timer = setTimeout(() => {
        socket.close();
        reject(new Error("QLever cancellation request deadline exceeded"));
      }, 2000);
      socket.onopen = () => {
        socket.send("cancel");
        clearTimeout(timer);
        socket.close();
        resolve();
      };
      socket.onerror = () => {
        clearTimeout(timer);
        reject(new Error("QLever cancellation socket failed"));
      };
    });
  };
  const request = async (
    sparql: string | undefined,
    kind: "query" | "update" | "command",
    requestOptions: QleverRequestOptions = {},
    command?: string,
  ) => {
    const queryId = requestOptions.queryId ?? randomUUID();
    const timeoutMs = requestOptions.timeoutMs ?? options.timeoutMs ?? 30_000;
    const signal = AbortSignal.any([
      AbortSignal.timeout(timeoutMs),
      ...(requestOptions.signal ? [requestOptions.signal] : []),
    ]);
    const target = new URL(base);
    if (command) target.searchParams.set("cmd", command);
    // Server timeouts are cooperative, not a proof of immediate termination.
    target.searchParams.set("timeout", `${Math.ceil(timeoutMs)}ms`);
    const headers: Record<string, string> = {
      "Query-Id": queryId,
      Accept: kind === "query" ? "application/sparql-results+json" : "application/json",
    };
    // [EXP-QNODELAY] Why: R40 section 1.3 identifies delayed ACK stalls on reused
    // QLever HTTP/1.1 sockets. Rejected: a global fetch dispatcher (changes unrelated clients).
    if (connectionMode === "per-request") headers["Connection"] = "close";
    if (options.accessToken) headers["Authorization"] = `Bearer ${options.accessToken}`;
    if (kind !== "command") headers["Content-Type"] = `application/sparql-${kind}`;
    const onAbort = () => {
      if (kind === "query") void cancel(queryId).catch(() => {});
    };
    signal.addEventListener("abort", onAbort, { once: true });
    try {
      const response = await (connectionMode === "per-request" ? requestFresh : fetch)(target, {
        method: kind === "command" ? "GET" : "POST",
        headers,
        ...(sparql === undefined ? {} : { body: sparql }),
        signal,
      });
      const reader = response.body?.getReader();
      const chunks: Uint8Array[] = [];
      let size = 0;
      if (reader)
        while (true) {
          const next = await reader.read();
          if (next.done) break;
          size += next.value.byteLength;
          if (size > (requestOptions.maxResponseBytes ?? 64 * 1024 * 1024)) {
            await reader.cancel();
            if (kind === "query") void cancel(queryId).catch(() => {});
            throw new RangeError("QLever response exceeds byte budget; no partial answer returned");
          }
          chunks.push(next.value);
        }
      const bodyText = Buffer.concat(chunks).toString("utf8");
      let body: unknown;
      try {
        body = JSON.parse(bodyText);
      } catch {
        body = bodyText;
      }
      if (!response.ok) throw new QleverHttpError(response.status, body);
      return body;
    } finally {
      signal.removeEventListener("abort", onAbort);
    }
  };
  return {
    query: async (sparql, requestOptions) => {
      const result = (await request(sparql, "query", requestOptions)) as {
        results?: { bindings?: SparqlBinding[] };
      };
      if (!Array.isArray(result.results?.bindings))
        throw new TypeError("QLever did not return a SPARQL SELECT result");
      return result.results.bindings;
    },
    update: (sparql, requestOptions) => request(sparql, "update", requestOptions),
    command: (command, requestOptions) => request(undefined, "command", requestOptions, command),
    cancel,
    close: async () => {},
  };
};
