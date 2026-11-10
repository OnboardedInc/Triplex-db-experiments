import { randomUUID } from "node:crypto";
import { decodeEntity, type CachedEntity, type ReachWire } from "./reach.js";
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
  readonly started: number;
  readonly finished: number;
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
export class DatomicClient {
  // [DX-B2-N3] Why: opt-in transport observations measure real calls without a second HTTP request.
  // Rejected: inferring gateway CPU or transact time from client wall latency.
  onRequest?: (sample: DatomicRequestSample) => void;
  readonly agent: http.Agent;
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
  readonly reachCache = new Map<string, Map<string, CachedEntity>>();
  forceFullReach = false;
  readonly reachDiagnostics = {
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
  readonly rowObservers = new Set<(db: string, row: TripleRow) => void>();
  close(): void {
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
    const started = performance.now();
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
    const bytes = body === undefined ? undefined : Buffer.from(stringifyExact(body));
    const serializeMicros = (performance.now() - serializeStart) * 1000;
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
                    typeof data["maximum"] === "number" ? data["maximum"] : undefined,
                    typeof data["route"] === "string" ? data["route"] : undefined,
                  ),
                );
              else {
                this.onRequest?.({
                  path,
                  started,
                  finished: performance.now(),
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
                });
                resolve(data as T);
              }
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
    if ([...this.reachCache.values()].reduce((n, cache) => n + cache.size, 0) > 500000) {
      this.reachSession = randomUUID();
      this.reachCache.clear();
    }
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
        let cache = this.reachCache.get(db);
        if (!cache) {
          cache = new Map();
          this.reachCache.set(db, cache);
        }
        if (response.reset) {
          cache.clear();
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
            decoded = decodeEntity(id, rev, entity[2], (row) => {
              for (const observe of this.rowObservers) observe(db, row);
            });
            cache.set(id, decoded);
          } else decoded = cache.get(id);
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
  health(): Promise<DatomicHealth> {
    return this.request("GET", "/health");
  }
  async create(scope: string, layout: "lean" | "legacy" = "legacy"): Promise<DatomicDatabase> {
    const result = await this.request<DatomicDatabase>("POST", "/v1/db/create", { scope, layout });
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
    const response = await this.request<{ rows: WireRow[] }>("POST", `/v1/db/${db}/read`, input);
    const rows = response.rows.map(decodeRow);
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
