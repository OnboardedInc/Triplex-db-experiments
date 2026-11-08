// [EXP-SQL01] Why: barriers distinguish SQLite snapshot atomicity, replica catch-up and writer waits.
// Rejected: random sleeps as proof that a read actually straddled a commit.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { createHash, randomUUID } from "node:crypto";
import { Worker, MessageChannel } from "node:worker_threads";
import { Effect } from "effect";
import { it, expect } from "vitest";
import type { TripleRow } from "@triplex-build/triplex/runtime";
import { columns, graphIri } from "../../../packages/qlever/src/rdf.ts";
import { HostBroker } from "../../../packages/qlever/src/broker/broker.ts";
import { makeQleverStorageAdapter } from "../../../packages/qlever/src/QleverStorageAdapter.ts";
import { sqliteWorker } from "../../../packages/qlever/src/broker/sqlite-worker.ts";
import { makeFreshConnectionClient } from "../../../packages/qlever/src/broker/http.ts";
import { LogFeed } from "../../../packages/qlever/src/broker/feed.ts";
const base = path.resolve(import.meta.dirname, "data");
const fresh = (s: string) => path.join(base, s + "-" + randomUUID());
const out = (name: string, value: unknown) => fs.writeFileSync(path.join(import.meta.dirname, "evidence", `${process.env.SQL01_ATTEMPT ?? "schedules"}-${name}.json`), JSON.stringify(value, null, 2));
const ids = (rs: readonly TripleRow[]) => rs.map(r => r.id).sort();
const row = (id: string, text = id, entity = "hot"): TripleRow => ({ ...Object.fromEntries(columns.map(c => [c, null])), id, entity_id: entity, attribute: ":a", value_type: "string", value_string: text, recorded_position: -1, recorded_at: 1, valid_from: 0, entity_type: "Subject" }) as TripleRow;
const submit = (b: HostBroker, id: string, rows: TripleRow[], priors: TripleRow[] = []) => b.submit({ operationId: id, attemptId: randomUUID(), sourceK: b.head(), reads: { entities: new Set<string>(), scopeWide: false }, claims: [{ commandId: id, txId: id, timestamp: 1 }], placeholders: [-1], rows, priors: new Map(priors.map(r => [r.id, r])), newIds: new Set(rows.filter(r => !priors.some(p => p.id === r.id)).map(r => r.id)) });
const driver = createRequire(path.resolve("packages/qlever/package.json")).resolve("better-sqlite3");
const hash = (s: string) => createHash("sha256").update(s).digest("hex");

it("holds the real reader algorithm after its marker across commits and a WAL restart attempt", async () => {
  const dir = fresh("barrier"), b = await HostBroker.open({ dir, scopeKey: "vsql01-barrier", minFreeBytes: 0 });
  const pause = new SharedArrayBuffer(8), state = new Int32Array(pause);
  // [EXP-SQL01] Why: only a barrier is inserted after the actual snapshot-pinning marker SELECT.
  // Rejected: copying the pull SQL into a separate oracle (would not exercise the product reader algorithm).
  const needle = "marker();result=handle(op,args);";
  expect(sqliteWorker.split(needle)).toHaveLength(2);
  const instrumented = sqliteWorker.replace(needle, "marker();if(args?.pauseBuffer){const p=new Int32Array(args.pauseBuffer);Atomics.store(p,0,1);Atomics.notify(p,0);Atomics.wait(p,1,0);}result=handle(op,args);");
  const worker = new Worker(instrumented, { eval: true, execArgv: [], workerData: { file: path.join(dir, "broker.db"), role: "reader", driver, seed: 0, gateBuffer: new SharedArrayBuffer(8) } });
  const request = (op: string, args: unknown) => new Promise<any>((resolve, reject) => {
    const { port1, port2 } = new MessageChannel();
    const timeout = setTimeout(() => { port1.close(); reject(Error("barrier reader timeout")); }, 20_000);
    port1.once("message", message => { clearTimeout(timeout); port1.close(); message.error ? reject(Error(message.error)) : resolve(message.result); });
    worker.postMessage({ op, args, response: port2 }, [port2]);
  });
  const commits: { lsn: number; ms: number; wal: number }[] = [];
  let pending: Promise<any> | undefined;
  try {
    const initial = Array.from({ length: 40 }, (_, j) => row("old-" + j));
    await submit(b, "initial", initial);
    const basis = b.head();
    pending = request("pull", { basis, selection: { entities: ["hot"] }, pauseBuffer: pause });
    const until = performance.now() + 10_000;
    while (Atomics.load(state, 0) !== 1) {
      if (performance.now() > until) throw Error("reader never pinned marker");
      await new Promise(r => setTimeout(r, 1));
    }
    const prior = (await b.pullAt(basis, { entities: ["hot"] })).rows;
    const next = Array.from({ length: 40 }, (_, j) => row("new-" + j));
    const replacement = await submit(b, "replacement", [...prior.map(r => ({ ...r, retracted_at: 2, retracted_position: -1 })), ...next], prior);
    expect(replacement.kind).toBe("committed");
    // [EXP-SQL01] Why: exceed the actual 64 MiB threshold before LSN 25 while the old snapshot is pinned.
    // Rejected: truncating or fabricating a WAL (would change storage semantics).
    for (let i = 0; i < 26; i++) {
      const t = performance.now();
      const d = await submit(b, "large-" + i, Array.from({ length: 10 }, (_, j) => row(`big-${i}-${j}`, "x".repeat(120_000), "large-" + i)));
      if (d.kind !== "committed") throw Error("unexpected writer conflict");
      commits.push({ lsn: d.lsn, ms: performance.now() - t, wal: fs.statSync(path.join(dir, "broker.db-wal")).size });
    }
    out("barrier-progress", { dir, basis, commits, originalWorkerSha256: hash(sqliteWorker), instrumentedWorkerSha256: hash(instrumented) });
    expect(commits.find(c => c.lsn === 25)!.wal).toBeGreaterThan(64 * 1024 ** 2);
    // [EXP-SQL01] Why: explicitly attempt maintenance with a physically held SQLite reader, then inspect its result.
    // Rejected: a wall-clock latency assertion (host load does not identify a waiting checkpoint).
    const heldCheckpoint = await b.checkpoint();
    expect(heldCheckpoint.events.at(-1)?.outcome).toBe("incomplete");
    expect(heldCheckpoint.events.at(-1)?.busy).toBe(0);
    Atomics.store(state, 1, 1); Atomics.notify(state, 1);
    const result = await pending;
    expect(result.snapshot.position).toBe(basis);
    expect(ids(result.rows)).toEqual(ids(initial));
    const latest = await b.pullAt(b.head(), { entities: ["hot"] });
    expect(ids(latest.rows)).toEqual(ids(next));
    const named = await b.pullAt(basis, { entities: ["hot"] });
    expect(ids(named.rows)).toEqual(ids(initial));
    const releasedCheckpoint = await b.checkpoint();
    expect(releasedCheckpoint.events.at(-1)?.outcome).toBe("complete");
    expect(releasedCheckpoint.events.at(-1)?.mode).toBe("RESTART");
    out("barrier", { heldCheckpoint, releasedCheckpoint, dir, basis, head: b.head(), heldRows: result.rows.length, latestRows: latest.rows.length, commits, originalWorkerSha256: hash(sqliteWorker), instrumentedWorkerSha256: hash(instrumented), instrumentation: needle, gate: "separate readonly connection; native SQLite checkpoint locks, not pool gate count" });
  } finally {
    Atomics.store(state, 1, 1); Atomics.notify(state, 1);
    await pending?.catch(() => {}); await worker.terminate(); await b.close();
  }
});

it("catches up past epoch-only prefixes on qlever-dev and preserves a named basis during writes", async () => {
  const dir = fresh("live-epochs"), scope = "vsql01:" + randomUUID();
  for (let i = 0; i < 7; i++) { const b = await HostBroker.open({ dir, scopeKey: scope, minFreeBytes: 0 }); await b.close(); }
  const client = makeFreshConnectionClient("http://127.0.0.1:7070");
  const events: unknown[] = [];
  const b = await HostBroker.open({ dir, scopeKey: scope, replica: client, autoApply: false, maxApplyCommands: 1, minFreeBytes: 0, onEvent: e => events.push(e) });
  try {
    const initial = Array.from({ length: 40 }, (_, j) => row("old-" + j));
    await submit(b, "initial", initial);
    const basis = b.head(), adapter = makeQleverStorageAdapter(client, scope, { broker: b });
    const read = () => Effect.runPromise(adapter.getByEntity("hot", { validAt: 5, recordedPosition: basis }));
    expect(ids(await read())).toEqual(ids(initial));
    b.startApplier();
    expect(await b.drain(30_000)).toBe(true);
    expect(ids(await read())).toEqual(ids(initial));
    const pin = b.pinBasis(basis, "live straddle");
    const observations: number[] = [];
    try {
      const prior = (await b.pullAt(b.head(), { entities: ["hot"] })).rows;
      const write = submit(b, "replace", [...prior.map(r => ({ ...r, retracted_at: 2, retracted_position: -1 })), ...Array.from({ length: 40 }, (_, j) => row("new-" + j))], prior);
      const readers = Array.from({ length: 16 }, async () => { for (let j = 0; j < 5; j++) { const rows = await read(); observations.push(rows.length); expect(ids(rows)).toEqual(ids(initial)); } });
      expect((await write).kind).toBe("committed");
      await Promise.all(readers);
      expect(await b.drain(30_000)).toBe(true);
      expect(ids(await read())).toEqual(ids(initial));
      const latest = await Effect.runPromise(adapter.getByEntity("hot", { validAt: 5, recordedPosition: b.head() }));
      expect(latest.every(r => r.id.startsWith("new-"))).toBe(true);
      expect(latest).toHaveLength(40);
    } finally { pin.release(); }
    out("live-epochs", { dir, scope, endpoint: "http://127.0.0.1:7070", basis, head: b.head(), reads: observations.length, observations, events, routes: (adapter as any).routes });
  } finally { await b.close(); await client.update(`DROP SILENT GRAPH ${graphIri(scope)}`); await client.close(); }
});

it("applies a concurrently retried operation once and preserves its receipt after reopen", async () => {
  const dir = fresh("idempotency");
  let b = await HostBroker.open({ dir, scopeKey: "vsql01-idem", minFreeBytes: 0 });
  try {
    const answers = await Promise.all(Array.from({ length: 32 }, () => submit(b, "same-key", Array.from({ length: 10 }, (_, j) => row("only-" + j)))));
    const original = b.operation("same-key")!;
    expect(original).toBeDefined();
    const head = b.head();
    const firstRows = (await b.pullAt(head, { entities: ["hot"] })).rows;
    expect(firstRows).toHaveLength(10);
    await b.close();
    b = await HostBroker.open({ dir, scopeKey: "vsql01-idem", minFreeBytes: 0 });
    const retry = await submit(b, "same-key", [row("must-not-apply")]);
    expect(retry.kind === "committed" && retry.replayed).toBe(true);
    expect(b.operation("same-key")).toEqual(original);
    expect(b.head()).toBe(head);
    expect(ids((await b.pullAt(head, { entities: ["hot"] })).rows)).toEqual(ids(firstRows));
    const feed = new LogFeed(dir), entries: any[] = []; let cursor = feed.start();
    for (;;) { const p = feed.poll(cursor, { maxBytes: 1 }); if (!p.resolutions.length) break; entries.push(...p.resolutions.filter(r => r.kind === "commit")); cursor = p.cursor; }
    expect(entries).toHaveLength(1);
    out("idempotency", { dir, answers, original, head, retry, rows: firstRows.length, commitFrames: entries.length });
  } finally { await b.close(); }
});
