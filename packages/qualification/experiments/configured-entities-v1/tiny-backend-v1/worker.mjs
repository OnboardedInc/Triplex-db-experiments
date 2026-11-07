/** Unexecuted tiny current-public foundation draft. No service/start/install. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { Effect, Layer, Option } from 'effect';
import { Triples } from '@triplex-build/triplex';
import { Capabilities, DatabaseScope } from '@triplex-build/triplex/runtime';
import { ConfigStore, GraphConstraint, InMemoryConfigStore } from '@triplex-build/triplex/config';
import { configuration, entityAssertions, correctionOps, presenceOps, V1, VALID } from '../recipe.mjs';
import { growthSnapshot } from './growth.mjs';
import { ROOT, owned, exclusiveJson, verifyAdmission, verifyPins } from '../../../../../.runtime/experiments/xtdb-identity-handoff-v1/loop-v2/common.mjs';
import { verifyDependencyLock } from '../../../../../.runtime/experiments/xtdb-identity-handoff-v1/loop-v2/inputs.mjs';
import { decodeMetadataPosition, metadataPositionEvidence } from '../../../../../.runtime/experiments/xtdb-identity-handoff-v1/backend-v2/metadata-position.mjs';
const arg = k => process.argv[process.argv.indexOf(k) + 1], sha = b => createHash('sha256').update(b).digest('hex');
const admission = await verifyAdmission(ROOT, { backend: 'xtdb', jobId: 'configured-entity-xtdb-tiny-v1' });
const contract = JSON.parse(await readFile(await owned(ROOT, arg('--contract'))));
assert.equal(contract.mode, 'CURRENT_PUBLIC_XTDB_ONE_EIGHT_ENTITY_HISTORY');
assert(admission.job.manifest.requiredOwners.includes('foundation-xtdb'));
const owner = admission.grant.requiredOwnerChecks.find(row => row.ownerId === 'foundation-xtdb'); assert(owner);
for (const [key, value] of Object.entries(contract.expectedOwner)) assert.deepEqual(owner.observation[key], value, `OWNED_FOUNDATION_${key}`);
assert.deepEqual(admission.grant.cohort.filter(row => row.resources.heavy && row.queryPath.startsWith('xtdb-')), [], 'OTHER_XTDB_CLIENT_AT_GRANT');
const lock = JSON.parse(await readFile(await owned(ROOT, contract.dependencies.path)));
await verifyDependencyLock(ROOT, lock); await verifyPins(ROOT, contract.guards);
const oracle = JSON.parse(await readFile(await owned(ROOT, contract.oracle.path)));
const scope = DatabaseScope.test(contract.scopeName), artifacts = admission.artifacts;
const records = [], acks = [], catalog = new Map(), ids = new Map(), retired = new Map(), growth = [], semanticChecks = [];
let sequence = 0, runtimeSequence = 0, rawClient, defaultApi;
const save = async (name, value) => {
  const entry = await exclusiveJson(ROOT, path.join(artifacts, `${String(++sequence).padStart(3, '0')}-${name}.json`), value);
  records.push(entry); return value;
};
const safeError = error => ({ name: typeof error?.name === 'string' && /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(error.name) ? error.name : 'Error',
  messageSha256: sha(String(error?.message ?? error)), tag: typeof error?._tag === 'string' && /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(error._tag) ? error._tag : null });
const check = (name, fn) => {
  try { fn(); semanticChecks.push({ name, status: 'PASS' }); return true; }
  catch (error) { if (error?.code !== 'ERR_ASSERTION') throw error;
    semanticChecks.push({ name, status:'FAIL', error:safeError(error) }); return false; }
};
const countPosition = async (channel, value) => {
  const raw = metadataPositionEvidence(value); let normalized;
  try { normalized = decodeMetadataPosition(value); } catch (error) { await save('metadata-refused', { channel, raw, error: safeError(error) }); throw error; }
  await save('metadata-position', { channel, raw, normalized }); return normalized;
};
const sample = async phase => {
  const value = await growthSnapshot(ROOT, contract.dataDirectory); growth.push({ phase, value }); await save(`growth-${phase}`, value);
  assert.equal(value.engineFileMetadata.scanFailure, null); assert.equal(value.checker.status, 0); assert.equal(value.checker.signal, null); assert.equal(value.boundedStorage.result, 'PASS');
  const sizes = snapshot => Object.values(snapshot.engineFileMetadata.groups).reduce((n,row) => n + Math.max(row.logicalBytes,row.allocatedBlockBytes), 0);
  assert(sizes(value) - sizes(growth[0].value) <= 256 * 1024 ** 2, 'ENGINE_OBSERVED_GROWTH_RESERVATION');
};
const small = { entityCount: 8, profile: 'sparse1', commandWidth: 500 }, dense = { ...small, profile: 'representative10' };
const optional = value => Option.isSome(value) ? value.value : null;
const expectedValue = row => row.field === 'exact' ? row.value : ({ type: ({ present: 'boolean', 'type-version': 'number', label: 'string', score: 'number', flag: 'boolean', group: 'ref', category: 'string', amount: 'number', instant: 'datetime', date: 'string', rank: 'number' })[row.field], value: row.value });
const symbol = row => `${Number(row.entityId.slice('capacity:e'.length))}/${row.attribute.slice(':capacity/'.length)}`;

// Source-bound width estimate from ConfigStore.ts337–439 only. It is an
// admission guard, not an independent hash or release-semantics oracle.
const configWidth = (before, result, hadRef) => {
  let width = 1 + (hadRef ? 3 : 2);
  for (const [cid, row] of result.store.objects) { const prior = before.objects.get(cid); if (!prior) width += 3;
    width += row.validUnder.filter(id => !prior?.validUnder.includes(id)).length; }
  width += 2 * [...result.store.schemas.keys()].filter(cid => !before.schemas.has(cid)).length;
  width += result.created.reduce((n, revision) => n + 4 + revision.deps.length, 0); return width;
};
const cfg = [await Effect.runPromise(configuration(1)), await Effect.runPromise(configuration(2))];
const empty = InMemoryConfigStore.empty(), preview1 = await Effect.runPromise(InMemoryConfigStore.commit(empty, cfg[0]));
const ref1 = await Effect.runPromise(InMemoryConfigStore.setRef(preview1.store, cfg[0].ref, preview1.snapshot.id));
const preview2 = await Effect.runPromise(InMemoryConfigStore.commit(ref1, cfg[1]));
const previews = [preview1, preview2], widths = [configWidth(empty, preview1, false), configWidth(ref1, preview2, true)];
await save('pure-schema-preview-before-backend', { source: 'PUBLIC_PURE_REFERENCE_NOT_INDEPENDENT_HASH_IMPLEMENTATION', widths,
  releases: previews.map(row => ({ snapshotId: row.snapshot.id, rootCid: row.snapshot.rootCid, revisions: row.created.map(r => r.id) })) });
assert(widths.every(n => Number.isSafeInteger(n) && n <= 500), 'CONFIG_WIDTH_EXCEEDS_ADMISSION');

let runtime;
const run = (program, clock = 2000.25, config = false) => {
  const base = runtime.layer({ scope, capabilities: Capabilities.none,
    deterministic: { startTime: clock, seed: `${contract.runId}:${scope}:${++runtimeSequence}` } });
  const services = config ? ConfigStore.layer.pipe(Layer.provideMerge(base)) : base;
  return Effect.runPromise(program.pipe(Effect.provide(services), Effect.scoped), { signal: AbortSignal.timeout(30000) });
};
const recordAck = async (phase, result, operations, logicalPhase) => {
  await save(`ack-${phase}-raw-before-assert`, { phase, explicitOperations: operations.length, result });
  assert.equal(typeof result.position, 'number'); assert(Number.isSafeInteger(result.position) && result.position > 0);
  assert.equal(result.position, acks.length + 1); assert.equal(result.triples.length, operations.filter(row => row.op === 'assert').length);
  assert.equal(result.retracted, operations.filter(row => row.op === 'retract').length);
  for (const op of operations.filter(row => row.op === 'retract')) { const key = ids.get(op.id); assert(key); retired.set(key, { txId: result.txId, instant: result.instant, position: result.position }); }
  for (const row of result.triples) {
    const key = `${symbol(row)}/${logicalPhase}`; assert(!catalog.has(key));
    catalog.set(key, { id: row.id, txId: result.txId, instant: result.instant, position: result.position }); ids.set(row.id, key);
  }
  acks.push({ phase, ...result, explicitOperations: operations.length }); return result;
};
const compareRows = (rows, expectedRows) => {
  assert.equal(rows.length, expectedRows.length); const expected = new Map(expectedRows.map(row => [row.identity, row]));
  const observed = new Set();
  for (const row of rows) {
    const key = ids.get(row.id), want = expected.get(key), origin = catalog.get(key); assert(want && origin); assert(!observed.has(key)); observed.add(key);
    assert.equal(symbol(row), `${want.entity}/${want.field}`); assert.deepEqual(row.value, expectedValue(want));
    assert.equal(row.validFrom, 10.125); assert.equal(optional(row.validTo), 30.5); assert.equal(optional(row.entityType), 'CapacityEntity');
    assert.equal(optional(row.schemaVersion), null); assert.equal(row.recordedAt, origin.instant); assert.equal(optional(row.txId), origin.txId);
  }
};
const compareRetirements = (rows, history) => {
  // This is an explicit shared as-of non-leakage TARGET. Do not transform the
  // returned rows. Native/Sources.ts's guarded retirement channels inspire the
  // same target here; source inspection alone is not an observed failure.
  for (const row of rows) { const key = ids.get(row.id); assert(key);
    const retirement = history ? retired.get(key) : undefined;
    assert.equal(optional(row.retractedAt), retirement?.instant ?? null, 'AS_OF_RETIREMENT_TIME_MUST_NOT_LEAK');
    assert.equal(optional(row.retractTxId), retirement?.txId ?? null, 'AS_OF_RETIREMENT_TX_MUST_NOT_LEAK');
  }
};
const visible = (model, phase) => model.rows.filter(row => row.asserted <= phase && (row.retired === null || row.retired > phase));
const snapshot = async (name, model, phase, recordedAt) => {
  const result = await run(Effect.gen(function* () { const t = yield* Triples;
    const q = yield* t.queryAll({ find: ['?entity'], where: [['?entity', V1.present.key, true]] }, {
      basis: { validAt: 20.25, ...(recordedAt === undefined ? {} : { recordedAt }) }, includeBasis: true });
    // Ordinary public TemporalBasis accepts R/V only (Temporal.ts11–14).
    // Returned P is observability; never inject internal P into match/query.
    const fixed = { validAt: 20.25, ...(recordedAt === undefined ? {} : { recordedAt }) };
    const rows = yield* t.match({ entityType: 'CapacityEntity' }, fixed);
    const end = yield* t.match({ entityType: 'CapacityEntity' }, { ...fixed, validAt: 30.5 }); return { q, rows, end };
  }));
  await save(`snapshot-${name}-raw-before-assert`, result);
  assert.equal(result.q.basis.scope, scope, 'UNEXPECTED_SCOPE_STOPS_PACKET');
  check(`${name}:query-returned-basis`, () => {
    assert.equal(result.q.basis.validAt,20.25); assert.equal(result.q.basis.recordedPosition, acks.length);
    if (recordedAt !== undefined) assert.equal(result.q.basis.recordedAt, recordedAt);
  });
  const expected = visible(model, phase);
  check(`${name}:typed-membership-and-lineage`, () => compareRows(result.rows, expected));
  check(`${name}:retirement-metadata-target`, () => compareRetirements(result.rows, false));
  check(`${name}:exclusive-valid-end`, () => assert.equal(result.end.length, 0));
  const members = expected.filter(row => row.field === 'present' && row.value === true).map(row => `capacity:e${String(row.entity).padStart(8, '0')}`).sort();
  check(`${name}:query-membership`, () => assert.deepEqual(result.q.results.map(row => row['?entity']).sort(), members));
  await save(`snapshot-${name}-separate-checks`, semanticChecks.filter(row => row.name.startsWith(name + ':')));
  return result;
};
const release = async index => {
  const clock = index === 0 ? 1000.25 : 1003.25;
  const result = await run(Effect.gen(function* () { const store = yield* ConfigStore.ConfigStore; return yield* store.commit(cfg[index]); }), clock, true);
  await save(`schema-v${index + 1}-raw-ack-before-assert`, result);
  assert.equal(result.snapshot.id, previews[index].snapshot.id); assert.equal(result.snapshot.rootCid, previews[index].snapshot.rootCid);
  assert.equal(result.transaction.position, acks.length + 1); assert.equal(result.transaction.instant, clock);
  assert.equal(result.transaction.triples.length + result.transaction.retracted, widths[index]);
  acks.push({ phase: `schema-v${index + 1}`, ...result.transaction, explicitOperations: widths[index] });
  const stored = await run(Effect.gen(function* () { const store = yield* ConfigStore.ConfigStore; const snapshot = yield* store.resolveRef('capacity-live'); assert(snapshot);
    return { snapshot, rules: yield* GraphConstraint.collect(snapshot.root) }; }), 2000.25, true);
  await save(`schema-v${index + 1}-fresh-client-readback`, { snapshot:stored.snapshot, rules:stored.rules.map(row => ({key:row.key,rule:row.rule})) });
  assert.equal(stored.snapshot.id, result.snapshot.id);
  return { snapshot: result.snapshot, rules: stored.rules };
};
let complete = false;
try {
  // Both foundation reservation and all source checks precede any API/client.
  const loaded = await import('@triplex-build/triplex-qualification');
  const selected = await loaded.loadQualificationBackend('xtdb');
  assert.equal(selected.artifact, path.join(ROOT, 'packages/xtdb/dist/index.js')); assert.equal(selected.url, contract.url); runtime = selected.makeRuntime();
  defaultApi = await import(new URL(`file://${selected.artifact}`).href);
  await sample('before');
  const start = await run(Effect.gen(function* () { const t = yield* Triples; return yield* t.currentPosition(); }));
  await save('fresh-scope-position', { scope, position: start }); assert.equal(start, 0);
  const schema1 = await release(0); await sample('schema-v1');
  const seed = (await Promise.all(Array.from({ length: 8 }, (_, i) => Effect.runPromise(entityAssertions(small, i))))).flat();
  const mutate = async (phase, operations, logicalPhase, clock, schema) => {
    assert(operations.length <= 500);
    const result = await run(Effect.gen(function* () { const t = yield* Triples; return yield* t.transact(operations, {
      commandId: `${contract.runId}:${phase}`, actor: 'capacity-fixture', configSnapshot: schema.snapshot.id, enforce: GraphConstraint.enforcement(schema.rules) }); }), clock);
    const ack = await recordAck(phase, result, operations, logicalPhase); assert.equal(ack.instant, clock); await sample(phase); return ack;
  };
  const sparse = await mutate('sparse-seed', seed, 0, 1001.25, schema1); assert.equal(seed.length, 24);
  await snapshot('sparse-seed', oracle.sparse, 0, sparse.instant);
  assert(!semanticChecks.some(row => row.status === 'FAIL'), 'SEED_FAILURE_DEPENDENT_WRITES_NOT_EXECUTED');
  const expanded = (await Promise.all(Array.from({ length: 8 }, (_, i) => Effect.runPromise(entityAssertions(dense, i))))).flat()
    .filter(row => ![V1.present.key, V1.typeVersion.key, V1.label.key].includes(row.attribute));
  const denseAck = await mutate('dense-expand', expanded, 0, 1002.25, schema1); assert.equal(expanded.length, 72);
  await snapshot('dense-seed', oracle.dense, 0, denseAck.instant);
  assert(!semanticChecks.some(row => row.status === 'FAIL'), 'EXPANSION_FAILURE_DEPENDENT_WRITES_NOT_EXECUTED');
  const failedId = `${contract.runId}:invalid-required`;
  const invalid = await run(Effect.gen(function* () { const t = yield* Triples;
    return yield* t.transact([{ op: 'retract', id: catalog.get('0/label/0').id }], { commandId: failedId,
      enforce: GraphConstraint.enforcement(schema1.rules.filter(row => row.rule._tag === 'Required' && row.rule.attribute === V1.label.key)) }).pipe(Effect.result);
  }), 1002.75);
  await save('required-rejection-typed-before-assert', { tag: invalid._tag,
    ...(invalid._tag === 'Failure' ? { error: safeError(invalid.failure),
      ...(invalid.failure._tag === 'ConstraintViolationError' ? { violations: invalid.failure.violations } : {}) } : {}) });
  assert.equal(invalid._tag, 'Failure'); assert.equal(invalid.failure._tag, 'ConstraintViolationError');
  assert(invalid.failure.violations.some(row => row.code === 'required'));
  const unchanged = await run(Effect.gen(function* () { const t = yield* Triples; return { position: yield* t.currentPosition(), receipt: yield* t.transactionByCommand(failedId) }; }));
  await save('required-rejection-atomic-readback', unchanged); assert.equal(unchanged.position, 3); assert.equal(unchanged.receipt, null);
  await snapshot('required-rejection-preserves-dense', oracle.dense, 0, 1002.25);
  const schema2 = await release(1); await sample('schema-v2');
  const correction = await Effect.runPromise(correctionOps(dense, 0, { label: catalog.get('0/label/0').id, typeVersion: catalog.get('0/type-version/0').id }));
  const changed = await mutate('correction', correction, 1, 1004.25, schema2);
  const off = await mutate('presence-off', presenceOps(dense, 0, false, catalog.get('0/present/0').id), 2, 1005.25, schema2);
  const on = await mutate('presence-on', presenceOps(dense, 0, true, catalog.get('0/present/2').id), 3, 1006.25, schema2);
  await save('immutable-ack-cut-catalog-before-final-reads', { scope, acks, assertions: [...catalog], retirements: [...retired] });
  await snapshot('sparse-old-cut-after-all-writes', oracle.sparse, 0, sparse.instant);
  for (const [name, phase, cut] of [['dense-old',0,denseAck.instant],['corrected',1,changed.instant],['absent',2,off.instant],['returned',3,on.instant]])
    await snapshot(name, oracle.dense, phase, cut);
  await snapshot('dense-recorded-R-with-returned-source-P', oracle.dense, 0, 1002.25);
  await snapshot('current-fresh-client', oracle.dense, 3);
  const history = await run(Effect.gen(function* () { const t = yield* Triples; return (yield* Effect.forEach(Array.from({ length:8 }, (_, i) => `capacity:e${String(i).padStart(8,'0')}`), id => t.history(id))).flat(); }));
  await save('full-history-fresh-client', history);
  check('full-history:typed-membership-and-lineage', () => compareRows(history, oracle.dense.rows));
  check('full-history:retirement-metadata', () => compareRetirements(history, true));
  const journals = await run(Effect.gen(function* () { const t = yield* Triples; return yield* t.transactions({ after: 0, limit: 1000 }); }));
  await save('journals-fresh-client', journals); assert.equal(journals.transactions.length, 7);
  for (const ack of acks) {
    const row = journals.transactions.find(row => row.position === ack.position); assert(row); assert.equal(row.txId, ack.txId); assert.equal(row.instant, ack.instant);
    assert.equal(row.changes.length, ack.explicitOperations);
  }
  for (const ack of acks.filter(row => !row.phase.startsWith('schema'))) {
    const receipt = await run(Effect.gen(function* () { const t = yield* Triples; return yield* t.transactionByCommand(`${contract.runId}:${ack.phase}`); }));
    await save(`command-receipt-${ack.phase}`, receipt); assert(receipt); assert.equal(receipt.txId, ack.txId); assert.equal(receipt.position, ack.position);
  }
  rawClient = defaultApi.makeXtdbClient(selected.url);
  const query = (sql, params) => rawClient.query(sql, params, undefined, { timeoutMs: 5000, signal: AbortSignal.timeout(5000) });
  const groups = await query('SELECT entity_type, COUNT(*) AS total FROM tx_assertions FOR ALL VALID_TIME WHERE scope_key = ? GROUP BY entity_type', [scope]);
  await save('scoped-logical-row-populations-raw', groups); const populations = {};
  for (const row of groups) populations[row.entity_type] = await countPosition(`assertions:${row.entity_type}`, row.total);
  assert.equal(populations.CapacityEntity, 100);
  const claims = await query('SELECT command_id, tx_id, position FROM tx_claims FOR ALL VALID_TIME WHERE scope_key = ?', [scope]);
  await save('scoped-command-claims-raw-before-decode', claims); assert.equal(claims.length, 5);
  for (const row of claims) { const position = await countPosition('claim-position', row.position); assert(acks.some(ack => ack.position === position && ack.txId === row.tx_id)); }
  const operations = await query('SELECT operation_id, attempt_id, position FROM tx_attempts FOR ALL VALID_TIME WHERE scope_key = ?', [scope]);
  await save('scoped-operation-receipts-raw-before-decode', operations); assert.equal(operations.length, 7);
  for (const row of operations) {
    const position = await countPosition('operation-position', row.position), resolved = await Effect.runPromise(defaultApi.resolveXtdbOperation(rawClient, scope, row.operation_id));
    await save('public-operation-resolution-before-assert', resolved); assert.equal(resolved.status, 'committed'); assert.equal(resolved.position, position); assert.equal(resolved.attemptId, row.attempt_id);
  }
  for (const table of ['tx_query_relations', 'tx_constraint_graphs', 'tx_constraint_generations']) {
    const rows = await query(`SELECT COUNT(*) AS total FROM ${table} FOR ALL VALID_TIME WHERE scope_key = ?`, [scope]);
    await save(`maintenance-${table}-raw`, rows); assert.equal(await countPosition(table, rows[0].total), 0);
  }
  await rawClient.close(); rawClient = undefined; await sample('after-final-client-close');
  await verifyDependencyLock(ROOT, lock); await verifyPins(ROOT, contract.guards);
  await save('all-semantic-checks', semanticChecks);
  const failures = semanticChecks.filter(row => row.status === 'FAIL');
  await save('summary', { scope, configuredEntities: 8, physicalDomainSubjects: 8, profileCuts: { sparseFacts:24,denseFacts:96 },
    finalFixtureAssertionVersions:100, fixtureRetirements:4, schemaCommits:2, domainCommands:5, requiredRejection:1,
    populations, recordedCut:1002.25, phaseSnapshots: growth.length, fullTransientPeakQualified:false,
    semanticFailures:failures, storedSchemaDatatypeAutomaticEnforcement:'UNQUALIFIED', explicitRequiredEnforcement:'PASSED', largerStages:'BLOCKED', driverObservationClaimed:false });
  await exclusiveJson(ROOT, path.join(artifacts, 'checks.json'), { configuredEntities:8, domainSubjects:8,
    logicalHistory:failures.length?'FAIL':'PASS', operationReceipts:'PASS', publicRequiredAtomicRejection:'PASS', schemaReleaseReadback:'PASS',
    status:failures.length?'FAIL_TINY_PUBLIC_FOUNDATION':'PASS_TINY_PUBLIC_FOUNDATION_ONLY' });
  complete = true;
} catch (error) { await save('failure', { error:safeError(error), completedAcks:acks.map(row => ({ phase:row.phase,position:row.position })),
  fixtureRetriedPublicCall:false, outcomeClassification:'Review retained ACKs; no unknown outcome silently replayed or called rejected' }); process.exitCode = 1; }
finally {
  if (rawClient) {
    try { await rawClient.close(); }
    catch (error) { complete = false; process.exitCode = 1; await save('client-cleanup-failed', {error:safeError(error)}); }
  }
  await exclusiveJson(ROOT, path.join(artifacts, 'report.json'), { format:'triplex-configured-tiny-public-report/1',
    status:complete?(semanticChecks.some(row => row.status === 'FAIL')?'COMPLETE_WITH_SEMANTIC_FAILURE':'COMPLETE'):'FAILED', scope,
    records, noDatasetDeletion:true, nativeRestart:false, performanceClaimed:false, largerStageAdmission:'BLOCKED' });
}
