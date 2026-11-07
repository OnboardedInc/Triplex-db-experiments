// EXP-P2X harness library: arms, a counting client, publication stamps, statistics and receipts.
// Imports the built dist (the bytes the gate hashes), never package sources.
import { execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Effect, Layer, ManagedRuntime } from 'effect';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const REPO = path.resolve(HERE, '../../../..');
const xtdb = await import(path.join(REPO, 'packages/xtdb/dist/index.js'));
const core = await import(path.join(REPO, 'packages/core/dist/index.js'));
const runtimeApi = await import(path.join(REPO, 'packages/core/dist/runtime/index.js'));
export { xtdb, core, runtimeApi };

/** Raw per-command samples are expensive to regenerate, so they go to the durable project folder. */
export const RAW_DIR = '/Users/sam/Claude/Projects/triplex-db-2/EXP-P2X-xtdb-commit-feed';
export const RECEIPT_DIR = path.join(HERE, '..', 'receipts');

export const ARMS = {
  A0: { commitPath: 'scope-counter', admissionQueue: false, label: 'A0 scope counter (default)' },
  A0q: { commitPath: 'scope-counter', admissionQueue: true, label: 'A0 scope counter + admission queue' },
  C: { commitPath: 'subject-stamp', admissionQueue: false, label: 'candidate subject-stamp' },
};

export const now = () => performance.now();

/**
 * Wraps the client to count engine rejections by kind and to stamp each commit's publication
 * instant: when COMMIT SYNC returns the transaction is applied and readable (TARGETS 1.1 P3 item 1),
 * on the same monotonic clock the driver and the consumer read. Keyed by operation id (candidate:
 * from METADATA; A0: from the tx_attempts insert) and, for A0, by its pre-assigned position.
 */
export const countingClient = (inner) => {
  const counts = { submits: 0, casConflicts: 0, commandConflicts: 0, otherRejections: 0, transportErrors: 0 };
  const published = new Map();
  const client = {
    query: (...args) => inner.query(...args),
    close: () => inner.close(),
    submit: async (statements, options) => {
      counts.submits++;
      const attempts = statements.find((s) => s.sql.startsWith('INSERT INTO tx_attempts'));
      try {
        const result = options === undefined ? await inner.submit(statements) : await inner.submit(statements, options);
        const t = now();
        const op = options?.metadata?.op ?? attempts?.params?.[2];
        if (op !== undefined) published.set(op, t);
        // A0 attempts rows carry (id, scope, op, attempt, position); the position is pre-assigned.
        if (attempts !== undefined && options?.metadata === undefined) published.set(`pos:${attempts.params[4]}`, t);
        return result;
      } catch (error) {
        const message = String(error?.message ?? error);
        if (/triplex-cas-conflict/.test(message)) counts.casConflicts++;
        else if (/triplex-command-conflict/.test(message)) counts.commandConflicts++;
        else if (error?.constructor?.name === 'XtdbTransactionRejected') counts.otherRejections++;
        else counts.transportErrors++;
        throw error;
      }
    },
  };
  return { client, counts, published };
};

/** A Triplex runtime for one arm and scope over a counting client. */
export const armRuntime = async (url, arm, scope, { maxConnections = 20 } = {}) => {
  const base = xtdb.makeXtdbClient(url, { maxConnections });
  const counting = countingClient(base);
  const config = ARMS[arm];
  const adapter = xtdb.makeXtdbStorageAdapter(counting.client, scope, {
    commitPath: config.commitPath,
    admissionQueue: config.admissionQueue,
  });
  const layer = runtimeApi.Runtime.define({
    name: `p2x-${arm}`,
    storage: Layer.succeed(runtimeApi.StorageAdapter, adapter),
    queries: Layer.succeed(runtimeApi.QueryExecutor, xtdb.makeXtdbQueryExecutor(counting.client, scope)),
  }).layer({ scope: runtimeApi.DatabaseScope.test(scope), capabilities: runtimeApi.Capabilities.none });
  const managed = ManagedRuntime.make(layer);
  const triples = await managed.runPromise(Effect.gen(function* () { return yield* core.Triples; }));
  return {
    arm, scope, adapter, triples, counts: counting.counts, published: counting.published, client: counting.client, base,
    run: (effect) => managed.runPromise(effect),
    close: async () => { await managed.dispose(); await base.close(); },
  };
};

/** One trace command as Triplex operations: `facts` asserts about subject `subj:<n>`. */
export const commandOps = (event, nowMs) => {
  const entityId = core.EntityId.make(`subj:${event.subject}`);
  const validFrom = event.correction ? nowMs - 30 * 86_400_000 : undefined;
  return Array.from({ length: event.facts }, (_v, i) => ({
    op: 'assert', entityId, attribute: `:p2x/f${i}`, value: core.string(`v${event.seq}-${i}`),
    ...(validFrom === undefined ? {} : { validFrom }), entityType: 'p2x-subject',
  }));
};

export const percentiles = (values, ps = [50, 90, 99]) => {
  if (values.length === 0) return Object.fromEntries(ps.map((p) => [`p${p}`, null]));
  const sorted = [...values].sort((a, b) => a - b);
  return Object.fromEntries(ps.map((p) => [`p${p}`, round(sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)])]));
};
export const round = (x, d = 1) => (x === null || x === undefined ? x : Math.round(x * 10 ** d) / 10 ** d);
export const summary = (values) => ({ n: values.length, ...percentiles(values), max: values.length ? round(Math.max(...values)) : null, mean: values.length ? round(values.reduce((a, b) => a + b, 0) / values.length) : null });

const git = (...args) => execFileSync('git', ['-C', REPO, ...args], { encoding: 'utf8' }).trim();
export const identity = () => {
  const head = git('rev-parse', 'HEAD');
  const status = git('status', '--porcelain');
  const diff = git('diff', 'HEAD');
  const slots = JSON.parse(fs.readFileSync(path.join(REPO, 'lab/config/slots.json'), 'utf8'));
  const dist = createHash('sha256');
  for (const pkg of ['packages/xtdb/dist', 'packages/core/dist'])
    for (const file of fs.readdirSync(path.join(REPO, pkg), { recursive: true }).filter((f) => String(f).endsWith('.js')).sort())
      dist.update(String(file)).update(fs.readFileSync(path.join(REPO, pkg, String(file))));
  return {
    gitHead: head, dirty: status.length > 0, diffSha256: createHash('sha256').update(diff).digest('hex'),
    distSha256: dist.digest('hex'), engineImage: slots.lanes.xtdb.image, node: process.version,
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
  const receipt = { format: 'p2x-receipt/1', id, kind, writtenAt: new Date().toISOString(), ...rest, rawPath, rawSha256: rawPath ? createHash('sha256').update(fs.readFileSync(rawPath)).digest('hex') : null };
  const file = path.join(RECEIPT_DIR, `${id}.json`);
  fs.writeFileSync(file, JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
  return { id, file };
};

export const runEffect = Effect.runPromise;
