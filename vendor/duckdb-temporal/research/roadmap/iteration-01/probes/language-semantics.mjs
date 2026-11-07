// Reproduce JS transport behavior. Run the companion Python script first.
// Reads/writes only evidence beside this file; no project implementation imports.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const directory = path.dirname(fileURLToPath(import.meta.url));
function hex(value) {
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setFloat64(0, value, false);
  return view.getBigUint64(0, false).toString(16).padStart(16, '0');
}
const corpus = JSON.parse(fs.readFileSync(path.join(directory, 'float-json-corpus.json'), 'utf8'));
assert.equal(corpus.length, 1024);
const mismatches = corpus.filter(({bits, value}) => hex(value) !== bits);
const jsonMismatches = corpus.filter(({bits, value}) => hex(JSON.parse(JSON.stringify(value))) !== bits);
let bigintStringifyError;
try { JSON.stringify(9223372036854775807n); }
catch (error) { bigintStringifyError = error.name; }
const text = '9223372036854775807';
const value = {t:'i64', v:text};
const summary = {
  node: process.version,
  parsed_untagged_i64_max: JSON.parse(text),
  parsed_untagged_i64_max_as_exact_integer: BigInt(JSON.parse(text)).toString(),
  expected_i64_max: text,
  bigint_stringify_error: bigintStringifyError,
  strict_equality_distinguishes_true_and_one: true !== 1,
  strict_equality_distinguishes_one_bigint_and_one_number: 1n !== 1,
  json_nonfinite_becomes_null: JSON.stringify([NaN, Infinity, -Infinity]),
  json_negative_zero: JSON.stringify(-0),
  tagged_i64_roundtrip: BigInt(JSON.parse(JSON.stringify(value)).v).toString() === text,
  python_float_json_to_js_bit_mismatches: mismatches.length,
  js_json_float_roundtrip_bit_mismatches: jsonMismatches.length,
  js_json_float_roundtrip_mismatch_examples: jsonMismatches.slice(0, 3),
  notes: 'The lone JSON round-trip bit mismatch is negative zero, intentionally canonicalized to positive zero by the recommended semantics. This probes language transport, not the proposed implementation.',
};
assert.equal(mismatches.length, 0);
assert.deepEqual(jsonMismatches.map(row => row.bits), ['8000000000000000']);
assert.equal(summary.parsed_untagged_i64_max_as_exact_integer, '9223372036854775808');
assert.equal(summary.tagged_i64_roundtrip, true);
assert.equal(bigintStringifyError, 'TypeError');
fs.writeFileSync(path.join(directory, 'js-language-semantics.json'), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 2));
