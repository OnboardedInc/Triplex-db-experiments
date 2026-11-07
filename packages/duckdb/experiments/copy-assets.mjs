import { copyFile, mkdir, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const packageRoot = fileURLToPath(new URL('..', import.meta.url));
await mkdir(`${packageRoot}/dist`, { recursive: true });
// Adapted transport and projection files are runtime inputs, not bundled sibling
// sources. Retain their bytes and declarations for portable package execution.
for (const name of await readdir(`${packageRoot}/src`)) {
  if (/\.(mjs|mts|sql)$/.test(name))
    await copyFile(`${packageRoot}/src/${name}`, `${packageRoot}/dist/${name}`);
}
