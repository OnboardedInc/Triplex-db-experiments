import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { expect } from 'vitest';
import { Effect } from 'effect';
import { DatabaseScope } from '@triplex-build/triplex/runtime';
import { DatomicClient } from '../../../packages/datomic/src/DatomicClient.js';
import { makeDatomicStorageAdapter } from '../../../packages/datomic/src/DatomicStorageAdapter.js';
import { makeDatomicQueryExecutor } from '../../../packages/datomic/src/DatomicQueryExecutor.js';

export const authority = JSON.parse(fs.readFileSync(process.env.DA01_AUTHORITY_SUMMARY ?? 'lab/experiments/EXP-DA01/round4/SUMMARY.json', 'utf8'));
const ownerPath = '/Users/sam/projects/triplex-db-2/lab/locks/datomic-dev/owner.json';
const sha = (b: Buffer | string) => createHash('sha256').update(b).digest('hex');
export const run = Effect.runPromise;
export const assertionId = (name: string) => sha(name).slice(0, 26).toUpperCase();
export function fingerprint() {
  const files = execFileSync('git', ['ls-files', 'packages/datomic', 'packages/core', 'packages/testkit', 'lab/bin', 'lab/config', 'pnpm-lock.yaml'], { encoding: 'utf8' }).trim().split('\n');
  return Object.fromEntries(files.map(f => [f, sha(fs.readFileSync(f))]));
}
// [CX-VDA01-R2] Why: every observation uses a new owned database and names its source, request, pin and real cleanup. Rejected: interpreting old builder receipts as a current outcome (no freshness proof).
export async function fixture(label: string, body: (f: {
  client: DatomicClient; db: string; scope: string;
  a: ReturnType<typeof makeDatomicStorageAdapter>; q: ReturnType<typeof makeDatomicQueryExecutor>;
  record: (v: unknown) => void;
}) => Promise<void>) {
  const attempt = `${label}-${randomUUID()}`;
  const dir = path.join(process.env.DA01_REVIEW_OUTPUT ?? 'lab/verify/DA01/round2', 'attempts', attempt);
  fs.mkdirSync(dir, { recursive: true });
  const owner = fs.readFileSync(ownerPath, 'utf8'), sources = fingerprint();
  const client = new DatomicClient(authority.owner.endpoint, 35000);
  const health = await client.health(); expect(health).toEqual(authority.health);
  const record = (v: unknown) => fs.appendFileSync(path.join(dir, 'observations.jsonl'), JSON.stringify({ at: new Date().toISOString(), attempt, value: v }) + '\n');
  fs.writeFileSync(path.join(dir, 'inputs.json'), JSON.stringify({ attempt, startedAt: new Date().toISOString(), head: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), health, owner: JSON.parse(owner), sources, reviewerSources: Object.fromEntries(fs.readdirSync(import.meta.dirname).filter(f => /^round[23]-/.test(f)).map(f => [f, sha(fs.readFileSync(path.join(import.meta.dirname, f)))])) }, null, 2) + '\n', { flag: 'wx' });
  const original = client.request.bind(client);
  client.request = async function <A>(method: 'GET' | 'POST', p: string, input?: unknown, timeout?: number): Promise<A> {
    try { const result = await original<A>(method, p, input, timeout); record({ method, path: p, input, result }); return result; }
    catch (e) { record({ method, path: p, input, error: { code: (e as { code?: string }).code, message: String(e) } }); throw e; }
  };
  const scope = DatabaseScope.test(`CX-VDA01-R2-${attempt}`);
  const created = await client.create(scope); record({ kind: 'created', scope, ...created });
  try { await body({ client, db: created.db, scope, a: makeDatomicStorageAdapter(client, scope), q: makeDatomicQueryExecutor(client, scope), record }); }
  finally {
    const cleanup = await client.delete(scope); record({ kind: 'cleanup', scope, ...cleanup }); client.close();
    expect(cleanup.db).toBe(created.db); expect(cleanup.deleted).toBe(true);
    expect(fingerprint()).toEqual(sources); expect(fs.readFileSync(ownerPath, 'utf8')).toBe(owner);
    expect(await (await fetch(authority.owner.endpoint + '/health')).json()).toEqual(health);
    record({ kind: 'finished', cleanupVerified: true, sourceUnchanged: true });
  }
}

export async function seed(a: ReturnType<typeof makeDatomicStorageAdapter>) {
  const tx = '_tx/01ARZ3NDEKTSV4RRFFQ69G5FAV';
  await run(a.withTransaction(Effect.gen(function* () {
    const p = yield* a.nextCommitPosition();
    for (let i = 0; i < 8; i++) {
      const entityId = `e${String(i).padStart(2, '0')}`;
      yield* a.insert({ entityId, attribute: ':key', value: { type: 'string', value: entityId }, validFrom: i >= 6 ? 30 : 0, validTo: 100, entityType: 'ReviewItem' }, tx, 10, assertionId(`key-${entityId}`), p);
      yield* a.insert({ entityId, attribute: ':status', value: { type: 'string', value: entityId }, validFrom: 0, validTo: 100 }, tx, 10, assertionId(`status-${entityId}`), p);
      yield* a.insert({ entityId: i === 0 ? 'root' : `e${String(i - 1).padStart(2, '0')}`, attribute: ':edge', value: { type: 'ref', value: entityId }, validFrom: 0, validTo: 100 }, tx, 10, assertionId(`edge-${entityId}`), p);
    }
  })));
  await run(a.withTransaction(Effect.gen(function* () { yield* a.nextCommitPosition(); yield* a.nextCommitPosition(); })));
}
export async function advance(a: ReturnType<typeof makeDatomicStorageAdapter>) {
  await run(a.withTransaction(Effect.gen(function* () {
    const p = yield* a.nextCommitPosition();
    for (const id of ['key-e00', 'status-e00', 'key-e03', 'status-e03', 'edge-e06']) expect(yield* a.retract(assertionId(id), 20, '_tx/01ARZ3NDEKTSV4RRFFQ69G5FAW', p)).toBe(true);
  })));
  await run(a.withTransaction(Effect.gen(function* () {
    const p = yield* a.nextCommitPosition();
    yield* a.insert({ entityId: 'new', attribute: ':key', value: { type: 'string', value: 'new' }, validFrom: 0, validTo: 100, entityType: 'ReviewItem' }, '_tx/01ARZ3NDEKTSV4RRFFQ69G5FAX', 30, assertionId('key-new'), p);
    yield* a.insert({ entityId: 'new', attribute: ':status', value: { type: 'string', value: 'new' }, validFrom: 0, validTo: 100 }, '_tx/01ARZ3NDEKTSV4RRFFQ69G5FAX', 30, assertionId('status-new'), p);
  })));
}
