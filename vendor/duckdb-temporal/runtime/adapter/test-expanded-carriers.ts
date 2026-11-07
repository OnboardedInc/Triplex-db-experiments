import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { EntityId } from '@triplex-build/triplex';
import { DatabaseScope, type TripleInput } from '@triplex-build/triplex/runtime';
import { NativeDuckDBPort } from './native-duckdb-port.mjs';
import type { SqlRows } from './owned-duckdb-port.mjs';
import { PublicDuckDBBackend } from './public-backend.mjs';

const schema = await readFile(new URL('./public-schema.sql', import.meta.url), 'utf8');
const source = EntityId.make('source');
const target = EntityId.make('target');
const text = (tag: number, s: string) => ({ tag, s, b: null, i: null, f: null });
const floating = (tag: number, value: number) => {
  const bytes = Buffer.alloc(8);
  bytes.writeDoubleBE(value);
  return { tag, s: null, b: null, i: null, f: bytes.toString('hex') };
};

async function fixture(work: (port: NativeDuckDBPort) => Promise<void>, audited = false) {
  const port = await (audited ? NativeDuckDBPort.openWithOwner() : NativeDuckDBPort.open());
  const backend = new PublicDuckDBBackend(port, DatabaseScope.test('expanded-carriers'));
  try {
    await backend.initialize(schema);
    const inputs: TripleInput[] = [
      { entityId: source, attribute: 'same-id', value: { type: 'string', value: target } },
      { entityId: source, attribute: 'same-id', value: { type: 'ref', value: target } },
      { entityId: source, attribute: 'manager', value: { type: 'ref', value: target } },
      { entityId: source, attribute: 'number', value: { type: 'number', value: -125.25 } },
      { entityId: target, attribute: 'name', value: { type: 'string', value: 'Target' } },
      ...[-125.25, -0, Number.MIN_VALUE].map(value => ({
        entityId: source, attribute: 'when', value: { type: 'datetime' as const, value },
      })),
    ];
    await backend.withTransaction(async session => {
      const position = await session.nextCommitPosition();
      await session.claimCommand('seed', 'expanded-carriers-tx', 10);
      await session.batchInsert(inputs.map(input => ({ ...input, validFrom: 0, validTo: 10 })),
        'expanded-carriers-tx', 10, inputs.map((_, index) => 'carrier-' + index), position);
    });
    if (audited) await port.activateOwnership();
    await work(port);
  } finally {
    await backend.close();
  }
}

async function evaluate(port: NativeDuckDBPort, program: string, options: {
  old?: boolean; where?: string; float?: string; integer?: string;
} = {}) {
  const entry = options.old ? 'td_query_stratified_deadline_v1' : 'td_query_stratified_values_v2';
  const facts = `(SELECT list(struct_pack(e:=e,a:=a,v:=struct_pack(tag:=v_tag,s:=decode(v_s),b:=v_b,
    i:=${options.integer ?? 'v_i'},f:=${options.float ?? 'v_f'}),
    valid_from:=valid_from,valid_to:=valid_to,tx_from:=tx_from,tx_to:=tx_to))
    FROM main.assertions WHERE ${options.where ?? 'TRUE'})`;
  const args = `?,${facts},0::BIGINT,1::BIGINT,100000::BIGINT,1000::BIGINT,5000000::BIGINT,5000::BIGINT${options.old ? '' : ',0::BIGINT'}`;
  const sql = `SELECT CAST(to_json(list_transform(${entry}(${args}).rows,lambda tuple:
    list_transform(tuple,lambda v:struct_pack(tag:=v.tag,s:=v.s,b:=v.b,i:=v.i::VARCHAR,
    f:=CASE WHEN v.tag IN(4,6) THEN td_float_bits_v1(v.f) END)))) AS VARCHAR)`;
  const rows = await port.run({ name: 'evaluate_legacy_carriers', sql, params: [program] });
  const output = rows[0]?.[0];
  assert.ok(typeof output === 'string');
  return JSON.parse(output);
}

test('values-v2 reads actual compatibility carriers and preserves format five and four-tag entrypoints', async () => {
  await fixture(async port => {
    const all = "answer(?v) :- triple('source',?a,?v).";
    const result = await evaluate(port, all);
    assert.deepEqual(result, [
      [text(1, 'target')], [floating(4, -125.25)], [text(5, 'target')],
      [floating(6, -125.25)], [floating(6, 0)], [floating(6, Number.MIN_VALUE)],
    ]);
    await assert.rejects(evaluate(port, all, { old: true }), /TD_E_VALUE_TAG/);
    assert.deepEqual(await evaluate(port, all, { old: true, where: 'v_tag<=4' }),
      await evaluate(port, all, { where: 'v_tag<=4' }));
    assert.deepEqual(await port.run({ name: 'format', sql: 'SELECT version::BIGINT FROM main.store_meta', params: [] }), [[5n]]);
  });
});

test('values-v2 compares and aggregates datetimes within their exact tag', async () => {
  await fixture(async port => {
    const negative = "answer(?d) :- triple('source','when',?d),[?d<datetime(\"0000000000000000\")].";
    const aggregate = (name: string) => "source(?e,?d) :- triple(?e,'when',?d). answer(" + name + "(?d)) :- source(?e,?d).";
    assert.deepEqual(await evaluate(port, negative), [[floating(6, -125.25)]]);
    assert.deepEqual(await evaluate(port, aggregate('min')), [[floating(6, -125.25)]]);
    assert.deepEqual(await evaluate(port, aggregate('max')), [[floating(6, Number.MIN_VALUE)]]);
    assert.deepEqual(await evaluate(port, "answer(?v) :- triple('source','when',?v),triple('source','number',?v)."), []);
    await assert.rejects(evaluate(port, "answer(?d) :- triple('source','when',?d),[?d<-125.25]."), /TD_E_EXPR_TYPE/);
    await assert.rejects(evaluate(port, aggregate('sum_i64')), /TD_E_AGG_MEASURE_TAG/);
    await assert.rejects(evaluate(port, "answer(?d) :- triple('source','when',?d).",
      { where: 'v_tag=6', float: "'Infinity'::DOUBLE" }), /TD_E_VALUE_PAYLOAD/);
  });
});

test('values-v2 reference identity and ref_id remain distinct and eager', async () => {
  await fixture(async port => {
    const join = "answer(?n) :- triple('source','manager',?r),triple(?target,'name',?n),";
    assert.deepEqual(await evaluate(port, join + '[?r=?target].'), []);
    assert.deepEqual(await evaluate(port, join + '[ref_id(?r)=?target].'), [[text(1, 'Target')]]);
    assert.deepEqual(await evaluate(port, "answer(?e) :- triple(?e,'manager',ref(\"target\"))."), [[text(1, 'source')]]);
    const wrong = "answer(?n) :- triple('source','same-id',?r),triple(?target,'name',?n),[false=true],[ref_id(?r)=?target].";
    await assert.rejects(evaluate(port, wrong), /TD_E_EXPR_TYPE/);
    assert.deepEqual(await evaluate(port, wrong.replace("'name'", "'absent'")), []);
    await assert.rejects(evaluate(port, "source(?e,?r) :- triple(?e,'manager',?r). answer(min(?r)) :- source(?e,?r)."), /TD_E_AGG_MEASURE_TAG/);
    await assert.rejects(evaluate(port, "answer(?r) :- triple('source','manager',?r).",
      { where: 'v_tag=5', integer: '1::BIGINT' }), /TD_E_VALUE_PAYLOAD/);
  });
});


const sqlQuote = (value: string) => "'" + value.replaceAll("'", "''") + "'";
const bounded = (program: string, route = 1) =>
  `PRAGMA td_query_store_values_v2(${sqlQuote(program)},0,-1,100000,1000,5000000,5000,0,${route})`;
const scalable = (program: string, inputFacts = 100) =>
  `PRAGMA td_query_store_scalable_v2(${sqlQuote(program)},0,-1,${inputFacts},100,100000,100,100000,0)`;
const runNative = (port: NativeDuckDBPort, sql: string) =>
  port.runNative({ name: 'persisted_expanded_carriers', sql, params: [] });
const tuples = (rows: SqlRows) => rows.flatMap(row => {
  assert.equal(row[0], 1n);
  assert.equal(row.length, 7);
  if (row[6] === null) return [];
  assert.equal(typeof row[6], 'string');
  return [JSON.parse(row[6] as string)];
});

test('persisted values-v2 keeps exact datetime scan, aggregate and four-tag wire parity', async () => {
  await fixture(async port => {
    const dates = "answer(?d) :- triple(?e,'when',?d).";
    const ordered = "answer(?d) :- triple(?e,'when',?d),[?d<datetime(\"0000000000000000\")].";
    const min = "source(?e,?d) :- triple(?e,'when',?d). answer(min(?d)) :- source(?e,?d).";
    const max = min.replace('min(', 'max(');
    const numbers = "answer(?d) :- triple(?e,'number',?d),[?d<0.0].";
    for (const [program, expected] of [
      [dates, [[floating(6, -125.25)], [floating(6, 0)], [floating(6, Number.MIN_VALUE)]]],
      [ordered, [[floating(6, -125.25)]]],
      [min, [[floating(6, -125.25)]]],
      [max, [[floating(6, Number.MIN_VALUE)]]],
      [numbers, [[floating(4, -125.25)]]],
    ] as const) {
      const native = await runNative(port, bounded(program));
      const sql = await runNative(port, scalable(program));
      assert.equal(native[0]?.[1], 'native');
      assert.equal(sql[0]?.[1], 'sql');
      assert.match(String(sql[0]?.[2]), /^owned_/);
      assert.deepEqual(tuples(native), expected, program);
      assert.deepEqual(tuples(sql), expected, program);
    }
    const datetimeConstant = "answer(?e) :- triple(?e,'when',datetime(\"0000000000000001\")).";
    assert.deepEqual(tuples(await runNative(port, scalable(datetimeConstant))), [[text(1, 'source')]]);
    const names = "answer(?n) :- triple(?e,'name',?n).";
    const legacy = (program: string) =>
      `PRAGMA td_query_store_native(${sqlQuote(program)},0,-1,100000,1000,5000000,5000)`;
    assert.deepEqual(await runNative(port, legacy(names)), await runNative(port, bounded(names)));
    await assert.rejects(runNative(port, legacy(dates)), /TD_E_QUERY_PROFILE/);
    await assert.rejects(runNative(port, scalable(ordered, 2)), /TD_E_QUERY_SCALE_LIMIT/);
  }, true);
});

test('persisted values-v2 ref_id join preserves typed identity and eager wrong-tag errors', async () => {
  await fixture(async port => {
    const join = "answer(?n) :- triple('source','manager',?r),triple(?target,'name',?n),[ref_id(?r)=?target].";
    const matches = [[text(1, 'Target')]];
    assert.deepEqual(tuples(await runNative(port, scalable(join))), matches);
    assert.deepEqual(tuples(await runNative(port, bounded(join))), matches);
    const uncast = "answer(?n) :- triple('source','manager',?target),triple(?target,'name',?n).";
    assert.deepEqual(tuples(await runNative(port, scalable(uncast))), []);
    assert.deepEqual(tuples(await runNative(port, scalable(
      "answer(?r) :- triple('source','manager',?r)."))), [[text(5, 'target')]]);
    const wrong = join.replace("'manager'", "'same-id'");
    for (const query of [bounded, scalable]) {
      await assert.rejects(runNative(port, query(wrong)), /TD_E_EXPR_TYPE/);
      assert.deepEqual(tuples(await runNative(port, query(wrong.replace("'name'", "'absent'")))), []);
    }
    await assert.rejects(runNative(port, scalable(join.replace('[ref_id(?r)=?target]', '[ref_id(?r)=?target],[false=true]'))),
      /TD_E_QUERY_SCALE_UNSUPPORTED/);
  }, true);
});

test('controlled values-v2 templates use the live owner generation', async () => {
  await fixture(async port => {
    const program = "answer(?d) :- triple(?e,'when',?d).";
    for (const [entry, params] of [
      ['td_query_store_values_sql_v2', [0n, -1n, 100000n, 1000n, 5000000n, 5000n, 1n]],
      ['td_query_store_scalable_sql_v2', [0n, -1n, 100n, 100n, 100000n, 100n, 100000n]],
    ] as const) {
      const execute = () => port.withNativeQueryControl({ timeoutMs: 5000 }, async control => {
        const compiled = await control.run({ name: 'compile_values_v2',
          sql: `SELECT system.main.${entry}(?,?,?,?,?,?,?,?)`, params: [program, ...params] });
        const statement = compiled[0]?.[0];
        assert.ok(typeof statement === 'string');
        return control.run({ name: 'execute_values_v2', sql: statement, params: [control.token], reuse: true });
      });
      const expected = [[floating(6, -125.25)], [floating(6, 0)], [floating(6, Number.MIN_VALUE)]];
      assert.deepEqual(tuples(await execute()), expected);
      await runNative(port, 'SELECT system.main.td_owner_probe_invalidate()');
      await assert.rejects(execute(), /TD_E_OWNER_PROBE_INVALID/);
      await port.activateOwnership();
      assert.deepEqual(tuples(await execute()), expected);
    }
  }, true);
});
