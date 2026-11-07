import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { EntityId } from '@triplex-build/triplex';
import { DatabaseScope, type TripleInput } from '@triplex-build/triplex/runtime';
import { NativeDuckDBPort } from './native-duckdb-port.mjs';
import { PublicDuckDBBackend } from './public-backend.mjs';

const cell = (tag: number, s: string) => ({ tag, s, b: null, i: null, f: null });
const carrier = (e: string, a: string, tag: number, s: string) => [e, a, BigInt(tag), s] as const;
const quote = (source: string) => JSON.stringify(source);
const fact = (integer = 'NULL::BIGINT') => "struct_pack(e:=?::VARCHAR,a:=?::VARCHAR," +
  "v:=struct_pack(tag:=?::UTINYINT,s:=?::VARCHAR,b:=NULL::BOOLEAN,i:=" + integer + ",f:=NULL::DOUBLE)," +
  "valid_from:=0::BIGINT,valid_to:=10::BIGINT,tx_from:=1::BIGINT,tx_to:=10::BIGINT)";

async function evaluate(port: NativeDuckDBPort, program: string, facts: string, params: readonly unknown[] = [], old = false) {
  const entry = old ? 'td_query_stratified_deadline_v1' : 'td_query_stratified_values_v2';
  const rows = await port.run({ name: 'raw_json_blob_carrier', params: [program, ...params],
    sql: "SELECT CAST(to_json(system.main." + entry + "(?," + facts +
      ",0::BIGINT,1::BIGINT,100000::BIGINT,1000::BIGINT,5000000::BIGINT,5000::BIGINT" +
      (old ? "" : ",0::BIGINT") + ").rows) AS VARCHAR)" });
  const answer = rows[0]?.[0];
  assert.equal(typeof answer, 'string');
  return JSON.parse(answer as string);
}

async function fixture(work: (port: NativeDuckDBPort) => Promise<void>) {
  const port = await NativeDuckDBPort.open();
  try { await work(port); }
  finally { await port.close(); }
}

const scan = "answer(?v) :- triple(?e,'value',?v).";

test('raw values-v2 uses exact serialized JSON bytes and tagged blob IDs for identity and groups', async () => {
  await fixture(async port => {
    const a = '{"a":1,"b":2}';
    const b = '{"b":2,"a":1}';
    const c = ' { "a":1,"b":2 } ';
    const records = [
      carrier('one', 'value', 7, a), carrier('one', 'value', 7, a),
      carrier('two', 'value', 7, a), carrier('one', 'value', 7, b),
      carrier('one', 'value', 7, c), carrier('one', 'value', 8, a),
      carrier('two', 'value', 8, a), carrier('one', 'value', 1, a),
    ];
    const facts = '[' + records.map(() => fact()).join(',') + ']';
    const run = (program: string) => evaluate(port, program, facts, records.flat());
    assert.deepEqual(await run(scan), [[cell(1, a)], [cell(7, c)], [cell(7, a)], [cell(7, b)], [cell(8, a)]]);
    assert.deepEqual(await run("answer(?v) :- triple(?e,'value',?v),[?v=json(" + quote(a) + ")]."), [[cell(7, a)]]);
    assert.deepEqual(await run("answer(?v) :- triple(?e,'value',?v),[?v=blob(" + quote(a) + ")]."), [[cell(8, a)]]);
    const grouped = "source(?e,?v) :- triple(?e,'value',?v). answer(?v,count()) :- source(?e,?v).";
    const count = (i: number) => ({ tag: 3, s: null, b: null, i, f: null });
    assert.deepEqual(await run(grouped), [
      [cell(1, a), count(1)], [cell(7, c), count(1)], [cell(7, a), count(2)],
      [cell(7, b), count(1)], [cell(8, a), count(2)],
    ]);
    await assert.rejects(evaluate(port, scan, facts, records.flat(), true), /TD_E_VALUE_TAG/);
    assert.deepEqual(await evaluate(port, scan, '[' + fact() + ']', carrier('one', 'value', 1, a), true), [[cell(1, a)]]);
  });
});

test('raw JSON admits bounded Unicode and syntax without converting or rewriting source bytes', async () => {
  await fixture(async port => {
    const run = (source: string) => evaluate(port, scan, '[' + fact() + ']', carrier('one', 'value', 7, source));
    for (const source of [
      'null', ' \n -12.50e+09 \t ', '{"same":1,"same":2}',
      '["\\uD834\\uDD1E","\\/","\\\\","\\u0000","é🙂"]',
      '['.repeat(64) + '0' + ']'.repeat(64), '"' + 'x'.repeat(4094) + '"',
    ]) assert.deepEqual(await run(source), [[cell(7, source)]]);
    for (const source of [
      '', ' ', '{', '[1,]', '{"a":1,}', '1e+', '01', '{} true',
      '"\\x"', '"\\ud800"', '"raw\nnewline"',
    ]) await assert.rejects(run(source), /TD_E_VALUE_PAYLOAD: invalid serialized JSON/);
    await assert.rejects(run('['.repeat(65) + '0' + ']'.repeat(65)), /JSON nesting exceeds 64/);
    await assert.rejects(run('"' + 'x'.repeat(16383) + '"'), /allowed byte length/);
    await assert.rejects(evaluate(port, scan, '[' + fact() + ']', carrier('one', 'value', 8, '')), /TD_E_VALUE_PAYLOAD/);
    await assert.rejects(evaluate(port, scan, '[' + fact('1::BIGINT') + ']', carrier('one', 'value', 8, 'id')), /TD_E_VALUE_PAYLOAD/);
  });
});

test('raw JSON and blob IDs support opaque equality with eager order and measure errors', async () => {
  await fixture(async port => {
    for (const [tag, source, constructor] of [[7, '42', 'json'], [8, '42', 'blob']] as const) {
      const run = (program: string) => evaluate(port, program, '[' + fact() + ']', carrier('one', 'value', tag, source));
      const match = "answer(?v) :- triple(?e,'value',?v),";
      const literal = constructor + '(' + quote(source) + ')';
      assert.deepEqual(await run(match + '[?v=' + literal + '].'), [[cell(tag, source)]]);
      assert.deepEqual(await run(match + '[?v=' + quote(source) + '].'), []);
      const invalidOrder = match + '[false=true],[?v<' + literal + '].';
      await assert.rejects(run(invalidOrder), /TD_E_EXPR_TYPE/);
      assert.deepEqual(await run(invalidOrder.replace("'value'", "'absent'")), []);
      for (const operation of ['min', 'max', 'sum_i64'])
        await assert.rejects(run("source(?e,?v) :- triple(?e,'value',?v). answer(" +
          operation + "(?v)) :- source(?e,?v)."), /TD_E_AGG_MEASURE_TAG/);
    }
  });
});

test('raw values-v2 reads real Triplex JSON and blob carriers without using descriptor fields as identity', async () => {
  await fixture(async port => {
    const backend = new PublicDuckDBBackend(port, DatabaseScope.test('json-blob-carriers'));
    const ddl = await readFile(new URL('./public-schema.sql', import.meta.url), 'utf8');
    await backend.initialize(ddl);
    const e = EntityId.make('doc');
    const value = { nested: ['é🙂', false, null, '\0'] };
    const inputs: TripleInput[] = [
      { entityId: e, attribute: 'value', value: { type: 'json', value } },
      { entityId: e, attribute: 'value', value: { type: 'blob', value: 'opaque:id',
        mimeType: 'text/plain', size: 3, filename: 'é.txt' } },
    ];
    await backend.withTransaction(async session => {
      const position = await session.nextCommitPosition();
      await session.claimCommand('seed', 'json-blob-tx', 10);
      await session.batchInsert(inputs.map(input => ({ ...input, validFrom: 0, validTo: 10 })),
        'json-blob-tx', 10, ['json-row', 'blob-row'], position);
    });
    const facts = "(SELECT list(struct_pack(e:=e,a:=a,v:=struct_pack(tag:=v_tag,s:=decode(v_s)," +
      "b:=v_b,i:=v_i,f:=v_f),valid_from:=valid_from,valid_to:=valid_to,tx_from:=tx_from,tx_to:=tx_to)) FROM main.assertions)";
    assert.deepEqual(await evaluate(port, scan, facts), [[cell(7, JSON.stringify(value))], [cell(8, 'opaque:id')]]);
  });
});
