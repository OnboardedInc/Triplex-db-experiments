import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { DatomicClient } from "../../../../packages/datomic/dist/index.js";
import { runtimeApi } from "../../../bench/lib/triplex.ts";
import { openComposition } from "../../../bench/lib/composition.ts";
import { canonicalWorld } from "../../../bench/lib/canonical.ts";
import { ids } from "../../../bench/lib/world.ts";
import { tenantAccounts, tenantScope, keyFor, type Topology } from "./tenants.ts";
import { smallScope } from "./small-plan.ts";
type Binding = { source: string; slot: string; nonce: string };
type Engine = { id: string; address: string; cgroup: string };
const write = (file: string, body: unknown) =>
  fs.writeFileSync(file, JSON.stringify(body, null, 2) + "\n", { flag: "wx" });
const cmd = (exe: string, args: string[], timeout = 20000) =>
  execFileSync(exe, args, { encoding: "utf8", timeout, maxBuffer: 24 * 1024 ** 2 }).trim();
const docker = (...args: string[]) => cmd("docker", args, 180000);
const read = (file: string) => fs.readFileSync(file, "utf8").trim();
const sha = (b: string) => createHash("sha256").update(b).digest("hex");
function metricSample(directory: string, role: string, b: Binding, since: number) {
  const f = path.join(directory, "engines", b.slot, "trace/raw", role + ".jsonl");
  if (!fs.existsSync(f)) return [];
  const fd = fs.openSync(f, "r"),
    length = fs.fstatSync(fd).size,
    bytes = Buffer.alloc(Math.min(length, 4 * 1024 ** 2));
  try {
    fs.readSync(fd, bytes, 0, bytes.length, length - bytes.length);
  } finally {
    fs.closeSync(fd);
  }
  return bytes
    .toString()
    .split("\n")
    .slice(bytes.length === length ? 0 : 1, -1)
    .filter((s) => s.includes('"metrics"'))
    .flatMap((s) => {
      const r = JSON.parse(s);
      if (r.type !== "metrics" || r.at < since) return [];
      assert(r.run === b.slot && r.slot === b.slot && r.source === b.source);
      return [
        {
          at: r.at,
          memoryIndexMB: r.counters?.memoryIndexMB ?? null,
          cache: r.counters?.objectCache ?? null,
        },
      ];
    });
}
function javaInfo(id: string, dir: string, role: string, b: Binding, since: number, mark: string) {
  const listing = docker("top", id, "-eo", "pid,comm")
    .split("\n")
    .slice(1)
    .map((s) => s.trim().split(/\s+/))
    .filter((r) => r[1] === "java");
  assert.equal(listing.length, 1);
  const pid = listing[0]![0]!,
    at = Date.now(),
    proc = read("/proc/" + pid + "/status");
  const heap = cmd("jattach", [pid, "jcmd", "GC.heap_info"]),
    threads = cmd("jattach", [pid, "jcmd", "Thread.print"]);
  fs.writeFileSync(path.join(dir, mark + "-" + role + "-heap.txt"), heap + "\n", { flag: "wx" });
  fs.writeFileSync(path.join(dir, mark + "-" + role + "-threads.txt"), threads + "\n", {
    flag: "wx",
  });
  const h = heap.match(/heap\s+total\s+(\d+)K,\s+used\s+(\d+)K/i);
  assert(h, "HotSpot heap counters unavailable");
  const named = threads
    .split("\n")
    .filter((l) => l.startsWith('"'))
    .map((l) => l.match(/^"([^"]+)"/)?.[1] ?? "");
  const pipeline = named.filter((n) =>
    /^(processor|writer|fressianer|notify-fressianer|block-notifier|log-treeifier|reader)-/.test(n),
  );
  return {
    at,
    heapCommitted: Number(h[1]) * 1024,
    heapUsed: Number(h[2]) * 1024,
    threads: Number(/^Threads:\s+(\d+)/m.exec(proc)?.[1]),
    javaThreads: named.length,
    pipelineThreads: pipeline.length,
    pipelineNamesSha256: sha(JSON.stringify(pipeline.sort())),
    rss: Number(/^VmRSS:\s+(\d+)/m.exec(proc)?.[1]) * 1024,
    metrics: metricSample(path.dirname(dir), role, b, since),
  };
}
function collectPoint(
  dir: string,
  b: Binding,
  engines: Record<string, Engine>,
  count: number,
  since: number,
  snapshot: () => unknown,
) {
  const md = path.join(dir, "scope-footprint"),
    mark = "idle-" + count;
  const point = {
    ...b,
    openScopes: count,
    readerClient: process.memoryUsage(),
    at: Date.now(),
    postgres: snapshot(),
    engines: Object.fromEntries(
      Object.entries(engines).map(([role, e]) => [
        role,
        {
          id: e.id,
          bytes: Number(read(path.join(e.cgroup, "memory.current"))),
          ...(role === "pg" ? {} : javaInfo(e.id, md, role, b, since, mark)),
        },
      ]),
    ),
  };
  write(path.join(md, mark + ".json"), point);
  return point;
}
function clients(engines: Record<string, Engine>) {
  return ["gw-w", "gw-r"].map(
    (role) => new DatomicClient("http://" + engines[role]!.address + ":8080", 45000),
  );
}
function closeClients(cs: DatomicClient[]) {
  for (const c of cs) c.close();
}
function nameOf(b: Binding, i: number, layout?: Topology) {
  return layout
    ? tenantScope(
        { study: "small", topology: layout, physical: layout === "pooled" ? 0 : i },
        b.nonce,
      )
    : smallScope(b.nonce, i);
}
async function open(
  cs: DatomicClient[],
  b: Binding,
  i: number,
  mustBeNew: boolean,
  layout?: Topology,
  probe = false,
) {
  const name = nameOf(b, i, layout) + (probe ? "-empty" : ""),
    key = runtimeApi.DatabaseScope.test(name),
    expected = "s2-" + Buffer.from(String(key)).toString("base64url"),
    start = performance.now();
  let operation = "create write database",
    createdOnWrite = false;
  try {
    for (const [peer, c] of cs.entries()) {
      operation = peer === 0 ? "open write gateway" : "open read gateway";
      const d = await c.create(key, "lean", true, 45000);
      assert.equal(d.db, expected);
      assert.equal(d.layout, "lean");
      assert.equal(d.created, mustBeNew && peer === 0);
      if (peer === 0) createdOnWrite = true;
      operation = peer === 0 ? "pin write snapshot" : "pin read snapshot";
      const h = await c.begin(d.db);
      if (mustBeNew) assert.equal(h.position, 0);
      operation = "release checked snapshot";
      await c.release(d.db, h.handle);
    }
  } catch (e) {
    if (e instanceof Error) Object.assign(e, { operation, createdOnWrite });
    throw e;
  }
  return {
    account: i,
    scope: name,
    database: expected,
    openedAt: Date.now(),
    elapsedMs: performance.now() - start,
  };
}
// [DX-SCALE1] Why: measuring empty database opens separately distinguishes a transactor limit from the later cost of a hundred application drivers. Rejected: attributing client heap exhaustion to Datomic database creation.
export async function openSmallScopes(
  dir: string,
  b: Binding,
  engines: Record<string, Engine>,
  snapshot: () => unknown,
  layout?: Topology,
) {
  const md = path.join(dir, "scope-footprint");
  fs.mkdirSync(md);
  if (spawnSync("jattach", [], { encoding: "utf8" }).error?.message.includes("ENOENT"))
    cmd("apt-get", ["-q", "-y", "install", "jattach"], 180000);
  write(path.join(md, "tool.json"), {
    package: cmd("dpkg-query", ["-W", "jattach"]),
    at: Date.now(),
  });
  const cs = clients(engines),
    opened: Awaited<ReturnType<typeof open>>[] = [],
    points = [];
  let since = Date.now();
  process.env.DATOMIC_URL = "http://" + engines["gw-w"]!.address + ":8080";
  process.env.DATOMIC_READ_URLS = "http://" + engines["gw-r"]!.address + ":8080";
  process.env.TRIPLEX_DATOMIC_LAYOUT = "lean";
  let pool: Awaited<ReturnType<typeof openComposition>> | undefined;
  const readerViews: { account: string; database: string; client: DatomicClient }[] = [];
  let lastPosition = 0;
  try {
    for (const count of [0, 1, 10, 50, 100]) {
      while (opened.length < count) {
        const i = opened.length;
        try {
          const pooled = layout === "pooled";
          const o = await open(cs, b, i, !pooled || i === 0, layout, pooled);
          if (pooled) {
            pool ??= await openComposition("reach", "datomic", o.scope);
            const key = keyFor(i);
            const tx = await pool.transact(
              [
                {
                  op: "assert",
                  entityId: "tenant:catalog",
                  attribute: ":tenant/account",
                  value: { type: "string", value: key },
                  validFrom: 0,
                },
              ],
              { commandId: b.nonce + ":register:" + key, actor: "account-registry" },
            );
            assert(
              tx.ok &&
                tx.value.position === lastPosition + 1 &&
                tx.value.triples.length === 1 &&
                tx.value.triples[0]!.value.value === key,
            );
            lastPosition = tx.value.position;
          }
          const reader = pooled
            ? cs[1]!
            : new DatomicClient("http://" + engines["gw-r"]!.address + ":8080", 45000);
          readerViews.push({ account: keyFor(i), database: o.database, client: reader });
          const h = await reader.begin(o.database);
          assert(h.position === lastPosition);
          await reader.release(o.database, h.handle);
          opened.push({ ...o, account: i });
        } catch (e) {
          if ((e as any)?.name === "AssertionError") throw e;
          const failure = {
            ...b,
            stage: "opening empty databases",
            requested: 100,
            opened: i,
            failedAccount: i,
            operation: (e as any)?.operation,
            createdOnWrite: (e as any)?.createdOnWrite,
            points,
            error: String(e),
            prior: opened,
            at: Date.now(),
          };
          write(path.join(dir, "database-limit.json"), failure);
          return false;
        }
      }
      if (pool && count) {
        const basis = { position: lastPosition, validAt: Date.now() };
        const out = await pool.sweepPage(["tenant:catalog"], basis);
        assert.deepEqual(out.reportedBasis, basis);
        assert.deepEqual(
          out.rows.map((r) => r.value.value).sort(),
          Array.from({ length: count }, (_, i) => keyFor(i)).sort(),
        );
      }
      // [DX-SCALE1] Why: native memory-index counters arrive on a minute cadence. Rejected: sampling the prior account plateau immediately after opening another reader.

      await sleep(65000);
      points.push(collectPoint(dir, b, engines, count, since, snapshot));
      since = Date.now();
      console.log(
        JSON.stringify({ kind: "small-scope-open", count, source: b.source, nonce: b.nonce }),
      );
    }
    assert.equal(new Set(opened.map((o) => o.database)).size, layout === "pooled" ? 1 : 100);
    write(path.join(dir, "open-scopes.json"), {
      ...b,
      layout: layout ?? "separate",
      opened,
      points,
      registeredAt: lastPosition,
      idleReaderViews: readerViews.length,
    });
    return true;
  } finally {
    for (const v of readerViews) if (v.client !== cs[1]) v.client.close();
    if (pool) {
      await pool.close();
      const name = nameOf(b, 0, layout) + "-empty",
        key = runtimeApi.DatabaseScope.test(name);
      const retired = await cs[0]!.delete(key);
      assert(
        retired.deleted && retired.db === "s2-" + Buffer.from(String(key)).toString("base64url"),
      );
      write(path.join(md, "registry-cleanup.json"), { ...b, scope: name, database: retired.db });
    }
    closeClients(cs);
  }
}
type ReadProof = {
  account: number;
  scope: string;
  position: number;
  basis: { recordedAt: number; recordedPosition: number; validAt: number };
  rows: number;
  digest: string;
};
async function witness(
  b: Binding,
  account: number,
  prior?: ReadProof,
  layout?: Topology,
): Promise<ReadProof> {
  const subject =
    layout === "pooled"
      ? tenantAccounts({ study: "small", topology: "pooled", physical: 0 })[account]!.first
      : 0;
  const scope = nameOf(b, account, layout),
    c = await openComposition("reach", "datomic", scope);
  try {
    const position = await c.currentPosition();
    assert(position > 0);
    if (prior) assert.equal(position, prior.position);
    const time = Date.now(),
      basis = prior?.basis ?? { recordedAt: time, recordedPosition: position, validAt: time },
      p = await c.pull(ids.placement(subject), basis);
    if (layout)
      assert(
        p.triples.some(
          (r) => r.attribute === ":subject/account" && r.value.value === keyFor(account),
        ),
      );
    assert(p.triples.length > 75);
    const r = {
      account,
      scope,
      position,
      basis,
      rows: p.triples.length,
      digest: sha(canonicalWorld(p.triples)),
    };
    if (prior) assert.deepEqual(r, prior);
    return r;
  } finally {
    await c.close();
  }
}
async function batches<T>(fn: (i: number) => Promise<T>) {
  const out: T[] = [];
  for (let i = 0; i < 100; i += 4)
    out.push(
      ...(await Promise.all(Array.from({ length: Math.min(4, 100 - i) }, (_, j) => fn(i + j)))),
    );
  return out;
}
// [DX-SCALE1] Why: restored availability means newly opened clients get the exact pre-restart data for their own database. Rejected: a health response, a pre-existing connection or an empty recreate.
export async function recoverSmallScopes(
  dir: string,
  b: Binding,
  engines: Record<string, Engine>,
  layout?: Topology,
) {
  const setEndpoints = () => {
    for (const role of ["gw-w", "gw-r"]) {
      const addr = docker(
        "inspect",
        "--format",
        "{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}",
        engines[role]!.id,
      );
      engines[role]!.address = addr;
    }
    process.env.DATOMIC_URL = "http://" + engines["gw-w"]!.address + ":8080";
    process.env.DATOMIC_READ_URLS = "http://" + engines["gw-r"]!.address + ":8080";
    process.env.TRIPLEX_DATOMIC_LAYOUT = "lean";
    process.env.DX_STRICT_RECORD_CLOCKS = "1";
  };
  setEndpoints();
  const before = await batches((i) => witness(b, i, undefined, layout));
  write(path.join(dir, "pre-restart.json"), { ...b, before });
  const stoppingAt = Date.now();
  for (const role of ["gw-r", "gw-w", "tx", "pg"])
    docker("stop", "--time", "20", engines[role]!.id);
  const coldStart = Date.now();
  for (const role of ["pg", "tx", "gw-w", "gw-r"]) {
    docker("start", engines[role]!.id);
    if (role === "pg") {
      const limit = Date.now() + 90000;
      while (
        spawnSync("docker", ["exec", engines.pg!.id, "pg_isready", "-U", "postgres"]).status !== 0
      ) {
        assert(Date.now() < limit);
        await sleep(500);
      }
    }
  }
  setEndpoints();
  const cs = clients(engines);
  try {
    const deadline = Date.now() + 240000;
    for (const c of cs) {
      for (;;) {
        try {
          await c.health();
          break;
        } catch (e) {
          if (Date.now() > deadline) throw e;
          await sleep(500);
        }
      }
    }
    const gatewayReady = Date.now(),
      results = await batches(async (i) => {
        const t = performance.now(),
          o = await open(cs, b, i, false, layout),
          r = await witness(b, i, before[i], layout);
        return { ...o, proof: r, verifiedAt: Date.now(), ms: performance.now() - t };
      });
    assert.equal(results.length, 100);
    write(path.join(dir, "restart.json"), {
      ...b,
      stoppingAt,
      coldStart,
      gatewayReady,
      allReopenedAt: Date.now(),
      reopenConcurrency: 4,
      results,
    });
  } finally {
    closeClients(cs);
  }
}
