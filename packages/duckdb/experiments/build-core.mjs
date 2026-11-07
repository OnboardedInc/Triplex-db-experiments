import { spawnSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Reuse the archived native C++ build, strict FP flags and metadata writer.
// Inspiration/rationale: vendor/duckdb-temporal/runtime/build_native.py and
// wiki/research.md. A fresh compile is not a transferred historical PASS.
const root = resolve(fileURLToPath(new URL('../../..', import.meta.url)));
const runtime = join(root, 'vendor/duckdb-temporal/runtime');
const python = join(root, '.local/tools/python-duckdb-2.0.0/bin/python3');
const result = spawnSync(python, ['build_native.py'], { cwd: runtime, env: process.env, stdio: 'inherit' });
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
const manifest = JSON.parse(await fs.readFile(join(runtime, 'build/artifact.json'), 'utf8'));
if (manifest.engine !== '2.0.0' || manifest.abi !== 'C_STRUCT_UNSTABLE') throw new Error('Unexpected native build identity');
await fs.copyFile(join(runtime, 'build/artifact.json'), join(process.env.TRIPLEX_RUN_ARTIFACTS, 'native-core-artifact.json'));
await fs.writeFile(join(process.env.TRIPLEX_RUN_ARTIFACTS, 'result.json'), JSON.stringify({ engine: manifest.engine, abi: manifest.abi, extensionVersion: manifest.extension_version }) + '\n', { flag: 'wx' });
