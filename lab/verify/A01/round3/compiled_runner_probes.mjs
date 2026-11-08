// [CX-VA01-R3] Why: test the changed COMPILED-copy hash check with real evaluator executions. Rejected: counting declaration-only predicate checks as proof that copied bytes were verified.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { buildFixtures } from './scratch/lab/bin/test/claim-fixtures.mjs';
import { qualifyClaim, gitSource, localSut } from './scratch/lab/bin/claim.mjs';

const root = fs.mkdtempSync(path.join(import.meta.dirname, 'compiled-fixtures-'));
let success = false;
try {
  const built = buildFixtures(root);
  const fixture = built.runFixtures.find(f => f.id === 'RUN-CANDIDATE');
  assert.ok(fixture);
  const repo = fixture.repo;
  const git = args => execFileSync('git', ['-c', 'user.name=review fixture', '-c', 'user.email=review@lab.invalid', '-c', 'commit.gpgsign=false', ...args], {
    cwd: repo, encoding: 'utf8', env: { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' }
  }).trim();
  const spec = JSON.parse(git(['show', 'main:lab/acceptance/obligations.json'])).buildSpec;
  const results = [];
  for (const mode of ['complete', 'wrong-byte-hash', 'missing-map']) {
    const branch = `review-compiled-${mode}`;
    git(['checkout', '-q', '-b', branch, 'main']);
    const file = path.join(repo, 'lab/acceptance/obligations.json');
    const c = JSON.parse(fs.readFileSync(file, 'utf8'));
    c.oracleRunners['O-CONTRACT'].sha256 = structuredClone(c.oraclePins['O-CONTRACT'].sha256);
    delete c.oraclePins['O-CONTRACT'];
    if (mode === 'wrong-byte-hash') for (const f of c.oracleRunners['O-CONTRACT'].files) c.oracleRunners['O-CONTRACT'].sha256[f] = '0'.repeat(64);
    if (mode === 'missing-map') delete c.oracleRunners['O-CONTRACT'].sha256;
    fs.writeFileSync(file, JSON.stringify(c, null, 2) + '\n');
    git(['add', 'lab/acceptance/obligations.json']);
    git(['commit', '-q', '-m', `review fixture ${mode}`, '-m', 'Co-Authored-By: Codex gpt-6.1-sol <noreply@openai.com>']);
    git(['checkout', '-q', 'main']);
    const r = qualifyClaim(fixture.claim, { git: gitSource(repo), authorityRef: branch,
      workDir: path.join(root, `work-${mode}`), sut: localSut(spec), sandbox: false });
    const codes = r.reasons.map(r => r.code);
    results.push({ mode, verdict: r.verdict, offlineVerdict: r.offlineVerdict, codes, cases: r.run.cases.length });
    assert.equal(r.verdict, 'DIAGNOSTIC');
    if (mode === 'complete') {
      assert.equal(r.offlineVerdict, 'QUALIFIED', JSON.stringify(r.reasons));
      assert.deepEqual(codes, ['GATE-NOT-RUN', 'RUN-NOT-ON-GATE']);
    } else {
      assert.equal(r.offlineVerdict, 'DIAGNOSTIC');
      assert.ok(codes.includes(mode === 'wrong-byte-hash' ? 'ORACLE-FILES' : 'ORACLE-RUNNER-UNPINNED'), JSON.stringify(r.reasons));
    }
  }
  console.log(JSON.stringify(results, null, 2));
  success = true;
} finally {
  if (success) fs.rmSync(root, { recursive: true, force: true });
  else console.error(`retained failed fixture tree: ${root}`);
}
