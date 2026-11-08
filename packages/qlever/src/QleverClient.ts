import { randomUUID } from "node:crypto";

export interface SparqlTerm {
  readonly type: string;
  readonly value: string;
  readonly datatype?: string;
  readonly "xml:lang"?: string;
}
export type SparqlBinding = Record<string, SparqlTerm>;
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
// [EXP-P2Q] Why: request aborts/timeouts and completed decode failures need structured identities.
// Rejected: classifying their prose (field names such as "connection" can appear in decode errors).
export class QleverRequestError extends Error {
  constructor(
    readonly kind: "aborted" | "timeout",
    cause?: unknown,
  ) {
    super(`QLever request ${kind}`, { cause });
  }
}
export class QleverDecodeError extends TypeError {}
export const makeQleverClient = (
  url: string,
  options: { readonly accessToken?: string; readonly timeoutMs?: number } = {},
): QleverClient => {
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
    if (options.accessToken) headers["Authorization"] = `Bearer ${options.accessToken}`;
    if (kind !== "command") headers["Content-Type"] = `application/sparql-${kind}`;
    const onAbort = () => {
      if (kind === "query") void cancel(queryId).catch(() => {});
    };
    signal.addEventListener("abort", onAbort, { once: true });
    try {
      const response = await fetch(target, {
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
    } catch (cause) {
      if (signal.aborted)
        throw new QleverRequestError(
          signal.reason instanceof DOMException && signal.reason.name === "TimeoutError"
            ? "timeout"
            : "aborted",
          cause,
        );
      throw cause;
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
        throw new QleverDecodeError("QLever did not return a SPARQL SELECT result");
      return result.results.bindings;
    },
    update: (sparql, requestOptions) => request(sparql, "update", requestOptions),
    command: (command, requestOptions) => request(undefined, "command", requestOptions, command),
    cancel,
    close: async () => {},
  };
};
