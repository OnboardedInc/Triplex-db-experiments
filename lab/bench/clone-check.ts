#!/usr/bin/env node
/**
 * Settle, freeze fingerprints and clone readiness for XTDB slots (EXP-K01; R26 sections 4, 6.2 and 6.9; RULINGS Q74b, Q74d).
 * Normally run by lab/bin/engine.mjs (settle, golden, clone, verify). Progress on stderr, one JSON document on stdout.
 *
 *   node lab/bench/clone-check.ts settle --url URL --container CT [--timeout-s 900]
 *   node lab/bench/clone-check.ts freeze --url URL --container CT --manifest FILE
 *   node lab/bench/clone-check.ts verify --url URL --container CT --golden-record FILE [--owner FILE]
 *
 * settle  POST /system/finish-block through docker exec (the lab publishes only pgwire), then poll until three readings
 *         5 s apart prove stable block/trie catalogs and idle gauges after each of two block cuts (Q83b).
 * freeze  the C3-C8 fingerprint of a settled slot: the golden's freeze record.
 * verify  C1 from the clone's copy record (owner.json volumeContent.copy.c1), C2 /healthz/started and /healthz/alive,
 *         C3-C8 compared with the golden's freeze record. verdict PASS only if all eight pass.
 *
 * [EXP-K01] Why one TS script: the checks need the built XTDB pgwire client (packages/xtdb/dist) and, for C8, the Triplex
 * pull the driver uses (lib/composition.ts); lab/bin takes no dependencies. Rejected: psql (not on the host or in the
 * image); reading engine files directly (a live Local log is torn).
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { canonical, compareFreeze, blockTrieCoverage, digest, planShape, pullDigest, publishedBlockIndices, type Check } from "./lib/clone.ts";
import { chooseSamples } from "./lib/samples.ts";
import { SEED_VALID_FROM, ids } from "./lib/world.ts";

const REPO = path.resolve(import.meta.dirname, "../..");
const DOCKER_HOST = "unix:///Users/sam/.colima/triplex2/docker.sock";
const argv = process.argv.slice(2);
const mode = argv[0];
const opt = (k: string, d?: string) => (argv.includes(`--${k}`) ? argv[argv.indexOf(`--${k}`) + 1] : d);
const url = opt("url");
const container = opt("container");
if (!["settle", "freeze", "verify", "start-check", "diagnostic", "probe-write"].includes(mode ?? "") || !url || !container) {
  process.stderr.write("usage: clone-check.ts settle|freeze|verify --url URL --container CT [--manifest FILE | --golden-record FILE [--owner FILE]]\n");
  process.exit(2);
}
const log = (line: string) => process.stderr.write(`[clone-check ${new Date().toISOString().slice(11, 19)}] ${line}\n`);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const readJson = (f: string) => JSON.parse(fs.readFileSync(path.resolve(f), "utf8"));
const print = (value: unknown) => process.stdout.write(JSON.stringify(value, (_k, v) => (typeof v === "bigint" ? v.toString() : v), 2) + "\n");

/** GNU wget in the XTDB image: -S puts the status line on stderr, --content-on-error keeps a 503 body. */
function healthz(route: string, post = false) {
  const r = spawnSync("docker", ["-H", DOCKER_HOST, "exec", container!, "wget", "-q", "-S", "--content-on-error", "-O", "-", ...(post ? ["--post-data="] : []), `http://127.0.0.1:8080${route}`], { encoding: "utf8", timeout: 30_000 });
  const status = r.status === 0 && !r.signal && !r.error ? Number((/HTTP\/[\d.]+ (\d{3})/.exec(r.stderr ?? "") ?? [])[1]) || null : null;
  return { status, body: (r.stdout ?? "").trim().slice(0, 500) };
}

const xtdb: any = await import(pathToFileURL(path.join(REPO, "packages/xtdb/dist/index.js")).href);
const runtimeApi: any = await import(pathToFileURL(path.join(REPO, "packages/core/dist/runtime/index.js")).href);
const client = xtdb.makeXtdbClient(url, { maxConnections: 2 });
const q = async (sql: string, params: unknown[] = []): Promise<any[]> => client.query(sql, params, undefined, { timeoutMs: 600_000 });
const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));

async function gauges() {
  const rows = await q("SELECT name, value FROM xt.metrics_gauges WHERE name IN ('compactor.jobs.available', 'node.tx.latestCompletedTxId', 'node.tx.lag.MsgId', 'node.tx.latestSubmittedMsgId', 'node.tx.latestProcessedMsgId', 'xtdb.block.last_upload_time')");
  // [EXP-K01] Why: an absent gauge is missing evidence, not an idle compactor. Rejected: reducing an empty set to zero (false settle).
  const sum = (name: string) => { const found = rows.filter((r) => r.name === name); return found.length ? found.reduce((s, r) => s + Number(r.value), 0) : null; };
  return { jobsAvailable: sum("compactor.jobs.available"), latestCompletedTxId: sum("node.tx.latestCompletedTxId"), lagMsgId: sum("node.tx.lag.MsgId"), latestSubmittedMsgId: sum("node.tx.latestSubmittedMsgId"), latestProcessedMsgId: sum("node.tx.latestProcessedMsgId"), lastUploadTime: sum("xtdb.block.last_upload_time"), rows: rows.length };
}
async function liveRows() {
  const rows = await q("SELECT table_name, row_count FROM xt.live_tables ORDER BY table_name");
  return { total: rows.reduce((s, r) => s + Number(r.row_count), 0), rows: rows.map((r) => [r.table_name, Number(r.row_count)]) };
}
// [EXP-K01] Why: the pinned node hangs reading a missing block through its memory cache (first live attempt, evidence/settle-engine.log).
// Rejected: probing dense block numbers until three misses (the very first seed may have no completed block).
// Enumerate only published block files through a read-only exec, then ask SQL for exactly those rows.
function blockListing(): string[] {
  const r = spawnSync("docker", ["-H", DOCKER_HOST, "exec", container!, "sh", "-c", "if [ -d /var/lib/xtdb/buffers/v06/blocks ]; then find /var/lib/xtdb/buffers/v06/blocks -maxdepth 1 -type f -name 'b*.binpb'; fi"], { encoding: "utf8", timeout: 30_000 });
  if (r.status !== 0 || r.signal || r.error) throw new Error(`block file discovery failed: ${r.stderr}`);
  return publishedBlockIndices(r.stdout ?? "");
}
async function blockFileRows(): Promise<any[]> {
  const rows: any[] = [];
  for (const index of blockListing()) {
    // [EXP-K01-R2] Why: GC can remove an old file between discovery and use (Q83c). Rejected: dense ranges or one stale listing (missing-file reads hang).
    if (!blockListing().includes(index)) continue;
    const found = await q("SELECT block_idx, tx_id, system_time, latest_processed_msg_id, table_names, boundary_replica_msg_id, file_size FROM xt.block_files WHERE block_idx = ?", [index]);
    if (found.length !== 1) throw new Error(`published block ${index} returned ${found.length} rows`);
    rows.push(...found);
  }
  return rows;
}
async function tries() {
  const rows = await q("SELECT table_name, trie_key, level, trie_state, data_file_size, row_count FROM xt.trie_stats ORDER BY table_name, trie_key");
  const normalized = rows.map(r => [r.table_name, r.trie_key, num(r.level), r.trie_state, num(r.data_file_size), num(r.row_count)]);
  return { rows: normalized, sha256: digest(normalized) };
}
async function snapshot() {
  return { listing: blockListing(), blocks: await blockFileRows(), gauges: await gauges(), trie: await tries() };
}
const blockNumber = (index: string) => parseInt(index.slice(1), 16);
async function settle() {
  const started = Date.now();
  const before = await snapshot();
  const phases: any[] = [];
  const persist = () => { if (opt("evidence")) fs.writeFileSync(opt("evidence")!, JSON.stringify({ before, phases }, (_k, v) => typeof v === "bigint" ? v.toString() : v, 2) + "\n"); };
  persist();
  let previous = before;
  for (let phase = 1; phase <= Number(opt("cuts", "2")); phase++) {
    const baseline = previous;
    const target = baseline.listing.length ? blockNumber(baseline.listing.at(-1)!) + 1 : 0;
    if (!Number.isSafeInteger(before.gauges.latestCompletedTxId) || before.gauges.latestCompletedTxId! < 0)
      return { settled: false, reason: "initial completed transaction gauge is missing or invalid", before, phases };
    const finishBlock = healthz("/system/finish-block", true);
    const evidence: any = { phase, target, finishBlock, polls: [] };
    phases.push(evidence);
    persist();
    if (finishBlock.status !== 200) return { settled: false, reason: `finish-block #${phase} failed`, before, phases };
    let streak = 0, stable = "";
    const requiredTables = ["tx_assertions", "tx_attempts", "tx_claims", "tx_meta", "txs"];
    const deadline = Date.now() + (phase === 1 ? Number(opt("timeout-s", "900")) : 180) * 1000;
    while (Date.now() < deadline) {
      await sleep(5000);
      const reading = await snapshot(), g = reading.gauges;
      const block = reading.blocks.find(r => blockNumber(r.block_idx) === target);
      const coverage = blockTrieCoverage(reading.trie.rows, block?.block_idx ?? "", requiredTables);
      const signature = digest([reading.listing, reading.trie.sha256, g.latestCompletedTxId, g.latestProcessedMsgId, g.latestSubmittedMsgId]);
      const ok = !!block && Number.isSafeInteger(g.latestCompletedTxId) && num(block.tx_id) === g.latestCompletedTxId &&
        g.latestCompletedTxId === before.gauges.latestCompletedTxId &&
        Number.isSafeInteger(num(block.latest_processed_msg_id)) && Number.isSafeInteger(g.latestProcessedMsgId) && num(block.latest_processed_msg_id)! <= g.latestProcessedMsgId! && g.latestProcessedMsgId === g.latestSubmittedMsgId &&
        g.lagMsgId === 0 && g.jobsAvailable === 0 && g.lastUploadTime !== null && baseline.gauges.lastUploadTime !== null &&
        g.lastUploadTime > baseline.gauges.lastUploadTime &&
        (phase === 1 ? coverage.covered : reading.trie.sha256 === baseline.trie.sha256);
      streak = ok ? (signature === stable ? streak + 1 : 1) : 0;
      stable = signature;
      evidence.polls.push({ elapsedS: (Date.now() - started) / 1000, ...reading, requiredTables, coverage, ok, streak });
      persist();
      log(`finish-block #${phase}: jobs ${g.jobsAvailable}, block ${block?.block_idx ?? "pending"}, stable ${streak}/3`);
      // [EXP-K01-R3] Why: a current transaction change invalidates the frozen seed even if its old block still matches. Rejected: treating the initial gauge as fresh evidence for later polls.
      if (!Number.isSafeInteger(g.latestCompletedTxId) || g.latestCompletedTxId !== before.gauges.latestCompletedTxId)
        return { settled: false, reason: `current completed transaction ${g.latestCompletedTxId} differs from frozen seed ${before.gauges.latestCompletedTxId} or is invalid`, before, phases };
      if (streak >= 3) { previous = reading; evidence.after = reading; (reading as any).frontiers = { F: num(block.latest_processed_msg_id), M: g.latestProcessedMsgId, T: g.latestCompletedTxId }; persist(); break; }
    }
    if (!evidence.after) return { settled: false, reason: `finish-block #${phase} evidence did not settle`, before, phases };
  }
  // [EXP-K01-R2] Why: #6174 leaves live_tables stale; only a fresh JVM proves zero live rows. Rejected: restarting before settling (asymmetric plans).
  return { settled: true, qualified: false, proofStage: "AWAITING_STOPPED_TAIL", frontiers: (previous as any).frontiers, waitedS: (Date.now() - started) / 1000, before, phases, after: previous };
}
async function startCheck(expected: any) {
  const proofReads: any = {};
  const read = (name: string, args: string[]) => {
    const r = spawnSync("docker", ["-H", DOCKER_HOST, ...args], { encoding: "utf8", maxBuffer: 16 << 20 });
    return proofReads[name] = { status: r.status, signal: r.signal ?? null, error: r.error?.message ?? null, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
  };
  const success = (r: any) => r.status === 0 && !r.signal && !r.error;
  const initial = read("inspect", ["inspect", "--format", "{{.State.StartedAt}}", container!]);
  const identity = initial.stdout.trim();
  if (!success(initial) || !identity || !Number.isFinite(Date.parse(identity))) return { ok: false, reason: "current startup inspect failed or returned invalid identity", proofReads, polls: [] };
  const polls: any[] = [];
  for (let n = 0; n < 3; n++) {
    if (n) await sleep(5000);
    polls.push({ gauges: await gauges(), live: await liveRows(), trie: await tries(), listing: blockListing() });
  }
  const out = read("logs", ["logs", "--since", identity, container!]);
  const final = read("finalInspect", ["inspect", "--format", "{{.State.StartedAt}}", container!]);
  const text = `${out.stdout}\n${out.stderr}`;
  const resume = [...text.matchAll(/resuming after (\d+)/g)].at(-1)?.[1] ?? null;
  const expectedMsgId = expected.frontiers?.M ?? expected.gauges.latestProcessedMsgId;
  const started = healthz("/healthz/started");
  return { ok: success(out) && success(final) && final.stdout.trim() === identity && started.status === 200 && resume !== null && Number(resume) === expectedMsgId && polls.every(p =>
    p.live.total === 0 && p.gauges.jobsAvailable === 0 && p.gauges.lagMsgId === 0 &&
    p.gauges.latestCompletedTxId === expected.gauges.latestCompletedTxId &&
    p.gauges.latestProcessedMsgId === expectedMsgId && p.gauges.latestSubmittedMsgId === expectedMsgId && p.trie.sha256 === expected.trie.sha256 &&
    canonical(p.listing) === canonical(expected.listing)), started, resume, expectedMsgId, polls, proofReads,
    startLines: text.split("\n").filter(l => /starting follower:|resuming after/.test(l)) };
}

// ---------------------------------------------------------------- fingerprint (C3-C8)

const C8_SUBJECTS = 20;
async function fingerprint(manifest: any) {
  const timings: Record<string, number> = {};
  const errors: string[] = [];
  const timed = async <A>(name: string, fn: () => Promise<A>): Promise<A | null> => {
    const t = Date.now();
    try { return await fn(); } catch (error: any) { errors.push(`${name}: ${String(error?.message ?? error).slice(0, 400)}`); return null; } finally { timings[name] = Date.now() - t; }
  };
  const scopeKey = runtimeApi.DatabaseScope.test(manifest.scope);
  const c3 = await timed("c3", async () => {
    const latest = await q("SHOW LATEST_COMPLETED_TXS");
    const txs = (await q("SELECT COUNT(*) AS n, MIN(system_time) AS min_st, MAX(system_time) AS max_st, MAX(_id) AS max_id FROM xt.txs FOR ALL VALID_TIME"))[0];
    const failed = (await q("SELECT COUNT(*) AS n FROM xt.txs FOR ALL VALID_TIME WHERE committed = false"))[0];
    return { latestCompletedTxs: JSON.parse(canonical(latest)), txs: { n: num(txs?.n), minSystemTime: txs?.min_st ? new Date(txs.min_st).toISOString() : null, maxSystemTime: txs?.max_st ? new Date(txs.max_st).toISOString() : null, maxId: num(txs?.max_id), notCommitted: num(failed?.n) } };
  });
  const c4 = await timed("c4", async () => {
    const position = num((await q("SELECT position FROM tx_meta FOR ALL VALID_TIME WHERE scope_key = ?", [scopeKey]))[0]?.position);
    const counts: Record<string, number | null> = {};
    for (const table of ["tx_assertions", "tx_claims", "tx_attempts", "tx_meta"])
      counts[table] = num((await q(`SELECT COUNT(*) AS n FROM ${table} FOR ALL VALID_TIME WHERE scope_key = ?`, [scopeKey]))[0]?.n);
    const scopes = (await q("SELECT scope_key, position FROM tx_meta FOR ALL VALID_TIME ORDER BY scope_key")).map((r) => [r.scope_key, num(r.position)]);
    return { scope: manifest.scope, position, counts, scopes };
  });
  const c5 = await timed("c5", async () => {
    const history: Record<string, number | null> = {};
    for (const table of ["tx_assertions", "tx_claims", "tx_attempts", "tx_meta"])
      history[table] = num((await q(`SELECT COUNT(*) AS n FROM ${table} FOR ALL SYSTEM_TIME FOR ALL VALID_TIME WHERE scope_key = ?`, [scopeKey]))[0]?.n);
    const distinct = num((await q("SELECT COUNT(DISTINCT system_time) AS n FROM xt.txs FOR ALL VALID_TIME"))[0]?.n);
    return { history, distinctTxSystemTimes: distinct };
  });
  const c6 = await timed("c6", async () => {
    const trie = (await q("SELECT table_name, trie_key, level, trie_state, data_file_size, row_count FROM xt.trie_stats ORDER BY table_name, trie_key"))
      .map((r) => [r.table_name, r.trie_key, num(r.level), r.trie_state, num(r.data_file_size), num(r.row_count)]);
    const blocks = (await blockFileRows())
      .map((r) => [r.block_idx, num(r.tx_id), r.system_time ? new Date(r.system_time).toISOString() : null, num(r.latest_processed_msg_id), r.table_names, num(r.boundary_replica_msg_id), num(r.file_size)]);
    const live = (await liveRows()).rows;
    const trieStats = { rows: trie.length, sha256: digest(trie), levels: Object.entries(trie.reduce((m: any, r) => ((m[`${r[2]}/${r[3]}`] = (m[`${r[2]}/${r[3]}`] ?? 0) + 1), m), {})) };
    const blockFiles = { rows: blocks.length, sha256: digest(blocks), list: blocks };
    return { trieStats, blockFiles, liveTables: { rows: live }, sha256: digest([trieStats.sha256, blockFiles.sha256]) };
  });
  const c7 = await timed("c7", gauges);
  const c8 = await timed("c8", async () => {
    process.env["XTDB_URL"] = url;
    const { openComposition } = await import("./lib/composition.ts");
    const comp = await openComposition("public", "xtdb", manifest.scope);
    const subjects = chooseSamples(manifest.subjects, Math.min(C8_SUBJECTS, manifest.subjects));
    const basis = { recordedAt: manifest.result.lastInstant, validAt: SEED_VALID_FROM + 86_400_000 };
    const pulls: any[] = [];
    try {
      for (const i of subjects) {
        const pr = await comp.pull(ids.placement(i), basis);
        pulls.push({ subject: i, triples: pr.triples.length, entities: pr.entities, roundTrips: pr.roundTrips, digest: pullDigest(pr.triples) });
      }
    } finally { await comp.close(); }
    const roots = subjects.map((i) => ids.placement(i));
    const sql = `EXPLAIN ANALYZE SELECT id, entity_id, attribute FROM tx_assertions FOR ALL VALID_TIME WHERE scope_key = ? AND entity_id IN (${roots.map(() => "?").join(", ")}) AND recorded_at <= ? AND retracted_at IS NULL AND valid_from <= ? AND (valid_to IS NULL OR valid_to > ?)`;
    const planRows = planShape(await q(sql, [scopeKey, ...roots, basis.recordedAt, basis.validAt, basis.validAt]));
    return { subjects, basis, pulls, resultSha256: digest(pulls), plan: { sql, rows: planRows, sha256: digest(planRows) } };
  });
  return { ok: errors.length === 0, at: new Date().toISOString(), url, container, scopeKey, c3, c4, c5, c6, c7, c8, timingsMs: timings, errors };
}

// ---------------------------------------------------------------- verify (Q74d)

async function verify() {
  const recordFile = path.resolve(opt("golden-record") ?? "");
  const record = readJson(recordFile);
  const manifest = readJson(path.resolve(REPO, record.manifest.path));
  const owner = opt("owner") ? readJson(opt("owner")!) : null;
  const checks: Record<string, Check> = {};
  const c1 = owner?.volumeContent?.copy?.c1;
  checks["C1"] = c1 && owner.volumeContent.goldenVolume === record.volume
    ? { pass: !!c1.pass, expected: c1.expected, observed: c1.observed, note: `copy of ${record.volume}: every file's path, size, mode, owner and sha256 (tree hash), checked in the helper before the first start` }
    : { pass: false, note: "no copy record for this golden in owner.json volumeContent" };
  const started = healthz("/healthz/started"), alive = healthz("/healthz/alive");
  checks["C2"] = { pass: started.status === 200 && alive.status === 200, observed: { started, alive }, expected: { started: 200, alive: 200 } };
  const t = Date.now();
  const start = await startCheck(record.settle.after);
  const obs = await fingerprint(manifest);
  let currentGauge = await gauges();
  const polls = [currentGauge.jobsAvailable];
  for (let k = 1; k < 3; k++) { await sleep(5000); currentGauge = await gauges(); polls.push(currentGauge.jobsAvailable); }
  (obs as any).c7 = { ...currentGauge, polls };
  // [EXP-K01-R3] Why: fingerprint queries can outlive their initial startup evidence. Rejected: reusing the initial zero gauges after a transaction or restart during the fingerprint.
  const finish = await startCheck(record.settle.after);
  Object.assign(checks, compareFreeze(record.freeze, obs, manifest));
  checks["C2"]!.pass &&= start.ok && finish.ok;
  checks["C2"]!.observed = { started, alive, start, finish };
  if (!obs.ok) for (const k of ["C3", "C4", "C5", "C6", "C7", "C8"]) if (obs.errors.some((e) => e.startsWith(k.toLowerCase()))) checks[k] = { ...checks[k]!, pass: false, note: `${checks[k]!.note}; error: ${obs.errors.find((e) => e.startsWith(k.toLowerCase()))}` };
  const verdict = Object.values(checks).every((c) => c.pass) ? "PASS" : "FAIL";
  return {
    format: "tx2-clone-readiness/1", verdict, at: new Date().toISOString(), container, url, golden: { volume: record.volume, key: record.key, record: path.relative(REPO, recordFile) },
    checks, fingerprintMs: Date.now() - t, timingsMs: obs.timingsMs, errors: obs.errors,
    note: "C9 (probe latency) and C10 (content digest) are validation E1, not per-clone gates (R26 section 4)",
  };
}

try {
  if (mode === "settle") print(await settle());
  else if (mode === "start-check") print(await startCheck(readJson(opt("expected")!)));
  else if (mode === "probe-write") print(await client.submit([{ sql: "INSERT INTO k01_r30_probe (_id, v) VALUES ('single-cut', 1)" }]));
  else if (mode === "diagnostic") print({ snapshot: await snapshot(), live: await liveRows() });
  else if (mode === "freeze") print(await fingerprint(readJson(opt("manifest") ?? "")));
  else print(await verify());
} finally {
  await client.close();
}
setTimeout(() => process.exit(0), 200).unref();
