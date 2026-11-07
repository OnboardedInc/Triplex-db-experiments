import { spawnSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Preserve the archived CPP owner and dedicated writer ABI; this is a fresh
// build against the exact selected headers/library, not a new engine port.
// Inspiration/rationale: runtime/build_owner_probe.py; wiki/research.md.
const root = resolve(fileURLToPath(new URL('../../..', import.meta.url)));
const runtime = join(root, 'vendor/duckdb-temporal/runtime');
const require = createRequire(join(runtime, 'adapter/build-deps/package.json'));
const engine = join(dirname(require.resolve('@duckdb/node-bindings-darwin-arm64/duckdb.node')), 'libduckdb.dylib');
const result = spawnSync(join(root, '.local/tools/python-duckdb-2.0.0/bin/python3'), [
  'build_owner_probe.py', '--source-dir', join(root, '.local/sources/duckdb-d54cbbe3df17e8e5ce68312f483b4155836112aa'), '--engine-library', engine,
], { cwd: runtime, env: process.env, stdio: 'inherit' });
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
const manifest = JSON.parse(await fs.readFile(join(runtime, 'build/owner_probe/artifact.json'), 'utf8'));
await fs.copyFile(join(runtime, 'build/owner_probe/artifact.json'), join(process.env.TRIPLEX_RUN_ARTIFACTS, 'native-owner-artifact.json'));
await fs.writeFile(join(process.env.TRIPLEX_RUN_ARTIFACTS, 'result.json'), JSON.stringify({ engine: manifest.engine, abi: manifest.abi, nodeVersion: manifest.native_writer.node_version, writerAbi: manifest.native_writer.abi }) + '\n', { flag: 'wx' });
