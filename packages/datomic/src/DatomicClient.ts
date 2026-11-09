import { validateFeedEntry, type FeedTransaction } from "@triplex-build/triplex/feed";
import type { ResolvedTemporalBasis } from "@triplex-build/triplex";
import type { TripleRow } from "@triplex-build/triplex/runtime";
import { encodeRow, decodeRow, type WireRow } from "./protocol.js";
import { encodeRowText } from "./rowText.js";
import http from "node:http";
import { stringifyExact, validateTagged, type TaggedValue } from "./codec.js";

export class DatomicHttpError extends Error {
  readonly _tag = "DatomicHttpError";
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}
export class DatomicTransportError extends Error {
  readonly _tag = "DatomicTransportError";
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
  }
}
export interface DatomicHealth {
  datomicVersion: string;
  gatewaySourceHash: string;
}
export interface DatomicDatabase {
  db: string;
  created: boolean;
  schemaHash: string;
}
export interface DatomicBasis {
  t: TaggedValue;
  position: TaggedValue;
  recordedAt: null;
  schemaHash: string;
}

export interface DatomicLogPage {
  readonly database: string;
  readonly fromT: string;
  readonly nextT: string;
  readonly rows: readonly (
    | { readonly t: string; readonly kind: "skipped"; readonly reason: "non-triplex" }
    | { readonly t: string; readonly kind: "commit"; readonly transaction: FeedTransaction }
  )[];
}

// [EXP-DA00] Why: 256 readers plus writers must not queue on the HTTP agent (R16). Rejected: default pool limits.
export class DatomicClient {
  readonly agent: http.Agent;
  readonly reachDiagnostics = { faults: 0, declines: {} as Record<string, number> };
  private readonly endpoint: URL;
  constructor(
    endpoint: string,
    readonly timeoutMs = 5000,
    readonly maxResponseBytes = 64 * 1024 ** 2,
  ) {
    if (
      !Number.isSafeInteger(timeoutMs) ||
      timeoutMs <= 0 ||
      !Number.isSafeInteger(maxResponseBytes) ||
      maxResponseBytes <= 0
    )
      throw new RangeError("Invalid Datomic transport budget");
    this.endpoint = new URL(endpoint);
    if (this.endpoint.protocol !== "http:" || this.endpoint.username || this.endpoint.password)
      throw new TypeError("Expected HTTP gateway URL without credentials");
    this.agent = new http.Agent({ keepAlive: true, maxSockets: 512, maxTotalSockets: 512 });
  }
  close(): void {
    this.agent.destroy();
  }
  async request<T>(
    method: "GET" | "POST",
    path: string,
    body?: unknown,
    timeoutMs = this.timeoutMs,
  ): Promise<T> {
    const bytes = body === undefined ? undefined : Buffer.from(stringifyExact(body));
    return new Promise<T>((resolve, reject) => {
      const req = http.request(
        new URL(path, this.endpoint),
        {
          method,
          agent: this.agent,
          headers: {
            Accept: "application/json",
            ...(bytes
              ? { "Content-Type": "application/json", "Content-Length": bytes.length }
              : {}),
          },
        },
        (res) => {
          const chunks: Buffer[] = [];
          let size = 0;
          res.on("data", (chunk: Buffer) => {
            size += chunk.length;
            if (size > this.maxResponseBytes)
              res.destroy(new Error(`Gateway response exceeds ${this.maxResponseBytes} bytes`));
            else chunks.push(chunk);
          });
          res.on("error", (error) =>
            reject(new DatomicTransportError(error.message, { cause: error })),
          );
          res.on("end", () => {
            try {
              const data = JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<
                string,
                unknown
              >;
              const status = res.statusCode ?? 0;
              if (status < 200 || status >= 300)
                reject(
                  new DatomicHttpError(
                    status,
                    String(data["code"] ?? "GatewayError"),
                    String(data["message"] ?? "Gateway request failed"),
                  ),
                );
              else resolve(data as T);
            } catch (error) {
              reject(new DatomicTransportError("Invalid gateway JSON", { cause: error }));
            }
          });
        },
      );
      const timer = setTimeout(
        () => req.destroy(new Error("Gateway deadline exceeded")),
        timeoutMs,
      );
      req.on("close", () => clearTimeout(timer));
      req.on("error", (error) =>
        reject(new DatomicTransportError(error.message, { cause: error })),
      );
      req.end(bytes);
    });
  }
  health(): Promise<DatomicHealth> {
    return this.request("GET", "/health");
  }
  create(scope: string): Promise<DatomicDatabase> {
    return this.request("POST", "/v1/db/create", { scope });
  }
  delete(scope: string): Promise<{ db: string; deleted: boolean }> {
    return this.request("POST", "/v1/db/delete", { scope });
  }
  async begin(
    db: string,
    basis?: ResolvedTemporalBasis,
  ): Promise<{ handle: string; position: number }> {
    const response = await this.request<{ handle: string; position: TaggedValue }>(
      "POST",
      `/v1/db/${db}/snapshot`,
      basis === undefined ? {} : { basis },
    );
    const position = Number(validateTagged(response.position).v);
    if (!Number.isSafeInteger(position) || position < 0) throw new RangeError("Unsafe position");
    return { handle: response.handle, position };
  }
  release(db: string, handle: string): Promise<unknown> {
    return this.request("POST", `/v1/db/${db}/release`, { handle }, 250);
  }
  async rows(db: string, input: Record<string, unknown>): Promise<readonly TripleRow[]> {
    const response = await this.request<{ rows: WireRow[] }>("POST", `/v1/db/${db}/read`, input);
    return response.rows.map(decodeRow);
  }
  transact(
    db: string,
    input: {
      sourceK: number;
      position: number;
      operationId: string;
      attemptId: string;
      rows: readonly TripleRow[];
      newIds: readonly string[];
      claims: readonly { commandId: string; txId: string; timestamp: number }[];
    },
  ): Promise<unknown> {
    return this.request("POST", `/v1/db/${db}/transact`, {
      ...input,
      rows: input.rows.map(encodeRow),
      rowTexts: Object.fromEntries(input.rows.filter(r => input.newIds.includes(r.id) && r.retracted_at === null).map(r => [r.id, encodeRowText(r)])),
    });
  }
  operation(db: string, operationId: string): Promise<{ status: "committed" | "absent" }> {
    return this.request("GET", `/v1/db/${db}/operation/${encodeURIComponent(operationId)}`);
  }
  async claim(db: string, commandId: string, position: number): Promise<string | null> {
    const result = await this.request<{ txId: string | null }>("POST", `/v1/db/${db}/claim`, {
      commandId,
      position,
    });
    return result.txId;
  }
  // [EXP-DF01] Why: explicit t and bounded waits preserve restart replay through the native log.
  // Rejected: feeding Triplex positions to tx-range or using txInstant for the record stamp.
  async log(db: string, fromT: string, limit = 1000, waitMs = 0): Promise<DatomicLogPage> {
    if (
      !/^(?:s-[a-f0-9]{32}|s2-[A-Za-z0-9_-]+)$/.test(db) ||
      typeof fromT !== "string" ||
      !/^(0|[1-9][0-9]*)$/.test(fromT) ||
      BigInt(fromT) > 9223372036854775807n ||
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      limit > 1000 ||
      !Number.isSafeInteger(waitMs) ||
      waitMs < 0 ||
      waitMs > 30000
    )
      throw new TypeError("Invalid Datomic log request");
    const page = await this.request<DatomicLogPage>(
      "GET",
      `/v1/db/${db}/log?fromT=${fromT}&limit=${limit}&waitMs=${waitMs}`,
      undefined,
      Math.max(this.timeoutMs, waitMs + 2000),
    );
    if (
      page.database !== db ||
      page.fromT !== fromT ||
      !Array.isArray(page.rows) ||
      page.rows.length > limit
    )
      throw new TypeError("Datomic log response binding mismatch");
    let prior = BigInt(fromT) - 1n;
    for (const row of page.rows) {
      if (typeof row.t !== "string" || !/^(0|[1-9][0-9]*)$/.test(row.t) || BigInt(row.t) <= prior)
        throw new TypeError("Datomic log response order mismatch");
      prior = BigInt(row.t);
      if (row.kind === "commit")
        validateFeedEntry({
          stream: db,
          epoch: "0",
          offset: row.t,
          kind: "commit",
          transactions: [row.transaction],
        });
      else if (row.kind !== "skipped" || row.reason !== "non-triplex")
        throw new TypeError("Unknown Datomic log resolution");
    }
    if (page.nextT !== (page.rows.length ? String(prior + 1n) : fromT))
      throw new TypeError("Datomic log response checkpoint mismatch");
    return page;
  }
  async basis(db: string): Promise<DatomicBasis> {
    if (!/^(?:s-[a-f0-9]{32}|s2-[A-Za-z0-9_-]+)$/.test(db))
      throw new TypeError("Invalid Datomic database name");
    const result = await this.request<DatomicBasis>("GET", `/v1/db/${db}/basis`);
    return { ...result, t: validateTagged(result.t), position: validateTagged(result.position) };
  }
}
