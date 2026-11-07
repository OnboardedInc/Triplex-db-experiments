// Isolated lifecycle experiment. No fact-store validation is disabled here.
// Run from the runtime directory with: node adapter/test-owner-probe.mjs
// Enrolled raw SQL is not intercepted. Explicit invalidation is caller-driven.
import assert from 'node:assert/strict';
import {after, test} from 'node:test';
import {readFile, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {DuckDBInstance, version} from '@duckdb/node-api';

const root = process.env.TD_OWNER_TEST_RUNTIME ? resolve(process.env.TD_OWNER_TEST_RUNTIME) + '/' : fileURLToPath(new URL('../', import.meta.url));
const artifact = root + 'build/owner_probe/temporal_owner_probe.duckdb_extension';
const observations = [];
const quote = value => "'" + value.replaceAll("'", "''") + "'";
const sql = async (connection, statement) => (await connection.runAndReadAll(statement)).getRows();
const status = async connection => JSON.parse((await sql(connection, 'SELECT td_owner_probe_status()'))[0][0]);

async function fixture(work) {
  assert.equal(version(), 'v2.0.0');
  const instance = await DuckDBInstance.create(':memory:', {allow_unsigned_extensions: 'true', threads: '1'});
  const connections = [];
  const connect = async () => {
    const connection = await instance.connect();
    connections.push(connection);
    return connection;
  };
  const writer = await connect(), reader = await connect();
  try {
    await sql(writer, 'LOAD ' + quote(artifact));
    await work({writer, reader, connect});
  } finally {
    for (const connection of connections.reverse()) connection.closeSync();
    instance.closeSync();
  }
}

async function arm(writer, reader) {
  await sql(writer, 'SELECT td_owner_probe_enroll()');
  await sql(reader, 'SELECT td_owner_probe_enroll()');
  await sql(writer, 'SELECT td_owner_probe_arm()');
}

test('CPP companion loads into the packaged Node instance and enrolls real contexts', async () => {
  await fixture(async ({writer, reader}) => {
    const first = await status(writer), second = await status(reader);
    assert.notEqual(first.connection, second.connection);
    assert.deepEqual(first.live, second.live);
    assert.equal(first.armed, false);
    await assert.rejects(sql(writer, 'SELECT td_owner_probe_arm()'), /TD_E_OWNER_PROBE_ENROLLMENT/);
    await arm(writer, reader);
    assert.deepEqual(await sql(reader, 'SELECT td_owner_probe_check()'), [[true]]);
    observations.push({case: 'shared_instance', snapshot: await status(writer)});
  });
});

test('an unknown connection invalidates before its first SQL statement', async () => {
  await fixture(async ({writer, reader, connect}) => {
    await arm(writer, reader);
    const before = await status(writer);
    const unknown = await connect();
    const opened = await status(writer);
    assert.equal(opened.armed, false);
    assert.ok(opened.generation > before.generation);
    const unknownId = opened.live.find(id => !before.live.includes(id));
    assert.ok(unknownId);
    const opening = opened.events.find(event => event.kind === 'connection_open' && event.connection === unknownId);
    assert.ok(opening);
    assert.equal(opened.events.some(event => event.kind === 'query_begin' && event.connection === unknownId), false);
    await sql(unknown, 'SELECT 1');
    const used = await status(writer);
    const firstQuery = used.events.find(event => event.kind === 'query_begin' && event.connection === unknownId);
    assert.ok(firstQuery.sequence > opening.sequence);
    await assert.rejects(sql(reader, 'SELECT td_owner_probe_check()'), /TD_E_OWNER_PROBE_INVALID/);
    observations.push({case: 'invalidate_before_use', snapshot: used});
  });
});

test('prepared execution repeats the native owner guard', async () => {
  await fixture(async ({writer, reader, connect}) => {
    await arm(writer, reader);
    const prepared = await reader.prepare('SELECT td_owner_probe_check()');
    try {
      assert.deepEqual((await prepared.runAndReadAll()).getRows(), [[true]]);
      await connect();
      await assert.rejects(prepared.runAndReadAll(), /TD_E_OWNER_PROBE_INVALID/);
    } finally {
      prepared.destroySync();
    }
    observations.push({case: 'prepared_guard', snapshot: await status(writer)});
  });
});

test('explicit dispatch invalidation precedes raw SQL and transaction callbacks are observable', async () => {
  await fixture(async ({writer, reader}) => {
    await sql(writer, 'CREATE TABLE probe_values(i INTEGER)');
    await arm(writer, reader);
    await sql(writer, 'SELECT td_owner_probe_invalidate()');
    await sql(writer, 'BEGIN');
    await sql(writer, 'INSERT INTO probe_values VALUES (1)');
    await sql(writer, 'COMMIT');
    await sql(reader, 'BEGIN');
    await sql(reader, 'SELECT * FROM probe_values');
    await sql(reader, 'ROLLBACK');
    const snapshot = await status(writer);
    assert.equal(snapshot.armed, false);
    for (const kind of ['dispatch_invalidate', 'transaction_begin', 'transaction_commit', 'transaction_rollback'])
      assert.ok(snapshot.events.some(event => event.kind === kind), kind);
    observations.push({case: 'explicit_invalidation_and_transactions', snapshot});
  });
});

test('a fresh instance starts unarmed without inheriting another owner scope', async () => {
  await fixture(async ({writer, reader}) => {
    await arm(writer, reader);
    await fixture(async ({writer: other}) => {
      const snapshot = await status(other);
      assert.equal(snapshot.armed, false);
      assert.deepEqual(snapshot.enrolled, []);
      observations.push({case: 'independent_instance', snapshot});
    });
    assert.deepEqual(await sql(reader, 'SELECT td_owner_probe_check()'), [[true]]);
  });
});

after(async () => {
  const build = JSON.parse(await readFile(root + 'build/owner_probe/artifact.json', 'utf8'));
  await writeFile(root + 'build/owner_probe/evidence.json', JSON.stringify({schema: 'native-owner-probe/1',
    scope: 'Actual packaged Node engine loading and lifecycle observations. No data-validation bypass or trust certification.',
    build, observations}, null, 2) + '\n');
});
