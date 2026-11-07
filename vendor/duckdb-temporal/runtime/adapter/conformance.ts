import assert from 'node:assert/strict';
import { Effect } from 'effect';
import { Capabilities, DatabaseScope } from '@triplex-build/triplex/runtime';
import { runtimeConformance, triplesConformanceCases } from '@triplex-build/triplex-testkit';
import { makeDuckDBRuntime } from './index.js';

assert.equal(triplesConformanceCases.length,44);
const runtime=await makeDuckDBRuntime();
const started=performance.now();
await Effect.runPromise(runtimeConformance(runtime,{
  scope:DatabaseScope.test('mac-duckdb-pinned-conformance'),capabilities:Capabilities.none,
}));
console.log(JSON.stringify({suite:'pinned-runtimeConformance-public-factory',
  upstream:'e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0',
  cases:triplesConformanceCases.length,result:'PASS',elapsed_ms:performance.now()-started}));
