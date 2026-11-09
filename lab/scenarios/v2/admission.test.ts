import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { memoryComposition } from '../../bench/lib/memory.ts';
import { seedW0 } from '../../bench/lib/w0-seed.ts';
import { V_W0 } from '../../bench/lib/w0-world.ts';
import { admitWorld } from './admission.ts';
// [EXP-W02] Why: test actual seeded content and a changed value rather than mocking a matching boolean.
// Rejected: treating this in-memory diagnostic as engine qualification.
test('same-process content admission matches independent population, rejects wrong scope and changed bytes', async () => {
  const N = 50, scope = 'W02-admission-unit';
  const comp = memoryComposition('xtdb', scope);
  const dir = new URL('../../../runs/W02-unit/', import.meta.url);
  fs.mkdirSync(dir, { recursive: true });
  const file = new URL(`seed-${process.pid}-${Date.now()}.jsonl`, dir);
  const seeded = await seedW0(comp, N, file.pathname);
  const oracleFile = new URL(`oracle-${process.pid}-${Date.now()}.json`, dir);
  const r = spawnSync('python3', ['-I', new URL('../../oracles/domain/cli.py', import.meta.url).pathname, '--population', '--rung', String(N), '--fingerprint', '--out', oracleFile.pathname], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  const input = { endpoint: comp.backend.url, scope, N, oracle: JSON.parse(fs.readFileSync(oracleFile, 'utf8')),
    counts: { position: seeded.commands, assertions: seeded.assertions, retired: seeded.retractions }, position: seeded.commands, validAt: V_W0 };
  const matching = await admitWorld(comp, input);
  assert.equal(matching.status, 'MATCHING');
  await assert.rejects(admitWorld(comp, { ...input, scope: 'another' }), /binding/);
  await assert.rejects(admitWorld(comp, { ...input, counts: { ...input.counts, assertions: 0 } }), /counts/);
  const changedOracle = structuredClone(input.oracle); changedOracle.fingerprint.worlds = 'sha256:' + '0'.repeat(64);
  await assert.rejects(admitWorld(comp, { ...input, oracle: changedOracle }), /mismatch/);
  const changed = { ...comp, sweepPage: async (...args: Parameters<typeof comp.sweepPage>) => {
    const page = await comp.sweepPage(...args);
    let replaced = false;
    return { ...page, rows: page.rows.map(row => {
      if (!replaced && row.attribute === 'payRateCents') { replaced = true; return { ...row, value: { type: 'integer', value: String(Number(row.value.value) + 1) } }; }
      return row;
    }) };
  } };
  await assert.rejects(admitWorld(changed, input), /mismatch/);
  await comp.close();
});
