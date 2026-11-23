import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";
import { DatomicClient } from "../../../../packages/datomic/dist/index.js";
import { play, type Sender } from "../scale1/decision/writes.ts";
import { now } from "../scale1/decision/observer.ts";
import { field, sha, task, type Write } from "../scale1/decision/plan.ts";
import { creditModeSelection } from "../prep1/rolling-credits.ts";
import { command } from "../w1/group/workload.ts";

// [DX-JVM1] Why: prove on the Mac that a one-time read of the restart's active set happens once, stops before
// admission, leaves no reader, keeps exact reads, and removes the first-window storage reads of the active set.
// Rejected: timing claims on the shared Mac, a prefetch of offered subjects, or replaying saves before admission.
type Phase = "seed" | "pre" | "read" | "post";
const [phase, arm, witnessPath] = process.argv.slice(2) as [Phase, string, string];
assert(["seed", "pre", "read", "post"].includes(phase) && ["today", "startup-read"].includes(arm) && witnessPath);
const attempt = process.env.PREP1_ATTEMPT!;
assert.match(attempt, /^[a-f0-9-]{36}$/);
const client = new DatomicClient(process.env.PREP1_PEERS!, 30000);
const nonce = `${attempt}-${arm}`;
const scope = JSON.stringify(["triplex-scope-v1", "test", "startup-read", nonce, 0]);
const accounts = 10, perAccount = 50, active = 25, controls = 5, fields = 160, kept = 4;
const selection = creditModeSelection("rolling6");
type Row = Sender["rows"] extends Map<string, infer R> ? R extends (infer X)[] ? X : never : never;
type Witness = { attempt: string; arm: string; db: string; cut: number; rows: [string, Row[]][]; head?: number;
  preEnd?: number; report?: unknown };

const read = () => JSON.parse(readFileSync(witnessPath, "utf8")) as Witness;
const write = (w: Witness) => { writeFileSync(witnessPath + ".tmp", JSON.stringify(w)); renameSync(witnessPath + ".tmp", witnessPath); };
const owners = (from: number, to: number) => Array.from({ length: accounts }, (_, a) =>
  Array.from({ length: to - from }, (_, i) => ({ account: a, subject: from + i }))).flat();
const senders = (w: Witness, rows: Map<string, Row[]>): Sender[] => Array.from({ length: accounts }, () => ({
  client, rows, scope: { name: scope, db: w.db, cut: w.cut, seedCut: w.cut, accounts: Array.from({ length: accounts }, (_, i) => i) },
}));
function tape(list: { account: number; subject: number }[], label: string, gapMs: number): Write[] {
  return list.map((o, ordinal) => ({ ordinal, account: o.account, subject: o.subject, ms: ordinal * gapMs, width: 1,
    version: `${label}/${o.account}/${o.subject}` }));
}
async function head(db: string) {
  const pin = await client.begin(db);
  await client.release(db, pin.handle);
  return pin.position;
}

async function seed() {
  const { db, created } = await client.create(scope, "lean", true, 35000);
  assert(created);
  const rows = new Map<string, Row[]>();
  let cut = 0;
  const all = owners(0, perAccount);
  for (let i = 0; i < all.length; i += 2) {
    const batch = all.slice(i, i + 2);
    const facts = batch.flatMap((o) => Array.from({ length: fields }, (_, n) => ({ e: task(o.account, o.subject), a: field(n),
      v: { type: "string" as const, value: sha(["seed", o.account, o.subject, n]).slice(0, 40) } })));
    const change = command(`${nonce}-seed-${i}`, facts, [], false);
    const reply = await client.transact(db, change) as { position: { v: string }; recordedAt: { v: number } };
    cut = Number(reply.position.v);
    batch.forEach((o, j) => rows.set(task(o.account, o.subject), change.rows.slice(j * fields, j * fields + kept)
      .map((r) => ({ ...r, recorded_position: cut, recorded_at: reply.recordedAt.v }))));
  }
  // [DX-JVM1] Why: the seed must be in stored index segments, as at full size, not in the replayed memory index.
  const indexed = await client.request<{ completed: boolean }>("POST", `/v2/db/${db}/request-index`, { waitMs: 300000 });
  assert(indexed.completed, "seed index did not complete");
  write({ attempt, arm, db, cut, rows: [...rows] });
  console.log("JVM1_STARTUP_SEED " + JSON.stringify({ attempt, arm, db, cut, owners: rows.size, facts: rows.size * fields }));
}

async function pre() {
  const w = read();
  const rows = new Map(w.rows);
  // [DX-JVM1] Why: the traffic before the restart defines the active set that a restart's log tail names.
  const out = await play(senders(w, rows), tape(owners(0, active), "pre", 40), now() + 100, nonce + "-pre", true, true, selection);
  assert(out.rows.every((r) => r.status === "acked" && r.receipt), "pre-restart save not acknowledged");
  const position = await head(w.db);
  write({ ...w, rows: [...rows], head: position, preEnd: Date.now() });
  console.log("JVM1_STARTUP_PRE " + JSON.stringify({ attempt, arm, db: w.db, saves: out.rows.length, head: position }));
}

function readerThreads(pid: string) {
  return readdirSync(`/proc/${pid}/task`).map((t) => { try { return readFileSync(`/proc/${pid}/task/${t}/comm`, "utf8").trim(); } catch { return ""; } })
    .filter((name) => name.startsWith("tx2-sread"));
}

const roles = ["tx", "gw-w"] as const;
async function startupRead() {
  const w = read();
  const dir = process.env.TRIPLEX_STARTUP_READ_DIR!;
  const pids = { tx: process.env.TX_PID!, "gw-w": process.env.GW_PID! };
  assert(dir && Object.values(pids).every((pid) => /^\d+$/.test(pid)));
  const uri = process.env.DATOMIC_URI_TEMPLATE!.replace("{db}", w.db);
  const base = { uri, attempt: nonce, windowSeconds: 20, maxTransactions: 20000, maxOwners: 5000, maxSegments: 20000,
    timeLimitMs: 60000, threads: 4 };
  // The transactor reads the leaves the save function touches; the write peer reads the owner's leaves and public ID,
  // through its own serving connection, which it keeps.
  const requests = { tx: { ...base, aevt: [":triplex.entity/row", ":triplex.entity/rev"] },
    "gw-w": { ...base, aevt: [], avetId: true, releaseConnection: false } };
  const started = Date.now();
  for (const role of roles) {
    assert(!existsSync(`${dir}/startup-read-${role}.report.json`));
    writeFileSync(`${dir}/.startup-read-${role}.request.json`, JSON.stringify(requests[role]));
    renameSync(`${dir}/.startup-read-${role}.request.json`, `${dir}/startup-read-${role}.request.json`);
  }
  const reports: Record<string, any> = {};
  for (const role of roles) {
    while (!existsSync(`${dir}/startup-read-${role}.report.json`)) {
      assert(Date.now() - started < base.timeLimitMs + 30000, "start-up read report missing: " + role);
      await sleep(50);
    }
    reports[role] = JSON.parse(readFileSync(`${dir}/startup-read-${role}.report.json`, "utf8"));
  }
  const waitedMs = Date.now() - started;
  // [DX-JVM1] Why: admission opens only once both readers have finished and no reader thread remains in either JVM.
  console.log("JVM1_STARTUP_REPORTS " + JSON.stringify(Object.fromEntries(roles.map((r) =>
    [r, { ...reports[r], request: { ...reports[r].request, uri: "<redacted>" } }]))));
  const remaining: Record<string, string[]> = {};
  for (const role of roles) {
    for (let i = 0; i < 100 && readerThreads(pids[role]).length; i++) await sleep(20);
    remaining[role] = readerThreads(pids[role]);
    const report = reports[role];
    assert.deepEqual(remaining[role], [], "start-up reader thread still running at admission: " + role);
    assert.equal(report.status, "complete", role + " " + JSON.stringify(report.causes ?? report.status));
    assert.equal(report.attempt, nonce);
    assert.deepEqual(report.readerThreadsAtReport, []);
    assert(report.poolTerminated && report.owners.read === report.owners.selected && report.owners.selected > 0);
    reports[role] = { ...report, request: { ...report.request, uri: "<redacted>" } };
  }
  write({ ...w, report: { ...reports, waitedMs } });
  const view = (r: any) => ({ status: r.status, elapsedMs: r.elapsedMs, owners: r.owners, transactions: r.log.transactions,
    datoms: r.datoms, segmentLoads: r.segmentLoads, reads: r.reads, logReads: r.log.reads });
  console.log("JVM1_STARTUP_READ " + JSON.stringify({ attempt, arm, waitedMs, status: reports.tx.status,
    tx: view(reports.tx), "gw-w": view(reports["gw-w"]), threadsAfter: Object.values(remaining).flat() }));
}

async function post() {
  const w = read();
  const rows = new Map(w.rows);
  const pids = [process.env.TX_PID!, process.env.GW_PID!];
  assert(pids.every((pid) => readerThreads(pid).length === 0), "a start-up reader thread exists at admission");
  assert.equal(await head(w.db), w.head);
  const activeSet = owners(0, active), control = owners(active, active + controls);
  // Interleave: four active owners, then one never-touched control owner.
  const order = activeSet.flatMap((o, i) => (i % 5 === 4 && control[Math.floor(i / 5)]) ? [o, control[Math.floor(i / 5)]!] : [o]);
  const out = await play(senders(w, rows), tape(order, "post", 40), now() + 100, nonce + "-post", true, true, selection);
  assert(out.rows.every((r) => r.status === "acked" && r.receipt), "post-restart save not acknowledged");
  let exact = 0;
  for (const r of out.rows) {
    const entity = task(r.account, r.subject);
    const got = await client.rows(w.db, { entityIds: [entity], basis: { recordedPosition: r.receipt!.p, validAt: 1 } });
    const visible = got.filter((x) => x.attribute === field(0));
    assert.equal(visible.length, 1);
    assert.equal(visible[0]!.value_string, sha([`post/${r.account}/${r.subject}`, 0]).slice(0, 57));
    exact++;
  }
  assert(pids.every((pid) => readerThreads(pid).length === 0), "a start-up reader thread appeared after admission");
  const group = (inActive: boolean) => {
    const xs = out.rows.filter((r) => (r.subject < active) === inActive);
    const reads = xs.map((r) => ((r.stage as { nativeIoStats?: { reads?: Record<string, number> } })?.nativeIoStats?.reads) ?? {});
    assert(reads.length && reads.every((x) => typeof x.eavt === "number"), "native io-stats missing");
    const mean = (k: string) => reads.reduce((n, x) => n + (x[k] ?? 0), 0) / reads.length;
    return { saves: xs.length, sqlPerSave: mean("sql"), eavtLoadPerSave: mean("eavt-load"), aevtLoadPerSave: mean("aevt-load"),
      avetLoadPerSave: mean("avet-load"), ocachePerSave: mean("ocache") };
  };
  const firstWindow = out.rows.slice(0, 50).map((r) => ((r.stage as { nativeIoStats?: { reads?: Record<string, number> } })?.nativeIoStats?.reads?.sql) ?? 0);
  console.log("JVM1_STARTUP_POST " + JSON.stringify({ attempt, arm, db: w.db, saves: out.rows.length, exact,
    activeSet: group(true), control: group(false),
    firstWindowSqlPerSave: firstWindow.reduce((a, b) => a + b, 0) / firstWindow.length,
    // [DX-THIN1] Why: the combined check runs this gate with the covering owner head and must see the covering writer save.
    // Rejected: trusting the requested setting without a per-save witness.
    ownerHeadSaves: out.rows.filter((r) => (r.stage as { subjectOwnerHeadBytes?: number })?.subjectOwnerHeadBytes).length,
    timings: "diagnostic" }));
}

try {
  if (phase === "seed") await seed();
  else if (phase === "pre") await pre();
  else if (phase === "read") await startupRead();
  else await post();
} finally {
  client.close();
}
