import { ByteCache } from "./ByteCache.js";
import { PredecessorCache, RowCache, estimateRowBytes } from "./RowCache.js";
import { randomUUID } from "node:crypto";
import { decodeEntity, type CachedEntity, type ReachWire } from "./reach.js";
import { validateFeedEntry, type FeedTransaction } from "@triplex-build/triplex/feed";
import type { ResolvedTemporalBasis } from "@triplex-build/triplex";
import type { TripleRow } from "@triplex-build/triplex/runtime";
import { encodeRow, decodeRow, type WireRow } from "./protocol.js";
import { encodeRowText } from "./rowText.js";
import http from "node:http";
import { stringifyExact, validateTagged, type TaggedValue } from "./codec.js";
import {
  beginSpan,
  bindTraceCallback,
  currentTrace,
  endSpan,
  traceInterval,
  traceparent,
  traceSync,
  tracedRequest,
  traceLevel,
} from "./tracing.js";

export class DatomicHttpError extends Error {
  readonly _tag = "DatomicHttpError";
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly maximum?: number,
    readonly route?: string,
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
  layout?: "lean" | "legacy";
  strictRecordClocks?: boolean;
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
export interface DatomicRequestSample {
  readonly path: string;
  readonly operationId?: string | undefined;
  readonly status: number;
  readonly started: number;
  readonly finished: number;
  readonly written: number;
  readonly headers: number;
  readonly reusedSocket: boolean;
  readonly gatewayTimeline?: unknown;
  readonly responseBytes: number;
  readonly requestBytes: number;
  readonly serializeMicros: number;
  readonly parseMicros: number;
  readonly gatewayMicros: number;
  readonly transactMicros: number;
  readonly waited: boolean;
  readonly datoms?: number;
  readonly position?: number;
}
export interface DatomicCommitAttempt {
  firstAdapterCall: number;
  optimistic: boolean;
  begin: boolean;
  httpCalls: number;
  requests: DatomicRequestSample[];
  transactionIds?: string[];
  ready?: number;
  released?: number;
}
export interface DatomicCommitSample {
  operationId: string;
  transactionIds: string[];
  httpCalls: number;
  replays: number;
  started: number;
  returned: number;
  attempts: DatomicCommitAttempt[];
}
export class DatomicClient {
  // [DX-B2-N3] Why: opt-in transport observations measure real calls without a second HTTP request.
  // Rejected: inferring gateway CPU or transact time from client wall latency.
  onRequest?: (sample: DatomicRequestSample) => void;
  onCommit?: (sample: DatomicCommitSample) => void;
  readonly agent: http.Agent;
  private activeObservation: DatomicCommitAttempt | undefined;
  // [DX-B6-1] Why: capture request attribution synchronously before the transport yields.
  // Rejected: a mutable callback spanning an await (concurrent fibers would borrow each other's observations).
  observeRequests<A>(observation: DatomicCommitAttempt | undefined, call: () => A): A {
    const previous = this.activeObservation;
    this.activeObservation = observation;
    try {
      return call();
    } finally {
      this.activeObservation = previous;
    }
  }
  readonly commitDiagnostics = {
    beginDecodeMicros: 0,
    transactEncodeMicros: 0,
    optimisticAttempts: 0,
    optimisticFallbacks: 0,
    conflicts: 0,
    replays: 0,
    clockReplays: 0,
  };
  private readonly layouts = new Map<string, "lean" | "legacy">();
  private readonly sentCallbacks = new Map<string, () => void>();
  private lastCommit: { db: string; position: number; t: string } | undefined;
  reachSession = randomUUID();
  readonly reachCache: ByteCache<CachedEntity>;
  readonly rowCache: RowCache;
  readonly predecessorCache: PredecessorCache;
  forceFullReach = false;
  readonly reachDiagnostics = {
    inlineEntities: 0,
    referenceEntities: 0,
    referenceHits: 0,
    referenceMisses: 0,
    decodedRows: 0,
    decodedTextBytes: 0,
    refMisses: 0,
    waits: 0,
    waitHits: 0,
    needRequests: 0,
    needEntities: 0,
    fullRetries: 0,
    resets: 0,
    faults: 0,
    declines: {} as Record<string, number>,
  };
  // [DX-H7] Why: parsed reference IDs repeatedly rebuilt and hashed long database-prefixed keys.
  // Rejected: changing cache identity to an entity ID alone (cross-database collisions).
  private reachKeyDb: string | undefined;
  private readonly reachKeys = new Map<string, string>();
  private reachKeyBytes = 0;
  private reachKey(db: string, prefix: string, id: string): string {
    if (this.reachKeyDb !== db) {
      this.reachKeys.clear();
      this.reachKeyBytes = 0;
      this.reachKeyDb = db;
    }
    const found = this.reachKeys.get(id);
    if (found !== undefined) return found;
    const key = prefix + id;
    const bytes = 128 + 2 * (id.length + key.length);
    if (bytes <= 32 * 1024 ** 2) {
      if (this.reachKeyBytes + bytes > 32 * 1024 ** 2) {
        this.reachKeys.clear();
        this.reachKeyBytes = 0;
      }
      this.reachKeys.set(id, key);
      this.reachKeyBytes += bytes;
    }
    return key;
  }
  private readonly endpoint: URL;
  constructor(
    endpoint: string,
    readonly timeoutMs = 5000,
    readonly maxResponseBytes = 64 * 1024 ** 2,
    readonly cacheOptions: {
      readonly entityCacheBytes?: number;
      readonly rowCacheBytes?: number;
      readonly predecessorCacheBytes?: number;
      readonly predecessorAttributes?: readonly string[];
    } = {},
  ) {
    this.reachCache = new ByteCache(
      cacheOptions.entityCacheBytes ?? 128 * 1024 ** 2,
      (entity) => 256 + entity.storedRows.reduce((n, row) => n + 3 * estimateRowBytes(row), 0),
    );
    this.predecessorCache = new PredecessorCache(
      cacheOptions.predecessorCacheBytes,
      cacheOptions.predecessorAttributes,
    );
    this.rowCache = new RowCache(
      Number.MAX_SAFE_INTEGER,
      cacheOptions.rowCacheBytes ?? 32 * 1024 ** 2,
    );
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
  readonly rowObservers = new Set<(db: string, row: TripleRow) => void>();
  close(): void {
    this.reachKeys.clear();
    this.reachKeyBytes = 0;
    this.reachKeyDb = undefined;
    this.reachCache.clear();
    this.rowCache.clear();
    this.predecessorCache.clear();
    this.layouts.clear();
    this.rowObservers.clear();
    this.agent.destroy();
  }
  async request<T>(
    method: "GET" | "POST",
    path: string,
    body?: unknown,
    timeoutMs = this.timeoutMs,
    onSent?: () => void,
  ): Promise<T> {
    // [DX-T1] Why: a caller's commit/read owns all HTTP children, including retries and failures.
    // Rejected: a new unrelated trace for each round trip (loses queue and post-response cost).
    const route = path
      .replace(/\/s2?-[^/]+/g, "/{db}")
      .replace(/\/operation\/[^/]+/, "/operation/{id}");
    return tracedRequest(
      path.endsWith("/transact") ? "commit" : "read",
      `http ${method} ${route}`,
      {},
      () => this.requestTraced<T>(method, path, body, timeoutMs, onSent),
    );
  }
  private async requestTraced<T>(
    method: "GET" | "POST",
    path: string,
    body: unknown,
    timeoutMs: number,
    onSent?: () => void,
  ): Promise<T> {
    const started = performance.now();
    const observation = this.activeObservation;
    const operationId =
      body &&
      typeof body === "object" &&
      typeof (body as { operationId?: unknown }).operationId === "string"
        ? (body as { operationId: string }).operationId
        : undefined;
    // [DX-B5-L0] Why: legacy request wrappers forward four arguments; recover the callback from the bound operation.
    // Rejected: requiring every instrumentation wrapper to forward a new positional argument.
    if (!onSent && path.endsWith("/transact") && body && typeof body === "object") {
      const operation = (body as { operationId?: unknown }).operationId;
      if (typeof operation === "string")
        onSent = this.sentCallbacks.get(`${path.split("/")[3]}/${operation}`);
    }
    // [EXP-DX1] Why: a known commit t lets lagging peers wait locally; no transactor round trip.
    // Rejected: d/sync without t and the old ten-millisecond poll.
    if (body && typeof body === "object" && this.lastCommit) {
      const input = body as { basis?: { recordedPosition?: number }; position?: number };
      if (
        path.includes(`/db/${this.lastCommit.db}/`) &&
        (input.basis?.recordedPosition ?? input.position) === this.lastCommit.position
      )
        body = { ...body, basisT: this.lastCommit.t };
    }
    const serializeStart = performance.now();
    const bytes = traceSync("client.encode", () =>
      body === undefined ? undefined : Buffer.from(stringifyExact(body)),
    );
    const serializeMicros = (performance.now() - serializeStart) * 1000;
    return new Promise<T>((resolve, reject) => {
      const trace = currentTrace();
      const exchange = beginSpan("client.http", "gateway-wait");
      const parent = traceparent(exchange);
      let written = NaN,
        headers = NaN;
      let completed = false;
      const complete = bindTraceCallback(() => {
        if (completed) return;
        completed = true;
        const origin = performance.timeOrigin;
        traceInterval(
          trace,
          "socket.queue-and-write",
          origin + socketStarted,
          origin + written,
          "network",
          exchange?.id,
        );
        traceInterval(
          trace,
          "socket.wait-first-byte",
          origin + written,
          origin + headers,
          "gateway-wait",
          exchange?.id,
        );
        endSpan(exchange);
      });
      const socketStarted = performance.now();
      const req = http.request(
        new URL(path, this.endpoint),
        {
          method,
          agent: this.agent,
          headers: {
            Accept: "application/json",
            traceparent: parent,
            // [DX-T1] Why: summary must retain every step of commits, including their begin/read routes and worker hops.
            // Rejected: sampling a fast /begin because its route looks read-only while it belongs to a commit.
            ...(traceLevel === "summary" &&
            (trace?.kind === "commit" || trace?.attributes["logicalKind"] === "commit")
              ? { "x-triplex-trace-kind": "commit" }
              : {}),
            ...(bytes
              ? { "Content-Type": "application/json", "Content-Length": bytes.length }
              : {}),
          },
        },
        (res) => {
          headers = performance.now();
          const chunks: Buffer[] = [];
          let size = 0;
          res.on("data", (chunk: Buffer) => {
            size += chunk.length;
            if (size > this.maxResponseBytes)
              res.destroy(new Error(`Gateway response exceeds ${this.maxResponseBytes} bytes`));
            else chunks.push(chunk);
          });
          res.on("error", (error) => {
            complete();
            reject(new DatomicTransportError(error.message, { cause: error }));
          });
          res.on("end", () => {
            const bodyEnd = performance.now();
            traceInterval(
              trace,
              "socket.body-read",
              performance.timeOrigin + headers,
              performance.timeOrigin + bodyEnd,
              "network",
              exchange?.id,
            );
            complete();
            try {
              const data = traceSync("client.parse", () =>
                JSON.parse(Buffer.concat(chunks).toString("utf8")),
              ) as Record<string, unknown>;
              if (exchange)
                exchange.attributes = {
                  responseTraceparent: String(res.headers["traceparent"] ?? "missing"),
                  status: res.statusCode ?? 0,
                };
              const status = res.statusCode ?? 0;
              const sample: DatomicRequestSample | undefined =
                observation || this.onRequest
                  ? {
                      path,
                      operationId,
                      status,
                      started,
                      finished: performance.now(),
                      written,
                      headers,
                      reusedSocket: req.reusedSocket,
                      gatewayTimeline: data["timeline"],
                      responseBytes: size,
                      requestBytes: bytes?.length ?? 0,
                      serializeMicros,
                      parseMicros: Number(res.headers["x-tx2-request-parse-micros"] ?? NaN),
                      gatewayMicros: Number(res.headers["x-tx2-gateway-micros"] ?? NaN),
                      transactMicros: Number(data["transactMicros"] ?? NaN),
                      waited: res.headers["x-tx2-waited"] === "true",
                      ...(typeof data["datoms"] === "number" ? { datoms: data["datoms"] } : {}),
                      ...(data["position"] && typeof data["position"] === "object"
                        ? { position: Number((data["position"] as TaggedValue).v) }
                        : {}),
                    }
                  : undefined;
              if (sample) observation?.requests.push(sample);
              if (status < 200 || status >= 300)
                reject(
                  new DatomicHttpError(
                    status,
                    String(data["code"] ?? "GatewayError"),
                    String(data["message"] ?? "Gateway request failed"),
                    typeof data["maximum"] === "number" ? data["maximum"] : undefined,
                    typeof data["route"] === "string" ? data["route"] : undefined,
                  ),
                );
              else {
                if (sample) this.onRequest?.(sample);
                resolve(data as T);
              }
            } catch (error) {
              reject(new DatomicTransportError("Invalid gateway JSON", { cause: error }));
            }
          });
        },
      );
      if (observation) observation.httpCalls++;
      const timer = setTimeout(
        () => req.destroy(new Error("Gateway deadline exceeded")),
        timeoutMs,
      );
      req.on("close", () => clearTimeout(timer));
      req.on("error", (error) => {
        complete();
        reject(new DatomicTransportError(error.message, { cause: error }));
      });
      req.once("finish", () => {
        written = performance.now();
      });
      if (onSent) {
        req.once("finish", onSent);
        req.once("error", onSent);
      }
      req.end(bytes);
    });
  }
  // [DX-B2-N2] Why: bind caches to database and revisions, and repair concurrent inline/reference races once.
  // Rejected: accepting a missing reference as an empty entity.
  private readonly reachInflight = new Set<Promise<void>>();
  async reachEntities(
    db: string,
    roots: readonly string[],
    basis: ResolvedTemporalBasis,
    rowPage = false,
  ) {
    return tracedRequest("read", "client.reach", {}, () =>
      this.reachEntitiesTraced(db, roots, basis, rowPage),
    );
  }
  private async reachEntitiesTraced(
    db: string,
    roots: readonly string[],
    basis: ResolvedTemporalBasis,
    rowPage: boolean,
  ) {
    const older = [...this.reachInflight];
    let ingested!: () => void;
    const ready = new Promise<void>((resolve) => {
      ingested = resolve;
    });
    this.reachInflight.add(ready);
    try {
      return await this.fetchReachEntities(db, roots, basis, rowPage, older, ingested);
    } finally {
      ingested();
      this.reachInflight.delete(ready);
    }
  }
  // [DX-B6-2] Why: wait only for inline ingestion, never for another pull's repair.
  // Rejected: awaiting whole pulls (crossed references can deadlock).
  private async fetchReachEntities(
    db: string,
    roots: readonly string[],
    basis: ResolvedTemporalBasis,
    rowPage: boolean,
    older: readonly Promise<void>[],
    ingested: () => void,
  ) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await this.request<ReachWire>(
        "POST",
        `/v2/db/${db}/${roots.length === 1 ? "reach" : "reach-many"}`,
        {
          ...(roots.length === 1 ? { root: roots[0] } : { roots }),
          basis,
          ...(rowPage ? { rowPage: true } : {}),
          session: this.reachSession,
          ...(this.forceFullReach || attempt === 1 ? { full: true } : {}),
        },
      );
      if (response.declined !== undefined) {
        this.reachDiagnostics.declines[response.declined] =
          (this.reachDiagnostics.declines[response.declined] ?? 0) + 1;
        return undefined;
      }
      try {
        if (
          !Number.isSafeInteger(response.position) ||
          response.position < 0 ||
          !/^\d+$/.test(response.t) ||
          (basis.recordedPosition !== undefined && basis.recordedPosition !== response.position) ||
          typeof response.reset !== "boolean" ||
          !Array.isArray(response.entities) ||
          !Array.isArray(response.closures) ||
          response.closures.length !== roots.length
        )
          throw new TypeError("Reach response basis/shape mismatch");
        const prefix = `${db}\0`;
        const cache = {
          get: (id: string) => this.reachCache.get(this.reachKey(db, prefix, id)),
          set: (id: string, entity: CachedEntity) =>
            this.reachCache.set(this.reachKey(db, prefix, id), entity),
        };
        if (response.reset) {
          this.reachCache.deleteWhere((key) => key.startsWith(prefix));
          this.reachDiagnostics.resets++;
        }
        const entities = new Map<string, CachedEntity>();
        let missed = false;
        for (const entity of response.entities) {
          if (
            !Array.isArray(entity) ||
            (entity.length !== 2 && entity.length !== 3) ||
            typeof entity[0] !== "string" ||
            !Number.isSafeInteger(entity[1]) ||
            entity[1] < 0 ||
            entities.has(entity[0])
          )
            throw new TypeError("Invalid reach entity");
          const [id, rev] = entity as [string, number];
          let decoded: CachedEntity | undefined;
          if (entity.length === 3) {
            if (!Array.isArray(entity[2])) throw new TypeError("Invalid inline entity");
            this.reachDiagnostics.inlineEntities++;
            this.countReachDecode(entity[2]);
            decoded = decodeEntity(id, rev, entity[2], (row) => {
              for (const observe of this.rowObservers) observe(db, row);
            });
            cache.set(id, decoded);
          } else {
            this.reachDiagnostics.referenceEntities++;
            decoded = cache.get(id);
            if (decoded?.rev === rev) {
              this.reachDiagnostics.referenceHits++;
              // [DX-H7] Why: references are reads too; refresh only the small predecessor cache.
              // Rejected: replaying row observers (would churn the row LRU on every reader cache hit).
              if (this.predecessorCache.enabled)
                for (const row of decoded.storedRows)
                  this.predecessorCache.retain(prefix + row.id, row);
            } else this.reachDiagnostics.referenceMisses++;
          }
          if (!decoded || decoded.rev !== rev) missed = true;
          else entities.set(id, decoded);
        }
        ingested();
        if (missed) {
          this.reachDiagnostics.refMisses++;
          const references = response.entities.filter(
            (e) => Array.isArray(e) && e.length === 2,
          ) as [string, number][];
          const missing = () =>
            references.filter(([id, rev]) => {
              const found = cache!.get(id);
              if (found?.rev === rev) {
                entities.set(id, found);
                return false;
              }
              return true;
            });
          if (older.length) {
            this.reachDiagnostics.waits++;
            await Promise.allSettled(older);
            if (!missing().length) this.reachDiagnostics.waitHits++;
          }
          const need = missing();
          if (need.length && attempt === 0) {
            this.reachDiagnostics.needRequests++;
            this.reachDiagnostics.needEntities += need.length;
            try {
              const repair = await this.request<ReachWire>("POST", `/v2/db/${db}/reach-many`, {
                roots,
                need: need.map(([id]) => id),
                session: this.reachSession,
                basis: { ...basis, recordedPosition: response.position },
                ...(rowPage ? { rowPage: true } : {}),
              });
              if (
                repair.declined ||
                repair.position !== response.position ||
                repair.t !== response.t ||
                !Array.isArray(repair.entities) ||
                repair.entities.length !== need.length
              )
                throw new TypeError("Repair basis/coverage mismatch");
              const expected = new Map(need);
              for (const entry of repair.entities) {
                if (
                  !Array.isArray(entry) ||
                  entry.length !== 3 ||
                  expected.get(entry[0]) !== entry[1] ||
                  !Array.isArray(entry[2])
                )
                  throw new TypeError("Repair entity/revision mismatch");
                this.countReachDecode(entry[2]);
                const decoded = decodeEntity(entry[0], entry[1], entry[2], (row) => {
                  for (const observe of this.rowObservers) observe(db, row);
                });
                expected.delete(entry[0]);
                entities.set(entry[0], decoded);
                cache.set(entry[0], decoded);
              }
              if (expected.size) throw new TypeError("Incomplete repair");
            } catch {
              this.reachDiagnostics.fullRetries++;
              continue;
            }
          } else if (need.length)
            throw new TypeError("Full reach response has unresolved references");
        }
        response.closures.forEach(([root, ids], i) => {
          if (
            root !== roots[i] ||
            !Array.isArray(ids) ||
            !ids.includes(root) ||
            new Set(ids).size !== ids.length ||
            ids.some((id) => typeof id !== "string" || !entities.has(id))
          )
            throw new TypeError("Reach closure binding mismatch");
        });
        return { entities, closures: response.closures };
      } catch {
        this.reachDiagnostics.faults++;
        return undefined;
      }
    }
    return undefined;
  }
  // [DX-H7] Why: distinguish decode churn from verification CPU without serializing rows again.
  // Rejected: JSON.stringify telemetry (adds the CPU cost being measured).
  private countReachDecode(rows: unknown[]) {
    this.reachDiagnostics.decodedRows += rows.length;
    for (const row of rows) {
      if (typeof row === "string") this.reachDiagnostics.decodedTextBytes += Buffer.byteLength(row);
      else if (Array.isArray(row))
        for (const value of row)
          if (typeof value === "string")
            this.reachDiagnostics.decodedTextBytes += Buffer.byteLength(value);
    }
  }
  health(): Promise<DatomicHealth> {
    return this.request("GET", "/health");
  }
  async create(
    scope: string,
    layout: "lean" | "legacy" = "legacy",
    strictRecordClocks = false,
  ): Promise<DatomicDatabase> {
    const result = await this.request<DatomicDatabase>("POST", "/v1/db/create", {
      scope,
      layout,
      strictRecordClocks,
    });
    // [DX-B5-L6] Why: compact writes follow the actual immutable scope layout, including a reopened scope.
    // Rejected: trusting only the requested layout (could compact a pre-existing legacy scope).
    this.layouts.set(result.db, result.layout === "lean" ? "lean" : "legacy");
    return result;
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
  async beginCommand(
    db: string,
    hint: { readonly commandId?: string; readonly tripleIds?: readonly string[] },
  ) {
    const response = await this.request<{
      handle: string;
      position: TaggedValue;
      t: TaggedValue;
      claim: string | null;
      rows: WireRow[];
    }>("POST", `/v2/db/${db}/begin`, {
      ...(hint.commandId === undefined ? {} : { commandId: hint.commandId }),
      ids: hint.tripleIds ?? [],
    });
    const decodeSpan = beginSpan("client.begin-validate-and-decode");
    const decodeStart = performance.now();
    const p = validateTagged(response.position);
    const position = Number(p.v);
    if (
      p.t !== "long" ||
      !Number.isSafeInteger(position) ||
      position < 0 ||
      typeof response.handle !== "string"
    )
      throw new TypeError("Invalid begin position/handle");
    const t = validateTagged(response.t);
    if (
      t.t !== "long" ||
      BigInt(t.v) < 0n ||
      (response.claim !== null && typeof response.claim !== "string")
    )
      throw new TypeError("Invalid begin t/claim");
    const rows = new Map<string, TripleRow | null>((hint.tripleIds ?? []).map((id) => [id, null]));
    const seen = new Set<string>();
    for (const wire of response.rows) {
      const row = decodeRow(wire);
      if (seen.has(row.id) || row.retracted_at !== null || row.recorded_position > position)
        throw new TypeError("Invalid prefetched row cut");
      seen.add(row.id);
      if (!rows.has(row.id)) throw new TypeError("Unexpected prefetched row");
      rows.set(row.id, row);
    }
    endSpan(decodeSpan);
    this.commitDiagnostics.beginDecodeMicros = (performance.now() - decodeStart) * 1000;
    return {
      handle: response.handle,
      position,
      prefetch: {
        ...(hint.commandId === undefined ? {} : { commandId: hint.commandId }),
        claim: response.claim,
        rows,
      },
    };
  }
  release(db: string, handle: string): Promise<unknown> {
    return this.request("POST", `/v1/db/${db}/release`, { handle }, 250);
  }
  async rows(db: string, input: Record<string, unknown>): Promise<readonly TripleRow[]> {
    return tracedRequest("read", "client.rows", {}, () => this.rowsTraced(db, input));
  }
  private async rowsTraced(
    db: string,
    input: Record<string, unknown>,
  ): Promise<readonly TripleRow[]> {
    const response = await this.request<{ rows: WireRow[] }>("POST", `/v1/db/${db}/read`, input);
    const rows = traceSync("client.rows-decode", () => response.rows.map(decodeRow));
    if (!input["staged"])
      for (const row of rows) for (const observe of this.rowObservers) observe(db, row);
    return rows;
  }
  async transact(
    db: string,
    input: {
      onSent?: () => void;
      clientId?: string;
      sendSequence?: number;
      replaySafe?: boolean;
      sourceK: number | null;
      span?: number;
      entities?: readonly string[];
      live?: readonly string[];
      scopeWide?: boolean;
      position: number;
      operationId: string;
      attemptId: string;
      rows: readonly TripleRow[];
      newIds: readonly string[];
      claims: readonly { commandId: string; txId: string; timestamp: number }[];
      handle?: string;
      release?: boolean;
    },
    onSent?: () => void,
  ): Promise<unknown> {
    // [DX-T1] Why: direct client users retain encoding and post-response validation in the same commit trace.
    // Rejected: starting the only trace after serialization at the HTTP boundary.
    return tracedRequest("commit", "client.transact", {}, () =>
      this.transactTraced(db, input, onSent),
    );
  }
  private async transactTraced(
    db: string,
    input: Parameters<DatomicClient["transact"]>[1],
    onSent?: () => void,
  ): Promise<unknown> {
    const encodeSpan = beginSpan("client.transact-encode");
    const encodeStart = performance.now();
    // [DX-B5-L0] Why: two-argument transact wrappers preserve the input, and this callback never belongs on the wire.
    // Rejected: a third-argument-only callback (the NS publication observer drops it).
    const { onSent: inputSent, ...wireInput } = input;
    onSent ??= inputSent;
    const compact = this.layouts.get(db) === "lean";
    const retirementColumns = [
      "id",
      "entity_id",
      "entity_type",
      "retracted_at",
      "retracted_position",
      "retract_tx_id",
    ];
    const rows = compact
      ? input.rows
          .filter((row) => row.retracted_at !== null)
          .map((row) => {
            const encoded = encodeRow(row);
            return Object.fromEntries(retirementColumns.map((column) => [column, encoded[column]]));
          })
      : input.rows.map(encodeRow);
    const body = {
      ...wireInput,
      rows,
      ...(compact ? { rowMode: "texts", rowOrder: input.rows.map((row) => row.id) } : {}),
      rowTexts: Object.fromEntries(
        input.rows
          .filter((r) => input.newIds.includes(r.id))
          .map((r) => [
            r.id,
            encodeRowText({
              ...r,
              retracted_at: null,
              retracted_position: null,
              retract_tx_id: null,
            }),
          ]),
      ),
    };
    endSpan(encodeSpan);
    this.commitDiagnostics.transactEncodeMicros = (performance.now() - encodeStart) * 1000;
    const sendKey = `${db}/${input.operationId}`;
    if (onSent) this.sentCallbacks.set(sendKey, onSent);
    let response: { t?: TaggedValue; position?: TaggedValue; delta?: number };
    try {
      response = await this.request("POST", `/v1/db/${db}/transact`, body, this.timeoutMs);
    } finally {
      this.sentCallbacks.delete(sendKey);
      onSent?.();
    }
    if (response.t && response.position) {
      const p = validateTagged(response.position);
      const position = Number(p.v);
      const t = validateTagged(response.t);
      if (
        p.t !== "long" ||
        !Number.isSafeInteger(position) ||
        position < 0 ||
        t.t !== "long" ||
        BigInt(t.v) < 0n ||
        !Number.isSafeInteger(response.delta) ||
        position - input.position !== response.delta
      )
        throw new TypeError("Commit basis mismatch");
      this.lastCommit = { db, position, t: String(t.v) };
    }
    return response;
  }
  operation(
    db: string,
    operationId: string,
  ): Promise<{ status: "committed" | "absent"; position?: TaggedValue; t?: TaggedValue }> {
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
