import fs from 'node:fs';
import { encodeTagged, decodeTagged } from '../../../packages/datomic/src/codec.ts';

// [CX-VDA00] Why: independent boundary cases supplement the builder vectors. Rejected: reusing only the shared fixture.
const rows = [];
const add = (t, v, expected = 'accept') => rows.push({ wire: { t, v }, expected });
for (const t of ['long', 'ref', 'instant']) {
  for (const v of ['-9223372036854775808', '9223372036854775807', '9007199254740993', '-9007199254740993', '0', '-0']) add(t, v);
  for (const v of ['-9223372036854775809', '9223372036854775808', '01', '1.0', '1e0', '1\n', '1\r']) add(t, v, 'reject');
}
for (const v of ['9'.repeat(200), '-' + '9'.repeat(200), '0']) add('bigint', v);
add('bigint', '1\n', 'reject');
for (const v of ['16.5000', '-0.0000', '1.234567890123456789012345678901234567890', '1E+2147483647', '1E-2147483647', '1.0E-2147483646']) add('bigdec', v);
// Java accepts the asymmetric negative scale limit -2147483648.
add('bigdec', '1E+2147483648');
for (const v of ['1E-2147483648', '1.0E-2147483647', '1E+999999999999999999999', '16.50\n']) add('bigdec', v, 'reject');
for (const v of [-0, Number.MIN_VALUE, -Number.MIN_VALUE, Number.MAX_VALUE, -Number.MAX_VALUE, 1e20, 9007199254740992, 0.10000000000000002]) add('double', v);
const results = rows.map(row => {
  try {
    const json = encodeTagged(row.wire);
    const decoded = decodeTagged(json);
    if (!Object.is(decoded.v, row.wire.v)) throw new Error('TS changed value');
    return { ...row, ts: 'accept', json, matchesExpected: row.expected === 'accept' };
  } catch (e) { return { ...row, ts: 'reject', error: e.message, matchesExpected: row.expected === 'reject' }; }
});
fs.writeFileSync(new URL('evidence/codec-cases.json', import.meta.url), JSON.stringify(rows, null, 2) + '\n');
// Preserve -0 on the independent Clojure input path too.
fs.writeFileSync(new URL('evidence/codec-wire.jsonl', import.meta.url), rows.map(r => {
  const wire = JSON.stringify(r.wire);
  return r.wire.t === 'double' && Object.is(r.wire.v, -0) ? wire.replace('"v":0', '"v":-0.0') : wire;
}).join('\n') + '\n');
fs.writeFileSync(new URL('evidence/codec-ts.json', import.meta.url), JSON.stringify(results, null, 2) + '\n');
console.log(JSON.stringify({ cases: results.length, unexpected: results.filter(r => !r.matchesExpected) }, null, 2));
