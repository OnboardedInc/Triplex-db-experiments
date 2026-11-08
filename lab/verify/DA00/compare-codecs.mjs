import assert from 'node:assert/strict';
import fs from 'node:fs';
import { decodeTagged } from '../../../packages/datomic/src/codec.ts';

// [CX-VDA00] Why: compare cross-language value and scale independently of textual normalization. Rejected: requiring identical exponent spelling.
const here = new URL('./evidence/', import.meta.url);
const cases = JSON.parse(fs.readFileSync(new URL('codec-cases.json', here)));
const wires = fs.readFileSync(new URL('codec-wire.jsonl', here), 'utf8').trim().split('\n').map(JSON.parse);
const ts = JSON.parse(fs.readFileSync(new URL('codec-ts.json', here)));
const jvm = fs.readFileSync(new URL('codec-jvm.jsonl', here), 'utf8').trim().split('\n').map(JSON.parse);
assert.equal(jvm.length, cases.length);
const decimal = value => {
  const [significand, exponent = '0'] = value.toLowerCase().split('e');
  const fraction = significand.split('.')[1]?.length ?? 0;
  return { coefficient: BigInt(significand.replace('.', '')), scale: BigInt(fraction) - BigInt(exponent) };
};
const results = jvm.map((row, i) => {
  const c = { ...cases[i], wire: wires[i] };
  assert.deepEqual(row.input, c.wire);
  assert.equal(row.result, c.expected, JSON.stringify(c));
  if (row.result === 'accept') {
    const output = decodeTagged(row.output);
    assert.equal(output.t, c.wire.t);
    if (c.wire.t === 'double') {
      assert(Object.is(output.v, row.input.v));
      const bits = Buffer.alloc(8);
      bits.writeDoubleBE(output.v);
      assert.equal(bits.readBigInt64BE().toString(), row.doubleBits);
    } else if (c.wire.t === 'bigdec') {
      assert.deepEqual(decimal(output.v), decimal(c.wire.v));
      assert.equal(BigInt(row.scale), decimal(c.wire.v).scale);
    } else if (['long', 'ref', 'bigint', 'instant'].includes(c.wire.t)) assert.equal(BigInt(output.v), BigInt(c.wire.v));
    else assert.equal(output.v, c.wire.v);
    assert.equal(row.roundtrip, true);
  }
  return { wire: c.wire, expected: c.expected, ts: ts[i].ts, jvm: row.result, agrees: ts[i].ts === row.result };
});
const result = { cases: results.length, jvmMatchesExpected: true, acceptedValuesExactAcrossJson: true, discrepancies: results.filter(r => !r.agrees) };
fs.writeFileSync(new URL('codec-comparison.json', here), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
