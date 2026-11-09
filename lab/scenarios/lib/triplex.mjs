// @ts-nocheck -- [EXP-CHECKJS-R2] unannotated dynamic parameters. Binding errors remain checked by lab/bin/checkjs.mjs.
// lab/scenarios/lib/triplex.mjs: load Triplex's built public dist from lab/ (outside the pnpm workspace).
//
// [EXP-W01] Why: lab/ is not a workspace package, so bare specifiers do not resolve here. We import the
// exact built `dist` files the GS gate hashes (same rule as packages/qualification: public exports only,
// never package sources). effect is resolved from packages/qualification, the package that already depends
// on it, so one effect instance is shared with the runtime.
// Rejected: adding lab/ to the workspace (changes pnpm-lock.yaml, a repo-wide input); tsx (another loader
// whose transpiled bytes the receipt would not bind).
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const REPO = path.resolve(import.meta.dirname, '../../..');

function exportTarget(pkgDir, subpath = '.') {
  const manifest = JSON.parse(fs.readFileSync(path.join(pkgDir, 'package.json'), 'utf8'));
  const entry = manifest.exports?.[subpath];
  const target = typeof entry === 'string' ? entry : (entry?.import ?? entry?.default);
  if (!target) throw new Error(`${manifest.name} has no import export for ${subpath}`);
  return pathToFileURL(path.resolve(pkgDir, target)).href;
}

const pkg = dir => path.join(REPO, 'packages', dir);


export async function loadTriplex() {
  const effectDir = fs.realpathSync(path.join(REPO, 'packages/qualification/node_modules/effect'));
  const [core, runtime, effect, qualification] = await Promise.all([
    import(exportTarget(pkg('core'))),
    import(exportTarget(pkg('core'), './runtime')),
    import(exportTarget(effectDir)),
    import(exportTarget(pkg('qualification'))),
  ]);
  return { core, runtime, effect, Effect: effect.Effect, Exit: effect.Exit, Cause: effect.Cause, Layer: effect.Layer, ManagedRuntime: effect.ManagedRuntime, qualification };
}

/** The dist files the scenario runner imports (the gate hashes these via its build manifest). */
export const DIST_ENTRIES = ['packages/core/dist/index.js', 'packages/core/dist/runtime/index.js', 'packages/qualification/dist/index.js'];
