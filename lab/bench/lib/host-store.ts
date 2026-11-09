/** [EXP-P5B-R2] Why: keep W0 reference positions inside the harness, native positions inside the product store.
 * Rejected: teaching each oracle about broker packing or bypassing Triples with handwritten seed rows.
 */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { createInterface } from "node:readline";
import { once } from "node:events";
import { createGzip, createGunzip } from "node:zlib";
import { Effect, Layer, ManagedRuntime } from "effect";
import * as core from "../../../packages/core/dist/index.js";
import * as rt from "../../../packages/core/dist/runtime/index.js";
import * as q from "../../../packages/qlever/dist/index.js";
import { PositionMap } from "./position-map.ts";
import {
  canonical,
  many,
  W0,
  V_W0,
  requirePosition,
  type PositionBasis,
  type WorldRow,
} from "./w0-world.ts";
import { seedCommands, seedOperations, type W0Command } from "./w0-seed.ts";
import type { CompositionHandle } from "./composition.ts";
import { publishRecords } from "./w0-outbox.ts";
import { decodeHostRow } from "./host-row.ts";
export { decodeHostRow };
export function commandWitness(operations: readonly any[], r: any, native: number, meta: any = {}) {
  let i = 0;
  const rows = operations.map((op) => {
    if (op.op === "retract")
      return { op: "retract", id: op.id, position: native, instant: r.instant, txId: r.txId };
    if (op.op !== "assert") throw Error("unsupported mapped command");
    const v = op.value,
      t = r.triples[i++];
    const row: any = {
      id: t.id,
      entity_id: op.entityId,
      attribute: op.attribute,
      value_type: v.type,
      value_string: null,
      value_number: null,
      value_boolean: null,
      value_datetime: null,
      value_json: null,
      recorded_at: r.instant,
      recorded_position: native,
      valid_from: op.validFrom ?? r.instant,
      valid_to: op.validTo ?? null,
      created_by: op.createdBy ?? meta.actor ?? null,
      retracted_at: null,
      retracted_position: null,
      retract_tx_id: null,
      entity_type: op.entityType ?? null,
      schema_version: 1,
      tx_id: r.txId,
    };
    const column: any = {
      integer: "value_string",
      string: "value_string",
      ref: "value_string",
      number: "value_number",
      datetime: "value_datetime",
      boolean: "value_boolean",
      json: "value_json",
    };
    if (!column[v.type]) throw Error("unsupported host value kind");
    row[column[v.type]] =
      v.type === "boolean"
        ? Number(v.value)
        : v.type === "json"
          ? JSON.stringify(v.value)
          : v.value;
    return { op: "assert", row };
  });
  return { rows, claim: { command: meta.commandId, txId: r.txId, position: native } };
}
/** [EXP-P5B-R3] Why: R3 seeds on the HS01 layout, so the store keeps a byte-bounded frame tail (HS01 G9 budget, 64 MiB) instead of 1,024 frames (140 B/fact).
 * Rejected: the product default (every frame is retained, 5,656 B/fact in round 2) and a frame-count tail (its bytes depend on frame size).
 * `reopen` attaches a clone of a sealed seed store: the frozen map is loaded against its externally bound hash and the runtime draws ids from `idSeed`,
 * because core's deterministic generator restarts its counter at 1 and would otherwise reuse the seed's ids.
 */
export const HOST_FRAME_TAIL_BYTES = 64 * 1024 * 1024;
export interface MappedHostOptions {
  readonly frameRetention?: { tailBytes?: number; tailFrames?: number };
  readonly reopen?: { mapFile: string; mapSha256: string; N: number };
  readonly idSeed?: string;
  readonly clockStart?: number;
}
export async function openMappedHost(dir: string, scope: string, options: MappedHostOptions = {}) {
  const frameEvents: { appendMs: number; watermarkMs: number; members: number; bytes: number }[] = [];
  if (options.reopen && !options.idSeed) throw Error("reopen requires a distinct id seed");
  const broker = await q.HostBroker.open({
    dir,
    scopeKey: scope,
    minFreeBytes: 5 * 1024 ** 3,
    frameRetention: options.frameRetention ?? { tailBytes: HOST_FRAME_TAIL_BYTES },
    // [EXP-P5N-R2] Why: the profile needs the broker's own per-frame split: the append round trip (writer thread, fsync) against the synchronous watermark publication (ack file plus purge) that follows it on the owner thread.
    // Rejected: inferring the watermark cost from a CPU profile only (a blocking Atomics.wait shows as idle, not as the function that waits).
    onEvent: (e: any) => {
      if (e.type === "frame")
        frameEvents.push({ appendMs: e.appendMs, watermarkMs: e.watermarkAt - e.at, members: e.members, bytes: e.bytes });
    },
  });
  const detached: any = {
    query: async () => [],
    update: async () => {
      throw Error("replica detached");
    },
    command: async () => {
      throw Error("replica detached");
    },
    cancel: async () => {},
    close: async () => {},
  };
  const adapter = q.makeQleverStorageAdapter(detached, scope, { broker }) as any;
  const layer = rt.Runtime.define({
    name: "p5-host",
    storage: Layer.succeed(rt.StorageAdapter, adapter),
    queries: Layer.succeed(
      rt.QueryExecutor,
      q.makeQleverQueryExecutor(detached, scope, { sourceView: adapter.sourceView }),
    ),
  }).layer({
    scope: rt.DatabaseScope.test(scope),
    capabilities: rt.Capabilities.none,
    deterministic: {
      startTime: options.clockStart ?? V_W0 - 10000000,
      seed: options.idSeed ?? scope,
    },
  });
  const managed = ManagedRuntime.make(layer),
    T: any = await managed.runPromise(Effect.service(core.Triples));
  let map = new PositionMap();
  const commands: any[] = [];
  let seedN = 0;
  let seeded = false,
    seedFile: string | undefined,
    seedStat: string | undefined;
  if (options.reopen) {
    map = PositionMap.load(options.reopen.mapFile, options.reopen.mapSha256);
    seedN = options.reopen.N;
    seedFile = options.reopen.mapFile;
    const stat = fs.statSync(seedFile, { bigint: true });
    seedStat = canonical([
      String(stat.ino),
      String(stat.size),
      String(stat.mtimeNs),
      String(stat.ctimeNs),
    ]);
    seeded = true;
    // [EXP-P5B-R3] Why: a clone whose head differs from the sealed map's last receipt is a different store; refuse before any read.
    if (broker.head() !== map.native(map.size))
      throw Error("reopened store head does not equal the sealed map's last native position");
  }
  const assertBound = () => {
    if (seedFile) {
      const s = fs.statSync(seedFile, { bigint: true });
      if (
        canonical([String(s.ino), String(s.size), String(s.mtimeNs), String(s.ctimeNs)]) !==
        seedStat
      )
        throw Error("bound seed position map changed after freeze");
    }
  };
  const receipt = (r: any) => ({
    ...r,
    nativePosition: r.position,
    position: map.reference(r.position),
    positionBinding: map.binding,
  });
  // [EXP-P5N] Why: step 1 splits the harness's own work inside each commit (core transact, readback, map append) from the broker's commit. Rejected: inferring it from the residual.
  const hstats = { transacts: 0, coreMs: 0, readbackMs: 0, mapAppendMs: 0, verifyMs: 0 };
  async function verifyGroup(
    items: readonly { operations: any[]; meta: any; receipt: any; reference: number }[],
  ) {
    const tv0 = performance.now();
    const ids = items.flatMap((x) => [
      ...x.receipt.triples.map((t: any) => t.id),
      ...x.operations.filter((o) => o.op === "retract").map((o) => o.id),
    ]);
    const rows = await broker.readback([...new Set(ids)]),
      byId = new Map(rows.map((r) => [r.id, r]));
    const claims = await broker.readbackClaims(items.map((x) => x.meta.commandId));
    const byClaim = new Map(claims.map((c) => [c.command, c]));
    hstats.readbackMs += performance.now() - tv0;
    const bound = [];
    for (const item of items) {
      const r = item.receipt,
        native = r.position,
        submitted = commandWitness(item.operations, r, native, item.meta);
      let i = 0;
      const observed = item.operations.map((op) => {
        if (op.op === "assert") {
          const t = r.triples[i++],
            raw = byId.get(t.id);
          if (!raw) throw Error("seed assertion absent on readback");
          if (raw.retracted_position !== null && raw.retracted_position <= native)
            throw Error("seed assertion already retired at receipt");
          const row =
            raw.retracted_position !== null
              ? { ...raw, retracted_at: null, retracted_position: null, retract_tx_id: null }
              : raw;
          return { op: "assert", row };
        }
        const row = byId.get(op.id);
        if (!row) throw Error("seed retraction absent on readback");
        return {
          op: "retract",
          id: row.id,
          position: row.retracted_position,
          instant: row.retracted_at,
          txId: row.retract_tx_id,
        };
      });
      const tm = performance.now();
      const binding = map.append(item.reference, native, submitted, {
        rows: observed,
        claim: byClaim.get(item.meta.commandId),
      });
      hstats.mapAppendMs += performance.now() - tm;
      bound.push({ ...item, receipt: { ...receipt(r), positionBinding: binding } });
    }
    hstats.verifyMs += performance.now() - tv0;
    return bound;
  }
  const counts = async () => {
    assertBound();
    const actual = await broker.storeCounts();
    return {
      position: map.reference(actual.position!),
      assertions: actual.domainAssertions!,
      retired: actual.retired!,
      frames: actual.claims!,
    };
  };
  const shape = (
    hostRows: any[],
    snapshot: any,
    roundTrips: number,
    basis: PositionBasis,
    nativeBasis: number,
    metrics: { transactionMs: number; cpuMicros: number; cpuScope: string },
  ) => {
    const rows = hostRows.map((r) => ({
      ...decodeHostRow(r),
      ...(r.attribute === ":_tx/position" && r.value_type === "number"
        ? { value: { type: "number", value: map.reference(r.value_number!) } }
        : {}),
      position: map.reference(r.recorded_position),
    }));
    return {
      rows,
      roundTrips,
      basis: basis.position,
      nativeSnapshot: snapshot,
      position: map.referenceCut(Math.min(snapshot.position, map.native(map.size))),
      epoch: String(snapshot.epoch),
      reportedBasis: { ...basis },
      positionBinding: comp.positionBinding!(basis.position),
      nativeBasis,
      store: { snapshot, positionEncoding: "native", nativeBasis, ...metrics },
    };
  };
    // [EXP-P5B-R3] Why: the live read route (four pooled readers, one H1 pull per hop) must not share connections with the sweep's dedicated workers, or a live read queues behind a sweep page.
    // Rejected: reusing sweepPage for live reads (a read-isolation ratio would then measure one shared connection).
  const livePage = async (
    subjects: readonly string[],
    basis: PositionBasis,
  ) => {
      assertBound();
      requirePosition(basis, map.size);
      const nativeBasis = map.native(basis.position),
        seen = new Set(subjects),
        out: any[] = [];
      let frontier = [...seen],
        trips = 0,
        snapshot: any;
      const started = performance.now();
      while (frontier.length) {
        trips++;
        const next: string[] = [];
        for (let o = 0; o < frontier.length; o += 500) {
          const page: any = await broker.pullAt(nativeBasis, {
            entities: frontier.slice(o, o + 500),
          });
          if (!page.eligible) throw Error("live read basis not eligible");
          snapshot = page.snapshot;
          for (const row of page.rows) {
            if (row.entity_type === "_Transaction" && row.entity_id === row.tx_id) continue;
            if (
              basis.validAt !== undefined &&
              !(row.valid_from <= basis.validAt && (row.valid_to === null || row.valid_to > basis.validAt))
            )
              continue;
            if (row.retracted_position !== null && row.retracted_position <= nativeBasis) continue;
            const r =
              row.retracted_position !== null
                ? { ...row, retracted_position: null, retracted_at: null, retract_tx_id: null }
                : row;
            out.push(r);
            if (r.value_type === "ref" && !seen.has(r.value_string)) {
              seen.add(r.value_string);
              next.push(r.value_string);
            }
          }
        }
        frontier = next;
      }
      return shape(out, snapshot, trips, basis, nativeBasis, {
        transactionMs: performance.now() - started,
        cpuMicros: 0,
        cpuScope: "not-measured",
      });
    };
  const one = { lane: "qlever" as const, role: "Q101a mapped broker H1, detached replica" };
  let sweepIndex = 0;
  let writeTail: Promise<unknown> = Promise.resolve();
  const comp: CompositionHandle = {
    name: "host-mapped",
    scopeName: scope,
    backend: { name: "qlever-host", url: `sqlite://${dir}`, queryPath: "H1" },
    assignments: { source: one, current: one, history: one, analytics: one, replicationEdges: [] },
    currentPosition: async () => {
      assertBound();
      return map.size;
    },
    watermarks: async () => ({ source: map.size }),
    coordinate: (position) => {
      const n = map.native(position);
      return {
        stream: scope,
        epoch: broker.epoch,
        offset: Math.floor(n / 1024),
        ordinal: n % 1024,
      };
    },
    transact: (operations, meta) => {
      const run = writeTail.then(async () => {
        assertBound();
        try {
          if (typeof meta.commandId !== "string" || !meta.commandId.length)
            throw Error("mapped host commands require commandId");
          const tc = performance.now();
          const r: any = await managed.runPromise(T.transact(operations, meta));
          hstats.coreMs += performance.now() - tc;
          hstats.transacts++;
          const bound = (
            await verifyGroup([
              { operations: [...operations], meta, receipt: r, reference: map.size + 1 },
            ])
          )[0]!;
          const c = { operations, meta, receipt: bound.receipt };
          commands.push(c);
          return { ok: true, value: bound.receipt };
        } catch (error: any) {
          return { ok: false, tag: error._tag ?? error.name ?? "WriteError", error };
        }
      });
      writeTail = run.then(
        () => undefined,
        () => undefined,
      );
      return run as any;
    },
    transactionByCommand: async (id) => {
      await writeTail;
      assertBound();
      try {
        // [EXP-P5B-R3] Why: core's transactionByCommand is a pattern query on the command-id attribute, which no H1 index serves, so a miss scanned every journal row
        // (12 s at 1k, 442k facts; once per outbox page and per trace event). The broker's claim table is the lost-ACK authority (R13) and is a primary-key lookup.
        // Rejected: the core pattern query (O(store) per call) and caching misses (a lost ACK must see the claim written by the first attempt).
        const claim = await broker.claimAsync(id);
        const r: any = claim ? await managed.runPromise(T.transaction(claim.txId)) : null;
        return {
          ok: true,
          value: r
            ? {
                ...r,
                position: map.reference(r.position),
                nativePosition: r.position,
                positionBinding: comp.positionBinding!(map.reference(r.position)),
              }
            : null,
        };
      } catch (error: any) {
        return { ok: false, tag: error._tag ?? "ReadError", error };
      }
    },
    // [EXP-P5N] Why: D3. A frozen array of the native positions of references 1..basis.position (a SharedArrayBuffer, 8 B per reference: about 5 MB at 10k, 50 MB at 100k) that sweep
    // workers binary-search; rows at or below the basis only reference positions in it. Rejected: sending the PositionMap to every worker (36 MB of JSON per worker at 10k).
    sweepWorkerSpec: async (basis) => {
      assertBound();
      requirePosition(basis, map.size);
      const sab = new SharedArrayBuffer(8 * basis.position),
        natives = new Float64Array(sab);
      for (let i = 0; i < basis.position; i++) natives[i] = map.native(i + 1);
      const handle = broker.sweepHandle();
      return { file: handle.file, gate: handle.gate, natives: sab };
    },
    sweepPage: async (subjects, basis) => {
      assertBound();
      requirePosition(basis, map.size);
      const nativeBasis = map.native(basis.position),
        page = await broker.sweepPage(nativeBasis, subjects, {
          worker: sweepIndex++ % 16,
          validAt: basis.validAt,
        });
      return shape(page.rows, page.snapshot, page.roundTrips, basis, nativeBasis, {
        transactionMs: page.transactionMs,
        cpuMicros: page.cpuMicros,
        cpuScope: page.cpuScope,
      });
    },
    pinBasis: async (position, owner) => {
      assertBound();
      const p = broker.pinBasis(map.native(position), owner, {
        ttlMs: 300000,
        maxLagPositions: Number.MAX_SAFE_INTEGER,
      });
      const timer = setInterval(() => {
        try {
          p.renew();
        } catch {}
      }, 60000);
      return {
        position,
        nativePosition: map.native(position),
        positionBinding: comp.positionBinding!(position),
        release: async () => {
          clearInterval(timer);
          p.release();
        },
      };
    },
    pull: async (entity, basis) => {
      if (basis.recordedAt !== Number.MAX_SAFE_INTEGER)
        throw Error("host mapped pull requires explicit P; T unsupported");
      const p = await comp.sweepPage([entity], { position: map.size, validAt: basis.validAt });
      return {
        triples: p.rows,
        entities: new Set(p.rows.map((r) => r.entityId)).size,
        roundTrips: p.roundTrips,
        depth: p.roundTrips - 1,
        route: "H1",
        language: "sqlite",
        waitedMs: 0,
      };
    },
    // [EXP-P5N] Why: 64 outbox state pulls per page were each a full BFS on the sweep connections and queued behind 200 ms page transactions (17.8 s summed at W4).
    // One read of the page's 64 state entities at the current head, on a pooled reader outside the sweep connections; the TripleLive preconditions in the commit still reject a stale read.
    // Rejected: caching state in memory (a lost ACK or a restart must read the stored state).
    pullMany: async (entities, basis) => {
      assertBound();
      const nativeBasis = broker.head(),
        out = new Map<string, any[]>(entities.map((e) => [e, []]));
      for (let o = 0; o < entities.length; o += 500) {
        const page: any = await broker.pullAt(nativeBasis, { entities: entities.slice(o, o + 500) });
        if (!page.eligible) throw Error("batched pull basis not eligible");
        for (const row of page.rows) {
          if (!(row.valid_from <= basis.validAt && (row.valid_to === null || row.valid_to > basis.validAt))) continue;
          if (row.retracted_position !== null && row.retracted_position <= nativeBasis) continue;
          out.get(row.entity_id)?.push(decodeHostRow(row));
        }
      }
      return out;
    },
    sweepPull: async (entity, basis) => comp.pull(entity, basis),
    publishOutbox: (records) => publishRecords(comp, records),
    feedPage: async (after, limit) => {
      assertBound();
      const nativeAfter = map.native(after);
      const page: any = await managed.runPromise(T.transactions({ after: nativeAfter, limit }));
      return {
        ...page,
        transactions: page.transactions.map((r: any) => ({
          ...r,
          position: map.reference(r.position),
          nativePosition: r.position,
          positionBinding: comp.positionBinding!(map.reference(r.position)),
        })),
        ...(page.next === undefined ? {} : { next: map.reference(page.next) }),
        positionBinding: map.binding,
      };
    },
    storeCounts: counts,
    commandLog: () => {
      if (seeded) throw Error("use commandStream for a mapped population");
      return commands;
    },
    validateMappedReceipt: (r, operations, meta) => {
      assertBound();
      if (
        map.native(r.position) !== r.nativePosition ||
        r.positionBinding?.mapHash !== map.prefixHash(r.position) ||
        r.positionBinding?.references !== r.position
      )
        throw Error("mapped receipt binding mismatch");
      map.verifyContent(r.position, commandWitness(operations, r, r.nativePosition, meta));
    },
    positionBinding: (position = map.size) => {
      assertBound();
      return {
        mapHash: map.prefixHash(position),
        seedMapHash: map.binding.seedMapHash,
        references: position,
      };
    },
    commandStream: async function* () {
      assertBound();
      if (!seedFile) throw Error("mapped seed not frozen");
      let expected = 1;
      for await (const line of createInterface({
        input: fs
          .createReadStream(path.join(path.dirname(seedFile), "seed.ndjson.gz"))
          .pipe(createGunzip()),
        crlfDelay: Infinity,
      })) {
        const c = JSON.parse(line),
          r = c.receipt;
        if (
          c.reference !== expected++ ||
          r.position !== c.reference ||
          map.native(r.position) !== r.nativePosition ||
          r.positionBinding.mapHash !== map.prefixHash(r.position)
        )
          throw Error("mapped replay intent binding mismatch");
        map.verifyContent(r.position, commandWitness(c.operations, r, r.nativePosition, c.meta));
        yield c;
      }
      if (expected - 1 !== W0.populationBasis(W0.rung(seedN)).tx)
        throw Error("mapped replay seed gap");
      for (const c of commands) yield c;
      assertBound();
    },
    close: async () => {
      try {
        await managed.dispose();
      } finally {
        await broker.close();
      }
    },
  };
  async function seed(N: number, output: string, groupSize = 64) {
    if (map.size || broker.head()) throw Error("mapped seed requires fresh store");
    seedN = N;
    const R = W0.rung(N),
      latest = new Map<string, string>(),
      pending: W0Command[] = [];
    // [EXP-P5B-R3] Why: the driver's seed intent was 2.4 GB at 10k (24 GB projected at 100k) and counted against the 5 GiB floor; gzip level 1 keeps the same bytes (the hash is over the uncompressed lines) at about a tenth.
    // Rejected: dropping the intent log (the O-REPLAY stream and the map's command witnesses read it) and leaving it raw (it would be the largest 100k file).
    const gzip = createGzip({ level: 1 }),
      logFile = fs.createWriteStream(path.join(output, "seed.ndjson.gz"), { flags: "wx" }),
      logDone = once(logFile, "close");
    gzip.pipe(logFile);
    let groups = 0,
      assertions = 0,
      retractions = 0;
    const start = performance.now(),
      logHash = createHash("sha256");
    async function flush() {
      if (!pending.length) return;
      const free = fs.statfsSync(output);
      if (free.bavail * free.bsize < 5 * 1024 ** 3)
        throw Error("RESOURCE-ABORT host disk below 5 GiB");
      const batch = pending.splice(0);
      const results: any = await managed.runPromise(
        adapter.withTransaction(
          Effect.gen(function* () {
            const out = [];
            for (const c of batch) {
              const operations = seedOperations(c, latest, R),
                meta = { commandId: `p5:seed:${c.position}`, actor: "p5-seed" };
              const r: any = yield* T.transact(operations, meta);
              for (const t of r.triples)
                if (!many.has(t.attribute)) latest.set(t.entityId + "\0" + t.attribute, t.id);
              out.push({ reference: c.position, operations, meta, receipt: r });
            }
            return out;
          }),
        ),
      );
      const checked = await verifyGroup(results);
      for (const c of checked) {
        assertions += c.operations.filter((o) => o.op === "assert").length;
        retractions += c.operations.filter((o) => o.op === "retract").length;
        const line = canonical(c) + "\n";
        if (!gzip.write(line)) await once(gzip, "drain");
        logHash.update(line);
      }
      groups++;
      if (groups % 100 === 0) {
        const progress = {
          groups,
          references: map.size,
          nativePosition: broker.head(),
          wallS: (performance.now() - start) / 1000,
          freeBytes: free.bavail * free.bsize,
          positionBinding: map.binding,
        };
        fs.writeFileSync(path.join(output, "progress.json"), JSON.stringify(progress, null, 2));
        console.log(JSON.stringify(progress));
      }
    }
    try {
      for (const c of seedCommands(N)) {
        pending.push(c);
        if (pending.length === groupSize) await flush();
      }
      await flush();
    } finally {
      gzip.end();
      await logDone;
    }
    if (map.size !== W0.populationBasis(R).tx) throw Error("seed reference coverage incomplete");
    map.sealSeed();
    seedFile = path.join(output, "position-map.json");
    map.save(seedFile);
    const stat = fs.statSync(seedFile, { bigint: true });
    seedStat = canonical([
      String(stat.ino),
      String(stat.size),
      String(stat.mtimeNs),
      String(stat.ctimeNs),
    ]);
    PositionMap.load(seedFile, map.sha256);
    seeded = true;
    const result = {
      N,
      basis: W0.populationBasis(R),
      nativeBasis: map.native(map.size),
      groups,
      assertions,
      retractions,
      wallS: (performance.now() - start) / 1000,
      positionBinding: map.binding,
      counts: await counts(),
      mapFile: seedFile,
      logSha256: logHash.digest("hex"),
      witnessEncoding: "q101a-full-row-and-claim/1",
      grouping:
        "product StorageAdapter.withTransaction with up to 64 nested Triples.transact calls",
    };
    fs.writeFileSync(
      path.join(output, "seed-manifest.json"),
      JSON.stringify(result, null, 2) + "\n",
      { flag: "wx" },
    );
    return result;
  }
  return {
    comp,
    broker,
    map,
    hstats,
    frameEvents,
    // [EXP-P5N] Why: G-JNL reads the journal triples through core's public Triples service (match, transactionsForEntity), not through the broker, so "queryable as ordinary triples" is checked on the product API.
    api: {
      match: (pattern: any) => managed.runPromise(T.match(pattern)) as Promise<any[]>,
      transactionsForEntity: (id: string, request?: any) => managed.runPromise(T.transactionsForEntity(id, request)) as Promise<any>,
    },
    livePage,
    seed,
    get seeded() {
      return seeded;
    },
    // [EXP-P5B-R2] Why: history retirement lifetimes use exact native-to-reference translation too. Rejected: translating snapshot assertion positions only.
    historyAt: async (entity: string, position: number) => {
      assertBound();
      const nativeCut = map.native(position);
      const all: any = await managed.runPromise(adapter.history(entity));
      const rows = all
        .filter((r: any) => r.recorded_position <= nativeCut)
        .map((r: any) =>
          r.retracted_position !== null && r.retracted_position > nativeCut
            ? { ...r, retracted_position: null, retracted_at: null, retract_tx_id: null }
            : r,
        );
      return rows.map((r: any) => ({
        ...r,
        ...(r.attribute === ":_tx/position" && r.value_type === "number"
          ? { value_number: map.reference(r.value_number) }
          : {}),
        recorded_position: map.reference(r.recorded_position),
        retracted_position:
          r.retracted_position === null ? null : map.reference(r.retracted_position),
        positionBinding: comp.positionBinding!(position),
      }));
    },
  };
}
