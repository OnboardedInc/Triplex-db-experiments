import {
  erasureWriteTicket,
  type ErasureFrontier,
  type ErasureReceipt,
  type ErasureSelector,
} from "./erasure.js";
import { ByteCache } from "./ByteCache.js";
import { PredecessorCache, RowCache, estimateRowBytes } from "./RowCache.js";
import { createHash, randomUUID } from "node:crypto";
import { AsyncLocalStorage } from "node:async_hooks";
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
import { protectWrite } from "./protectedWrite.js";
import { checkAtLeastRequest, type ReadAtLeastRequest } from "./readAtLeast.js";
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
    readonly retryAfterMs?: number,
    // [DX-XQ4] On a refusal of `find`: "sweep" when the exact sweep (XQ6, TX2_SWEEP=1) answers the same question
    // unchanged, "none" when it does not. Absent on every other route.
    readonly fallback?: "sweep" | "none",
  ) {
    super(message);
  }
}
// [DX-W3] Why: a gateway started with TX2_READ_WAIT_LIMIT answers a read beyond its permit queue with 503 "ReadBusy"
// at once instead of holding a web thread. Reads are idempotent, so the client waits the suggested delay and asks
// again within the same deadline. Rejected: retrying writes (a write's outcome must stay single) and retrying any 503.
const busyRetryRoute = /\/(?:reach|reach-many|read|q)$/;
const sleepMs = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
class DatomicRequestTooLarge extends DatomicHttpError {
  constructor() {
    super(400, "InvalidValue", "Request too large");
  }
}
class DatomicProtectedWriteEncodingError extends DatomicHttpError {
  constructor() {
    super(400, "ProtectedWriteUnavailable", "The configured protected save transport could not encode this request");
  }
}
export class DatomicTransportError extends Error {
  readonly _tag = "DatomicTransportError";
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
  }
}
// [DX-XQ4] Questions across subjects (commit-time index, gateway option TX2_CROSS_INDEX=1). The shapes mirror
// lab/experiments/EXP-DX1/xq4/COMMIT-INDEX.md; answers are returned unchanged from the gateway.
export type CrossIndexFamily = "string" | "integer" | "number" | "datetime" | "boolean" | "ref";
export interface CrossIndexDeclaration {
  readonly version: 1;
  readonly attributes: readonly { readonly attribute: string; readonly code: string; readonly family: CrossIndexFamily }[];
  readonly types?: readonly (
    | { readonly entityType: string; readonly list: "entries" }
    | { readonly entityType: string; readonly list: "idPattern"; readonly idPattern: string }
  )[];
}
export interface CrossIndexEpoch { readonly position: number; readonly t: number }
export interface CrossIndexDeclarationState {
  readonly database: string;
  readonly seq: number;
  readonly declaration: CrossIndexDeclaration | null;
  readonly epochs: Readonly<Record<string, CrossIndexEpoch>>;
  readonly changed?: boolean;
}
export interface CrossIndexBackfill {
  readonly database: string;
  readonly sealed: boolean;
  readonly dryRun: boolean;
  readonly head: number;
  readonly entities: number;
  readonly added: number;
  readonly retracted: number;
  readonly typeEntries: number;
  readonly batches: number;
  readonly epochs?: Readonly<Record<string, CrossIndexEpoch>>;
}
export interface CrossIndexValue { readonly type: CrossIndexFamily; readonly value: string | number | boolean }
export type CrossIndexCondition =
  | { readonly attribute: string; readonly op: "eq"; readonly value: CrossIndexValue }
  | { readonly attribute: string; readonly op: "in"; readonly values: readonly CrossIndexValue[] }
  | {
      readonly attribute: string;
      readonly op: "range";
      readonly from?: CrossIndexValue;
      readonly fromExclusive?: CrossIndexValue;
      readonly to?: CrossIndexValue;
      readonly toExclusive?: CrossIndexValue;
    }
  | { readonly attribute: string; readonly op: "prefix"; readonly value: string }
  | { readonly attribute: string; readonly op: "exists" | "missing" };
export interface CrossIndexFindRequest {
  readonly account: string;
  readonly basis?: { readonly recordedPosition?: number; readonly recordedAt?: number; readonly validAt?: number };
  readonly atLeastPosition?: number;
  readonly basisWaitMs?: number;
  readonly from?: { readonly type: string } | { readonly prefix: string; readonly shape?: string };
  readonly where?: readonly CrossIndexCondition[];
  readonly project?: readonly string[];
  readonly result?: "ids" | "count" | "countByValue" | "countDistinct";
  readonly of?: string;
  readonly order?: { readonly by: string; readonly direction?: "asc" | "desc" };
  readonly limit?: number;
  readonly cursor?: string | null;
  readonly bounds?: { readonly entries?: number; readonly ms?: number; readonly segments?: number };
}
export interface CrossIndexAnswer {
  readonly database: string;
  readonly account: string;
  readonly position: number;
  readonly t: string;
  readonly validAt: number;
  readonly head: number;
  readonly indexEpoch: number;
  readonly trailingBy: 0;
  readonly result: "ids" | "count" | "countByValue" | "countDistinct";
  readonly order: { readonly by: string; readonly direction: "asc" | "desc" };
  readonly ids?: readonly string[];
  readonly projected?: Readonly<Record<string, Readonly<Record<string, readonly string[]>>>>;
  readonly count?: number;
  readonly countExact?: boolean;
  readonly counts?: readonly { readonly value: { readonly type: string; readonly value?: unknown }; readonly count: number }[];
  readonly matched?: number;
  readonly examined: number;
  readonly segmentsLoaded: number;
  readonly stopped: "end" | "limit" | "entries" | "time" | "segments";
  readonly next: string | null;
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
/** `POST /v2/db/{db}/ids` (DX-XQ3, design 2026-11-24 section 7.5). */
export interface DatomicIdListRequest {
  readonly account: string;
  readonly prefix?: string;
  readonly shape?: string;
  readonly basis?: {
    readonly recordedPosition?: number;
    readonly recordedAt?: number;
    readonly validAt?: number;
  };
  readonly atLeastPosition?: number;
  readonly basisWaitMs?: number;
  readonly result?: "ids" | "count";
  readonly limit?: number;
  readonly order?: "asc" | "desc";
  readonly cursor?: string;
  /** Exclusive keyset start: a full entity ID inside the account's prefix. */
  readonly after?: string;
  readonly bounds?: { readonly entries?: number; readonly ms?: number; readonly segments?: number };
}
export interface DatomicIdListPage {
  readonly database: string;
  readonly account: string;
  readonly position: number;
  readonly t: string;
  readonly head: number;
  readonly validAt: number | null;
  readonly trailingBy: 0;
  readonly result: "ids" | "count";
  readonly ids?: readonly string[];
  readonly count?: number;
  readonly countExact?: boolean;
  readonly examined: number;
  readonly segmentsLoaded: number;
  readonly ioReads?: Record<string, unknown>;
  readonly scanMicros: number;
  readonly stopped: "end" | "limit" | "entries" | "time" | "segments";
  readonly next: string | null;
}
export interface DatomicBasis {
  t: TaggedValue;
  position: TaggedValue;
  recordedAt: null;
  schemaHash: string;
  /** [DX-RD4] Present only when the call asked for at least a position: the echo and the gateway's wait. */
  atLeast?: number;
  atLeastWaitMicros?: number;
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
type ReadWireSample = {
  id: string;
  route: string;
  status: number;
  issue: number;
  encoded: number;
  socket: number;
  sent: number;
  headers: number;
  bodyEnd: number;
  parsed: number;
  reusedSocket: boolean;
  responseBytes: number;
  echo: string | string[] | undefined;
};

// [DX-RD4] The body fields of an at-least read, and the check of its answer.
export const atLeastBody = (atLeast: ReadAtLeastRequest) => ({
  atLeastPosition: checkAtLeastRequest(atLeast).position,
  ...(atLeast.waitMs === undefined ? {} : { basisWaitMs: atLeast.waitMs }),
});
export const checkAtLeastAnswer = (atLeast: ReadAtLeastRequest, echo: unknown, position: number) => {
  if (echo !== atLeast.position)
    throw new TypeError("The gateway did not confirm the at-least read (it predates the parameter)");
  if (!(position >= atLeast.position))
    throw new TypeError(`The gateway answered at position ${position}, before the at-least position ${atLeast.position}`);
};

export class DatomicClient {
  // [DX-B2-N3] Why: opt-in transport observations measure real calls without a second HTTP request.
  // Rejected: inferring gateway CPU or transact time from client wall latency.
  onRequest?: (sample: DatomicRequestSample) => void;
  onCommit?: (sample: DatomicCommitSample) => void;
  readonly agent: http.Agent;
  // [DX-RD1] Why: each explicitly sampled logical read owns its exchanges across awaits and any repair.
  // Rejected: assigning concurrent response callbacks to the last caller or allocating samples for the whole ladder.
  private readProfile?: AsyncLocalStorage<(sample: ReadWireSample) => void>;
  withReadProfile<A>(observe: (sample: ReadWireSample) => void, read: () => A): A {
    return (this.readProfile ??= new AsyncLocalStorage()).run(observe, read);
  }
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
  private readonly reachReplySequence = new WeakMap<object, number | null>();
  // [DX-RD4] The gateway's echo of an at-least read whose body is not a map (reach), keyed by the parsed reply.
  private readonly atLeastEcho = new WeakMap<object, number>();
  private readonly reachSequence = new Map<string, number>();
  private readonly reachStamps = new WeakMap<
    CachedEntity,
    { position: number; t: string; sequence: number }
  >();
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
      readonly receiptPredecessorAttributes?: readonly string[];
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
      cacheOptions.receiptPredecessorAttributes,
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
    this.reachSequence.clear();
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
    const once = (ms: number) => tracedRequest(
      path.endsWith("/transact") ? "commit" : "read",
      `http ${method} ${route}`,
      {},
      () => this.requestTraced<T>(method, path, body, ms, onSent),
    );
    if (!busyRetryRoute.test(path)) return once(timeoutMs);
    const deadline = performance.now() + timeoutMs;
    for (let attempt = 0; ; attempt++) {
      try {
        return await once(attempt === 0 ? timeoutMs : Math.max(1, deadline - performance.now()));
      } catch (error) {
        if (!(error instanceof DatomicHttpError && error.status === 503 && error.code === "ReadBusy")) throw error;
        const wait = Math.max(1, Math.min(1000, error.retryAfterMs ?? 25));
        if (deadline - performance.now() <= wait) throw error;
        this.readBusyRetries++;
        await sleepMs(wait);
      }
    }
  }
  /** [DX-W3] Reads the gateway answered "ReadBusy" that this client retried (0 unless the bound is on). */
  readBusyRetries = 0;
  private async requestTraced<T>(
    method: "GET" | "POST",
    path: string,
    body: unknown,
    timeoutMs: number,
    onSent?: (published?: boolean) => void,
  ): Promise<T> {
    const started = performance.now();
    const readProfile = this.readProfile?.getStore();
    const profileId = readProfile ? randomUUID().replaceAll("-", "") : undefined;
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
    let bytes = largeRequestBody(body)
      ? await traceAsync("client.encode", () => encodeLargeRequest(body))
      : traceSync("client.encode", () =>
          body === undefined
            ? undefined
            : Buffer.from((fastPathEnabled("body") ? stringifyNativeExact : stringifyExact)(body)),
        );
    const writeKey = path.endsWith("/transact") ? process.env["TRIPLEX_DATOMIC_WRITE_PUBLIC_KEY"] : undefined;
    if (writeKey) {
      const attemptId = (body as { attemptId?: string } | undefined)?.attemptId;
      if (typeof attemptId !== "string" || operationId === undefined || bytes === undefined)
        throw new DatomicProtectedWriteEncodingError();
      const clear = bytes;
      try {
        bytes = traceSync("client.protect-write", () =>
          protectWrite(writeKey, path.split("/")[3]!, operationId, attemptId, clear),
        );
      } catch {
        throw new DatomicProtectedWriteEncodingError();
      }
    }
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
        headers = NaN,
        socket = NaN;
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
            ...(profileId ? { "x-triplex-read-profile": profileId } : {}),
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
              if (readProfile && profileId) {
                const origin = performance.timeOrigin;
                readProfile({ id: profileId, route: path.slice(path.lastIndexOf("/") + 1),
                  status, issue: origin + started, encoded: origin + socketStarted, socket: origin + socket,
                  sent: origin + written, headers: origin + headers, bodyEnd: origin + bodyEnd,
                  parsed: origin + performance.now(), reusedSocket: req.reusedSocket, responseBytes: size,
                  echo: res.headers["x-triplex-read-profile"] });
              }
              const atLeastHeader = res.headers["x-tx2-at-least"];
              if (typeof atLeastHeader === "string" && data && typeof data === "object")
                this.atLeastEcho.set(data, Number(atLeastHeader));
              const erasureHead = res.headers["x-triplex-erasure-seq"];
              if (
                erasureHead !== undefined &&
                (path.endsWith("/reach") || path.endsWith("/reach-many"))
              ) {
                const sequence = Number(erasureHead);
                this.reachReplySequence.set(
                  data,
                  Number.isSafeInteger(sequence) &&
                    sequence >= 0 &&
                    String(sequence) === erasureHead
                    ? sequence
                    : null,
                );
              }
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
                    typeof data["retryAfterMs"] === "number" ? data["retryAfterMs"] : undefined,
                    data["fallback"] === "sweep" || data["fallback"] === "none" ? data["fallback"] : undefined,
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
      if (profileId) req.once("socket", () => { socket = performance.now(); });
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
  private acceptReachSequence(db: string, sequence: number | null | undefined) {
    const previous = this.reachSequence.get(db);
    if (
      sequence === null ||
      (previous !== undefined && (sequence === undefined || sequence < previous))
    )
      return false;
    if (sequence !== undefined && sequence !== previous) this.reachSequence.set(db, sequence);
    return true;
  }
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
    atLeast?: ReadAtLeastRequest,
  ) {
    // [DX-RD4] Why: an unpinned subject pull answers at the gateway's head; a reader holding a receipt asks for at least it.
    if (atLeast && (basis.recordedPosition !== undefined || basis.recordedAt !== undefined))
      throw new TypeError("An at-least pull cannot also be pinned");
    return tracedRequest("read", "client.reach", {}, () =>
      this.reachEntitiesTraced(db, roots, basis, rowPage, gzipRows, atLeast),
    );
  }
  private async reachEntitiesTraced(
    db: string,
    roots: readonly string[],
    basis: ResolvedTemporalBasis,
    rowPage: boolean,
    gzipRows: boolean,
    atLeast?: ReadAtLeastRequest,
  ) {
    const older = [...this.reachInflight];
    let ingested!: () => void;
    const ready = new Promise<void>((resolve) => {
      ingested = resolve;
    });
    this.reachInflight.add(ready);
    try {
      return await this.fetchReachEntities(db, roots, basis, rowPage, gzipRows, older, ingested, atLeast);
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
    atLeast?: ReadAtLeastRequest,
  ) {
    const session = this.reachSessionAt(db, basis);
    const page = async (route: string, input: Record<string, unknown>) => {
      const wire = await this.request<ReachPage>("POST", route, {
        ...input,
        erasureRefs: true,
        ...(gzipRows ? { gzipRows: true } : {}),
      });
      return {
        response: gzipRows ? decodeReachPage(wire, this.maxResponseBytes) : (wire as ReachWire),
        sequence: this.reachReplySequence.get(wire),
        echo: this.atLeastEcho.get(wire),
      };
    };
    let requests = 0;
    for (let attempt = 0; attempt < 2; attempt++) {
      requests++;
      const { response, sequence, echo } = await page(
        `/v2/db/${db}/${roots.length === 1 ? "reach" : "reach-many"}`,
        {
          ...(roots.length === 1 ? { root: roots[0] } : { roots }),
          basis,
          ...(rowPage ? { rowPage: true } : {}),
          session,
          ...(this.forceFullReach || attempt === 1 ? { full: true } : {}),
          ...(atLeast ? atLeastBody(atLeast) : {}),
        },
      );
      // [DX-ERASE1] Why: a delayed response cannot carry the cache back across an observed frontier.
      // Rejected: waiting until after decoding or reporting rows to check the response sequence.
      if (sequence === null || !this.acceptReachSequence(db, sequence)) {
        if (attempt === 0) this.reachDiagnostics.fullRetries++;
        continue;
      }
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
        if (atLeast) checkAtLeastAnswer(atLeast, echo, response.position);
        const prefix = `${db}\0`;
        // [DX-INT1] Why: historical sessions keep their revision keys and guarded references still verify the native cut.
        // Rejected: letting a revision match override the erasure sequence.
        const key = (id: string, rev: number) =>
          this.cacheOptions.historicalRevisionReuse
            ? `${prefix}${id.length}:${id}/${rev}`
            : this.reachKey(db, prefix, id);
        const stamp =
          sequence === undefined
            ? undefined
            : { position: response.position, t: response.t, sequence };
        const cache = {
          get: (id: string, rev: number) => {
            const hit = this.reachCache.get(key(id, rev));
            if (hit?.rev !== rev) return;
            if (!stamp) return hit;
            const old = this.reachStamps.get(hit);
            if (
              old?.sequence === stamp.sequence &&
              old.position === stamp.position &&
              old.t === stamp.t
            )
              return hit;
            return undefined;
          },
          set: (id: string, entity: CachedEntity) => {
            if (stamp) this.reachStamps.set(entity, stamp);
            this.reachCache.set(key(id, entity.rev), entity);
          },
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
              if (decoded) {
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
              if (found) {
                entities.set(id, found);
                return false;
              }
              return true;
            });
          if (older.length) {
            this.reachDiagnostics.waits++;
            await Promise.allSettled(older);
            if (this.reachSequence.get(db) !== sequence) {
              if (attempt === 0) this.reachDiagnostics.fullRetries++;
              continue;
            }
            if (!missing().length) this.reachDiagnostics.waitHits++;
          }
          const need = missing();
          if (need.length && attempt === 0) {
            this.reachDiagnostics.needRequests++;
            this.reachDiagnostics.needEntities += need.length;
            try {
              requests++;
              const { response: repair, sequence: repairedSequence } = await page(
                `/v2/db/${db}/reach-many`,
                {
                  roots,
                  need: need.map(([id]) => id),
                  session,
                  basis: { ...basis, recordedPosition: response.position },
                  ...(rowPage ? { rowPage: true } : {}),
                },
              );
              if (
                !this.acceptReachSequence(db, repairedSequence) ||
                repairedSequence !== sequence ||
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
  // [DX-XQ4] Why: the declaration, its offline backfill and the bounded find route of the commit-time index.
  // Rejected: an adapter-level scan fallback (a question too large for the bounds pages with a cursor instead).
  declareIndexes(db: string, declaration: CrossIndexDeclaration) {
    return this.request<CrossIndexDeclarationState>("POST", `/v2/db/${db}/index-declaration`, declaration);
  }
  indexDeclaration(db: string) {
    return this.request<CrossIndexDeclarationState>("GET", `/v2/db/${db}/index-declaration`);
  }
  backfillIndex(db: string, options: { batchDatoms?: number; dryRun?: boolean; expectHead?: number } = {}) {
    return this.request<CrossIndexBackfill>("POST", `/v2/db/${db}/index-backfill`, options, 600_000);
  }
  find(db: string, request: CrossIndexFindRequest) {
    return this.request<CrossIndexAnswer>("POST", `/v2/db/${db}/find`, request);
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
    atLeast?: ReadAtLeastRequest,
  ): Promise<{ handle: string; position: number }> {
    // [DX-RD4] Why: an unpinned snapshot is a head the reader resolves; at least its receipt's position when it holds one.
    // Rejected: sending it with a pinned basis (the gateway refuses that combination).
    if (atLeast && (basis?.recordedPosition !== undefined || basis?.recordedAt !== undefined))
      throw new TypeError("An at-least snapshot cannot also be pinned");
    const response = await this.request<{ handle: string; position: TaggedValue; atLeast?: number }>(
      "POST",
      `/v1/db/${db}/snapshot`,
      {
        ...(basis === undefined ? {} : { basis }),
        ...(atLeast === undefined ? {} : atLeastBody(atLeast)),
      },
    );
    const position = Number(validateTagged(response.position).v);
    if (!Number.isSafeInteger(position) || position < 0) throw new RangeError("Unsafe position");
    if (atLeast) checkAtLeastAnswer(atLeast, response.atLeast, position);
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
    const response = await this.request<{ rows: WireRow[]; atLeast?: number }>("POST", `/v1/db/${db}/read`, input);
    // [DX-RD4] A row read that asked for at least a position must carry the gateway's confirmation.
    if (input["atLeastPosition"] !== undefined && response.atLeast !== input["atLeastPosition"])
      throw new TypeError("The gateway did not confirm the at-least read (it predates the parameter)");
    const rows = traceSync("client.rows-decode", () => response.rows.map(decodeRow));
    if (!input["staged"])
      for (const row of rows) for (const observe of this.rowObservers) observe(db, row);
    return rows;
  }
  /**
   * [DX-JRN1] One page of one field's history of one entity, newest first by (recorded position, row ID): the gateway
   * decodes only that attribute's rows and returns `limit` of them below the `before` cursor, with `next` for the
   * following page (null on the last). Lean layout only. The rows are the same as an unbounded history read of the
   * entity filtered to the attribute and sorted the same way.
   */
  async historyPage(
    db: string,
    input: {
      readonly entityId: string;
      readonly attribute: string;
      readonly limit: number;
      readonly before?: { readonly position: number; readonly id: string } | null;
      readonly basis?: Record<string, unknown>;
    },
  ): Promise<{ rows: readonly TripleRow[]; next: { position: number; id: string } | null }> {
    return tracedRequest("read", "client.history-page", {}, async () => {
      const response = await this.request<{
        rows: WireRow[];
        historyNext?: { position: number; id: string } | null;
      }>("POST", `/v1/db/${db}/read`, {
        pattern: { entityId: input.entityId },
        history: true,
        historyPage: {
          attribute: input.attribute,
          limit: input.limit,
          ...(input.before ? { before: input.before } : {}),
        },
        ...(input.basis ? { basis: input.basis } : {}),
      });
      if (!("historyNext" in response)) throw new TypeError("History page answer without a cursor");
      const rows = traceSync("client.rows-decode", () => response.rows.map(decodeRow));
      for (const row of rows) for (const observe of this.rowObservers) observe(db, row);
      return { rows, next: response.historyNext ?? null };
    });
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
      ...(fresh || ordered ? requestHeader : wireInput),
      // [DX-ERASE1] Why: the source removal sequence fences every wire form.
      // Rejected: adding the ticket only to compact writes (legacy and mixed frames can also replay protected values).
      ...(ticket
        ? {
            erasureSeq: ticket.sequence,
            erasureReplay: ticket.replay,
            ...(ticket.sourceDatabase === undefined
              ? {}
              : {
                  erasureSourceDatabase: ticket.sourceDatabase,
                }),
          }
        : {}),
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
      dispatched = !(error instanceof DatomicRequestTooLarge || error instanceof DatomicProtectedWriteEncodingError);
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
          // [DX-HASYNC1] Why: an interrupted claim lookup keeps the decision unknown. Rejected: returning a definite conflict without reading the claim.
          if (cas) throw readError;
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
  // [DX-XQ3] Why: questions across subjects, step 0: the IDs of one kind in one account, from the gateway's ID list
  // route (TX2_ID_LISTS=1 on the gateway), one bounded page per call; the answer is returned unchanged.
  // Rejected: following the cursor here (the caller decides how many pages its own bound allows).
  async listIds(db: string, request: DatomicIdListRequest): Promise<DatomicIdListPage> {
    if (!/^(?:s-[a-f0-9]{32}|s2-[A-Za-z0-9_-]+)$/.test(db))
      throw new TypeError("Invalid Datomic database name");
    const page = await this.request<DatomicIdListPage>("POST", `/v2/db/${db}/ids`, request);
    if (
      typeof page !== "object" ||
      page === null ||
      !Number.isSafeInteger(page.position) ||
      page.trailingBy !== 0 ||
      page.account !== request.account ||
      !["end", "limit", "entries", "time", "segments"].includes(page.stopped) ||
      (page.stopped === "end") !== (page.next === null || page.next === undefined)
    )
      throw new DatomicTransportError("Invalid ID list answer");
    return page;
  }
  // [DX-RD4] Why: `atLeast` makes the head answered at least a receipt's position; the gateway waits on its peer.
  // Rejected: trusting a gateway that ignores the parameter (an old gateway would answer early without saying so).
  async basis(db: string, atLeast?: ReadAtLeastRequest): Promise<DatomicBasis> {
    if (!/^(?:s-[a-f0-9]{32}|s2-[A-Za-z0-9_-]+)$/.test(db))
      throw new TypeError("Invalid Datomic database name");
    const query = atLeast
      ? `?atLeast=${checkAtLeastRequest(atLeast).position}${atLeast.waitMs === undefined ? "" : `&waitMs=${atLeast.waitMs}`}`
      : "";
    const result = await this.request<DatomicBasis>("GET", `/v1/db/${db}/basis${query}`);
    const basis = { ...result, t: validateTagged(result.t), position: validateTagged(result.position) };
    if (atLeast) checkAtLeastAnswer(atLeast, result.atLeast, Number(basis.position.v));
    return basis;
  }
}
