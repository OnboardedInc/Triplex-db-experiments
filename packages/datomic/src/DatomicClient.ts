import {
  erasureWriteTicket,
  type ErasureFrontier,
  type ErasureReceipt,
  type ErasureSelector,
} from "./erasure.js";
import { ByteCache } from "./ByteCache.js";
import { PredecessorCache, RowCache, estimateRowBytes } from "./RowCache.js";
import { createHash, randomUUID } from "node:crypto";
import {
  decodeEntity,
  decodeReachPage,
  reachResponse,
  type CachedEntity,
  type ReachPage,
  type ReachWire,
} from "./reach.js";
import { databaseName } from "./scopeName.js";
import { validateFeedEntry, type FeedTransaction } from "@triplex-build/triplex/feed";
import type { ResolvedTemporalBasis } from "@triplex-build/triplex";
import type { TripleRow } from "@triplex-build/triplex/runtime";
import { encodeRow, decodeRow, type WireRow } from "./protocol.js";
import { encodeRowText, encodeRowTextFast } from "./rowText.js";
import { historyIdentityBounds } from "./identityRange.js";
import { enabledFastPaths, fastPathEnabled } from "./fastPaths.js";
import { largeRequestBody, encodeLargeRequest } from "./requestEncoding.js";
import http from "node:http";
import { stringifyExact, stringifyNativeExact, validateTagged, type TaggedValue } from "./codec.js";
import {
  beginSpan,
  bindTraceCallback,
  currentTrace,
  endSpan,
  traceInterval,
  traceparent,
  traceSync,
  traceAsync,
  tracedRequest,
  traceLevel,
  traceResource,
} from "./tracing.js";

export type DatomicWriteClass = "live" | "import" | "activation" | "notice";

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
class DatomicRequestTooLarge extends DatomicHttpError {
  constructor() {
    super(400, "InvalidValue", "Request too large");
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
  orderedRowTexts?: boolean;
  journalCuts?: boolean;
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
  readonly erasureSeq?: number;
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
    serverAssignedSubmissions: 0,
    clientOrderedSubmissions: 0,
    ticketWaitMicros: 0,
  };
  private readonly layouts = new Map<string, "lean" | "legacy">();
  private readonly orderedRowTexts = new Set<string>();
  private readonly journalCuts = new Set<string>();
  private readonly sentCallbacks = new Map<string, (published?: boolean) => void>();
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
  private readonly historicalSessions = new Map<string, string>();
  // [DX-H7] Why: parsed reference IDs repeatedly rebuilt and hashed long database-prefixed keys.
  // Rejected: changing cache identity to an entity ID alone (cross-database collisions).
  private reachKeyDb: string | undefined;
  private readonly reachKeys = new Map<string, string>();
  private reachKeyBytes = 0;
  private readonly reachKeyBudget: number;
  private cacheTimer: ReturnType<typeof setInterval> | undefined;
  cacheDiagnostics() {
    const stats = (c: {
      bytes: number;
      peakBytes: number;
      size: number;
      evictions: number;
      byteLimit: number;
    }) => ({
      bytes: c.bytes,
      peakBytes: c.peakBytes,
      entries: c.size,
      evictions: c.evictions,
      budgetBytes: c.byteLimit,
    });
    return {
      fastPaths: enabledFastPaths(),
      reach: stats(this.reachCache),
      rows: stats(this.rowCache),
      predecessors: stats(this.predecessorCache),
      reachKeys: {
        bytes: this.reachKeyBytes,
        entries: this.reachKeys.size,
        budgetBytes: this.reachKeyBudget,
      },
    };
  }
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
    if (bytes <= this.reachKeyBudget) {
      if (this.reachKeyBytes + bytes > this.reachKeyBudget) {
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
      readonly groupAccount?: string;
      readonly writeClass?: DatomicWriteClass;
      readonly saveWire?: boolean;
      readonly entityCacheBytes?: number;
      readonly rowCacheBytes?: number;
      readonly predecessorCacheBytes?: number;
      readonly predecessorAttributes?: readonly string[];
      readonly reachKeyBytes?: number;
      readonly historicalRevisionReuse?: boolean;
    } = {},
  ) {
    this.reachKeyBudget = cacheOptions.reachKeyBytes ?? 4 * 1024 ** 2;
    if (!Number.isSafeInteger(this.reachKeyBudget) || this.reachKeyBudget < 0)
      throw new RangeError("Invalid reach key budget");
    this.reachCache = new ByteCache(
      cacheOptions.entityCacheBytes ?? 16 * 1024 ** 2,
      (entity) => 256 + entity.storedRows.reduce((n, row) => n + 3 * estimateRowBytes(row), 0),
    );
    this.predecessorCache = new PredecessorCache(
      cacheOptions.predecessorCacheBytes,
      cacheOptions.predecessorAttributes,
    );
    this.rowCache = new RowCache(
      Number.MAX_SAFE_INTEGER,
      cacheOptions.rowCacheBytes ?? 8 * 1024 ** 2,
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
    // [DX-T1-12] Why: report real cache occupancy and budgets off the request path, including every writer/reader isolate.
    // Rejected: assume a configured budget is resident, or add a cache walk to every commit.
    if (traceLevel !== "off")
      this.cacheTimer = setInterval(
        () =>
          traceResource("client.caches", { client: this.reachSession, ...this.cacheDiagnostics() }),
        1000,
      ).unref();
  }
  readonly rowObservers = new Set<(db: string, row: TripleRow) => void>();
  close(): void {
    if (this.cacheTimer) clearInterval(this.cacheTimer);
    this.reachKeys.clear();
    this.reachKeyBytes = 0;
    this.reachKeyDb = undefined;
    this.historicalSessions.clear();
    this.reachCache.clear();
    this.rowCache.clear();
    this.predecessorCache.clear();
    this.layouts.clear();
    this.orderedRowTexts.clear();
    this.journalCuts.clear();
    this.rowObservers.clear();
    this.agent.destroy();
  }
  async request<T>(
    method: "GET" | "POST",
    path: string,
    body?: unknown,
    timeoutMs = this.timeoutMs,
    onSent?: (published?: boolean) => void,
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
    onSent?: (published?: boolean) => void,
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
    const bytes = largeRequestBody(body)
      ? await traceAsync("client.encode", () => encodeLargeRequest(body))
      : traceSync("client.encode", () =>
          body === undefined
            ? undefined
            : Buffer.from((fastPathEnabled("body") ? stringifyNativeExact : stringifyExact)(body)),
        );
    const byteLength = typeof bytes === "string" ? Buffer.byteLength(bytes) : (bytes?.length ?? 0);
    // [DX-WFIX1] Why: validate the complete UTF-8 transaction after its final wire encoding and before opening a socket.
    // Rejected: estimating row sizes (JSON escaping, envelopes and row texts all count against the same body cap).
    if (path.endsWith("/transact") && byteLength > 4 * 1024 * 1024)
      throw new DatomicRequestTooLarge();
    const serializeMicros = (performance.now() - serializeStart) * 1000;
    const remainingMs = timeoutMs - (performance.now() - started);
    if (remainingMs <= 0)
      throw new DatomicTransportError("Gateway deadline exceeded during encoding");
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
            ...(bytes ? { "Content-Type": "application/json", "Content-Length": byteLength } : {}),
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
              const erasureHead = res.headers["x-triplex-erasure-seq"];
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
                      requestBytes: byteLength,
                      serializeMicros,
                      parseMicros: Number(res.headers["x-tx2-request-parse-micros"] ?? NaN),
                      gatewayMicros: Number(res.headers["x-tx2-gateway-micros"] ?? NaN),
                      transactMicros: Number(data["transactMicros"] ?? NaN),
                      waited: res.headers["x-tx2-waited"] === "true",
                      ...(typeof erasureHead === "string"
                        ? { erasureSeq: Number(erasureHead) }
                        : {}),
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
        remainingMs,
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
        req.once("error", () => onSent?.());
      }
      req.end(bytes);
    });
  }
  // [DX-B2-N2] Why: bind caches to database and revisions, and repair concurrent inline/reference races once.
  // Rejected: accepting a missing reference as an empty entity.
  private readonly reachInflight = new Set<Promise<void>>();
  async readDemandWorld(
    scope: string,
    root: string,
    basis: ResolvedTemporalBasis,
    gzipRows = fastPathEnabled("demand-gzip"),
  ) {
    // [DX-THIN1] Why: one native cut validates every cached entity revision and returns all missing rows. Rejected: following the whole import journal to keep untouched worlds current.
    const found = await this.reachEntities(databaseName(scope), [root], basis, true, gzipRows);
    if (!found) return undefined;
    for (const entity of found.entities.values()) {
      if (
        entity.storedRows.some(
          (row) =>
            !Number.isSafeInteger(row.recorded_position) ||
            row.recorded_position < 1 ||
            row.recorded_position > found.position,
        )
      )
        throw new TypeError("Demand row outside its selected position");
    }
    const world = reachResponse(root, found.entities, basis, found.closures[0]![1]);
    return { ...world, entities: found.closures[0]![1].length, requests: found.requests };
  }

  // [DX-RD1] Why: one native union walk for several roots at the identical two-clock cut.
  // Rejected: batching across unequal valid times or answering a missing root from another cut.
  async readHistoricalWorlds(
    scope: string,
    roots: readonly string[],
    basis: ResolvedTemporalBasis,
  ) {
    if (
      !roots.length ||
      roots.length > 16 ||
      new Set(roots).size !== roots.length ||
      (basis.recordedAt === undefined && basis.recordedPosition === undefined)
    )
      throw new TypeError("Invalid historical read batch");
    const found = await this.reachEntities(databaseName(scope), roots, basis, true);
    if (!found) return undefined;
    for (const entity of found.entities.values()) {
      if (
        entity.storedRows.some(
          (row) =>
            !Number.isSafeInteger(row.recorded_position) ||
            row.recorded_position < 1 ||
            row.recorded_position > found.position,
        )
      )
        throw new TypeError("Historical row outside the selected position");
    }
    const worlds = found.closures.map(([root, closure]) => {
      const result = reachResponse(root, found.entities, basis, closure);
      let from = -Infinity,
        to = Infinity;
      // All reachable entities carry rows outside the requested valid time too. The first
      // boundary changes either an output row or an edge, so a hit can never cross it.
      for (const id of closure) {
        for (const row of found.entities.get(id)!.storedRows) {
          for (const at of [row.valid_from, row.valid_to]) {
            if (at === null) continue;
            if (at <= basis.validAt) from = Math.max(from, at);
            else to = Math.min(to, at);
          }
        }
      }
      return { root, ...result, entities: closure.length, from, to };
    });
    return { worlds, requests: found.requests, position: found.position, t: found.t };
  }

  private reachSessionAt(db: string, basis: ResolvedTemporalBasis) {
    if (!this.cacheOptions.historicalRevisionReuse) return this.reachSession;
    const key = `${db}/${basis.recordedAt ?? ""}/${basis.recordedPosition ?? ""}`;
    const found = this.historicalSessions.get(key);
    if (found) return found;
    // [DX-RD1] Why: an alternating cut must not overwrite the gateway's remembered revision on every other request.
    // Rejected: one session per logical caller, or an unbounded session for every recorded instant.
    if (this.historicalSessions.size >= 8)
      this.historicalSessions.delete(this.historicalSessions.keys().next().value!);
    const session = randomUUID();
    this.historicalSessions.set(key, session);
    return session;
  }
  async reachEntities(
    db: string,
    roots: readonly string[],
    basis: ResolvedTemporalBasis,
    rowPage = false,
    gzipRows = false,
  ) {
    return tracedRequest("read", "client.reach", {}, () =>
      this.reachEntitiesTraced(db, roots, basis, rowPage, gzipRows),
    );
  }
  private async reachEntitiesTraced(
    db: string,
    roots: readonly string[],
    basis: ResolvedTemporalBasis,
    rowPage: boolean,
    gzipRows: boolean,
  ) {
    const older = [...this.reachInflight];
    let ingested!: () => void;
    const ready = new Promise<void>((resolve) => {
      ingested = resolve;
    });
    this.reachInflight.add(ready);
    try {
      return await this.fetchReachEntities(db, roots, basis, rowPage, gzipRows, older, ingested);
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
    gzipRows: boolean,
    older: readonly Promise<void>[],
    ingested: () => void,
  ) {
    const session = this.reachSessionAt(db, basis);
    const page = async (route: string, input: Record<string, unknown>) => {
      if (!gzipRows) return this.request<ReachWire>("POST", route, input);
      const wire = await this.request<ReachPage>("POST", route, { ...input, gzipRows: true });
      return decodeReachPage(wire, this.maxResponseBytes);
    };
    let requests = 0;
    for (let attempt = 0; attempt < 2; attempt++) {
      requests++;
      const response = await page(`/v2/db/${db}/${roots.length === 1 ? "reach" : "reach-many"}`, {
        ...(roots.length === 1 ? { root: roots[0] } : { roots }),
        basis,
        ...(rowPage ? { rowPage: true } : {}),
        session,
        ...(this.forceFullReach || attempt === 1 ? { full: true } : {}),
      });
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
        // [DX-RD1] Why: records of different revisions can be in flight concurrently.
        // Rejected: reusing an inline payload without decoding it, or waiting for a newer revision to repair an older cut.
        const key = (id: string, rev: number) =>
          this.cacheOptions.historicalRevisionReuse
            ? `${prefix}${id.length}:${id}/${rev}`
            : this.reachKey(db, prefix, id);
        const cache = {
          get: (id: string, rev: number) => this.reachCache.get(key(id, rev)),
          set: (id: string, entity: CachedEntity) =>
            this.reachCache.set(key(id, entity.rev), entity),
        };
        const entities = new Map<string, CachedEntity>();
        let missed = false;
        // [DX-T1-4] Why: old late-offer intervals overlap reach scopes but leave decode/cache work unnamed.
        // Rejected: treating an asynchronous reach scope as exclusive JavaScript CPU time.
        traceSync("client.reach-decode-and-cache", () => {
          if (response.reset) {
            this.reachCache.deleteWhere((key) => key.startsWith(prefix));
            this.reachDiagnostics.resets++;
          }
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
              decoded = cache.get(id, rev);
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
        });
        if (missed) {
          this.reachDiagnostics.refMisses++;
          const references = response.entities.filter(
            (e) => Array.isArray(e) && e.length === 2,
          ) as [string, number][];
          const missing = () =>
            references.filter(([id, rev]) => {
              const found = cache.get(id, rev);
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
              requests++;
              const repair = await page(`/v2/db/${db}/reach-many`, {
                roots,
                need: need.map(([id]) => id),
                session,
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
        return {
          entities,
          closures: response.closures,
          requests,
          position: response.position,
          t: response.t,
        };
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
  declareProtection(db: string, attributes: readonly string[], sealed = false) {
    return this.request("POST", `/v2/db/${db}/protection`, { attributes, sealed });
  }
  async erasureFrontier(db: string): Promise<ErasureFrontier> {
    const result = await this.request<ErasureFrontier>("GET", `/v2/db/${db}/erasure-frontier`);
    if (
      result.database !== db ||
      typeof result.protected !== "boolean" ||
      !Number.isSafeInteger(result.seq) ||
      result.seq < 0 ||
      !result.erased ||
      typeof result.erased !== "object" ||
      Array.isArray(result.erased)
    )
      throw new TypeError("Erasure frontier scope or shape mismatch");
    return result;
  }
  erase(db: string, commandId: string, selectors: readonly ErasureSelector[]) {
    return this.request<ErasureReceipt>("POST", `/v2/db/${db}/erase`, { commandId, selectors });
  }
  restoreErasure(db: string) {
    return this.request("POST", `/v2/db/${db}/restore-erasure`, {});
  }
  health(): Promise<DatomicHealth> {
    return this.request("GET", "/health");
  }
  async create(
    scope: string,
    layout: "lean" | "legacy" = "legacy",
    strictRecordClocks = false,
    timeoutMs = this.timeoutMs,
  ): Promise<DatomicDatabase> {
    const result = await this.request<DatomicDatabase>(
      "POST",
      "/v1/db/create",
      {
        scope,
        layout,
        strictRecordClocks,
      },
      timeoutMs,
    );
    // [DX-B5-L6] Why: compact writes follow the actual immutable scope layout, including a reopened scope.
    // Rejected: trusting only the requested layout (could compact a pre-existing legacy scope).
    this.layouts.set(result.db, result.layout === "lean" ? "lean" : "legacy");
    if (result.orderedRowTexts === true) this.orderedRowTexts.add(result.db);
    else this.orderedRowTexts.delete(result.db);
    if (result.journalCuts === true) this.journalCuts.add(result.db);
    else this.journalCuts.delete(result.db);
    return result;
  }
  supportsJournalCuts(db: string): boolean {
    return this.journalCuts.has(db);
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
      onSent?: (dispatched?: boolean) => void;
      groupAccount?: string;
      writeClass?: DatomicWriteClass;
      clientId?: string;
      sendSequence?: number;
      replaySafe?: boolean;
      assignRecordTime?: boolean;
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
    onSent?: (dispatched?: boolean) => void,
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
    onSent?: (dispatched?: boolean) => void,
  ): Promise<unknown> {
    const encodeSpan = beginSpan("client.transact-encode");
    const encodeStart = performance.now();
    // [DX-B5-L0] Why: two-argument transact wrappers preserve the input, and this callback never belongs on the wire.
    // Rejected: a third-argument-only callback (the NS publication observer drops it).
    const { onSent: inputSent, ...wireInput } = input;
    const { rows: inputRows, newIds: ids, ...requestHeader } = wireInput;
    const ticket = erasureWriteTicket();
    const header = ticket
      ? {
          ...requestHeader,
          erasureSeq: ticket.sequence,
          erasureReplay: ticket.replay,
          erasureSourceDatabase: ticket.sourceDatabase,
        }
      : requestHeader;
    onSent ??= inputSent;
    const compact = this.layouts.get(db) === "lean";
    const rowFast = fastPathEnabled("row"),
      newIds = rowFast ? new Set(input.newIds) : null;
    const isNew = (id: string) => (newIds ? newIds.has(id) : input.newIds.includes(id));
    const retirementColumns = [
      "id",
      "entity_id",
      "entity_type",
      "retracted_at",
      "retracted_position",
      "retract_tx_id",
    ];
    const rows = compact
      ? inputRows
          .filter((row) => row.retracted_at !== null)
          .map((row) => {
            const encoded = encodeRow(row);
            return Object.fromEntries(retirementColumns.map((column) => [column, encoded[column]]));
          })
      : inputRows.map(encodeRow);
    const bounds =
      compact && fastPathEnabled("history-range") ? historyIdentityBounds(input.newIds) : undefined;
    const texts = inputRows
      .filter((r) => isNew(r.id))
      .map(
        (r) =>
          [
            r.id,
            (rowFast ? encodeRowTextFast : encodeRowText)(
              rowFast &&
                r.retracted_at === null &&
                r.retracted_position === null &&
                r.retract_tx_id === null
                ? r
                : { ...r, retracted_at: null, retracted_position: null, retract_tx_id: null },
            ),
          ] as const,
      );
    // [DX-W1] Why: each row text already carries its exact identity, and ordinary replacements have a stable order.
    // Rejected: removing IDs from irregular imports or guessing peer support during a rollout.
    const ordered =
      compact &&
      (this.cacheOptions.saveWire ?? fastPathEnabled("save-wire")) &&
      this.orderedRowTexts.has(db) &&
      ids.length === texts.length &&
      new Set(ids).size === ids.length &&
      rows.length + ids.length === inputRows.length &&
      inputRows.every((r, i) =>
        i < texts.length
          ? r.retracted_at === null && r.id === texts[i]![0] && ids[i] === r.id
          : r.retracted_at !== null && !isNew(r.id),
      );
    // [DX-LOAD1] Why: an append-only lean batch carries the same new ID in the text prefix, map key and two arrays. Rejected: omitting IDs on mixed/retired input or trusting an empty subject at the peer.
    const fresh =
      compact &&
      fastPathEnabled("fresh-texts") &&
      inputRows.length >= 32 &&
      inputRows.length === input.newIds.length &&
      new Set(input.newIds).size === inputRows.length &&
      inputRows.every(
        (r) =>
          isNew(r.id) &&
          r.retracted_at === null &&
          r.retracted_position === null &&
          r.retract_tx_id === null,
      ) &&
      new Set(inputRows.map((r) => r.id)).size === inputRows.length;
    const body = {
      // [DX-INT1] Why: updating the existing legacy keys preserves the frozen request bytes.
      // Rejected: rebuilding the legacy header in compact-field order.
      ...(fresh || ordered ? header : wireInput),
      ...(this.cacheOptions.writeClass ? { writeClass: this.cacheOptions.writeClass } : {}),
      ...(this.cacheOptions.groupAccount ? { groupAccount: this.cacheOptions.groupAccount } : {}),
      ...(bounds ? { historyIdentityBounds: bounds } : {}),
      ...(fresh
        ? { rowMode: "texts", freshTexts: texts.map(([, text]) => text) }
        : ordered
          ? {
              rows,
              rowMode: "texts",
              rowOrder: "assertions-first-v1",
              rowTexts: texts.map(([, text]) => text),
            }
          : {
              rows,
              newIds: ids,
              ...(compact ? { rowMode: "texts", rowOrder: inputRows.map((row) => row.id) } : {}),
              rowTexts: Object.fromEntries(texts),
            }),
    };
    endSpan(encodeSpan);
    this.commitDiagnostics.transactEncodeMicros = (performance.now() - encodeStart) * 1000;
    const sendKey = `${db}/${input.operationId}`;
    if (onSent) this.sentCallbacks.set(sendKey, onSent);
    let response: {
      t?: TaggedValue;
      position?: TaggedValue;
      delta?: number;
      recordedAt?: TaggedValue;
    };
    let dispatched = true;
    try {
      response = await this.request("POST", `/v1/db/${db}/transact`, body, this.timeoutMs);
    } catch (error) {
      dispatched = !(error instanceof DatomicRequestTooLarge);
      throw error;
    } finally {
      this.sentCallbacks.delete(sendKey);
      if (dispatched) onSent?.();
      else onSent?.(false);
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
      if (input.assignRecordTime === true) {
        const assigned = response.recordedAt && validateTagged(response.recordedAt);
        const submitted = [
          ...input.rows.flatMap((row) => [
            ...(isNew(row.id) ? [row.recorded_at] : []),
            ...(row.retracted_at === null ? [] : [row.retracted_at]),
          ]),
          ...input.claims.map((claim) => claim.timestamp),
        ];
        if (
          !assigned ||
          assigned.t !== "double" ||
          !Number.isFinite(assigned.v) ||
          submitted.some((v) => Number(assigned.v) < v)
        )
          throw new TypeError("Commit assigned record clock mismatch");
      }
      this.lastCommit = { db, position, t: String(t.v) };
      // [DX-T1-5] Why: a native ACK's actual content must identify the command in its trace, even across interleaved fibers.
      // Rejected: accepting matching timestamps/ambient trace IDs alone (can silently describe a different request).
      if (encodeSpan)
        encodeSpan.attributes = {
          appliedPosition: position,
          operationHash: createHash("sha256").update(input.operationId).digest("hex"),
          commandHash: createHash("sha256")
            .update(JSON.stringify(input.claims.map((claim) => claim.commandId)))
            .digest("hex"),
        };
    }
    return response;
  }
  async *transactBulkFrames(
    db: string,
    kind: Exclude<DatomicWriteClass, "live">,
    frames:
      | Iterable<Parameters<DatomicClient["transact"]>[1]>
      | AsyncIterable<Parameters<DatomicClient["transact"]>[1]>,
  ) {
    // [DX-W1] Why: release the pipeline between independently atomic producer frames, with a durable receipt for each.
    // Rejected: splitting one application's atomic write or pre-submitting the suffix before the current ACK.
    if (this.cacheOptions.writeClass && this.cacheOptions.writeClass !== kind)
      throw new TypeError("Bulk producer class differs from its configured role");
    for await (const frame of frames) yield await this.transact(db, { ...frame, writeClass: kind });
  }
  // [DX-W1] Why: all retries of one claimed command return its original durable logical receipt, including after an ambiguous transport failure.
  // Rejected: retrying a write after an unknown ACK or returning the last member of its physical transaction.
  async transactCommand(db: string, input: Parameters<DatomicClient["transact"]>[1]) {
    if (input.claims.length !== 1) throw new TypeError("One command claim is required");
    const claim = input.claims[0]!;
    type Result = {
      operationId: string;
      position: TaggedValue;
      t: TaggedValue;
      recordedAt: TaggedValue;
    };
    const receipt = (txId: string, ack: Result) => {
      const p = validateTagged(ack.position),
        t = validateTagged(ack.t),
        clock = validateTagged(ack.recordedAt);
      if (
        typeof ack.operationId !== "string" ||
        !ack.operationId ||
        p.t !== "long" ||
        !Number.isSafeInteger(Number(p.v)) ||
        Number(p.v) < 1 ||
        t.t !== "long" ||
        BigInt(t.v) < 1n ||
        clock.t !== "double" ||
        !Number.isFinite(clock.v)
      )
        throw new TypeError("Invalid command receipt");
      return {
        commandId: claim.commandId,
        txId,
        operationId: ack.operationId,
        position: Number(p.v),
        t: String(t.v),
        recordedAt: Number(clock.v),
      };
    };
    try {
      const ack = (await this.transact(db, input)) as Result;
      if (ack.operationId !== input.operationId) throw new TypeError("Commit operation mismatch");
      return receipt(claim.txId, ack);
    } catch (error) {
      // [DX-WFIX1] Why: older writers can report a stale CAS for an already committed command.
      // Rejected: retrying CAS or polling for a different command (a truly conflicting write stays refused).
      const cas = error instanceof DatomicHttpError && error.code === "CasConflict";
      if (
        !cas &&
        !(
          error instanceof DatomicTransportError ||
          (error instanceof DatomicHttpError &&
            ["CommandConflict", "OperationDuplicate", "OutcomeUnknown"].includes(error.code))
        )
      )
        throw error;
      const deadline = performance.now() + this.timeoutMs;
      do {
        const remaining = Math.max(1, Math.ceil(deadline - performance.now()));
        try {
          const found = await this.request<{
            txId: string | null;
            receipt?: Result & { status: string };
            commandId?: string;
          }>(
            "POST",
            `/v1/db/${db}/claim`,
            { commandId: claim.commandId, receipt: true },
            remaining,
          );
          if (found.txId) {
            if (found.commandId !== claim.commandId || found.receipt?.status !== "committed")
              throw new TypeError("Stored command receipt mismatch");
            return receipt(found.txId, found.receipt);
          }
        } catch (readError) {
          if (!(readError instanceof DatomicTransportError)) throw readError;
        }
        if (cas) break;
        const left = deadline - performance.now();
        if (left > 0) await new Promise((resolve) => setTimeout(resolve, Math.min(25, left)));
      } while (performance.now() < deadline);
      throw error;
    }
  }
  operation(
    db: string,
    operationId: string,
  ): Promise<{
    status: "committed" | "absent";
    operationId?: string;
    position?: TaggedValue;
    t?: TaggedValue;
    recordedAt?: TaggedValue;
  }> {
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
