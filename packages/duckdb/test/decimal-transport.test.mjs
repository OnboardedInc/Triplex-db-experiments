import assert from 'node:assert/strict';
import test from 'node:test';
import { NativeDuckDBPort } from '../src/native-duckdb-port.mjs';

// A real paired C++ instance verifies the actual pinned driver's DECIMAL wire
// shape. Compiler category keys have a small closed exact family; arbitrary
// fractional decimals cannot silently cross as binary64. See wiki/research.md.
test('paired native transport preserves int64 order keys and exact compiler categories', async () => {
  const port = await NativeDuckDBPort.openWithOwner({ memoryLimit:'64MB', threads:1 });
  try {
    await port.activateOwnership();
    const rows = await port.runNative({ name:'exact-transport', sql:"SELECT '-9223372036854775808'::DECIMAL(32,0), '9223372036854775807'::DECIMAL(32,0), 0.5::DECIMAL(2,1), 2::DECIMAL(2,1)", params:[] });
    assert.deepEqual(rows,[[-9223372036854775808n,9223372036854775807n,0.5,2]]);
    await assert.rejects(port.runNative({ name:'fractional-refused', sql:'SELECT 0.1::DECIMAL(2,1)', params:[] }), { code:'RESULT' });
    await assert.rejects(port.runNative({ name:'integer-overflow-refused', sql:"SELECT '9223372036854775808'::DECIMAL(32,0)", params:[] }), { code:'PARAMETER' });
  } finally { await port.closeWriter(); await port.close(); }
});
