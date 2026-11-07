/** Private fixture assertion only. No transformation or metadata defaulting.
 * XTDB source XtdbStorageAdapter.ts448 writes schema_version:1; the public
 * Core row decoder exposes Some(1). This is the pinned adapter metadata default,
 * distinct from application type-version facts and ConfigStore revisions.
 */
import assert from 'node:assert/strict';
export function assertAdapterCodecSchemaVersion(actual, declared) {
  assert.equal(declared, 1, 'EXPLICIT_PINNED_XTDB_METADATA_DEFAULT');
  assert(actual !== null && typeof actual === 'object' && !Array.isArray(actual), 'OPTION_METADATA_REQUIRED');
  assert.equal(actual._tag, 'Some', 'CURRENT_XTDB_METADATA_IS_SOME');
  assert.equal(actual.value, declared, 'CURRENT_XTDB_METADATA_VALUE');
}
