import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { DuckDBInstance } from '@duckdb/node-api';
import { Effect } from 'effect';
import { EntityId } from '@triplex-build/triplex';
import { Capabilities, DatabaseScope, type TripleInput } from '@triplex-build/triplex/runtime';
import { runtimeConformance, triplesConformanceCases } from '@triplex-build/triplex-testkit';
import type { GranularBackend } from './effect-storage.js';
import { buildRow, PublicDuckDBBackend } from './public-backend.mjs';
import { NativeDuckDBPort } from './native-duckdb-port.mjs';
import { NativeDirectCompatibilityBackend } from './native-direct-backend.js';
import { makeNativeDirectCompatibilityRuntime } from './native-direct-runtime.js';

const schema = await readFile(new URL('./public-schema.sql', import.meta.url), 'utf8');
const scope = DatabaseScope.test('native-direct-mutations');
const input: TripleInput = { entityId: EntityId.make('e'), attribute: 'n', value: { type: 'number', value: 1 } };
const physical = `SELECT assertion_id,e,a,tag,payload,valid_from::VARCHAR valid_from,valid_to::VARCHAR valid_to,
 tx_from::VARCHAR tx_from,tx_to::VARCHAR tx_to,command_id,corrected_by,payload_hash,v_tag,hex(v_s) v_s,v_b,
 v_i::VARCHAR v_i,v_f,recorded_at,retracted_at,external_valid_from,external_valid_to,created_by,entity_type,
 transaction_id,retract_transaction_id,extra_json,origin,interop FROM main.assertions ORDER BY assertion_id`;
const rolledBack = (pattern: RegExp) => (error: unknown) => error instanceof Error &&
  'code' in error && error.code === 'ROLLED_BACK' && error.cause instanceof Error && pattern.test(error.cause.message);
const quote = (text: string) => "'" + text.replaceAll("'", "''") + "'";

async function open(direct: boolean, database = ':memory:') {
  const port = await (direct ? NativeDuckDBPort.openWithOwner({ database }) : NativeDuckDBPort.open({ database }));
  const baseline = new PublicDuckDBBackend(port, scope);
  const backend: GranularBackend = direct ? new NativeDirectCompatibilityBackend(baseline) : baseline;
  try { await backend.initialize(schema); }
  catch (error) { await backend.close(); throw error; }
  return { port, backend };
}

test('direct C++ append matches all seven carriers, binary64 bits and fractional time', async () => {
  const fixtures: TripleInput[] = [
    { ...input, value: { type: 'string', value: "é🙂 '\n\\" } },
    { ...input, value: { type: 'ref', value: EntityId.make('target') } },
    { ...input, value: { type: 'boolean', value: true } },
    { ...input, value: { type: 'boolean', value: false } },
    { ...input, value: { type: 'json', value: { key: ['é', false, null, '\0'] } } },
    { ...input, value: { type: 'blob', value: 'blob', mimeType: 'text/plain', size: 3, filename: 'é.txt' } },
    ...[Number.MIN_VALUE, -Number.MIN_VALUE, 0, -0, Number.MAX_VALUE, -Number.MAX_VALUE, 1.0000000000000002].flatMap(value => [
      { ...input, value: { type: 'number' as const, value } },
      { ...input, value: { type: 'datetime' as const, value } },
    ]),
    { ...input, validFrom: 1e100, validTo: Number.MAX_VALUE },
  ];
  const inputs = fixtures.map(row => ({ validFrom: 0.25, validTo: 0.75, createdBy: 'actor', entityType: 'Row', ...row }));
  const results = [];
  for (const direct of [false, true]) {
    const { backend } = await open(direct);
    try {
      const returned = await backend.withTransaction(async session => {
        const position = await session.nextCommitPosition();
        return session.batchInsert(inputs, 'provided-tx', 10.125, inputs.map((_, index) => 'row-' + index), position);
      });
      results.push({ returned, physical: await backend.read(session => session.runRecords(physical)),
        usage: await backend.read(session => session.runRecords('SELECT * FROM main.storage_usage')) });
    } finally { await backend.close(); }
  }
  assert.deepEqual(results[1], results[0]);
});

test('direct append uses the caller transaction and refreshes prepared parameters and metadata', async () => {
  const { backend, port } = await open(true);
  try {
    await backend.withTransaction(async session => {
      const position = await session.nextCommitPosition();
      assert.equal(await session.claimCommand('command', 'transaction', 10), null);
      const first = await session.insert(input, 'transaction', 10, 'first', position);
      assert.deepEqual(await session.getById('first'), first);
      const second = await session.insert({ ...input, value: { type: 'number', value: 2 } }, 'transaction', 10, 'second', position);
      assert.deepEqual(await session.getById('second'), second);
      assert.equal(await session.retract('missing', 10.5, 'transaction', 0), false);
      assert.equal(await session.retract('first', 10.5, 'transaction', position), true);
      assert.equal(await session.getById('first'), null);
    });
    await assert.rejects(backend.withTransaction(async session => {
      const position = await session.nextCommitPosition();
      await session.insert(input, null, 11, 'rollback', position);
      throw new Error('requested rollback');
    }), rolledBack(/requested rollback/));
    await backend.read(async session => {
      assert.equal(await session.currentCommitPosition(), 1);
      assert.equal(await session.getById('rollback'), null);
      assert.equal(await session.claimCommand('command', 'different', 11), 'transaction');
    });
    await backend.withTransaction(async session => {
      await session.runRecords('DROP TABLE main.assertions');
      await session.runRecords('PRAGMA td_initialize');
      await session.runRecords('UPDATE main.storage_usage SET retained_count=0,retained_bytes=0');
      const position = await session.nextCommitPosition();
      await session.insert({ ...input, value: { type: 'number', value: 3 } }, null, 12, 'recreated', position);
    });
    await backend.read(async session => {
      assert.equal(await session.getById('second'), null);
      assert.equal((await session.getById('recreated'))?.value_number, 3);
    });
    assert.ok(port.cacheStats().hits > 0);
  } finally { await backend.close(); }
});

test('direct post-append usage failure aborts the whole caller transaction even when caught', async () => {
  const { backend } = await open(true);
  try {
    await backend.withTransaction(async session => {
      await session.runRecords('DROP TABLE main.storage_usage');
      await session.runRecords(`CREATE TABLE main.storage_usage(singleton BOOLEAN PRIMARY KEY CHECK(singleton),
        retained_count BIGINT NOT NULL CHECK(retained_count<2),retained_bytes BIGINT NOT NULL CHECK(retained_bytes>=0))`);
      await session.runRecords('INSERT INTO main.storage_usage VALUES (TRUE,0,0)');
    });
    await assert.rejects(backend.withTransaction(async session => {
      const position = await session.nextCommitPosition();
      await session.claimCommand('failed', 'failed-tx', 10);
      try { await session.batchInsert([input, input], 'failed-tx', 10, ['first', 'second'], position); }
      catch { /* Native post-append failure must invalidate the transaction too. */ }
    }));
    await backend.read(async session => {
      assert.equal(await session.currentCommitPosition(), 0);
      assert.deepEqual(await session.runRecords('SELECT count(*) n FROM main.assertions'), [{ n: 0 }]);
      assert.deepEqual(await session.runRecords('SELECT count(*) n FROM main.commands'), [{ n: 0 }]);
      assert.deepEqual(await session.runRecords('SELECT retained_count n FROM main.storage_usage'), [{ n: 0 }]);
    });
    await backend.withTransaction(async session => {
      const position = await session.nextCommitPosition();
      await session.insert(input, null, 11, 'healthy', position);
    });
  } finally { await backend.close(); }
});

test('direct append rejects malformed metadata, NULL, depth and transport bounds before mutations', async () => {
  const { backend, port } = await open(true);
  const valid = buildRow(input, null, 1, 'one', 1);
  try {
    for (const rows of [[{ ...valid, extra: true }], [{ ...valid, value_type: 'no' }], [{ ...valid, recorded_position: 0 }],
      [{ ...valid, value_number: null }], [valid, valid]]) {
      await assert.rejects(backend.withTransaction(session => session.runRecords(
        'SELECT td_compat_append_cpp_v1(?::VARCHAR)', [JSON.stringify(rows)])), rolledBack(/TD_E_COMPAT_CPP_INPUT/));
    }
    await assert.rejects(backend.withTransaction(session => session.runRecords(
      'SELECT td_compat_append_cpp_v1(?::VARCHAR)', [null])), rolledBack(/TD_E_COMPAT_CPP_INPUT/));
    await assert.rejects(backend.withTransaction(session => session.runRecords(
      'SELECT td_compat_append_cpp_v1(?::VARCHAR)', ['['.repeat(65) + '0' + ']'.repeat(65)])), rolledBack(/TD_E_COMPAT_CPP_LIMIT/));
    await assert.rejects(backend.withTransaction(session => session.runRecords(
      'SELECT td_compat_append_cpp_v1(?::VARCHAR)', [JSON.stringify(Array.from({ length: 4097 }, () => ({})))])), rolledBack(/TD_E_COMPAT_CPP_LIMIT/));
    await assert.rejects(backend.withTransaction(session => session.runRecords(
      'SELECT td_compat_append_cpp_v1(?::VARCHAR) FROM range(2)', [JSON.stringify([valid])])), rolledBack(/TD_E_COMPAT_CPP_INPUT/));
    await backend.withTransaction(async session => {
      assert.deepEqual(await session.runRecords('SELECT td_compat_append_cpp_v1(?::VARCHAR) WHERE FALSE',
        [JSON.stringify([valid])]), []);
    });
    // Exercise the native 2 MiB limit directly. The public port deliberately
    // retains its smaller SQL-text and 1 MiB parameter transport admissions.
    const instance = await DuckDBInstance.create(':memory:', { allow_unsigned_extensions: 'true' });
    const connection = await instance.connect();
    let statement;
    try {
      const root = fileURLToPath(new URL('../..', import.meta.url));
      await connection.run(`LOAD ${quote(join(root, 'build/temporal_datalog.duckdb_extension'))}`);
      await connection.run('PRAGMA td_initialize');
      await connection.run(`LOAD ${quote(join(root, 'build/owner_probe/temporal_owner_probe.duckdb_extension'))}`);
      statement = await connection.prepare('SELECT td_compat_append_cpp_v1(?::VARCHAR)');
      const json = JSON.stringify([valid]);
      const exact = json + ' '.repeat(2 * 1024 * 1024 - Buffer.byteLength(json));
      await connection.run('BEGIN');
      statement.bindVarchar(1, exact);
      assert.deepEqual((await statement.runAndReadAll()).getRows(), [[1n]]);
      await connection.run('ROLLBACK');
      await connection.run('BEGIN');
      statement.clearBindings();
      statement.bindVarchar(1, exact + ' ');
      await assert.rejects(statement.runAndReadAll(), /TD_E_COMPAT_CPP_LIMIT/);
      await connection.run('ROLLBACK');
      const rowLimit = JSON.stringify(Array.from({ length: 4096 }, (_, index) => ({ ...valid, id: 'limit-' + index })));
      assert.ok(Buffer.byteLength(rowLimit) < 2 * 1024 * 1024);
      await connection.run('BEGIN');
      statement.clearBindings();
      statement.bindVarchar(1, rowLimit);
      assert.deepEqual((await statement.runAndReadAll()).getRows(), [[4096n]]);
      assert.deepEqual((await connection.runAndReadAll('SELECT retained_count FROM main.storage_usage')).getRows(), [[4096n]]);
      await connection.run('ROLLBACK');
    } finally { statement?.destroySync(); connection.closeSync(); instance.closeSync(); }
    await port.run({ name: 'read_only_begin', sql: 'BEGIN TRANSACTION READ ONLY', params: [] });
    try {
      await assert.rejects(port.run({ name: 'read_only_append', sql: 'SELECT td_compat_append_cpp_v1(?::VARCHAR)',
        params: [JSON.stringify([valid])] }), /read.only/i);
    } finally { await port.rollback(); }
    await backend.read(async session => assert.deepEqual(await session.runRecords('SELECT count(*) n FROM main.assertions'), [{ n: 0 }]));
  } finally { await backend.close(); }
});

test('direct append survives reopen and explicitly rejects an absent feature', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'direct-compat-'));
  try {
    const database = join(directory, 'fixture.duckdb');
    for (let attempt = 0; attempt < 2; attempt++) {
      const { backend } = await open(true, database);
      try {
        if (attempt === 0) await backend.withTransaction(async session => {
          const position = await session.nextCommitPosition();
          await session.claimCommand('persisted', 'persisted-tx', 10);
          await session.insert(input, 'persisted-tx', 10, 'persisted', position);
        });
        await backend.read(async session => {
          assert.equal(await session.currentCommitPosition(), 1);
          assert.equal((await session.getById('persisted'))?.value_number, 1);
          assert.equal(await session.claimCommand('persisted', 'ignored', 11), 'persisted-tx');
        });
      } finally { await backend.close(); }
    }
  } finally { await rm(directory, { recursive: true }); }
  const port = await NativeDuckDBPort.open();
  const backend = new NativeDirectCompatibilityBackend(new PublicDuckDBBackend(port, scope));
  try { await assert.rejects(backend.initialize(schema), /--compat-mutations/); }
  finally { await backend.close(); }
});

test('multiple append expressions in one statement cannot commit an earlier append', async () => {
  const { backend, port } = await open(true);
  const valid = JSON.stringify([buildRow(input, null, 1, 'first-expression', 1)]);
  await port.begin();
  try {
    await assert.rejects(port.run({ name: 'repeated_direct_append', sql:
      `WITH first AS MATERIALIZED (SELECT td_compat_append_cpp_v1(?::VARCHAR) n)
       SELECT td_compat_append_cpp_v1(CASE WHEN n=1 THEN ?::VARCHAR ELSE '[]' END) FROM first`,
      params: [valid, '[{}]'] }), /one invocation per query/);
    // DuckDB converts COMMIT of an invalidated transaction into ROLLBACK.
    await port.runNative({ name: 'attempt_commit', sql: 'COMMIT', params: [] });
    await backend.read(async session => {
      assert.deepEqual(await session.runRecords('SELECT count(*) n FROM main.assertions'), [{ n: 0 }]);
      assert.deepEqual(await session.runRecords('SELECT retained_count n FROM main.storage_usage'), [{ n: 0 }]);
    });
  } finally {
    // The COMMIT above closes the invalidated transaction on the successful path.
    await backend.close();
  }
});

test('two caller transactions conflict on usage and roll back every losing append and receipt', async () => {
  const first = await open(true);
  const secondPort = await first.port.forkReader();
  const second = new NativeDirectCompatibilityBackend(new PublicDuckDBBackend(secondPort, scope));
  let firstController: ReturnType<GranularBackend['startTransaction']> | undefined;
  let secondController: ReturnType<GranularBackend['startTransaction']> | undefined;
  let firstSettled = false, secondSettled = false;
  try {
    await second.initialize(schema);
    // Reserve two caller-supplied positions before overlapping the transactions,
    // so the expected conflict occurs at storage_usage rather than main.clock.
    await first.backend.withTransaction(session => session.runRecords('UPDATE main.clock SET position=2'));
    firstController = first.backend.startTransaction();
    secondController = second.startTransaction();
    const [left, right] = await Promise.all([firstController.started, secondController.started]);
    await Promise.all([left.runRecords('SELECT retained_count FROM main.storage_usage'),
      right.runRecords('SELECT retained_count FROM main.storage_usage')]);
    await left.claimCommand('concurrent-left', 'left-tx', 10);
    await right.claimCommand('concurrent-right', 'right-tx', 11);
    await left.insert({ ...input, entityId: EntityId.make('left') }, 'left-tx', 10, 'left-id', 1);
    await assert.rejects(right.insert({ ...input, entityId: EntityId.make('right') }, 'right-tx', 11, 'right-id', 2), /conflict/i);
    secondController.succeed(undefined); secondSettled = true;
    await assert.rejects(secondController.completion, rolledBack(/conflict/i));
    firstController.succeed(undefined); firstSettled = true;
    await firstController.completion;
    await first.backend.read(async session => {
      assert.deepEqual(await session.runRecords('SELECT assertion_id FROM main.assertions ORDER BY assertion_id'), [{ assertion_id: 'left-id' }]);
      assert.deepEqual(await session.runRecords('SELECT command_id FROM main.commands ORDER BY command_id'), [{ command_id: 'concurrent-left' }]);
      assert.deepEqual(await session.runRecords('SELECT retained_count FROM main.storage_usage'), [{ retained_count: 1 }]);
    });
    await second.withTransaction(async session => {
      assert.equal(await session.claimCommand('concurrent-right', 'right-tx', 11), null);
      await session.insert({ ...input, entityId: EntityId.make('right') }, 'right-tx', 11, 'right-id', 2);
    });
    await first.backend.read(async session => {
      assert.deepEqual(await session.runRecords('SELECT assertion_id FROM main.assertions ORDER BY assertion_id'),
        [{ assertion_id: 'left-id' }, { assertion_id: 'right-id' }]);
      assert.deepEqual(await session.runRecords('SELECT retained_count FROM main.storage_usage'), [{ retained_count: 2 }]);
      assert.deepEqual(await session.runRecords('SELECT command_id FROM main.commands ORDER BY command_id'),
        [{ command_id: 'concurrent-left' }, { command_id: 'concurrent-right' }]);
      assert.equal(await session.currentCommitPosition(), 2);
    });
  } finally {
    if (firstController && !firstSettled) firstController.fail(new Error('concurrency test cleanup'));
    if (secondController && !secondSettled) secondController.fail(new Error('concurrency test cleanup'));
    await Promise.allSettled([...(firstController ? [firstController.completion] : []),
      ...(secondController ? [secondController.completion] : [])]);
    await second.close();
    await first.backend.close();
  }
});

test('direct usage updates reject foreign keys before appending any rows', async () => {
  const { backend } = await open(true);
  try {
    await backend.withTransaction(async session => {
      await session.runRecords('CREATE TABLE main.allowed_counts(n BIGINT PRIMARY KEY)');
      await session.runRecords('INSERT INTO main.allowed_counts VALUES (0)');
      await session.runRecords('DROP TABLE main.storage_usage');
      await session.runRecords(`CREATE TABLE main.storage_usage(singleton BOOLEAN PRIMARY KEY CHECK(singleton),
        retained_count BIGINT NOT NULL REFERENCES main.allowed_counts(n),retained_bytes BIGINT NOT NULL CHECK(retained_bytes>=0))`);
      await session.runRecords('INSERT INTO main.storage_usage VALUES (TRUE,0,0)');
    });
    await assert.rejects(backend.withTransaction(async session => {
      const position = await session.nextCommitPosition();
      await session.claimCommand('foreign-key', 'foreign-key-tx', 10);
      await session.insert(input, 'foreign-key-tx', 10, 'foreign-key', position);
    }), rolledBack(/TD_E_COMPAT_CPP_FORMAT.*foreign keys/));
    await backend.read(async session => {
      assert.deepEqual(await session.runRecords('SELECT count(*) n FROM main.assertions'), [{ n: 0 }]);
      assert.deepEqual(await session.runRecords('SELECT retained_count n,retained_bytes b FROM main.storage_usage'), [{ n: 0, b: 0 }]);
      assert.equal(await session.currentCommitPosition(), 0);
      assert.deepEqual(await session.runRecords('SELECT count(*) n FROM main.commands'), [{ n: 0 }]);
    });
  } finally { await backend.close(); }
});

test('direct C++ append preserves all 44 pinned Triplex conformance cases', async () => {
  assert.equal(triplesConformanceCases.length, 44);
  const runtime = await makeNativeDirectCompatibilityRuntime();
  await Effect.runPromise(runtimeConformance(runtime, {
    scope: DatabaseScope.test('direct-compat-conformance'), capabilities: Capabilities.none,
  }));
});
