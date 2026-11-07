/**
 * Black-box acceptance harness for the future typed browser reference API.
 * This is test preparation, not an implementation or a passed conformance run.
 * Usage: node run-contract.mjs --engine /absolute/path/to/engine-v2.js
 */
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL, fileURLToPath} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const option = name => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};
const enginePath = option('--engine') ?? process.env.TD_BROWSER_V2_ENGINE;
const fixturePath = option('--fixtures') ?? path.join(here, 'contract-fixtures.json');

if (!enginePath) {
  console.error('UNRUN: supply --engine or TD_BROWSER_V2_ENGINE for the future v2 reference module.');
  process.exit(2);
}

const clone = object => structuredClone(object);
const requestFact = payload => ({e:'e',a:'a',v:payload,
  valid_from:'0',valid_to:'100',tx_from:'0',tx_to:'100'});
const basicProgram = "answer(?v) :- triple('e','a',?v).";
let checks = 0;
const passed = [];

function validateWireValue(value) {
  assert.ok(value && typeof value === 'object' && !Array.isArray(value));
  assert.deepEqual(Object.keys(value).sort(), ['t','v']);
  if (value.t === 'str') assert.equal(typeof value.v, 'string');
  else if (value.t === 'bool') assert.equal(typeof value.v, 'boolean');
  else if (value.t === 'i64') {
    assert.equal(typeof value.v, 'string');
    assert.match(value.v, /^(?:0|-[1-9][0-9]*|[1-9][0-9]*)$/);
    assert.ok(BigInt(value.v) >= -(1n<<63n) && BigInt(value.v) < (1n<<63n));
  } else if (value.t === 'f64') {
    assert.equal(typeof value.v, 'number');
    assert.ok(Number.isFinite(value.v));
    assert.equal(Object.is(value.v, -0), false, 'Output float negative zero must normalize');
  } else assert.fail(`Unknown output value tag ${String(value.t)}`);
}

async function main() {
  const corpus = JSON.parse(await readFile(fixturePath, 'utf8'));
  assert.equal(corpus.format, 'temporal-datalog-research-contract-fixtures');
  assert.equal(corpus.value_format_version, 2);
  const module = await import(pathToFileURL(path.resolve(enginePath)).href);
  if (typeof module.evaluateV2 !== 'function') {
    console.error('UNRUN: module has no evaluateV2 export; no typed implementation is claimed.');
    process.exitCode = 2;
    return;
  }
  const evaluate = async (program, facts, validAt='1', knownAt='1', limits={}) => {
    const result = await module.evaluateV2(program, clone(facts), validAt, knownAt, limits);
    assert.ok(result && typeof result === 'object');
    assert.ok(Array.isArray(result.rows), 'Result must expose canonical tagged JSON rows');
    for (const row of result.rows) {
      assert.ok(Array.isArray(row));
      row.forEach(validateWireValue);
    }
    return result;
  };
  const answer = async (name, program, facts, expected, validAt='1', knownAt='1') => {
    const result = await evaluate(program, facts, validAt, knownAt);
    assert.deepEqual(result.rows, expected, name);
    checks++;
    passed.push(name);
  };
  const rejection = async (name, operation) => {
    await assert.rejects(operation, undefined, name);
    checks++;
    passed.push(name);
  };

  for (const fixture of corpus.cases) {
    await answer(fixture.name, fixture.program, fixture.facts, fixture.expected_rows,
                 fixture.valid_at, fixture.known_at);
    await answer(`${fixture.name}:input-permutation`, fixture.program,
                 [...fixture.facts].reverse(), fixture.expected_rows,
                 fixture.valid_at, fixture.known_at);
    await answer(`${fixture.name}:input-duplicates`, fixture.program,
                 [...fixture.facts, ...fixture.facts], fixture.expected_rows,
                 fixture.valid_at, fixture.known_at);
  }

  for (const fixture of corpus.rejections) {
    const program = fixture.program ?? basicProgram;
    const facts = Object.hasOwn(fixture, 'value')
      ? [requestFact(fixture.value)] : [requestFact({t:'str',v:'ok'})];
    const validAt = Object.hasOwn(fixture, 'valid_at') ? fixture.valid_at : '1';
    const knownAt = Object.hasOwn(fixture, 'known_at') ? fixture.known_at : '1';
    await rejection(fixture.name, () => evaluate(program, facts, validAt, knownAt));
  }

  const badValues = [
    null, true, 1, '1', {t:'f64',v:NaN}, {t:'f64',v:Infinity}, {t:'f64',v:-Infinity},
    {t:'str',v:'\uD800'}, {t:'str',v:'x\0y'}, {t:'i64',v:'9223372036854775808'},
    {t:'i64',v:'-9223372036854775809'}, {t:'i64',v:'01'}, {t:'i64',v:'-0'},
    {t:'str',v:'ok',extra:true}, {t:'i64',v:1n}, {t:'bool',v:1},
  ];
  for (const [index,value] of badValues.entries()) {
    await rejection(`bad-direct-value-${index}`, () => evaluate(basicProgram,[requestFact(value)]));
  }
  const wellFormed = requestFact({t:'str',v:'ok'});
  for (const [name, fact] of [
    ['numeric-entity',{...wellFormed,e:1}],
    ['boolean-attribute',{...wellFormed,a:true}],
    ['invalid-entity-unicode',{...wellFormed,e:'\uDC00'}],
    ['numeric-valid-boundary',{...wellFormed,valid_from:0}],
    ['numeric-recorded-boundary',{...wellFormed,tx_to:100}],
    ['empty-valid-interval',{...wellFormed,valid_from:'1',valid_to:'1'}],
    ['empty-recorded-interval',{...wellFormed,tx_from:'1',tx_to:'1'}],
    ['invalid-invisible-value',{...wellFormed,v:{t:'f64',v:NaN},valid_from:'10'}],
  ]) await rejection(name, () => evaluate(basicProgram,[fact]));
  for (const [name, time] of [['number-clock',1],['bigint-clock',1n],['leading-plus-clock','+1'],
                             ['leading-zero-clock','01'],['out-of-range-clock','9223372036854775808']]) {
    await rejection(name, () => evaluate(basicProgram,[wellFormed],time,'1'));
  }

  const chain = ['a','b','c','d'].map((e,index) => ({...wellFormed,e,a:'edge',
    v:{t:'str',v:String.fromCharCode('b'.charCodeAt(0)+index)}}));
  const recursive = "r(?x,?y) :- triple(?x,'edge',?y). "
    + "r(?x,?z) :- r(?x,?y),triple(?y,'edge',?z). answer(?x,?y) :- r(?x,?y).";
  for (const [name,limits] of [['facts-cap',{facts:1}],['work-cap',{work:1}],['rounds-cap',{rounds:1}]]) {
    await rejection(name, () => evaluate(recursive,chain,'1','1',limits));
  }
  // An error in a previous invocation must not poison future independent calls.
  await answer('query-after-rejection-is-healthy',basicProgram,[wellFormed],[[{t:'str',v:'ok'}]]);
  await answer('float-zero-input-is-normalized',basicProgram,[requestFact({t:'f64',v:-0})],
               [[{t:'f64',v:0}]]);

  console.log(JSON.stringify({status:'passed',implementation:path.resolve(enginePath),
    checks,passed,fixture_status:corpus.status},null,2));
}

try { await main(); }
catch (error) {
  console.error(JSON.stringify({status:'failed-or-unavailable',checks,
    error:error?.stack ?? String(error)},null,2));
  process.exitCode = 1;
}
