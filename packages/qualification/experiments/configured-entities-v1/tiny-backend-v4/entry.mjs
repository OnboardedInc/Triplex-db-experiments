// @ts-nocheck -- [EXP-CHECKJS-R2] unannotated destructured parameters. Binding errors remain checked by lab/bin/checkjs.mjs.
/** One private experiment entry identity; no source import or SDK access. */
import assert from 'node:assert/strict';
export function assertEntryBinding({descriptor,sourceGeneration,command,inputs,actualModule,actualArgv}) {
  assert(descriptor && typeof descriptor.path==='string' && /^[a-f0-9]{64}$/.test(descriptor.sha256), 'EXPLICIT_WORKER_DESCRIPTOR_REQUIRED');
  assert.equal(descriptor.generation,sourceGeneration,'SOURCE_GENERATION_MISMATCH');
  assert.equal(command.argv[2],descriptor.path,'COMMAND_WORKER_MISMATCH');
  for(const actual of [actualModule,actualArgv]) {
    assert.equal(actual.path,descriptor.path,'ACTUAL_ENTRY_PATH_MISMATCH');
    assert.equal(actual.sha256,descriptor.sha256,'ACTUAL_ENTRY_BYTES_MISMATCH');
    assert.equal(actual.bytes,descriptor.bytes,'ACTUAL_ENTRY_SIZE_MISMATCH');
  }
  assert(Array.isArray(inputs),'AUTHENTICATED_FULL_MANIFEST_INPUTS_REQUIRED');
  const source=inputs.find(row=>row.path===descriptor.path);assert(source,'WORKER_NOT_PINNED');
  assert.equal(source.role,'runner','WORKER_ROLE');assert.equal(source.sha256,descriptor.sha256,'PINNED_WORKER_BYTES_MISMATCH');
}
