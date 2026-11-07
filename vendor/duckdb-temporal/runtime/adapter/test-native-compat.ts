import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { Effect } from 'effect';
import { EntityId } from '@triplex-build/triplex';
import { Capabilities, DatabaseScope, type TripleInput } from '@triplex-build/triplex/runtime';
import { runtimeConformance, triplesConformanceCases } from '@triplex-build/triplex-testkit';
import type { GranularBackend } from './effect-storage.js';
import { buildRow, PublicDuckDBBackend } from './public-backend.mjs';
import { NativeDuckDBPort } from './native-duckdb-port.mjs';
import { NativeCompatibilityBackend } from './native-compat-backend.js';
import { makeNativeCompatibilityRuntime } from './native-compat-runtime.js';

const schema = await readFile(new URL('./public-schema.sql', import.meta.url), 'utf8');
const scope = DatabaseScope.test('native-compat-mutations');
const quote = (text: string) => "'" + text.replaceAll("'", "''") + "'";
const rolledBack = (pattern: RegExp) => (error: unknown) => error instanceof Error &&
  'code' in error && error.code === 'ROLLED_BACK' && error.cause instanceof Error && pattern.test(error.cause.message);
const input: TripleInput = { entityId: EntityId.make('e'), attribute: 'n', value: { type: 'number', value: 1 } };
const physical = `SELECT assertion_id,e,a,tag,payload,valid_from::VARCHAR valid_from,valid_to::VARCHAR valid_to,
 tx_from::VARCHAR tx_from,tx_to::VARCHAR tx_to,command_id,corrected_by,payload_hash,v_tag,hex(v_s) v_s,v_b,
 v_i::VARCHAR v_i,v_f,recorded_at,retracted_at,external_valid_from,external_valid_to,created_by,entity_type,
 transaction_id,retract_transaction_id,extra_json,origin,interop,
 main.td_float_bits_v1(recorded_at) recorded_bits,
 CASE WHEN v_f IS NOT NULL THEN main.td_float_bits_v1(v_f) END value_bits
 FROM main.assertions ORDER BY assertion_id`;

async function open(native: boolean, owned = false) {
  const port = await (owned ? NativeDuckDBPort.openWithOwner() : NativeDuckDBPort.open());
  const publicBackend = new PublicDuckDBBackend(port, scope);
  const backend: GranularBackend = native ? new NativeCompatibilityBackend(publicBackend) : publicBackend;
  try { await backend.initialize(schema); }
  catch (error) { await backend.close(); throw error; }
  return { port, backend };
}

test('native compatibility append matches every physical carrier and fractional metadata', async () => {
  const fixtures: TripleInput[] = [
    { ...input, attribute: 'text', value: { type: 'string', value: "é🙂 ' \\ \n" } },
    { ...input, attribute: 'ref', value: { type: 'ref', value: EntityId.make('target') } },
    { ...input, attribute: 'false', value: { type: 'boolean', value: false } },
    { ...input, attribute: 'true', value: { type: 'boolean', value: true } },
    { ...input, attribute: 'json', value: { type: 'json', value: { nested: [1, false, null, 'é🙂'] } } },
    { ...input, attribute: 'blob', value: { type: 'blob', value: 'sha256:123', mimeType: 'text/plain', size: 3, filename: "é'.txt" } },
    ...[Number.MIN_VALUE, -Number.MIN_VALUE, 0, -0, Number.MAX_VALUE, -Number.MAX_VALUE, 1.0000000000000002].flatMap(value => [
      { ...input, attribute: 'number', value: { type: 'number' as const, value } },
      { ...input, attribute: 'datetime', value: { type: 'datetime' as const, value } },
    ]),
    { ...input, attribute: 'huge-time', validFrom: 1e100, validTo: Number.MAX_VALUE },
  ];
  const inputs = fixtures.map(row => ({ validFrom: 0.25, validTo: 0.75, createdBy: 'actor', entityType: 'Entity', ...row }));
  const results = [];
  for (const native of [false, true]) {
    const { backend } = await open(native);
    try {
      const returned = await backend.withTransaction(async session => {
        const position = await session.nextCommitPosition();
        await session.claimCommand('values', 'tx-values', 10.125);
        return session.batchInsert(inputs, 'tx-values', 10.125, inputs.map((_, index) => 'value-' + index), position);
      });
      const snapshot = await backend.read(async session => ({
        rows: await session.runRecords(physical),
        usage: await session.runRecords('SELECT * FROM main.storage_usage'),
        history: await session.history('e'),
      }));
      assert.equal(snapshot.rows.length, inputs.length);
      assert.equal(returned[0]?.recorded_at, 10.125);
      assert.equal(returned[0]?.valid_from, 0.25);
      assert.equal(returned[0]?.valid_to, 0.75);
      assert.equal(snapshot.rows.find(row => row.assertion_id === 'value-6')?.value_bits, '0000000000000001');
      results.push({ returned, ...snapshot });
    } finally { await backend.close(); }
  }
  assert.deepEqual(results[1], results[0]);
});

test('native compatibility retains caller transaction, retraction and command semantics', async () => {
  const outputs = [];
  for (const native of [false, true]) {
    const { backend } = await open(native);
    try {
      const values = await backend.withTransaction(async session => {
        assert.equal(await session.claimCommand('transaction', 'provided-tx', 10.5), null);
        const position = await session.nextCommitPosition();
        assert.equal(position, 1);
        const before = await session.insert(input, 'provided-tx', 10.5, 'provided-id', position);
        assert.deepEqual(await session.getById('provided-id'), before);
        assert.equal(await session.retract('missing', 10.75, 'provided-tx', 0), false);
        assert.equal(await session.retract('provided-id', 10.75, 'provided-tx', position), true);
        assert.equal(await session.getById('provided-id'), null);
        assert.equal(await session.retract('provided-id', 10.75, 'provided-tx', position), false);
        await session.insert({ ...input, value: { type: 'number', value: 2 } }, null, 10.5, 'replacement', position);
        return { history: await session.history('e'), physical: await session.runRecords(physical) };
      });
      assert.equal(await backend.read(session => session.claimCommand('transaction', 'ignored-tx', 99)), 'provided-tx');
      await assert.rejects(backend.withTransaction(async session => {
        const position = await session.nextCommitPosition();
        await session.insert(input, 'rollback-tx', 11, 'rolled-back', position);
        throw new Error('rollback requested');
      }), rolledBack(/rollback requested/));
      await backend.read(async session => {
        assert.equal(await session.getById('rolled-back'), null);
        assert.equal(await session.currentCommitPosition(), 1);
      });
      outputs.push(values);
    } finally { await backend.close(); }
  }
  assert.deepEqual(outputs[1], outputs[0]);
});

test('chunked native writes poison caught failures and permit healthy reuse', async () => {
  const { backend, port } = await open(true);
  try {
    await backend.withTransaction(async session => {
      const position = await session.nextCommitPosition();
      await session.insert(input, 'seed', 1, 'seed', position);
    });
    const inputs = Array.from({ length: 130 }, (_, index) => ({ ...input, entityId: EntityId.make('chunk-' + index) }));
    for (const kind of ['duplicate', 'oversize']) {
      const selected = inputs.map((row, index) => kind === 'oversize' && index === 129
        ? { ...row, value: { type: 'string' as const, value: 'x'.repeat(32768) } } : row);
      const ids = inputs.map((_, index) => kind === 'duplicate' && index === 129 ? 'seed' : 'chunk-' + index);
      await assert.rejects(backend.withTransaction(async session => {
        const position = await session.nextCommitPosition();
        await session.claimCommand('failed-' + kind, 'bad', 2);
        try { await session.batchInsert(selected, 'bad', 2, ids, position); }
        catch { /* The owner still rejects completion and rolls back earlier chunks. */ }
      }));
      await backend.read(async session => {
        assert.equal(await session.currentCommitPosition(), 1);
        assert.equal(await session.getById('chunk-0'), null);
        assert.deepEqual(await session.runRecords("SELECT count(*) n FROM main.commands WHERE command_id LIKE 'failed-%'"), [{ n: 0 }]);
        assert.deepEqual(await session.runRecords('SELECT retained_count n FROM main.storage_usage'), [{ n: 1 }]);
      });
    }
    await backend.withTransaction(async session => {
      const position = await session.nextCommitPosition();
      await session.batchInsert(inputs, 'good', 3, inputs.map((_, index) => 'chunk-' + index), position);
    });
    assert.equal(await backend.read(async session => (await session.query({ attribute: 'n' })).length), 131);
    assert.equal(port.trace().some(row => row.op === 'append'), false);
  } finally { await backend.close(); }
});

test('direct native mutation rejects malformed rows and storage admission atomically', async () => {
  const { backend } = await open(true);
  const valid = buildRow(input, 'direct', 1, 'direct', 1);
  const invalid = [
    [{ ...valid, value_number: null }],
    [{ ...valid, value_type: 'unknown' }],
    [{ ...valid, id: '' }],
    [{ ...valid, recorded_position: 0 }],
    [{ ...valid, extra: true }],
    [valid, valid],
    Array.from({ length: 129 }, () => ({})),
  ];
  try {
    for (const rows of invalid) {
      await assert.rejects(backend.withTransaction(session => session.runRecords(`PRAGMA td_compat_append_v1(${quote(JSON.stringify(rows))})`)), rolledBack(/TD_E_COMPAT/));
    }
    await assert.rejects(backend.withTransaction(async session => {
      await session.runRecords('UPDATE main.storage_usage SET retained_count=1000000');
      await session.insert(input, 'full', 1, 'full', 1);
    }), rolledBack(/TD_E_COMPAT_LIMIT/));
    await assert.rejects(backend.withTransaction(async session => {
      await session.runRecords('DELETE FROM main.storage_usage');
      await session.insert(input, 'missing-usage', 1, 'missing-usage', 1);
    }), rolledBack(/TD_E_COMPAT_INPUT/));
    await backend.read(async session => {
      assert.deepEqual(await session.runRecords('SELECT count(*) n FROM main.assertions'), [{ n: 0 }]);
      assert.deepEqual(await session.runRecords('SELECT retained_count n FROM main.storage_usage'), [{ n: 0 }]);
    });
    const json = JSON.stringify([valid]);
    const atLimit = json + ' '.repeat(32768 - Buffer.byteLength(json));
    await backend.withTransaction(session => session.runRecords(`PRAGMA td_compat_append_v1(${quote(atLimit)})`));
    await assert.rejects(backend.withTransaction(session =>
      session.runRecords(`PRAGMA td_compat_append_v1(${quote(atLimit + ' ')})`)), rolledBack(/TD_E_COMPAT_LIMIT/));
    await backend.read(async session => {
      assert.deepEqual(await session.runRecords('SELECT count(*) n FROM main.assertions'), [{ n: 1 }]);
      assert.deepEqual(await session.runRecords('SELECT retained_count n FROM main.storage_usage'), [{ n: 1 }]);
    });
  } finally { await backend.close(); }
});

test('experimental mutations invalidate audited ownership before raw dispatch', async () => {
  const { backend, port } = await open(true, true);
  const run = (sql: string) => port.runNative({ name: 'compat_owner_test', sql, params: [] });
  try {
    await run('SELECT td_owner_probe_enroll()');
    await run('SELECT td_owner_probe_activate(0)');
    assert.deepEqual(await run('SELECT td_owner_probe_validated_check()'), [[true]]);
    await backend.withTransaction(async session => {
      const position = await session.nextCommitPosition();
      await session.insert(input, 'owned-raw', 1, 'owned-raw', position);
    });
    await assert.rejects(run('SELECT td_owner_probe_validated_check()'), /TD_E_OWNER_PROBE_INVALID/);
    assert.ok(port.trace().some(row => row.name === 'owner_invalidate'));
    await run('SELECT td_owner_probe_enroll()');
    await run('SELECT td_owner_probe_activate(0)');
    assert.deepEqual(await run('SELECT td_owner_probe_validated_check()'), [[true]]);
  } finally { await backend.close(); }
});

test('all 44 pinned Triplex conformance cases pass through the experimental factory', async () => {
  assert.equal(triplesConformanceCases.length, 44);
  const runtime = await makeNativeCompatibilityRuntime();
  await Effect.runPromise(runtimeConformance(runtime, {
    scope: DatabaseScope.test('native-compat-conformance'), capabilities: Capabilities.none,
  }));
});
