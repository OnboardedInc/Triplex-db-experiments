// @ts-nocheck -- [EXP-CHECKJS-R2] generated/optional runtime modules unavailable in standalone source checking; dynamic collections, runtime Buffer-to-JSON coercion, or validated values without static narrowing. Binding errors remain checked by lab/bin/checkjs.mjs.
// [EXP-J01] Why: rerun the only non-deadline failure in the paused G1 raw reports.
// Rejected: --cases N (selects a prefix and repeats unrelated overload failures).
// This is a diagnostic single-case rerun, never a G1 acceptance receipt.
import fs from 'node:fs';
import { randomUUID, createHash } from 'node:crypto';
import { Effect, Exit } from 'effect';
import { triplesConformanceCases } from '../../../../packages/testkit/dist/index.js';
import { makeXtdbRuntime } from '../../../../packages/xtdb/dist/index.js';
import { Capabilities, DatabaseScope } from '../../../../packages/core/dist/runtime/index.js';
import { identity, writeReceipt, URLS } from '../bench/lib.mjs';

const ownerPath = '/Users/sam/projects/triplex-db-2/lab/locks/xtdb-dev/owner.json';
const ownerBytes = fs.readFileSync(ownerPath);
const owner = JSON.parse(ownerBytes);
if (owner.endpoint !== URLS.xtdb || owner.lane !== 'xtdb') throw new Error('Wrong resident owner');
const name = 'graph constraints reject invalid post-states across valid time';
const entry = triplesConformanceCases.find(e => e.name === name);
if (!entry) throw new Error('Missing unchanged conformance case');
const scope = DatabaseScope.test(`j01-cx-j01-constraint-${randomUUID()}`);
const before = identity();
const startedAt = new Date().toISOString(), t0 = performance.now();
const exit = await Effect.runPromiseExit(entry.run.pipe(
  Effect.provide(makeXtdbRuntime({ url: URLS.xtdb, commitEncoding: 'a0' }).layer({ scope, capabilities: Capabilities.none })),
  Effect.timeout('110 seconds'), Effect.scoped,
));
const outcome = {
  previous: 'G1-xtdb-20261108T013218Z-7e7e23', reason: 'ConformanceError, not a deadline error',
  lane: 'xtdb', commitEncoding: 'a0', case: name, scope, startedAt, endedAt: new Date().toISOString(),
  elapsedMs: performance.now() - t0, status: Exit.isSuccess(exit) ? 'PASS_SUBSET' : 'FAIL',
  error: Exit.isSuccess(exit) ? null : String(exit.cause), sourceBefore: before,
  ownerPath, ownerSha256: createHash('sha256').update(ownerBytes).digest('hex'), owner,
};
console.log(JSON.stringify({ ...writeReceipt('constraint-rerun', outcome), ...outcome }, null, 2));
if (!Exit.isSuccess(exit)) process.exitCode = 1;
