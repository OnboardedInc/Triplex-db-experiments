/** Retained pure-result review only. Never import the compiler/test or a backend. */
import assert from 'node:assert/strict';
import { readFile, readdir, lstat, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { openContext, readState, loadJobManifest } from '../devloop/state.mjs';
import { verifyAttempt } from '../devloop/evidence.mjs';
const root = path.resolve(import.meta.dirname, '../..'), sha = b => createHash('sha256').update(b).digest('hex');
const jobId = 'qlever-wrapper-text-lowering-pure-v1', context = await openContext(root);
const checked = await verifyAttempt(context, jobId, '0001');
assert.equal(checked.terminal.status, 'completed_verified_bytes');
assert.equal(checked.terminal.manifestSha256, '6e135f0a5adf494774fb35fe62290c085ba42830c4269785e44cedc6e52ddc68');
assert.equal(checked.terminal.cleanup.groupGone, true);
const state = await readState(context), manifest = await loadJobManifest(context, state.jobs[jobId]);
for (const entry of manifest.inputs) assert.equal(sha(await readFile(path.join(root, entry.path))), entry.sha256, entry.path);
const directory = path.join(root, '.devloop/jobs', jobId, 'attempts/0001'), artifacts = path.join(directory, 'artifacts');
const json = async p => JSON.parse(await readFile(p));
const expected = await readFile(path.join(root, manifest.evidence.checks[0].expectedInput));
assert.deepEqual(await readFile(path.join(artifacts, 'checks.json')), expected);
const tap = await readFile(path.join(artifacts, 'compiler-components.tap'), 'utf8');
for (const expression of [/# tests 12\n/, /# pass 12\n/, /# fail 0\n/, /# skipped 0\n/, /# cancelled 0\n/]) assert.match(tap, expression);
assert.equal((tap.match(/^ok \d+ -/gm) ?? []).length, 12);
assert.deepEqual(await json(path.join(artifacts, 'component-outcome.json')), { status: 0, signal: null });
assert.deepEqual(await json(path.join(artifacts, 'pure-transport.json')), { forbiddenCalls: 0, nativeCalls: 0 });
const emission = await json(path.join(artifacts, 'emission-before-import.json'));
assert.equal(emission.mode, 'PINNED_NODE24_TYPE_STRIP_NOT_TYPECHECK');
assert.equal(emission.publicResolution, 'NORMAL_EXISTING_Q_PACKAGE_ANCESTRY');
assert.equal(emission.installedLoader, false); assert.equal(emission.nativeOrServiceCalls, 0); assert.equal(emission.liveDistWrites, 0);
assert.equal(emission.emitted.length, 10);
const runtime = path.join(root, emission.runtimeRoot);
assert.equal(emission.runtimeRoot, 'packages/qlever/.artifacts/wrapper-lowering-v1/qlever-wrapper-text-lowering-pure-v1-0001');
const names = ['FamilyDomainDistinct.js','FamilyDomainMask.js','PersistedScalarSource.js','compiler.js','rdf.js'];
for (const branch of ['base','candidate']) assert.deepEqual((await readdir(path.join(runtime, branch))).sort(), names);
for (const entry of emission.emitted) {
  const file = path.join(root, entry.path), bytes = await readFile(file);
  assert(!(await lstat(file)).isSymbolicLink()); assert.equal(bytes.length, entry.bytes); assert.equal(sha(bytes), entry.sha256);
}
for (const name of names.filter(name => name !== 'compiler.js'))
  assert.deepEqual(await readFile(path.join(runtime, 'base', name)), await readFile(path.join(runtime, 'candidate', name)));
const patch = await readFile(path.join(root, '.artifacts/qlever-wrapper-text-lowering-v1/candidate.patch'), 'utf8');
const added = patch.split('\n').filter(line => line.startsWith('+') && !line.startsWith('+++')).map(line => line.slice(1)).join('\n') + '\n';
const base = await readFile(path.join(runtime, 'base/compiler.js'), 'utf8'), candidate = await readFile(path.join(runtime, 'candidate/compiler.js'), 'utf8');
assert.equal(candidate.split(added).length, 2, 'EXACT_ONE_REVIEWED_BRANCH');
assert.equal(candidate.replace(added, ''), base, 'NO_OTHER_EMITTED_EXECUTABLE_DELTA');
assert.equal(sha(await readFile(path.join(root, 'packages/qlever/src/compiler.ts'))), '9c60e5a7f491a92ffdb5f7d42cdf57d28dd01d6959066d2b4ed32850e14b012f');
const report = { format: 'triplex-independent-pure-renderer-actual-review/1', reviewer: 'xtdb-native-independent',
  status: 'CLEAR_ACTUAL12_ISOLATED_TEXT_WRAPPER_LOWERING_ONLY', jobId, terminalSha256: checked.terminalSha256,
  manifestSha256: checked.terminal.manifestSha256, currentDeclaredPins: manifest.inputs.length, currentDrift: [],
  retainedOutputs: checked.terminal.outputs.length, sourcePreimages: checked.sourcePreimages,
  actualCases: 12, actualEmissions: 10, emittedDelta: 'Exactly the reviewed raw-string wrapper branch in compiler.js; other4modules byte-identical',
  cleanup: checked.terminal.cleanup, sampledPeakProcessGroupRssBytes: checked.terminal.resources.sampledPeakProcessGroupRssBytes,
  limits: ['No compiler, test, hook, client or native API imported/invoked by this reviewer.',
    'Actual author Node24 strip-only renderer execution qualifies pure lowering shapes, not TypeScript typing or returned backend rows.',
    'Live compiler/source/public dist remains unchanged; native collation/string extension failures stay failed.',
    'Normal installed public Core resolution is declared/guarded, not copied immutable/whole OS runtime closure; global transport counter is not OS-level socket isolation.'],
  reviewerBackendCalls: 0, reviewerRendererInvocations: 0,
};
const output = path.join(root, 'qualification/reviews/qlever-wrapper-text-lowering-v1-actual-independent.json');
await writeFile(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
console.log(JSON.stringify({ output: path.relative(root, output), sha256: sha(await readFile(output)), terminalSha256: checked.terminalSha256, cases: 12, emissions: 10 }));
