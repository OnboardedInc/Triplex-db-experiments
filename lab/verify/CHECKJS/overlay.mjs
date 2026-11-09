// [CX-VCHECKJS] Why: exercise the actual CLI against modified compiler input without
// editing reviewed files. Rejected: import smoke tests (dormant names never execute).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const target = path.resolve(process.env.CHECKJS_REVIEW_TARGET);
const original = fs.readFileSync(target, 'utf8');
const mutation = process.env.CHECKJS_REVIEW_MUTATION;
let replacement;
if (mutation === 'engine-import') {
  assert(original.includes('withPool, sha256File,'));
  replacement = original.replace('withPool, sha256File,', 'withPool,');
} else {
  replacement = original + '\n// @ts-ignore -- reviewer verifies this cannot mask the sentinel\nif (false) { cxVcheckjsDormantUnboundName(); }\n';
}
const read = ts.sys.readFile;
let reads = 0;
ts.sys.readFile = file => {
  if (path.resolve(file) === target) { reads++; return replacement; }
  return read(file);
};
process.on('exit', () => {
  assert.equal(fs.readFileSync(target, 'utf8'), original);
  process.stderr.write(`CX-VCHECKJS overlay: ${JSON.stringify({ target, mutation, reads, originalUnchanged: true })}\n`);
});
