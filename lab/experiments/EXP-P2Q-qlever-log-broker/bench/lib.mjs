// EXP-P2Q harness library: arms, a counting QLever client, statistics, identity and receipts.
// Imports the built dist (the bytes a gate would hash), never package sources. Pattern from EXP-P2X bench/lib.mjs.
import { execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Effect, Layer, ManagedRuntime } from 'effect';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const REPO = path.resolve(HERE, '../../../..');
// The bench imports dist: refuse to run when any broker source is newer than the built bundle (a stale dist
// once ran an older applier in a receipt, P2Q-trace-C-20261107T221344Z-cad02c).
{
  const built = fs.statSync(path.join(REPO, 'packages/qlever/dist/index.js')).mtimeMs;
  for (const dir of ['packages/qlever/src', 'packages/qlever/src/broker'])
    for (const file of fs.readdirSync(path.join(REPO, dir)).filter((f) => f.endsWith('.ts')))
      if (fs.statSync(path.join(REPO, dir, file)).mtimeMs > built)
        throw new Error(`packages/qlever/dist is older than ${dir}/${file}; rebuild before running the bench`);
}
const qlever = await import(path.join(REPO, 'packages/qlever/dist/index.js'));
const core = await import(path.join(REPO, 'packages/core/dist/index.js'));
const runtimeApi = await import(path.join(REPO, 'packages/core/dist/runtime/index.js'));
export { qlever, core, runtimeApi };

/** Raw per-command samples are expensive to regenerate, so they go to the durable project folder (Sam's rule). */
export const RAW_DIR = '/Users/sam/Claude/Projects/triplex-db-2/EXP-P2Q-qlever-log-broker';
export const RECEIPT_DIR = path.join(HERE, '..', 'receipts');
/** Broker logs: under the worktree's runs/ (gitignored), never /tmp (brief, hard rule). */
export const BROKER_ROOT = path.join(REPO, 'runs/broker/EXP-P2Q');

export const ARMS = {
  A0: { label: 'A0: default adapter, marker guard, ACK after QLever publication, fetch (keep-alive) client' },
  A0f: { label: 'A0 with a fresh TCP connection per request (diagnostic: separates the connection effect)' },
  C: { label: 'candidate: host log + broker, ACK at durable frame, overlay RYOW, async guarded publication' },
};

export const now = () => performance.now();
/** Wall-clock-aligned high-resolution stamp, for comparing instants across processes on this host. */
export const wall = () => performance.timeOrigin + performance.now();

/**
 * Wraps a QLever client to record every update's duration and QLever's reported delta (`operations[0]`).
 * RULINGS Q67d: with the engine as the source (A0), a commit resolves when its guarded update applies; each
 * applied A0 update (its VALUES row `(<urn:triplex:meta> <urn:triplex:field:position> "P")`, inserted > 0) is
 * recorded as `resolutions: [P, wall instant]`, the source publication instant for feed lag.
 */
const A0_POSITION = /\(<urn:triplex:meta> <urn:triplex:field:position> "(\d+)"\)/;
export const countingClient = (inner) => {
  const counts = { queries: 0, updates: 0, updateErrors: 0, queryMs: [], updateMs: [], deltaTotals: [], resolutions: [] };
  let lastDelta;
  const client = {
    query: async (...args) => { counts.queries++; const t = now(); try { return await inner.query(...args); } finally { counts.queryMs.push(now() - t); } },
    update: async (...args) => {
      counts.updates++;
      const t = now();
      try {
        const response = await inner.update(...args);
        const at = wall();
        const total = response?.operations?.[0]?.['delta-triples']?.after?.total;
        if (typeof total === 'number') { lastDelta = total; counts.deltaTotals.push(total); }
        const inserted = response?.operations?.[0]?.['delta-triples']?.operation?.inserted;
        const position = A0_POSITION.exec(String(args[0]))?.[1];
        if (position !== undefined && typeof inserted === 'number' && inserted > 0) counts.resolutions.push([Number(position), at]);
        return response;
      } catch (error) { counts.updateErrors++; throw error; } finally { counts.updateMs.push(now() - t); }
    },
    command: (...args) => inner.command(...args),
    cancel: (...args) => inner.cancel(...args),
    close: () => inner.close(),
  };
  return { client, counts, lastDelta: () => lastDelta };
};

/** One trace command as Triplex operations: `facts` asserts about subject `subj:<n>`, values tagged by seq. */
export const commandOps = (event, nowMs) => {
  const entityId = core.EntityId.make(`subj:${event.subject}`);
  const validFrom = event.correction ? nowMs - 30 * 86_400_000 : undefined;
  return Array.from({ length: event.facts }, (_v, i) => ({
    op: 'assert', entityId, attribute: `:p2q/f${i}`, value: core.string(`v${event.seq}-${i}`),
    ...(validFrom === undefined ? {} : { validFrom }), entityType: 'p2q-subject',
  }));
};

/**
 * A Triplex runtime for one arm and scope. The candidate opens a HostBroker on a log directory under
 * runs/broker/EXP-P2Q/ and routes reads through it; A0 is the unchanged default adapter.
 */
const nullClient = { query: async () => [], update: async () => ({}), command: async () => ({}), cancel: async () => {}, close: async () => {} };
export const armRuntime = async (url, arm, scope, { brokerDir, brokerOptions = {}, onEvent, onRead, replica = true, offline = false } = {}) => {
  // offline (candidate only): no QLever at all; the broker keeps every frame in its overlay and log, which
  // isolates the ACK path and the feed (a diagnostic, not the composition under test).
  const base = offline ? nullClient : arm === 'A0' ? qlever.makeQleverClient(url) : qlever.makeFreshConnectionClient(url);
  if (offline) replica = false;
  const counting = countingClient(base);
  let broker, adapter;
  if (arm === 'C') {
    const dir = brokerDir ?? path.join(BROKER_ROOT, `${scope.replace(/[^a-zA-Z0-9-]/g, '_')}`);
    broker = await qlever.HostBroker.open({
      dir, scopeKey: scope, ...(replica ? { replica: counting.client } : {}), minFreeBytes: 3 * 1024 ** 3, requireFullFsync: true,
      ...(onEvent ? { onEvent } : {}), ...brokerOptions,
    });
    adapter = qlever.makeQleverStorageAdapter(counting.client, scope, { broker, brokerOptions: { ...(onRead ? { onRead } : {}) } });
  } else adapter = qlever.makeQleverStorageAdapter(counting.client, scope, {});
  const layer = runtimeApi.Runtime.define({
    name: `p2q-${arm}`,
    storage: Layer.succeed(runtimeApi.StorageAdapter, adapter),
    queries: Layer.succeed(runtimeApi.QueryExecutor, qlever.makeQleverQueryExecutor(counting.client, scope, {
      sourceView: adapter.sourceView, ...(adapter.resolveQueryBasis ? { resolveBasis: adapter.resolveQueryBasis } : {}),
    })),
  }).layer({ scope: runtimeApi.DatabaseScope.test(scope), capabilities: runtimeApi.Capabilities.none });
  const managed = ManagedRuntime.make(layer);
  const triples = await managed.runPromise(Effect.gen(function* () { return yield* core.Triples; }));
  return {
    arm, scope, adapter, triples, broker, counts: counting.counts, lastDelta: counting.lastDelta, client: counting.client,
    run: (effect) => managed.runPromise(effect),
    close: async () => { await managed.dispose(); if (broker) await broker.close(); },
  };
};

export const percentiles = (values, ps = [50, 90, 99]) => {
  if (values.length === 0) return Object.fromEntries(ps.map((p) => [`p${p}`, null]));
  const sorted = [...values].sort((a, b) => a - b);
  return Object.fromEntries(ps.map((p) => [`p${p}`, round(sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)])]));
};
export const round = (x, d = 1) => (x === null || x === undefined ? x : Math.round(x * 10 ** d) / 10 ** d);
export const summary = (values) => ({ n: values.length, ...percentiles(values), max: values.length ? round(Math.max(...values)) : null, mean: values.length ? round(values.reduce((a, b) => a + b, 0) / values.length) : null });
export const tally = (items) => items.reduce((acc, k) => ((acc[k] = (acc[k] ?? 0) + 1), acc), {});

const git = (...args) => execFileSync('git', ['-C', REPO, ...args], { encoding: 'utf8' }).trim();
export const identity = (url) => {
  const head = git('rev-parse', 'HEAD');
  const status = git('status', '--porcelain');
  const diff = git('diff', 'HEAD');
  const slots = JSON.parse(fs.readFileSync(path.join(REPO, 'lab/config/slots.json'), 'utf8'));
  const dist = createHash('sha256');
  for (const pkg of ['packages/qlever/dist', 'packages/core/dist'])
    for (const file of fs.readdirSync(path.join(REPO, pkg), { recursive: true }).filter((f) => String(f).endsWith('.js')).sort())
      dist.update(String(file)).update(fs.readFileSync(path.join(REPO, pkg, String(file))));
  // Which engine start script the slot runs: the repo's (default) or the EXP-P2Q "np" arm via TX2_CONFIG_DIR.
  const configDir = process.env.TX2_CONFIG_DIR ? path.resolve(process.env.TX2_CONFIG_DIR) : '/Users/sam/projects/triplex-db-2';
  const startScript = fs.readFileSync(path.join(configDir, 'qlever-start.sh'));
  return {
    gitHead: head, dirty: status.length > 0, diffSha256: createHash('sha256').update(diff).digest('hex'),
    engineConfig: { dir: configDir, arm: process.env.TX2_CONFIG_DIR ? 'np (no --persist-updates, keep-previous none)' : 'default (repo qlever-start.sh)', startScriptSha256: createHash('sha256').update(startScript).digest('hex'), persistUpdates: /--persist-updates/.test(String(startScript)) },
    // V-P2Q m5: QLEVER_COMMIT_PATH flips makeQleverRuntime process-wide, so every receipt records it.
    env: Object.fromEntries(['QLEVER_COMMIT_PATH', 'QLEVER_BROKER_DIR', 'TX2_CONFIG_DIR'].map((k) => [k, process.env[k] ?? null])),
    distSha256: dist.digest('hex'), engineImage: slots.lanes.qlever.image, endpoint: url ?? null, node: process.version,
    host: { cpus: os.cpus().length, loadavg: os.loadavg().map((x) => round(x, 2)), freeBytes: (() => { const s = fs.statfsSync(REPO); return s.bavail * s.bsize; })() },
  };
};

export const writeReceipt = (kind, body) => {
  fs.mkdirSync(RECEIPT_DIR, { recursive: true });
  fs.mkdirSync(RAW_DIR, { recursive: true });
  const id = `P2Q-${kind}-${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z')}-${randomUUID().slice(0, 6)}`;
  const { raw, ...rest } = body;
  let rawPath = null;
  if (raw !== undefined) {
    rawPath = path.join(RAW_DIR, `${id}.raw.json`);
    fs.writeFileSync(rawPath, JSON.stringify(raw));
  }
  const receipt = { format: 'p2q-receipt/1', id, kind, writtenAt: new Date().toISOString(), ...rest, rawPath, rawSha256: rawPath ? createHash('sha256').update(fs.readFileSync(rawPath)).digest('hex') : null };
  const file = path.join(RECEIPT_DIR, `${id}.json`);
  fs.writeFileSync(file, JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
  return { id, file };
};
