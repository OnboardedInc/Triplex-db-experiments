// [DX-XQ6] Server run for the exact sweep on the sealed 1 billion database (EXACT-SWEEP.md section 6 has the command,
// its duration and the predictions, written before any run). It reads a demo stack brought up with the sweep on
// (DX_SWEEP=1 DX_SWEEP_PERMITS=6 DX_SWEEP_PER_ACCOUNT=6 DX_SWEEP_QUEUE_MS=5000 through demo/server-up.sh) and writes only
// in arm B (a save loop on one other account of the working copy).
//   node --no-warnings --experimental-transform-types lab/experiments/EXP-DX1/xq6/server.ts READY_FILE OUT [ACCOUNT]
// Arm A, alone: for 1, 3 and 6 parallel parts (ID prefixes pl:00000..pl:00009, at most that many running at once),
//   the read gateway restarted (cold), an exact count of every subject of the account matching one condition, pinned
//   to the head; then a filtered list (result ids, pages of 100) over the first 10,000 subjects, cold and repeated warm.
// Arm B, beside load: 256 pinned readers re-reading 5,000 subjects of the other accounts at position 87,002, a save loop
//   (one commit per subject's save, 17 facts, 23 saves/s, on account-005) for 120 s alone, then the same with a
//   one-part count of the account running, then with a three-part count.
// [DX-XQ9] Arm C, alone, only when the read gateway has TX2_SWEEP_SHAPES (exp/DX-XQ9-question-shapes, predictions in
//   xq9/QUESTION-SHAPES.md section 6): a question over each subject's tasks (has by key, i9:, at least 3 not complete)
//   for 1, 3 and 6 parts, cold; the top 100 profiles (wk:) by pay, descending, for 1, 3 and 6 parts (each part keeps its
//   own top 100 in its cursor; the parts' tops are merged here, which is exact because the top 100 of a union is in the
//   union of the parts' top 100s), cold; and the same top 100 by one part again, warm. Set DX_XQ9_SKIP_B=1 to stop after it.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Effect, Layer, ManagedRuntime } from "effect";

const REPO = path.resolve(import.meta.dirname, "../../../..");
const dist = (pkg: string, file: string) => pathToFileURL(path.join(REPO, "packages", pkg, "dist", file)).href;
const core: any = await import(dist("core", "index.js"));
const runtimeApi: any = await import(dist("core", "runtime/index.js"));
const datomic: any = await import(dist("datomic", "index.js"));
const [readyFile, out, account = "account-003"] = process.argv.slice(2);
assert(readyFile && out && !fs.existsSync(out), "usage: server.ts READY_FILE NEW_OUT [ACCOUNT]");
fs.mkdirSync(out, { recursive: true });
const ready = JSON.parse(fs.readFileSync(readyFile, "utf8"));
assert(ready.version === "triplex-demo-ready/1" && /^tx2-dx[a-z0-9-]+$/.test(ready.prefix));
const readUrl = `http://127.0.0.1:${ready.readPort}`, writeUrl = `http://127.0.0.1:${ready.writePort}`;
const db: string = ready.database;
// Overrides exist only for the Mac dry run (dryrun.ts); the server command sets none of them.
const OLD = Number(process.env["DX_XQ6_OLD"] ?? 87002), SUBJECTS = Number(process.env["DX_XQ6_SERVER_SUBJECTS"] ?? 100_000);
const WINDOW_MS = Number(process.env["DX_XQ6_WINDOW_S"] ?? 120) * 1000;
const log = (kind: string, data: object = {}) => {
  const line = JSON.stringify({ kind, at: new Date().toISOString(), ...data });
  console.log(line);
  fs.appendFileSync(path.join(out, "server.jsonl"), line + "\n");
};
let reader = new datomic.DatomicClient(readUrl, 600_000);
const pad = (n: number) => String(n).padStart(8, "0");
const sid = (acct: string, i: number) => `acct/${acct}/pl:${pad(i)}`;
const restartReader = async () => {
  reader.close();
  execFileSync("docker", ["restart", `${ready.prefix}-gw-r`], { stdio: "ignore" });
  for (let i = 0; i < 600; i++) {
    try { if ((await fetch(`${readUrl}/health`, { signal: AbortSignal.timeout(2000) })).ok) break; } catch {}
    await new Promise((s) => setTimeout(s, 1000));
  }
  reader = new datomic.DatomicClient(readUrl, 600_000);
  await reader.basis(db);
};
const head = Number((await reader.basis(db)).position.v);
// The condition: the first unprotected string fact of subject 0 (an attribute every loader subject carries).
const sample = await reader.rows(db, { entityIds: [sid(account, 0)], basis: { recordedPosition: head, validAt: Date.now() } });
const fact = sample.find((r: any) => r.value_type === "string" && !/privacy|identity/.test(r.attribute));
assert(fact, "subject 0 has no string fact to filter on");
const where = [{ attribute: fact.attribute, op: "eq", value: { type: "string", value: fact.value_string } }];
const kind = { prefix: "pl:", shape: "pl:{8 digits}" };
const parts = Array.from({ length: 10 }, (_, d) => `pl:0000${d}`);
log("question", { head, account, where, parts });

// A pool of `width` workers over the ten parts; every part pinned to one position and valid time.
const countWith = async (width: number) => {
  const validAt = Date.now(), t0 = performance.now();
  const queue = [...parts];
  let count = 0, pages = 0, examined = 0, busy = 0, cpu = 0, gw = 0, rows = 0;
  await Promise.all(Array.from({ length: width }, async () => {
    for (let prefix = queue.shift(); prefix; prefix = queue.shift()) {
      let next: string | null = null;
      do {
        const r = { account, from: { ...kind, prefix }, where, result: "count", bounds: { subjects: 2000, ms: 2000 } };
        const page: any = await datomic.sweepPageWaiting(reader, db, next ? { ...r, cursor: next } : { ...r, basis: { recordedPosition: head, validAt } });
        pages++; examined += page.examined; busy += page.busyRetries; cpu += page.cpuMicros; gw += page.micros.total; rows += page.rows; next = page.next;
        if (!next) count += page.count;
      } while (next);
    }
  }));
  return { width, count, pages, examined, rows, busyRetries: busy, cpuSeconds: cpu / 1e6, gatewaySeconds: gw / 1e6, seconds: (performance.now() - t0) / 1000 };
};
const listFirst = async () => {
  const t0 = performance.now(), validAt = Date.now();
  let next: string | null = null, ids = 0, pages = 0, examined = 0, cpu = 0;
  do {
    const r = { account, from: { ...kind, prefix: "pl:0000" }, where, limit: 100, bounds: { subjects: 2000, ms: 2000 } };
    const page: any = await datomic.sweepPageWaiting(reader, db, next ? { ...r, cursor: next } : { ...r, basis: { recordedPosition: head, validAt } });
    ids += page.ids.length; pages++; examined += page.examined; cpu += page.cpuMicros; next = page.next;
  } while (next);
  return { ids, pages, examined, cpuSeconds: cpu / 1e6, seconds: (performance.now() - t0) / 1000 };
};

// ---- Arm A ----
for (const width of [1, 3, 6]) {
  await restartReader();
  const r = await countWith(width);
  log("A-count", { ...r, msPerSubject: (r.seconds * 1000) / r.examined, examinedIsAll: r.examined === SUBJECTS });
}
await restartReader();
log("A-list-cold", await listFirst());
log("A-list-warm", await listFirst());

// ---- Arm C (DX-XQ9) ----
const shapesOn = typeof ready.questionRoutes?.sweepShapes === "string" && ready.questionRoutes.sweepShapes.length > 0;
if (shapesOn) {
  const runParts = async (width: number, base: (prefix: string) => object, validAt: number) => {
    const queue = [...parts], t0 = performance.now();
    const out: any[] = [];
    let pages = 0, examined = 0, related = 0, relatedRows = 0, rows = 0, cpu = 0, gw = 0, maxCursor = 0;
    await Promise.all(Array.from({ length: width }, async () => {
      for (let prefix = queue.shift(); prefix; prefix = queue.shift()) {
        let next: string | null = null;
        do {
          const r = { account, ...base(prefix), bounds: { subjects: 2000, ms: 2000 } };
          const page: any = await datomic.sweepPageWaiting(reader, db, next ? { ...r, cursor: next } : { ...r, basis: { recordedPosition: head, validAt } });
          pages++; examined += page.examined; related += page.related ?? 0; relatedRows += page.relatedRows ?? 0; rows += page.rows;
          cpu += page.cpuMicros; gw += page.micros.total; next = page.next; maxCursor = Math.max(maxCursor, next?.length ?? 0);
          if (!next) out.push(page);
        } while (next);
      }
    }));
    return { width, pages, examined, rows, related, relatedRows, cpuSeconds: cpu / 1e6, gatewaySeconds: gw / 1e6, maxCursorBytes: maxCursor, seconds: (performance.now() - t0) / 1000, finals: out };
  };
  const child = (prefix: string) => ({ from: { ...kind, prefix }, result: "count",
    where: [{ op: "has", related: { prefix: "i9:", link: "key" }, quantifier: { op: "gte", value: 3 }, where: [{ attribute: ":task/status", op: "ne", value: { type: "string", value: "complete" } }] }] });
  const top = (prefix: string) => ({ from: { prefix: prefix.replace(/^pl:/, "wk:") }, result: "top", limit: 100, order: { by: ":person/custom-pay-cents", type: "integer", direction: "desc" } });
  const merge = (finals: any[]) => {
    const all = finals.flatMap((p) => p.ids.map((id: string, i: number) => [id, p.values[i] === null ? null : BigInt(p.values[i].value)] as [string, bigint | null]));
    return all.sort(([ia, va], [ib, vb]) => (va === null && vb === null ? (ia < ib ? -1 : 1) : va === null ? 1 : vb === null ? -1 : va === vb ? (ia < ib ? -1 : 1) : va > vb ? -1 : 1)).slice(0, 100);
  };
  const validAt = Date.now();
  const tops: string[] = [];
  for (const width of [1, 3, 6]) {
    await restartReader();
    const r = await runParts(width, child, validAt);
    const count = r.finals.reduce((n, p) => n + p.count, 0);
    const { finals: _f, ...rest } = r;
    log("C-child", { ...rest, count, msPerSubject: (r.seconds * 1000) / r.examined, relatedPerSubject: r.related / r.examined, examinedIsAll: r.examined === SUBJECTS });
  }
  for (const width of [1, 3, 6]) {
    await restartReader();
    const r = await runParts(width, top, validAt);
    const merged = merge(r.finals);
    tops.push(JSON.stringify(merged.map(([id, v]) => [id, String(v)])));
    const { finals: _f, ...rest } = r;
    log("C-top", { ...rest, first: merged.slice(0, 3).map(([id, v]) => [id, String(v)]), msPerProfile: (r.seconds * 1000) / r.examined });
  }
  const warm = await runParts(1, top, validAt);
  tops.push(JSON.stringify(merge(warm.finals).map(([id, v]) => [id, String(v)])));
  const { finals: _w, ...warmRest } = warm;
  log("C-top-warm", { ...warmRest, msPerProfile: (warm.seconds * 1000) / warm.examined, sameTopInEveryArm: new Set(tops).size === 1 });
}
if (process.env["DX_XQ9_SKIP_B"] === "1") { reader.close(); log("done"); process.exit(0); }

// ---- Arm B ----
// The scope from the database name itself (s2- then base64url of ["triplex-scope-v1", env, tenant, database, generation]).
const [tag, env, tenant, database, generation] = JSON.parse(Buffer.from(db.slice(3), "base64url").toString());
assert(tag === "triplex-scope-v1", "unexpected database name");
const scope = runtimeApi.DatabaseScope.make({ env, tenant, database, generation });
const writer = new datomic.DatomicClient(writeUrl, 60_000);
const rt = ManagedRuntime.make(runtimeApi.Runtime.define({
  name: "datomic",
  storage: Layer.succeed(runtimeApi.StorageAdapter, datomic.makeDatomicStorageAdapter(writer, scope, { layout: "lean", serverRecordTime: true })),
  queries: Layer.succeed(runtimeApi.QueryExecutor, datomic.makeDatomicQueryExecutor(writer, scope)),
}).layer({ scope, capabilities: runtimeApi.Capabilities.none })) as any;
const others = ["account-001", "account-002", "account-004", "account-006", "account-007", "account-008", "account-009", "account-010"];
// The readers re-read a fixed set of 5,000 subjects of the other accounts (the card's "re-read" readers): they are
// served from the read gateway's cache once warm, so the window shows what a sweep's segment loads do to that cache.
const hot = Array.from({ length: 5000 }, (_, k) => sid(others[k % others.length]!, (k * 7919) % SUBJECTS));
const window = async (label: string, sweepWidth: number) => {
  let stop = false;
  const lat: number[] = [], saveLat: number[] = [];
  let reads = 0, saves = 0, saveErrors = 0, readErrors = 0;
  const readers = Array.from({ length: 256 }, async () => {
    while (!stop) {
      const id = hot[Math.floor(Math.random() * hot.length)]!;
      const t0 = performance.now();
      try { await reader.rows(db, { entityIds: [id], basis: { recordedPosition: OLD, validAt: 1.8e12 } }); reads++; lat.push(performance.now() - t0); }
      catch { readErrors++; }
    }
  });
  const saver = (async () => {
    for (let n = 0; !stop; n++) {
      const due = performance.now() + 1000 / 23;
      const s = sid("account-005", Math.floor(Math.random() * SUBJECTS));
      const t0 = performance.now();
      try {
        await rt.runPromise(Effect.flatMap(core.Triples, (t: any) => t.transact(Array.from({ length: 17 }, (_, k) => ({
          op: "assert", entityId: s, entityType: "Subject", attribute: `:xq6/probe-${k}`, value: { type: "string", value: `${label} ${n}` }, validFrom: 0 })), { actor: "xq6-server" })));
        saves++; saveLat.push(performance.now() - t0);
      } catch { saveErrors++; }
      const wait = due - performance.now();
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    }
  })();
  const t0 = performance.now();
  const sweepResult = sweepWidth ? await countWith(sweepWidth) : (await new Promise((r) => setTimeout(r, WINDOW_MS)), null);
  stop = true;
  await Promise.all([...readers, saver]);
  const q = (xs: number[], f: number) => { const s = [...xs].sort((x, y) => x - y); return Math.round(s[Math.min(s.length - 1, Math.floor(f * s.length))]! * 10) / 10; };
  const threads = await reader.request("GET", "/v2/admin/threads");
  log("B-window", { label, sweepWidth, seconds: (performance.now() - t0) / 1000, reads, readsPerSecond: reads / ((performance.now() - t0) / 1000),
    readP50: q(lat, 0.5), readP99: q(lat, 0.99), readErrors, saves, saveP50: q(saveLat, 0.5), saveP99: q(saveLat, 0.99), saveErrors, sweep: sweepResult, threads });
};
await window("warm-up", 0);
await window("control", 0);
await window("one-part sweep", 1);
await window("three-part sweep", 3);
await window("control again", 0);
await rt.dispose();
writer.close(); reader.close();
log("done");
