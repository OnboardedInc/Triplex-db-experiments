// Run once per staged variant with TD_IDENTITY_COUNT_RUNTIME set to its root.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {test} from 'node:test';
import {DuckDBInstance} from '@duckdb/node-api';

const runtime = resolve(process.env.TD_IDENTITY_COUNT_RUNTIME ?? '.');
const manifest = JSON.parse(await readFile(runtime + '/build/artifact.json', 'utf8'));
const enabled = manifest.experimental_identity_count_fast_path === true;
const injectiveEnabled = manifest.experimental_injective_projection_fast_path === true;
const streamingEnabled = manifest.experimental_streaming_source_fast_path === true;
const quote = value => "'" + value.replaceAll("'", "''") + "'";
const sql = async (connection, statement) => (await connection.runAndReadAll(statement)).getRows();
const reconcileUsage = connection => sql(connection,`UPDATE main.storage_usage
  SET retained_count=actual.n,retained_bytes=actual.b FROM (
    SELECT count(*) n,coalesce(sum(octet_length(encode(e))+octet_length(encode(a))+
      octet_length(encode(payload))+coalesce(octet_length(encode(extra_json)),0)),0) b
    FROM main.assertions) actual WHERE singleton`);
const direct = 'answer(count()) :- triple(?e,?a,?v).';
const fixed = "source(?e,?v) :- triple(?e,'n',?v). answer(count()) :- source(?e,?v).";

function query(connection, program, {known = -1, budgets = [1000, 1000, 1048576, 1000, 1048576]} = {}) {
  return sql(connection, 'PRAGMA td_query_store_owned(' + [quote(program), 0, known, ...budgets, 0].join(',') + ')');
}
async function compiled(connection, program) {
  return (await sql(connection, 'SELECT td_query_store_owned_sql_v1(' +
    [quote(program), 0, -1, 1000, 1000, 1048576, 1000, 1048576].join(',') + ')'))[0][0];
}
const countValue = rows => BigInt(JSON.parse(rows[0][6])[0].i);

async function fixture(work) {
  const instance = await DuckDBInstance.create(':memory:', {allow_unsigned_extensions: 'true', threads: '1'});
  const connection = await instance.connect();
  try {
    await sql(connection, 'LOAD ' + quote(runtime + '/build/temporal_datalog.duckdb_extension'));
    await sql(connection, 'PRAGMA td_initialize');
    await sql(connection, 'LOAD ' + quote(runtime + '/build/owner_probe/temporal_owner_probe.duckdb_extension'));
    await sql(connection, 'SELECT td_owner_probe_enroll()');
    await sql(connection, 'SELECT td_owner_probe_activate(0)');
    await sql(connection, "PRAGMA td_define_schema('schema identity_count version 1 {entity Row {n:int64 many;s:text;b:boolean;f:float64;}}')");
    await sql(connection, `PRAGMA td_put_entity('identity_count',1,'Row','one','one','{n=1;n=2;s="repeat";b=false;f=f64("3ff0000000000000");}',0,9223372036854775807)`);
    await sql(connection, `PRAGMA td_put_entity('identity_count',1,'Row','two','two','{n=1;s="repeat";}',0,9223372036854775807)`);
    // A distinct carrier ID can repeat the same EAV and still pass the current
    // retained audit. Active DISTINCT must therefore remain in both variants.
    await sql(connection, "INSERT INTO main.assertions SELECT * REPLACE (assertion_id || '-duplicate' AS assertion_id) FROM main.assertions WHERE command_id='one' AND a='n' AND v_i=1");
    await reconcileUsage(connection);
    await sql(connection, 'SELECT td_owner_probe_activate(0)');
    await work(connection);
  } finally {
    connection.closeSync();
    instance.closeSync();
  }
}

test('exact identity counts preserve mixed tags and duplicate-carrier set semantics', async () => {
  await fixture(async connection => {
    assert.deepEqual(await sql(connection, 'SELECT count(*) FROM main.assertions'), [[8n]]);
    assert.equal(countValue(await query(connection, direct)), 7n);
    assert.equal(countValue(await query(connection, fixed)), 3n);
    assert.equal(countValue(await query(connection,
      'source(?v,?a,?e) :- triple(?e,?a,?v). answer(count()) :- source(?v,?a,?e).')), 7n);
    for (const program of [direct, fixed]) {
      const template = await compiled(connection, program);
      assert.equal(template.includes('count_source AS MATERIALIZED'), !enabled&&!streamingEnabled);
      assert.ok(template.includes('SELECT DISTINCT e,a,v_tag,v_s,v_b,v_i,v_f'));
    }
  });
});

test('noninjective projections grouped counts and repeated body variables retain their original plans', async () => {
  await fixture(async connection => {
    const projected = "source(?v) :- triple(?e,'s',?v). answer(count()) :- source(?v).";
    assert.equal(countValue(await query(connection, projected)), 1n);
    const programs = [projected, 'answer(?e,count()) :- triple(?e,?a,?v).',
      'source(?e,?v) :- triple(?e,?e,?v). answer(count()) :- source(?e,?v).',
      "source(?e,?v,'constant') :- triple(?e,'n',?v). answer(count()) :- source(?e,?v,?c)."];
    for (const [index,program] of programs.entries())
      assert.ok((await compiled(connection, program)).includes(index===1&&streamingEnabled?'count_source AS NOT MATERIALIZED':'count_source AS MATERIALIZED'));
  });
});

test('identity count retains temporal corrections empty-source results and conservative admission', async () => {
  await fixture(async connection => {
    await sql(connection, "PRAGMA td_put_entity('identity_count',1,'Row','one','corrected','{n=9;}',0,9223372036854775807)");
    await sql(connection, 'SELECT td_owner_probe_activate(0)');
    assert.equal(countValue(await query(connection, direct, {known: 2})), 7n);
    assert.equal(countValue(await query(connection, direct)), 3n);
    assert.equal(countValue(await query(connection,
      "source(?e,?v) :- triple(?e,'missing',?v). answer(count()) :- source(?e,?v).")), 0n);
    await assert.rejects(query(connection, direct, {budgets: [1, 1000, 1048576, 1000, 1048576]}), /TD_E_QUERY_SCALE_LIMIT/);
    await assert.rejects(query(connection, direct, {budgets: [1000, 1000, 1, 1000, 1048576]}), /TD_E_QUERY_SCALE_LIMIT/);
  });
});

test('injective aggregate projections retain typed columns and exact sum grouping and extrema',async()=>{
  await fixture(async connection=>{
    const prefix="source(?e,?v) :- triple(?e,'n',?v). ";
    const scalar=[['sum_i64',4n],['min',1n],['max',2n]];
    for(const [operation,expected] of scalar){
      const program=prefix+'answer('+operation+'(?v)) :- source(?e,?v).';
      assert.equal(countValue(await query(connection,program)),expected);
      assert.equal((await compiled(connection,program)).includes('count_source AS MATERIALIZED (SELECT DISTINCT'),!injectiveEnabled);
    }
    const grouped=prefix+'answer(?e,sum_i64(?v)) :- source(?e,?v).';
    assert.deepEqual((await query(connection,grouped)).map(row=>JSON.parse(row[6]).map(cell=>cell.tag===1?cell.s:BigInt(cell.i))),
      [['one',3n],['two',1n]]);
    assert.equal((await compiled(connection,grouped)).includes('count_source AS MATERIALIZED (SELECT DISTINCT'),!injectiveEnabled);
    const dropped="source(?v) :- triple(?e,'n',?v). answer(sum_i64(?v)) :- source(?v).";
    assert.equal(countValue(await query(connection,dropped)),3n);
    assert.ok((await compiled(connection,dropped)).includes('count_source AS MATERIALIZED (SELECT DISTINCT'));
    await assert.rejects(query(connection,"source(?e,?v) :- triple(?e,'b',?v). answer(sum_i64(?v)) :- source(?e,?v)."),
      /TD_E_AGG_MEASURE_TAG/);
  });
});
