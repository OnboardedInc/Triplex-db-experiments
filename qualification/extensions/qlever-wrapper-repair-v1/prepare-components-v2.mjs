// @ts-nocheck -- [EXP-CHECKJS] runtime-built or optional package modules absent from this standalone project; runtime coercion (Buffer JSON), dynamic collections, or validated inputs without static narrowing. Binding errors remain checked by lab/bin/checkjs.mjs.
/** Reporter-only successor metadata; all test and SDK/application bytes stay. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pin, exclusiveJson } from '../../../.runtime/experiments/xtdb-identity-handoff-v1/loop-v2/common.mjs';
import { openContext } from '../../devloop/state.mjs';
import { validateManifest } from '../../devloop/scheduler.mjs';
import { preserveInputPreimages } from '../../devloop/preimages.mjs';
const root = path.resolve(import.meta.dirname, '../../..');
const output = 'qualification/component-jobs/qlever-wrapper-runtime-components-v2';
const manifest = JSON.parse(await readFile(path.join(root, 'qualification/component-jobs/qlever-wrapper-runtime-components-v1/manifest.json')));
manifest.id = 'qlever-wrapper-runtime-components-v2';
manifest.command.argv[2] = 'qualification/extensions/qlever-wrapper-repair-v1/runtime-components-v2.mjs';
manifest.hypothesis = 'Select explicit TAP for the identical16 pure tests; preserve the first default-reporter summary guard failure and unchanged SDK/application/runtime envelopes.';
for (const [file, role] of [[manifest.command.argv[2], 'runner'], ['qualification/extensions/qlever-wrapper-repair-v1/prepare-components-v2.mjs', 'source'],
  ['qualification/evidence/qlever-wrapper-runtime-components-v1-first-failure.json', 'recipe'], ['.devloop/jobs/qlever-wrapper-runtime-components-v1/attempts/0001/terminal.json', 'recipe']]) {
  const entry = await pin(root, file); assert(!manifest.inputs.some(row => row.path === entry.path));
  manifest.inputs.push({ path: entry.path, role, sha256: entry.sha256 });
}
const context = await openContext(root); validateManifest(manifest, context.policy);
const manifestPin = await exclusiveJson(root, `${output}/manifest.json`, manifest);
const preimages = await preserveInputPreimages(context, manifest.inputs, `${output}/prepared-source-preimages.json`);
process.stdout.write(JSON.stringify({ manifest: manifestPin, preimages }) + '\n');
