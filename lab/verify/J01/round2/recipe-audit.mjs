// [CX-VJ01-2] Why: establish exactly what the deferred commands persist without reserving or contacting an engine. Rejected: treating a note or a diagnostic label as environment/mode evidence.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const root = 'lab/verify/J01/round2';
const sha = b => createHash('sha256').update(b).digest('hex');
const git = file => execFileSync('git', ['show', `0d9a860:${file}`], { encoding: 'utf8' });
const files = ['lab/experiments/EXP-J01-bytes-per-commit/REPORT-round2.md', 'lab/bin/gate.mjs', 'lab/bin/heavy.mjs', 'lab/experiments/EXP-J01-bytes-per-commit/probes/p9-g1-mode-proof.mjs'];
const sources = Object.fromEntries(files.map(file => [file, git(file)]));
const [report, gate, heavy, probe] = files.map(f => sources[f]);
const commands = [...report.matchAll(/```sh\n([\s\S]*?)```/g)].map(m => m[1]);
const gates = commands[0].split('\n').filter(x => x.startsWith('TRIPLEX_COMMIT_ENCODING='));
assert.equal(gates.length, 4);
// Evaluate the exact pure environment cleaner, supplying no engine connection.
const envCode = gate.slice(gate.indexOf('const LIVE_FLAGS'), gate.indexOf('\nclass Run'));
const cleanEnv = new Function(`${envCode}; return cleanEnv;`)();
const saved = process.env.TRIPLEX_COMMIT_ENCODING;
process.env.TRIPLEX_COMMIT_ENCODING = 'compact';
const effectiveChildMode = cleanEnv().TRIPLEX_COMMIT_ENCODING;
if (saved === undefined) delete process.env.TRIPLEX_COMMIT_ENCODING; else process.env.TRIPLEX_COMMIT_ENCODING = saved;
assert.equal(effectiveChildMode, 'compact');
const diagnostic = [];
const originalArgv = process.argv, originalLog = console.log, originalFetch = globalThis.fetch;
try {
  for (const [name, rowsByScope] of [['zero-evidence', [[0, 0, 0], [0, 0, 0]]], ['missing-second-scope', [[1, 1, 1], [0, 0, 0]]]]) {
    const scopes = ['scope-a', 'scope-b']; let index = 0; const captured = [];
    globalThis.__CX_VJ01_R2_FS__ = { readFileSync: () => JSON.stringify({ startedAt: '2026-11-08T00:00:00Z', endpoint: 'http://unused-local', executions: scopes.map(scope => ({ scope })) }) };
    globalThis.fetch = async () => { const [rows, native, version] = rowsByScope[index++]; return { json: async () => ({ results: { bindings: [{ rows: { value: String(rows) }, native: { value: String(native) }, version: { value: String(version) } }] } }) }; };
    console.log = value => captured.push(JSON.parse(value));
    process.argv = ['node', 'p9', 'unused-report.json', '--lane', 'qlever'];
    const code = probe.replace("import fs from 'node:fs';", 'const fs = globalThis.__CX_VJ01_R2_FS__;').replace(/import postgres from .*?;\n/, '');
    await import(`data:text/javascript;base64,${Buffer.from(code + `\n// ${name}`).toString('base64')}`);
    diagnostic.push({ name, mockedScopeCounts: rowsByScope, actualProbeOutput: captured[0] });
    assert.equal(captured[0].encoding, 'a0');
  }
} finally { console.log = originalLog; process.argv = originalArgv; globalThis.fetch = originalFetch; }
const out = { source: execFileSync('git', ['rev-parse', '0d9a860'], { encoding: 'utf8' }).trim(), hashes: Object.fromEntries(Object.entries(sources).map(([f,s]) => [f, sha(s)])), commands, effectiveChildMode,
  observations: [
    'The four gate invocations propagate the explicit environment; cleanEnv does not strip TRIPLEX_COMMIT_ENCODING.',
    'Gate result.profile.env contains QLever planner settings, not a snapshot of the child environment.',
    'Neither heavy.mjs nor gate.mjs writes the separately required encoding launch envelope.',
    'No listed command collects complete per-scope raw source-log/RDF rows or hashes those with the launch envelope.',
    'P9 emits aggregate counts and an inferred label, not the required raw records; report lines 113-120 correctly disclaim sufficiency.',
    'These are mocked diagnostic examples, not live engine evidence or semantic qualification.'
  ], diagnostic };
fs.writeFileSync(`${root}/recipe-audit.json`, JSON.stringify(out, null, 2) + '\n');
console.log(JSON.stringify(out, null, 2));
