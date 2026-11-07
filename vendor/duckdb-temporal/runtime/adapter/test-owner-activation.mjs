// Run from runtime with: node --test adapter/test-owner-activation.mjs
// Validates the retained audit and its lifecycle independently of the adapter.
import assert from 'node:assert/strict';
import {after, test} from 'node:test';
import {randomUUID} from 'node:crypto';
import {readFile, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import {DuckDBInstance} from '@duckdb/node-api';

const root = process.env.TD_OWNER_TEST_RUNTIME ? resolve(process.env.TD_OWNER_TEST_RUNTIME) + '/' : fileURLToPath(new URL('../', import.meta.url));
const observations = [];
const quote = value => "'" + value.replaceAll("'", "''") + "'";
const sql = async (connection, statement) => (await connection.runAndReadAll(statement)).getRows();
const status = async connection => JSON.parse((await sql(connection, 'SELECT td_owner_probe_status()'))[0][0]);
const activate = connection => sql(connection, 'SELECT td_owner_probe_activate(0)');

async function fixture(work, {database = ':memory:', earlyTransaction = false} = {}) {
  const instance = await DuckDBInstance.create(database, {allow_unsigned_extensions: 'true', threads: '1'});
  const connections = [];
  const connect = async () => {
    const connection = await instance.connect();
    connections.push(connection);
    return connection;
  };
  const writer = await connect(), reader = await connect();
  try {
    await sql(writer, 'LOAD ' + quote(root + 'build/temporal_datalog.duckdb_extension'));
    await sql(writer, 'PRAGMA td_initialize');
    if (earlyTransaction) await sql(reader, 'BEGIN');
    await sql(writer, 'LOAD ' + quote(root + 'build/owner_probe/temporal_owner_probe.duckdb_extension'));
    await sql(writer, 'SELECT td_owner_probe_enroll()');
    if (!earlyTransaction) {
      await sql(reader, 'SELECT td_owner_probe_enroll()');
      await activate(writer);
      await sql(writer, "PRAGMA td_define_schema('schema audit_probe version 1 {entity Row {x:int64 required;}}')");
      for (const [command, value] of [['before', 1], ['after', 2]])
        await sql(writer, `PRAGMA td_put_entity('audit_probe',1,'Row','row',${quote(command)},'{x=${value};}',0,9223372036854775807)`);
      await sql(writer, 'SELECT td_owner_probe_invalidate()');
    }
    await work({writer, reader, connect});
  } finally {
    for (const connection of connections.reverse()) connection.closeSync();
    instance.closeSync();
  }
}

test('actual retained audit activates only after the caller query and transaction acknowledge', async () => {
  await fixture(async ({writer, reader}) => {
    await sql(writer, 'SELECT td_owner_probe_arm()');
    await assert.rejects(sql(reader, 'SELECT td_owner_probe_validated_check()'), /TD_E_OWNER_PROBE_INVALID/);
    assert.deepEqual(await activate(writer), [[true]]);
    assert.deepEqual(await sql(reader, 'SELECT td_owner_probe_validated_check()'), [[true]]);
    const snapshot = await status(writer);
    assert.equal(snapshot.audited, true);
    const complete = snapshot.events.findLast(event => event.kind === 'audit_read_complete');
    const pending = snapshot.events.findLast(event => event.kind === 'audit_awaiting_ack');
    const committed = snapshot.events.find(event => event.kind === 'transaction_commit' && event.sequence > pending.sequence);
    const active = snapshot.events.findLast(event => event.kind === 'audit_activated');
    assert.ok(complete.sequence < pending.sequence && pending.sequence < committed.sequence && committed.sequence < active.sequence);
    assert.ok(snapshot.events.some(event => event.kind === 'audit_connection_close' && event.sequence < pending.sequence));
    observations.push({case: 'audited_activation', snapshot});
  });
});

test('inactive corrupt history and outer query failure cannot publish an audited owner', async () => {
  await fixture(async ({writer}) => {
    await activate(writer);
    await sql(writer, 'SELECT td_owner_probe_invalidate()');
    await sql(writer, "UPDATE main.assertions SET payload_hash='bad' WHERE command_id='before'");
    await assert.rejects(activate(writer), /TD_E_QUERY_CARRIER|TD_E_COMMAND_HISTORY/);
    const snapshot = await status(writer);
    assert.equal(snapshot.audited, false);
    assert.equal(snapshot.auditing, false);
    observations.push({case: 'corrupt_inactive_history', snapshot});
  });
  await fixture(async ({writer}) => {
    await assert.rejects(sql(writer, "SELECT CASE WHEN td_owner_probe_activate(0) THEN error('injected outer failure') END"), /injected outer failure/);
    assert.equal((await status(writer)).audited, false);
    await assert.rejects(sql(writer, 'UPDATE main.clock SET position=position WHERE td_owner_probe_activate(0)'), /TD_E_OWNER_AUDIT_CONTEXT/);
    observations.push({case: 'outer_query_failure', snapshot: await status(writer)});
  });
});

test('explicit caller and peer transactions reject activation and permit later clean revalidation', async () => {
  await fixture(async ({writer, reader}) => {
    await sql(writer, 'BEGIN');
    await assert.rejects(activate(writer), /TD_E_OWNER_AUDIT_CONTEXT/);
    await sql(writer, 'ROLLBACK');
    await sql(reader, 'BEGIN');
    await assert.rejects(activate(writer), /TD_E_OWNER_AUDIT_BUSY/);
    await sql(reader, 'ROLLBACK');
    await activate(writer);
    assert.equal((await status(writer)).audited, true);
    observations.push({case: 'transaction_rejection', snapshot: await status(writer)});
  });
});

test('transactions opened before observer installation require fresh enrollment', async () => {
  await fixture(async ({writer, reader}) => {
    await assert.rejects(sql(reader, 'SELECT td_owner_probe_enroll()'), /TD_E_OWNER_PROBE_CONTEXT/);
    await sql(reader, 'ROLLBACK');
    await sql(reader, 'SELECT td_owner_probe_enroll()');
    await activate(writer);
    assert.equal((await status(writer)).audited, true);
    observations.push({case: 'fresh_enrollment', snapshot: await status(writer)});
  }, {earlyTransaction: true});
});

test('unknown connections and fresh peer transactions discard in-progress audit candidates', async () => {
  for (const unknown of [false, true]) {
    await fixture(async ({writer, reader, connect}) => {
      const pending = assert.rejects(sql(writer, 'SELECT td_owner_probe_activate(200)'), /TD_E_OWNER_AUDIT_CHANGED/);
      await delay(30);
      if (unknown) await connect();
      else await sql(reader, 'SELECT 1');
      await pending;
      const snapshot = await status(writer);
      assert.equal(snapshot.audited, false);
      assert.equal(snapshot.auditing, false);
      observations.push({case: unknown ? 'unknown_during_audit' : 'peer_during_audit', snapshot});
    });
  }
});

test('outer interruption during delayed activation leaves the owner invalid', async () => {
  await fixture(async ({writer}) => {
    const warmStart=performance.now();
    await activate(writer);
    const auditMs=performance.now()-warmStart;
    const eventsBefore=(await status(writer)).events.at(-1)?.sequence??0;
    const pending = assert.rejects(sql(writer, 'SELECT td_owner_probe_activate(1000)'), /interrupt|cancel/i);
    await delay(Math.min(750,Math.max(150,Math.ceil(3*auditMs))));
    writer.interrupt();
    await pending;
    const snapshot = await status(writer);
    assert.equal(snapshot.audited, false);
    assert.equal(snapshot.auditing, false);
    assert.ok(snapshot.events.some(event => event.sequence > eventsBefore && event.kind === 'audit_read_complete'));
    observations.push({case: 'interrupted_activation', snapshot});
  });
});

test('outer interruption is forwarded during a real retained-history audit', async () => {
  await fixture(async ({writer}) => {
    await activate(writer);
    await sql(writer, "PRAGMA td_define_schema('schema audit_bulk version 1 {entity Row {x:int64 many;}}')");
    for (let offset = 0; offset < 524288; offset += 4096) {
      const record = '{' + Array.from({length: 4096}, (_, i) => 'x=' + (offset + i) + ';').join('') + '}';
      await sql(writer, `PRAGMA td_put_entity('audit_bulk',1,'Row','bulk-${offset}','bulk-${offset}',${quote(record)},0,9223372036854775807)`);
    }
    const eventsBefore=(await status(writer)).events.at(-1)?.sequence??0;
    const pending = assert.rejects(activate(writer), /interrupt|cancel/i);
    await delay(30);
    writer.interrupt();
    await pending;
    const snapshot = await status(writer);
    assert.equal(snapshot.audited, false);
    assert.equal(snapshot.auditing, false);
    assert.ok(snapshot.events.some(event => event.kind === 'audit_task_executed'));
    assert.ok(snapshot.events.some(event => event.kind === 'audit_interrupt_forwarded'));
    assert.equal(snapshot.events.some(event => event.sequence > eventsBefore && event.kind === 'audit_read_complete'), false);
    observations.push({case: 'interrupted_mid_audit', retained_facts: 524290, snapshot});
  });
});

test('reopen discards live ownership and requires another successful full audit', async () => {
  const database = root + 'build/owner_probe/activation-' + randomUUID() + '.duckdb';
  await fixture(async ({writer}) => {
    await activate(writer);
    assert.equal((await status(writer)).audited, true);
  }, {database});
  await fixture(async ({writer}) => {
    assert.equal((await status(writer)).audited, false);
    await activate(writer);
    assert.equal((await status(writer)).audited, true);
    observations.push({case: 'reopened_reaudit', snapshot: await status(writer)});
  }, {database});
});

after(async () => {
  const build = JSON.parse(await readFile(root + 'build/owner_probe/artifact.json', 'utf8'));
  await writeFile(root + 'build/owner_probe/activation-evidence.json', JSON.stringify({schema: 'native-owner-activation/1',
    scope: 'Actual canonical retained-carrier and entity-history audit before live owner activation and persisted operations.',
    build, observations}, null, 2) + '\n');
});
