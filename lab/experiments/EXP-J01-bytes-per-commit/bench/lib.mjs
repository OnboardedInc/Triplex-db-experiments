// EXP-J01 harness library: Triplex runtimes per lane and journal encoding over measuring clients,
// source-log record sizing (XTDB) and delta accounting (QLever), statistics and receipts.
// Imports the built dist (the bytes a gate hashes), never package sources.
import { execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Effect, Layer, ManagedRuntime } from 'effect';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const REPO = path.resolve(HERE, '../../../..');
export const xtdb = await import(path.join(REPO, 'packages/xtdb/dist/index.js'));
export const qlever = await import(path.join(REPO, 'packages/qlever/dist/index.js'));
export const core = await import(path.join(REPO, 'packages/core/dist/index.js'));
export const runtimeApi = await import(path.join(REPO, 'packages/core/dist/runtime/index.js'));

/** Raw samples are expensive to regenerate, so they go to the durable project folder (never /tmp). */
export const RAW_DIR = '/Users/sam/Claude/Projects/triplex-db-2/EXP-J01';
export const RECEIPT_DIR = path.join(HERE, '..', 'receipts');
export const URLS = { xtdb: 'postgres://xtdb:xtdb@127.0.0.1:5470/xtdb', qlever: 'http://127.0.0.1:7070' };

export const now = () => performance.now();

// ---------------------------------------------------------------- XTDB: record sizing

/** XTDB tx ids are byte offsets into the source log, so a record's size is the next message's offset minus its own. */
export const parseTxOps = (text) => {
  const ops = [];
  const re = /#xt\/tagged \[:(sql|put-docs|delete-docs|erase-docs|patch-docs)/g;
  for (let m; (m = re.exec(text)); ) ops.push(m[1]);
  return ops;
};

/**
 * Wraps a single-connection XTDB client so every submit is followed by SHOW LATEST_SUBMITTED_TX
 * (same connection) and a one-row fence transaction; the record's bytes are then
 * next-message-offset minus own offset, read from xt.source_log_msgs (other agents' records may
 * interleave; they do not change the difference).
 */
export const measuringXtdbClient = (url, { measure = true } = {}) => {
  const inner = xtdb.makeXtdbClient(url, { maxConnections: 1 });
  const records = [];
  let armed = false; // armed explicitly after initialize() so CREATE TABLE is never counted
  void measure;
  const latest = async () => Number((await inner.query('SHOW LATEST_SUBMITTED_TX'))[0].tx_id);
  const sizeOf = async (id) => {
    await inner.submit([{ sql: 'INSERT INTO j01_fence (_id, at) VALUES (?, ?)', params: [randomUUID(), Date.now()] }]);
    const fence = await latest();
    const msgs = await inner.query(`SELECT msg_id, msg_type, tx_ops FROM xt.source_log_msgs WHERE msg_id BETWEEN ${id} AND ${fence}`);
    const ids = msgs.map((m) => Number(m.msg_id)).sort((a, b) => a - b);
    const own = msgs.find((m) => Number(m.msg_id) === id);
    const next = ids.find((x) => x > id);
    return { txId: id, recordBytes: next - id, interleaved: ids.length - 2, ops: own ? parseTxOps(String(own.tx_ops)) : null };
  };
  const client = {
    query: (...args) => inner.query(...args),
    close: () => inner.close(),
    submit: async (statements) => {
      const result = await inner.submit(statements);
      if (armed) {
        const id = await latest();
        records.push({ statements: statements.map((s) => ({ sql: s.sql, params: s.params ?? [] })), ...(await sizeOf(id)) });
      }
      return result;
    },
  };
  return { client, records, inner, latest, sizeOf, arm: (on) => { armed = on; } };
};

// ---------------------------------------------------------------- QLever: delta accounting

/** Wraps a QLever client to keep each update's text and QLever's reported delta for that operation. */
export const measuringQleverClient = (url) => {
  const inner = qlever.makeQleverClient(url);
  const updates = [];
  const client = {
    query: (...args) => inner.query(...args),
    command: (...args) => inner.command(...args),
    cancel: (...args) => inner.cancel(...args),
    close: () => inner.close(),
    update: async (sparql, options) => {
      const t0 = now();
      const response = await inner.update(sparql, options);
      const delta = response?.operations?.[0]?.['delta-triples'];
      updates.push({ sparql, ms: now() - t0, operation: delta?.operation ?? null, after: delta?.after ?? null });
      return response;
    },
  };
  return { client, updates, inner };
};

/** Splits the VALUES block of the adapter's guarded update into (subject, predicate, object) rows. */
export const valuesRows = (sparql) => {
  const start = sparql.indexOf('VALUES (?s ?p ?new) {');
  const end = sparql.lastIndexOf('} OPTIONAL {');
  return sparql
    .slice(start + 'VALUES (?s ?p ?new) {'.length, end)
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('('))
    .map((line) => {
      const body = line.slice(1, -1);
      const s = body.slice(0, body.indexOf('> ') + 1);
      const rest = body.slice(s.length + 1);
      const p = rest.slice(0, rest.indexOf('> ') + 1);
      return { s, p, o: rest.slice(p.length + 1) };
    });
};

// ---------------------------------------------------------------- runtimes

/**
 * A Triplex runtime for one lane, one journal encoding and one scope, over a measuring client.
 * `commitEncoding` is passed to the lane adapter (the option under test, default "copy" = A0).
 */
export const laneRuntime = async (lane, { scope, commitEncoding, measure = true, url = URLS[lane], deterministic } = {}) => {
  const scopeKey = runtimeApi.DatabaseScope.test(scope);
  let measuring, adapter, executor;
  const encoding = commitEncoding === undefined ? {} : { commitEncoding };
  if (lane === 'xtdb') {
    measuring = measuringXtdbClient(url, { measure });
    adapter = xtdb.makeXtdbStorageAdapter(measuring.client, scopeKey, encoding);
    executor = xtdb.makeXtdbQueryExecutor(measuring.client, scopeKey);
  } else {
    measuring = measuringQleverClient(url);
    adapter = qlever.makeQleverStorageAdapter(measuring.client, scopeKey, encoding);
    executor = qlever.makeQleverQueryExecutor(measuring.client, scopeKey, { sourceView: adapter.sourceView });
  }
  const definition = runtimeApi.Runtime.define({
    name: `j01-${lane}`,
    storage: Layer.succeed(runtimeApi.StorageAdapter, adapter),
    queries: Layer.succeed(runtimeApi.QueryExecutor, executor),
  });
  const layer = definition.layer({ scope: scopeKey, capabilities: runtimeApi.Capabilities.none, ...(deterministic ? { deterministic } : {}) });
  const managed = ManagedRuntime.make(layer);
  const triples = await managed.runPromise(Effect.gen(function* () { return yield* core.Triples; }));
  return {
    lane, scope, scopeKey, adapter, triples, measuring,
    run: (effect) => managed.runPromise(effect),
    close: async () => { await managed.dispose(); await measuring.client.close(); },
  };
};

/** One trace-shaped command: `facts` string asserts about `subj:<n>` (the P2X/P2Q probe shape). */
export const commandOps = (subject, facts, seq, prefix = 'j01') => {
  const entityId = core.EntityId.make(`subj:${subject}`);
  return Array.from({ length: facts }, (_v, i) => ({
    op: 'assert', entityId, attribute: `:${prefix}/f${i}`, value: core.string(`v${seq}-${i}`), entityType: `${prefix}-subject`,
  }));
};

// ---------------------------------------------------------------- statistics and receipts

export const round = (x, d = 1) => (x === null || x === undefined ? x : Math.round(x * 10 ** d) / 10 ** d);
export const percentiles = (values, ps = [50, 90, 99]) => {
  if (values.length === 0) return Object.fromEntries(ps.map((p) => [`p${p}`, null]));
  const sorted = [...values].sort((a, b) => a - b);
  return Object.fromEntries(ps.map((p) => [`p${p}`, round(sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)])]));
};
export const summary = (values) => ({ n: values.length, ...percentiles(values), max: values.length ? round(Math.max(...values)) : null, mean: values.length ? round(values.reduce((a, b) => a + b, 0) / values.length) : null });

const git = (...args) => execFileSync('git', ['-C', REPO, ...args], { encoding: 'utf8' }).trim();
export const identity = () => {
  const dist = createHash('sha256');
  for (const pkg of ['packages/core/dist', 'packages/xtdb/dist', 'packages/qlever/dist'])
    for (const file of fs.readdirSync(path.join(REPO, pkg), { recursive: true }).filter((f) => String(f).endsWith('.js')).sort())
      dist.update(String(file)).update(fs.readFileSync(path.join(REPO, pkg, String(file))));
  const slots = JSON.parse(fs.readFileSync(path.join(REPO, 'lab/config/slots.json'), 'utf8'));
  return {
    gitHead: git('rev-parse', 'HEAD'), dirty: git('status', '--porcelain').length > 0,
    diffSha256: createHash('sha256').update(git('diff', 'HEAD')).digest('hex'), distSha256: dist.digest('hex'),
    engines: { xtdb: slots.lanes.xtdb.image, qlever: slots.lanes.qlever.image }, endpoints: URLS, node: process.version,
    host: { cpus: os.cpus().length, loadavg: os.loadavg().map((x) => round(x, 2)) },
  };
};

export const writeReceipt = (kind, body) => {
  fs.mkdirSync(RECEIPT_DIR, { recursive: true });
  fs.mkdirSync(RAW_DIR, { recursive: true });
  const id = `${kind}-${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z')}-${randomUUID().slice(0, 6)}`;
  const { raw, ...rest } = body;
  let rawPath = null;
  if (raw !== undefined) {
    rawPath = path.join(RAW_DIR, `${id}.raw.json`);
    fs.writeFileSync(rawPath, JSON.stringify(raw));
  }
  const receipt = { format: 'j01-receipt/1', id, kind, writtenAt: new Date().toISOString(), identity: identity(), ...rest, rawPath, rawSha256: rawPath ? createHash('sha256').update(fs.readFileSync(rawPath)).digest('hex') : null };
  const file = path.join(RECEIPT_DIR, `${id}.json`);
  fs.writeFileSync(file, JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
  return { id, file };
};
