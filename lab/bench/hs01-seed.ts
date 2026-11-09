/** [EXP-HS01] Why: vendor P5B R2's real nested Triples seeder and complete assertion/claim witnesses.
 * Rejected: handwritten rows or suppressed journal (would understate production bytes).
 * Adaptation: compact worker readback, gzip intent log, strict disk reserve and no P5 sweep/lease APIs.
 */
import fs from "node:fs";
import path from "node:path";
import { randomUUID, createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import { Effect, Layer, ManagedRuntime } from "effect";
import * as core from "../../packages/core/dist/index.js";
import * as rt from "../../packages/core/dist/runtime/index.js";
import * as q from "../../packages/qlever/dist/index.js";
import { createRequire } from "node:module";
const Database = createRequire(new URL("../../packages/qlever/package.json", import.meta.url))(
  "better-sqlite3",
);
import { seedCommands, type W0Command } from "./lib/w0-seed.ts";
import { many, W0, V_W0, canonical, triplexValue } from "./lib/w0-world.ts";
// [EXP-HS01] Why: vendor P5B R2's seedOperations helper; main still embeds it in the dense-position seeder.
// Rejected: importing a sibling worktree or calling main's seeder (would reject packed native positions).
function seedOperations(
  c: W0Command,
  latest: Map<string, string>,
  Rseed: ReturnType<typeof W0.rung>,
) {
  const operations: any[] = [];
  for (const [e, a, v] of c.rows) {
    const key = e + "\0" + a;
    if (!many.has(a) && c.validFrom <= V_W0 && latest.has(key))
      operations.push({ op: "retract", id: latest.get(key) });
    operations.push({
      op: "assert",
      entityId: e,
      attribute: a,
      value: triplexValue(a, v),
      validFrom: c.validFrom,
      ...(a === "payRateCents" && c.validFrom <= V_W0 && W0.plan(Rseed, Number(e.slice(4))).raise
        ? { validTo: Date.parse("2026-11-16T00:00:00Z") }
        : {}),
    });
  }
  return operations;
}
const artifactHashes = () =>
  Object.fromEntries(
    ["core", "qlever", "w0"].flatMap((p) => {
      const root = path.resolve("packages", p, "dist");
      return fs
        .readdirSync(root, { recursive: true })
        .map((f) => path.join(root, String(f)))
        .filter((f) => fs.statSync(f).isFile())
        .sort()
        .map((f) => [
          path.relative(process.cwd(), f),
          createHash("sha256").update(fs.readFileSync(f)).digest("hex"),
        ]);
    }),
  );
const builds = artifactHashes();
const out = process.argv[2]!,
  N = Number(process.argv[3]);
if (!out || ![1000, 10000].includes(N)) throw Error("out N=1000|10000");
fs.mkdirSync(out, { recursive: false });
const floor = 5 * 1024 ** 3,
  free = () => {
    const s = fs.statfsSync(out);
    return s.bavail * s.bsize;
  };
if (free() < floor + (N === 1000 ? 700000000 : 1400000000))
  throw Error("RESOURCE-ABORT: need 1.4 GB plus 5 GiB before seeding");
const scope = "hs01:" + randomUUID(),
  broker = await q.HostBroker.open({
    dir: path.join(out, "store"),
    scopeKey: scope,
    minFreeBytes: floor,
    frameRetention: { tailFrames: 1024 },
  });
const log = (broker as any).log,
  detached: any = {
    query: async () => [],
    update: async () => {
      throw Error("detached");
    },
    command: async () => {
      throw Error("detached");
    },
    cancel: async () => {},
    close: async () => {},
  };
const adapter = q.makeQleverStorageAdapter(detached, scope, { broker }) as any;
const layer = rt.Runtime.define({
  name: "hs01-seed",
  storage: Layer.succeed(rt.StorageAdapter, adapter),
  queries: Layer.succeed(
    rt.QueryExecutor,
    q.makeQleverQueryExecutor(detached, scope, { sourceView: adapter.sourceView }),
  ),
}).layer({
  scope: rt.DatabaseScope.test(scope),
  capabilities: rt.Capabilities.none,
  deterministic: { startTime: V_W0 - 10000000, seed: scope },
});
const managed = ManagedRuntime.make(layer),
  T: any = await managed.runPromise(Effect.service(core.Triples));
const latest = new Map<string, string>(),
  pending: W0Command[] = [],
  positionMap: any[] = [],
  latencies: number[] = [],
  intent = createHash("sha256"),
  fd = fs.openSync(path.join(out, "seed.ndjson.gz"), "wx");
let readBench: unknown;
let groups = 0,
  assertions = 0,
  retractions = 0,
  reference = 0,
  status = "RUNNING",
  error: string | undefined;
const started = performance.now(),
  freeStart = free();
async function flush() {
  if (!pending.length) return;
  if (free() < floor + 64 * 1024 ** 2)
    throw Error("RESOURCE-ABORT: next group may cross 5 GiB floor");
  const batch = pending.splice(0),
    start = performance.now();
  const results: any = await managed.runPromise(
    adapter.withTransaction(
      Effect.gen(function* () {
        const result = [];
        for (const c of batch) {
          const operations = seedOperations(c, latest, W0.rung(N)),
            meta = { commandId: `p5:seed:${c.position}`, actor: "p5-seed" };
          const receipt: any = yield* T.transact(operations, meta);
          for (const t of receipt.triples)
            if (!many.has(t.attribute)) latest.set(t.entityId + "\0" + t.attribute, t.id);
          result.push({ reference: c.position, operations, meta, receipt });
        }
        return result;
      }),
    ),
  );
  latencies.push(performance.now() - start);
  const ids = [
    ...new Set(
      results.flatMap((c: any) => [
        ...c.receipt.triples.map((t: any) => t.id),
        ...c.operations.filter((o: any) => o.op === "retract").map((o: any) => o.id),
      ]),
    ),
  ];
  const raw = await log.pool[0].request("readback", ids),
    byId = new Map(raw.map((r: any) => [r.id, r]));
  for (const c of results) {
    if (
      c.reference !== reference + 1 ||
      !Number.isSafeInteger(c.receipt.position) ||
      c.receipt.position <= (positionMap.at(-1)?.native ?? 0)
    )
      throw Error("reference/native order mismatch");
    const claim = broker.claim(c.meta.commandId);
    if (claim?.txId !== c.receipt.txId || claim.position !== c.receipt.position)
      throw Error("claim mismatch");
    let j = 0;
    const observed = [];
    for (const op of c.operations) {
      const native = c.receipt.position;
      if (op.op === "retract") {
        const r: any = byId.get(op.id);
        if (
          !r ||
          r.retracted_position !== native ||
          r.retracted_at !== c.receipt.instant ||
          r.retract_tx_id !== c.receipt.txId
        )
          throw Error("retraction mismatch");
        retractions++;
        observed.push(r);
        continue;
      }
      const t = c.receipt.triples[j++],
        r: any = byId.get(t.id);
      if (!r) throw Error("assertion missing");
      const expect: any = {
        id: t.id,
        entity_id: op.entityId,
        attribute: op.attribute,
        value_type: op.value.type,
        value_string: null,
        value_number: null,
        value_boolean: null,
        value_datetime: null,
        value_json: null,
        recorded_at: c.receipt.instant,
        recorded_position: native,
        valid_from: op.validFrom ?? c.receipt.instant,
        valid_to: op.validTo ?? null,
        created_by: op.createdBy ?? c.meta.actor ?? null,
        retracted_at: null,
        retracted_position: null,
        retract_tx_id: null,
        entity_type: op.entityType ?? null,
        schema_version: 1,
        tx_id: c.receipt.txId,
      };
      const type = op.value.type;
      expect[type === "integer" || type === "ref" ? "value_string" : "value_" + type] =
        type === "boolean"
          ? Number(op.value.value)
          : type === "json"
            ? JSON.stringify(op.value.value)
            : op.value.value;
      const actual =
        r.retracted_position === null
          ? r
          : { ...r, retracted_at: null, retracted_position: null, retract_tx_id: null };
      if (
        (r.retracted_position !== null && r.retracted_position <= native) ||
        canonical(actual) !== canonical(expect)
      )
        throw Error("assertion content mismatch");
      assertions++;
      observed.push(actual);
    }
    const witness = canonical({ observed, claim }),
      binding = createHash("sha256").update(witness).digest("hex");
    positionMap.push({ reference: c.reference, native: c.receipt.position, binding });
    reference++;
  }
  const bytes = Buffer.from(results.map((c: any) => canonical(c)).join("\n") + "\n");
  intent.update(bytes);
  fs.writeSync(fd, gzipSync(bytes));
  groups++;
  if (groups % 100 === 0)
    console.log(
      JSON.stringify({
        N,
        groups,
        reference,
        assertions,
        free: free(),
        wallS: (performance.now() - started) / 1000,
      }),
    );
}
try {
  for (const c of seedCommands(N)) {
    pending.push(c);
    if (pending.length === 64) await flush();
  }
  await flush();
  if (reference !== W0.populationBasis(W0.rung(N)).tx) throw Error("incomplete seed coverage");
  const d = new Database(log.segmentPath, { readonly: true });
  const subjects = d
    .prepare(
      "SELECT name FROM ents WHERE name LIKE 'pl:%' AND instr(name,'/')=0 ORDER BY name LIMIT 300",
    )
    .all()
    .map((r: any) => r.name);
  d.close();
  const passes = [];
  for (const mode of ["first-touch", "warm"]) {
    const start = performance.now();
    let readRows = 0,
      roundTrips = 0;
    for (const subject of subjects) {
      let todo = [subject];
      const seen = new Set<string>();
      while (todo.length) {
        const entities = todo.filter((e) => !seen.has(e));
        if (!entities.length) break;
        entities.forEach((e) => seen.add(e));
        const answer = await log.pull(broker.head(), { entities });
        if (!answer.eligible) throw Error("benchmark basis unavailable");
        roundTrips++;
        readRows += answer.rows.length;
        todo = answer.rows
          .filter((r: any) => r.value_type === "ref")
          .map((r: any) => r.value_string);
      }
    }
    passes.push({
      mode,
      subjects: subjects.length,
      rows: readRows,
      roundTrips,
      wallMs: performance.now() - start,
    });
  }
  readBench = {
    passes,
    cache: "No macOS page-cache purge; first-touch follows seed/readback",
    bytesPerPull: "Not measured: better-sqlite3 does not expose SQLITE_DBSTATUS_CACHE_MISS",
  };
  status = "SEEDED-CONTENT-VERIFIED";
} catch (e) {
  error = String(e);
  status = error.includes("RESOURCE-ABORT") ? "RESOURCE-ABORT" : "ERROR";
  process.exitCode = 1;
} finally {
  fs.closeSync(fd);
  while (log.purgeFrames().removed) {}
  const marker = log.writer.sync("marker");
  await managed.dispose();
  await broker.close();
  const db = new Database(path.join(out, "store/broker.db"), { readonly: true }),
    pageCount = db.pragma("page_count", { simple: true }) as number,
    pageSize = db.pragma("page_size", { simple: true }) as number;
  const dbstat = db
      .prepare(
        "SELECT name,sum(pgsize) bytes,sum(payload) payload FROM dbstat GROUP BY name ORDER BY bytes DESC",
      )
      .all(),
    fallback = db
      .prepare(
        "SELECT sum(n) n FROM (SELECT count(*) n FROM facts WHERE x IS NOT NULL UNION ALL SELECT count(*) FROM history WHERE x IS NOT NULL UNION ALL SELECT count(*) FROM journal WHERE x IS NOT NULL)",
      )
      .get();
  db.close();
  fs.writeFileSync(path.join(out, "position-map.json"), JSON.stringify(positionMap));
  latencies.sort((a, b) => a - b);
  const logical = pageCount * pageSize;
  const buildsStillMatch = canonical(builds) === canonical(artifactHashes());
  // [EXP-HS01] Why: a complete seed is distinct from passing the 10k storage bar.
  // Rejected: exit zero after merely measuring an oversized or incomplete population.
  const sizeVerdict =
    N !== 10000
      ? "DIAGNOSTIC"
      : status === "SEEDED-CONTENT-VERIFIED" &&
          buildsStillMatch &&
          assertions > 0 &&
          logical <= 1400000000 &&
          logical / assertions <= 300
        ? "PASS"
        : "FAIL";
  const receipt = {
    status,
    sizeVerdict,
    builds,
    buildsStillMatch,
    readBench,
    error,
    N,
    groups,
    reference,
    assertions,
    retractions,
    wallS: (performance.now() - started) / 1000,
    freeStart,
    freeEnd: free(),
    logicalBytes: logical,
    bytesPerAssertion: logical / assertions,
    prediction: { bytesPerAssertion: 259, logical10k: 1200000000 },
    bar: { bytesPerAssertion: 300, logical10k: 1400000000 },
    dbstat,
    fallback,
    marker,
    latencyMs: {
      p50: latencies[Math.floor(latencies.length * 0.5)],
      p99: latencies[Math.floor(latencies.length * 0.99)],
    },
    intentSha256: intent.digest("hex"),
    positionMapSha256: createHash("sha256")
      .update(fs.readFileSync(path.join(out, "position-map.json")))
      .digest("hex"),
  };
  if (!receipt.buildsStillMatch || sizeVerdict === "FAIL") process.exitCode = 1;
  fs.writeFileSync(path.join(out, "seed-manifest.json"), JSON.stringify(receipt, null, 2));
  console.log(JSON.stringify(receipt));
}
