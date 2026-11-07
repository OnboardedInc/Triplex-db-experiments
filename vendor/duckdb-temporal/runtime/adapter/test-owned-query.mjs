// Audited persisted SQL reads. Run from runtime with:
// node --test adapter/test-owned-query.mjs
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {test} from 'node:test';
import {DuckDBInstance} from '@duckdb/node-api';

const root = process.env.TD_OWNER_TEST_RUNTIME ? resolve(process.env.TD_OWNER_TEST_RUNTIME) + '/' : fileURLToPath(new URL('../', import.meta.url));
const nativeManifest = JSON.parse(await readFile(root + 'build/artifact.json', 'utf8'));
const uniqueEnabled = nativeManifest.experimental_current_unique_fast_path === true;
const allCutEnabled = nativeManifest.experimental_all_cut_unique_fast_path === true;
const ownedPrefix = allCutEnabled ? 'owned_allcut_unique_' : uniqueEnabled ? 'owned_unique_' : 'owned_';
const bridge = createRequire(import.meta.url)(root + 'build/temporal_control.node');
const quote = value => "'" + value.replaceAll("'", "''") + "'";
const sql = async (connection, statement, params) => (await connection.runAndReadAll(statement, params)).getRows();
const limits = [1000000, 1000000, 536870912, 100000, 16777216];
const count = 'answer(count()) :- triple(?e,?a,?v).';
const activate = connection => sql(connection, 'SELECT td_owner_probe_activate(0)');
const invalidate = connection => sql(connection, 'SELECT td_owner_probe_invalidate()');

function query(connection, program, {owned = true, known = -1, budgets = limits, control = 0n} = {}) {
  const args = [quote(program), 0, known, ...budgets, control];
  return sql(connection, 'PRAGMA td_query_store_' + (owned ? 'owned' : 'scalable') + '(' + args.join(',') + ')');
}

async function fixture(work, {readerCount = 1, companion = true} = {}) {
  const manifest = JSON.parse(await readFile(root + 'build/artifact.json', 'utf8'));
  bridge.initialize(root + 'build/temporal_datalog.duckdb_extension', manifest.extension_sha256);
  const instance = await DuckDBInstance.create(':memory:', {allow_unsigned_extensions: 'true', threads: '1'});
  const connections = [];
  const connect = async () => {
    const connection = await instance.connect();
    connections.push(connection);
    return connection;
  };
  const writer = await connect();
  const readers = [];
  for (let i = 0; i < readerCount; i++) readers.push(await connect());
  try {
    await sql(writer, 'LOAD ' + quote(root + 'build/temporal_datalog.duckdb_extension'));
    await sql(writer, 'PRAGMA td_initialize');
    if (companion) {
      await sql(writer, 'LOAD ' + quote(root + 'build/owner_probe/temporal_owner_probe.duckdb_extension'));
      for (const connection of connections) await sql(connection, 'SELECT td_owner_probe_enroll()');
      await activate(writer);
      await sql(writer, "PRAGMA td_define_schema('schema owned_query version 1 {entity Row {n:int64 many;s:text;f:float64;}}')");
      await sql(writer, `PRAGMA td_put_entity('owned_query',1,'Row','one','one','{n=1;n=2;s="one";f=f64("4000000000000000");}',0,9223372036854775807)`);
      await sql(writer, `PRAGMA td_put_entity('owned_query',1,'Row','two','two','{n=3;s="two";f=f64("4008000000000000");}',0,9223372036854775807)`);
      await invalidate(writer);
    }
    await work({writer, readers, connect});
  } finally {
    for (const connection of connections.reverse()) connection.closeSync();
    instance.closeSync();
  }
}

test('owned queries require the companion and a real audit instead of enrollment-only arm', async () => {
  await fixture(async ({writer}) => {
    await assert.rejects(query(writer, count), /td_owner_probe_(?:validated|current_unique|uniqueness)_check/);
    await assert.rejects(query(writer, count, {owned: false}), /td_owner_probe_(?:validated|current_unique|uniqueness)_check/);
  }, {companion: false});
  await fixture(async ({writer}) => {
    await assert.rejects(query(writer, count), /TD_E_OWNER_PROBE_INVALID/);
    await sql(writer, 'SELECT td_owner_probe_arm()');
    await assert.rejects(query(writer, count), /TD_E_OWNER_PROBE_INVALID/);
    await assert.rejects(query(writer, "answer(?v) :- triple(?e,'missing',?v)."), /TD_E_OWNER_PROBE_INVALID/);
    await activate(writer);
    assert.equal((await query(writer, count))[0][2], ownedPrefix + 'scalable_count');
  });
});

test('both scalable SQL aliases preserve typed answers and expose the same physical plan', async () => {
  await fixture(async ({writer, readers}) => {
    await activate(writer);
    const programs = [
      "answer(?v) :- triple(?e,'n',?v).",
      "answer(?n,?s) :- triple(?e,'n',?n),triple(?e,'s',?s).",
      count,
      'answer(?a,count()) :- triple(?e,?a,?v).',
      "source(?e,?v) :- triple(?e,'n',?v). answer(sum_i64(?v)) :- source(?e,?v).",
      "source(?e,?v) :- triple(?e,'s',?v). answer(min(?v)) :- source(?e,?v).",
      "source(?e,?v) :- triple(?e,'f',?v). answer(max(?v)) :- source(?e,?v).",
      "answer(?v) :- triple(?e,'missing',?v).",
    ];
    for (const program of programs) {
      const alias = await query(readers[0], program, {owned: false});
      const owned = await query(readers[0], program);
      assert.deepEqual(owned, alias);
      assert.ok(owned.every(row => row[2].startsWith(ownedPrefix + 'scalable_')));
    }
  });
});

test('cached owned templates recheck the current audited generation on every execution', async () => {
  await fixture(async ({writer, readers, connect}) => {
    await activate(writer);
    const compiled = await sql(readers[0], 'SELECT td_query_store_owned_sql_v1(?,' + Array(7).fill('CAST(? AS BIGINT)').join(',') + ')',
      [count, 0n, -1n, ...limits.map(BigInt)]);
    const template = compiled[0][0];
    assert.equal(typeof template, 'string');
    assert.ok(template.includes('td_owner_probe_validated_check()'));
    assert.equal(template.includes('SELECT count(*) FROM td_catalog_v1.entity_history'), false);
    const prepared = await readers[0].prepare(template);
    const token = bridge.create(5000);
    try {
      prepared.bindBigInt(1, token);
      const first = (await prepared.runAndReadAll()).getRows();
      const unknown = await connect();
      await assert.rejects(prepared.runAndReadAll(), /TD_E_OWNER_PROBE_INVALID/);
      await sql(unknown, 'SELECT td_owner_probe_enroll()');
      await activate(writer);
      assert.deepEqual((await prepared.runAndReadAll()).getRows(), first);
      bridge.cancel(token);
      await assert.rejects(prepared.runAndReadAll(), /TD_E_CANCELED/);
    } finally {
      bridge.release(token);
      prepared.destroySync();
    }
  });
});

test('a failed retained-history revalidation rejects both scalable aliases', async () => {
  await fixture(async ({writer}) => {
    await activate(writer);
    await sql(writer, "PRAGMA td_put_entity('owned_query',1,'Row','one','correction','{n=9;}',0,9223372036854775807)");
    await invalidate(writer);
    await sql(writer, "UPDATE main.assertions SET payload_hash='corrupt' WHERE command_id='one'");
    await assert.rejects(activate(writer), /TD_E_QUERY_CARRIER|TD_E_COMMAND_HISTORY/);
    await assert.rejects(query(writer, count), /TD_E_OWNER_PROBE_INVALID/);
    await assert.rejects(query(writer, count, {owned: false}), /TD_E_OWNER_PROBE_INVALID/);
  });
});

test('owned plans retain scalable input intermediate output and unsupported-plan admission', async () => {
  await fixture(async ({writer}) => {
    await activate(writer);
    const scan = "answer(?v) :- triple(?e,'n',?v).";
    for (const budgets of [[1, 100, 100000, 100, 100000], [100, 100, 1, 100, 100000],
      [100, 100, 100000, 1, 100000], [100, 100, 100000, 100, 1]]) {
      await assert.rejects(query(writer, scan, {budgets}), /TD_E_QUERY_SCALE_LIMIT/);
      await assert.rejects(query(writer, scan, {budgets, owned: false}), /TD_E_QUERY_SCALE_LIMIT/);
    }
    await assert.rejects(query(writer, "answer(?x,?y) :- triple(?a,'n',?x),triple(?b,'n',?y).",
      {budgets: [100, 3, 100000, 100, 100000]}), /TD_E_QUERY_SCALE_LIMIT/);
    await assert.rejects(query(writer, "p(?a,?b) :- triple(?a,'s',?b). p(?a,?c) :- p(?a,?b),p(?b,?c). answer(?a,?b) :- p(?a,?b)."),
      /TD_E_QUERY_SCALE_UNSUPPORTED/);
  });
});

test('concurrent readers through both scalable aliases return exact explicit and latest committed cuts after revalidation', async () => {
  await fixture(async ({writer, readers}) => {
    await activate(writer);
    const program = "source(?e,?v) :- triple(?e,'n',?v). answer(sum_i64(?v)) :- source(?e,?v).";
    await sql(writer, "PRAGMA td_put_entity('owned_query',1,'Row','one','correction','{n=9;}',0,9223372036854775807)");
    await invalidate(writer);
    await assert.rejects(query(readers[0], program), /TD_E_OWNER_PROBE_INVALID/);
    await activate(writer);
    for (const known of [2, -1]) {
      const answers = await Promise.all(readers.map((reader, index) => query(reader, program, {known, owned: index % 2 === 0})));
      for (const answer of answers) {
        assert.equal(answer[0][0], known === 2 ? 2n : 3n);
        assert.equal(JSON.parse(answer[0][6])[0].i, known === 2 ? '6' : '12');
      }
    }
  }, {readerCount: 8});
});
