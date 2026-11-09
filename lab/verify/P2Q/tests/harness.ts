// [EXP-P2Q] Why: outage fixtures carry real transport codes. Rejected: text-only errors (not transport evidence).
// V-P2Q verifier harness (independent of the branch's tests).
//
// 1. An independent reader of the broker's segment file and an oracle that replays the log to a basis B
//    (the brief's oracle: "the broker's own log replayed to B"). It decodes frames and commit-group payloads
//    itself; it shares no code with the broker beyond the on-disk format.
// 2. A model replica (`ModelReplica`) that executes the broker's actual guarded DELETE/INSERT text against an
//    in-memory quad set (so buildPublication's net-delta logic is exercised, not assumed), answers the
//    repository-pull SELECT the adapter sends, and can be held, delayed, taken down or rolled back to an
//    older state (a restart without persisted updates). Every query takes its snapshot when it arrives.
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Effect, Layer, ManagedRuntime } from "effect";
import { EntityId, Triples, string } from "@triplex-build/triplex";
import {
  Capabilities,
  DatabaseScope,
  QueryExecutor,
  Runtime,
  StorageAdapter,
  type TripleRow,
} from "@triplex-build/triplex/runtime";
import type { QleverClient } from "../../../../packages/qlever/src/QleverClient.js";
import { makeQleverQueryExecutor } from "../../../../packages/qlever/src/QleverQueryExecutor.js";
import { makeQleverStorageAdapter } from "../../../../packages/qlever/src/QleverStorageAdapter.js";
import {
  HostBroker,
  type HostBrokerOptions,
} from "../../../../packages/qlever/src/broker/broker.js";
import type {
  BrokerReadEvent,
  QleverBrokerStorageAdapterService,
} from "../../../../packages/qlever/src/broker/BrokerStorageAdapter.js";
import { decodeRow } from "../../../../packages/qlever/src/rdf.js";
import { crc32c as crc32cRef } from "../../../../packages/qlever/src/broker/crc32c.js";

export const REPO = path.resolve(import.meta.dirname, "../../../..");
export const RUNS = process.env["V_P2Q_RUNS"] ?? path.join(REPO, "runs/broker/V-P2Q");
// Evidence for the head under test (the d7c6086 round's evidence is committed in lab/verify/P2Q/evidence/).
export const OUT =
  process.env["V_P2Q_OUT"] ??
  path.join(
    "/Users/sam/Claude/Projects/triplex-db-2/V-P2Q",
    process.env["V_P2Q_HEAD"] ?? "f711193",
  );
fs.mkdirSync(OUT, { recursive: true });
export const freshDir = (tag: string) => {
  const dir = path.join(RUNS, `${tag}-${randomUUID()}`);
  fs.mkdirSync(path.dirname(dir), { recursive: true });
  return dir;
};
export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
export const ORD = 1024;
export const lsnOfP = (p: number) => Math.floor(p / ORD);

// ------------------------------------------------------------------ independent log reader + oracle

// Column order of the commit-group wire format (copied, not imported, so a reordering in the branch shows up).
const COLUMNS = [
  "id",
  "entity_id",
  "attribute",
  "value_type",
  "value_string",
  "value_number",
  "value_boolean",
  "value_datetime",
  "value_json",
  "recorded_at",
  "recorded_position",
  "valid_from",
  "valid_to",
  "created_by",
  "retracted_at",
  "retracted_position",
  "retract_tx_id",
  "entity_type",
  "schema_version",
  "tx_id",
] as const;
export interface RawFrame {
  readonly lsn: number;
  readonly epoch: number;
  readonly kind: number;
  readonly offset: number;
  readonly payload: Buffer;
}
export const readSegment = (segment: string): RawFrame[] => {
  // [EXP-SQL01] Why: preserve the independent wire-replay oracle while changing only its storage reader.
  // Rejected: using H1 or recent_rows for expected results (would mirror the implementation under test).
  const file = segment.endsWith(".db") ? segment : path.join(path.dirname(segment), "broker.db");
  if (fs.existsSync(file)) {
    const D = createRequire(new URL("../../../../packages/qlever/package.json", import.meta.url))(
      "better-sqlite3",
    );
    const db = new D(file, { readonly: true });
    try {
      return db.prepare("SELECT lsn,epoch,kind,offset,payload FROM frames ORDER BY lsn").all();
    } finally {
      db.close();
    }
  }
  const buf = fs.readFileSync(segment);
  const frames: RawFrame[] = [];
  let off = 32;
  while (off + 32 <= buf.length) {
    if (buf.readUInt32LE(off) !== 0x464c5854) break;
    const len = buf.readUInt32LE(off + 4);
    if (off + 32 + len + 4 > buf.length) break;
    frames.push({
      lsn: Number(buf.readBigUInt64LE(off + 8)),
      epoch: buf.readUInt32LE(off + 16),
      kind: buf.readUInt16LE(off + 24),
      offset: off,
      payload: Buffer.from(buf.subarray(off + 32, off + 32 + len)),
    });
    off += 32 + len + 4;
  }
  return frames;
};
export interface OracleMember {
  readonly lsn: number;
  readonly operationId: string;
  readonly positions: number[];
  readonly commandIds: string[];
  readonly txIds: string[];
  readonly rows: TripleRow[];
  readonly subjects: string[];
}
export const decodeMembers = (frame: RawFrame): OracleMember[] => {
  if (frame.kind !== 1) return [];
  const wire = JSON.parse(frame.payload.toString("utf8"));
  return wire.m.map((m: any) => ({
    lsn: frame.lsn,
    operationId: m.o,
    positions: m.p,
    commandIds: m.c.map((c: any) => c[0]),
    txIds: m.c.map((c: any) => c[1]),
    rows: m.r.map(
      (cells: unknown[]) =>
        Object.fromEntries(COLUMNS.map((c, i) => [c, cells[i] ?? null])) as TripleRow,
    ),
    subjects: m.s,
  }));
};
export const logMembers = (segment: string) => readSegment(segment).flatMap(decodeMembers);

/** Visibility at basis B with valid time `validAt`, written from the definitions, not from the adapter. */
export const oracleVisible = (row: TripleRow, b: number, validAt: number) =>
  row.recorded_position <= b &&
  !(row.retracted_position !== null && row.retracted_position <= b) &&
  row.valid_from <= validAt &&
  (row.valid_to === null || row.valid_to > validAt);

/** The answer at B from the broker's own log: frames with LSN <= lsn(B), latest version per row id. */
export const oracleAt = (
  segment: string,
  b: number,
  validAt: number,
  keep: (row: TripleRow) => boolean,
  history = false,
): TripleRow[] => {
  const latest = new Map<string, TripleRow>();
  for (const frame of readSegment(segment))
    if (frame.kind === 1 && frame.lsn <= lsnOfP(b))
      for (const m of decodeMembers(frame)) for (const row of m.rows) latest.set(row.id, row);
  return [...latest.values()].filter(
    (row) => keep(row) && (history ? row.recorded_position <= b : oracleVisible(row, b, validAt)),
  );
};
/** Comparable form: immutable fields only (a retraction above B may legitimately show on the latest version, as on A0). */
export const key = (rows: readonly TripleRow[]) =>
  rows
    .map((r) => `${r.id}|${r.entity_id}|${r.attribute}|${r.value_string}|${r.recorded_position}`)
    .sort()
    .join("\n");

// ------------------------------------------------------------------ model replica

type Quads = Map<string, Map<string, Set<string>>>;
const META = "<urn:triplex:meta>";
const BP = "<urn:triplex:field:broker_position>";
const BE = "<urn:triplex:field:broker_epoch>";
const BI = "<urn:triplex:field:broker_incarnation>"; // author adaptation: Q72b marker field
const ROWF = "<urn:triplex:field:_row>";
const LIT = /"(?:[^"\\]|\\.)*"/g;
const parseQuads = (block: string): [string, string, string][] =>
  block
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const m = /^(<[^>]+>) (<[^>]+>) (.+) \.$/.exec(line);
      if (!m) throw new Error(`ModelReplica: cannot parse quad ${line.slice(0, 120)}`);
      return [m[1]!, m[2]!, m[3]!];
    });

export class ModelReplica implements QleverClient {
  quads: Quads = new Map();
  down = false;
  queryDelay: () => number = () => 0;
  updateDelay: () => number = () => 0;
  private gate: Promise<void> | undefined;
  private openGate: (() => void) | undefined;
  readonly unsupported: { sparql: string; markerAtArrival: number }[] = [];
  updates = 0;
  appliedUpdates = 0;
  multiRow = 0;
  constructor(readonly graph: string) {}

  hold() {
    if (!this.gate) this.gate = new Promise((resolve) => (this.openGate = resolve));
  }
  release() {
    this.openGate?.();
    this.gate = undefined;
    this.openGate = undefined;
  }
  /** The current state (immutable by construction: updates copy touched subjects). */
  snapshot(): Quads {
    return this.quads;
  }
  /** Roll the replica back to an older state, as a restart without persisted updates does. */
  restore(state: Quads) {
    this.quads = state;
  }
  private objects(q: Quads, s: string, p: string) {
    return q.get(s)?.get(p) ?? new Set<string>();
  }
  marker(q: Quads = this.quads) {
    const pos = [...this.objects(q, META, BP)][0];
    const ep = [...this.objects(q, META, BE)][0];
    return { position: pos ? Number(JSON.parse(pos)) : 0, epoch: ep ? Number(JSON.parse(ep)) : 0 };
  }
  rowCount(q: Quads = this.quads) {
    let n = 0;
    for (const preds of q.values()) n += preds.get(ROWF)?.size ?? 0;
    return n;
  }

  async query(sparql: string): Promise<any[]> {
    if (this.down) throw Object.assign(new Error("connect ECONNREFUSED 127.0.0.1:7070 (model replica down)"), { code: "ECONNREFUSED" });
    const q = this.quads; // snapshot at arrival
    const delay = this.queryDelay();
    if (delay > 0) await sleep(delay);
    if (this.down) throw Object.assign(new Error("socket hang up (model replica went down mid-query)"), { code: "ECONNRESET" });
    if (sparql.startsWith("SELECT ?brokerPosition ?brokerEpoch")) {
      const m = this.marker(q);
      const pos = [...this.objects(q, META, BP)][0];
      const ep = [...this.objects(q, META, BE)][0];
      return [
        {
          ...(pos ? { brokerPosition: { type: "literal", value: String(m.position) } } : {}),
          ...(ep ? { brokerEpoch: { type: "literal", value: String(m.epoch) } } : {}),
          ...(([...this.objects(q, META, BI)][0] as string | undefined)
            ? {
                brokerIncarnation: {
                  type: "literal",
                  value: JSON.parse([...this.objects(q, META, BI)][0]!),
                },
              }
            : {}),
        },
      ];
    }
    // [EXP-P2Q] Why: a combined dependency/marker request on an empty snapshot is valid
    // and must reach the adapter's in-request marker check. Rejected: throwing unsupported
    // (prevents exercising that check). Populated aggregates remain a live-QLever obligation.
    if (
      sparql.startsWith("SELECT ?sourcePosition ?nextBoundary ?brokerPosition") &&
      this.rowCount(q) === 0
    )
      return [{ brokerPosition: { type: "literal", value: String(this.marker(q).position) } }, {}];
    if (sparql.startsWith("SELECT ?s WHERE { ?s ?p ?o } LIMIT 1")) return [];
    if (sparql.startsWith("SELECT ?row ?brokerPosition WHERE")) {
      const out: any[] = [];
      for (const pos of this.objects(q, META, BP))
        out.push({ brokerPosition: { type: "literal", value: JSON.parse(pos) } });
      const body = sparql.slice(sparql.indexOf("UNION"));
      const idMatch = /VALUES \?subject \{ (<[^>]+>) \}/.exec(body);
      const entMatch = /VALUES \?entity \{ (.*?) \} \?subject/.exec(body);
      const entities = entMatch ? new Set(entMatch[1]!.match(LIT) ?? []) : undefined;
      const exact: [string, string][] = [];
      for (const m of body.matchAll(
        /\?subject (<urn:triplex:field:[^>]+>) ("(?:[^"\\]|\\.)*") \./g,
      ))
        exact.push([m[1]!, m[2]!]);
      const subjects = idMatch ? [idMatch[1]!] : [...q.keys()];
      for (const s of subjects) {
        const preds = q.get(s);
        const rows = preds?.get(ROWF);
        if (!rows || rows.size === 0) continue;
        if (
          entities &&
          ![...(preds!.get("<urn:triplex:field:entity_id>") ?? [])].some((o) => entities.has(o))
        )
          continue;
        if (!exact.every(([p, o]) => preds!.get(p)?.has(o))) continue;
        if (rows.size > 1) this.multiRow++;
        for (const o of rows) out.push({ row: { type: "literal", value: JSON.parse(o) } });
      }
      return out;
    }
    this.unsupported.push({ sparql, markerAtArrival: this.marker(q).position });
    throw new Error(
      "ModelReplica: unsupported query (only repository pulls and markers are modelled)",
    );
  }

  async update(sparql: string): Promise<unknown> {
    if (this.down) throw Object.assign(new Error("connect ECONNREFUSED 127.0.0.1:7070 (model replica down)"), { code: "ECONNREFUSED" });
    this.updates++;
    if (this.gate) await this.gate;
    const delay = this.updateDelay();
    if (delay > 0) await sleep(delay);
    if (this.down) throw Object.assign(new Error("socket hang up (model replica went down mid-update)"), { code: "ECONNRESET" });
    const g = this.graph;
    const delStart = `DELETE { GRAPH ${g} { `;
    const insStart = ` } } INSERT { GRAPH ${g} { `;
    const whereStart = ` } } WHERE { `;
    const i1 = sparql.indexOf(insStart);
    const i2 = sparql.indexOf(whereStart);
    if (!sparql.startsWith(delStart) || i1 < 0 || i2 < 0)
      throw new Error("ModelReplica: unsupported update");
    const deletes = parseQuads(sparql.slice(delStart.length, i1));
    const inserts = parseQuads(sparql.slice(i1 + insStart.length, i2));
    const guard =
      /COALESCE\(\?brokerPosition, "0"\) = ("(?:[^"\\]|\\.)*") && COALESCE\(\?brokerEpoch, "0"\) = ("(?:[^"\\]|\\.)*")/.exec(
        sparql,
      );
    if (!guard) throw new Error("ModelReplica: update without the marker guard");
    const q = this.quads;
    const posNow = [...this.objects(q, META, BP)];
    const epNow = [...this.objects(q, META, BE)];
    const okPos = (posNow.length ? posNow : ['"0"']).includes(guard[1]!);
    const okEp = (epNow.length ? epNow : ['"0"']).includes(guard[2]!);
    // [EXP-P2Q] Why: real SPARQL guards the incarnation too. Rejected: ignoring it
    // (an old in-flight publication could add its incarnation after a new fence in this model).
    const incGuard = /COALESCE\(\?brokerIncarnation, ""\) = ("(?:[^"\\]|\\.)*")/.exec(sparql);
    const incNow = [...this.objects(q, META, BI)];
    const okInc = !incGuard || (incNow.length ? incNow : ['""']).includes(incGuard[1]!);
    if (!(okPos && okEp && okInc))
      return {
        operations: [
          { "delta-triples": { operation: { inserted: 0, deleted: 0 }, after: { total: 0 } } },
        ],
      };
    const next: Quads = new Map(q);
    const touch = (s: string) => {
      const preds = new Map(next.get(s) ?? []);
      for (const [p, set] of preds) preds.set(p, new Set(set));
      next.set(s, preds);
      return preds;
    };
    const touched = new Map<string, Map<string, Set<string>>>();
    const get = (s: string) => touched.get(s) ?? touched.set(s, touch(s)).get(s)!;
    let deleted = 0;
    let inserted = 0;
    for (const [s, p, o] of deletes) {
      const set = get(s).get(p);
      if (set?.delete(o)) deleted++;
    }
    for (const [s, p, o] of inserts) {
      const preds = get(s);
      let set = preds.get(p);
      if (!set) preds.set(p, (set = new Set()));
      if (!set.has(o)) {
        set.add(o);
        inserted++;
      }
    }
    this.quads = next;
    this.appliedUpdates++;
    return {
      operations: [
        { "delta-triples": { operation: { inserted, deleted }, after: { total: inserted } } },
      ],
    };
  }
  async command(): Promise<unknown> {
    return {};
  }
  async cancel(): Promise<void> {}
  async close(): Promise<void> {}
}

/** The replica's content decoded to rows (to compare the model's state with the log after a drain). */
export const replicaRows = (replica: ModelReplica): TripleRow[] => {
  const out: TripleRow[] = [];
  for (const preds of replica.quads.values())
    for (const o of preds.get(ROWF) ?? []) out.push(decodeRow(JSON.parse(o)));
  return out;
};

// ------------------------------------------------------------------ runtime

export const nullReplica: QleverClient = {
  query: async () => [],
  update: async () => ({}),
  command: async () => ({}),
  cancel: async () => {},
  close: async () => {},
};

export interface Rt {
  readonly scope: string;
  readonly dir: string;
  readonly broker: HostBroker;
  readonly adapter: QleverBrokerStorageAdapterService;
  readonly executor: any;
  readonly triples: any;
  readonly reads: BrokerReadEvent[];
  readonly run: <A, E>(effect: Effect.Effect<A, E>) => Promise<A>;
  readonly dispose: () => Promise<void>;
}
export const openRt = async (
  dir: string,
  scope: string,
  replica?: QleverClient,
  brokerExtra: Partial<HostBrokerOptions> = {},
  adapterExtra: Record<string, unknown> = {},
): Promise<Rt> => {
  const broker = await HostBroker.open({
    dir,
    scopeKey: scope,
    minFreeBytes: 256 * 1024 ** 2,
    ...(replica ? { replica } : {}),
    ...brokerExtra,
  });
  const client = replica ?? nullReplica;
  const reads: BrokerReadEvent[] = [];
  const adapter = makeQleverStorageAdapter(client, scope, {
    broker,
    brokerOptions: { ...adapterExtra, onRead: (e) => reads.push(e) },
  }) as QleverBrokerStorageAdapterService;
  const executor = makeQleverQueryExecutor(client, scope, {
    sourceView: adapter.sourceView,
    resolveBasis: adapter.resolveQueryBasis,
  });
  const layer = Runtime.define({
    name: "v-p2q",
    storage: Layer.succeed(StorageAdapter, adapter),
    queries: Layer.succeed(QueryExecutor, executor),
  }).layer({ scope: DatabaseScope.test(scope), capabilities: Capabilities.none });
  const managed = ManagedRuntime.make(layer);
  const triples = await managed.runPromise(
    Effect.gen(function* () {
      return yield* Triples;
    }),
  );
  return {
    scope,
    dir,
    broker,
    adapter,
    executor,
    triples,
    reads,
    run: <A, E>(effect: Effect.Effect<A, E>) => managed.runPromise(effect),
    dispose: () => managed.dispose(),
  };
};

export const ops = (subject: string, facts: number, tag: string) =>
  Array.from({ length: facts }, (_v, i) => ({
    op: "assert" as const,
    entityId: EntityId.make(subject),
    attribute: `:v/f${i}`,
    value: string(`${tag}-${i}`),
  }));
export const at = (position: number, validAt = Date.now() + 10 ** 9) => ({
  validAt,
  recordedPosition: position,
});

/** Deterministic PRNG (mulberry32). */
export const rng = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
/** Run an effect and return its success or its typed failure as a value (no Cause plumbing). */
export const attempt = <A, E>(rt: Rt, effect: Effect.Effect<A, E>) =>
  rt.run(
    Effect.match(effect, {
      onFailure: (error: any) => ({ ok: false as const, error, value: undefined as any }),
      onSuccess: (value: A) => ({ ok: true as const, value, error: undefined as any }),
    }),
  );
/** Write a WATERMARK file (format of log.ts publishWatermark) naming `lsn`, to model which frame was ACKed. */
export const writeWatermark = (dir: string, epoch: number, lsn: number, position: number) => {
  const out = Buffer.alloc(32);
  out.writeUInt32LE(0x4d575854, 0);
  out.writeUInt32LE(epoch >>> 0, 4);
  out.writeBigUInt64LE(BigInt(lsn), 8);
  out.writeBigUInt64LE(BigInt(position), 16);
  out.writeUInt32LE(crc32cRef(out, 0, 0, 24), 24);
  fs.writeFileSync(path.join(dir, "WATERMARK"), out);
};
export const writeJson = (name: string, value: unknown) =>
  fs.writeFileSync(path.join(OUT, name), JSON.stringify(value, null, 2));
