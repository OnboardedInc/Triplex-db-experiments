// @ts-nocheck -- [CX-A01-040] Why: integration adds this runtime protocol or command fixture to checkJs; dynamic JSON/message fields lack static record types. Binding errors remain checked by lab/bin/checkjs.mjs. Rejected: excluding current executable code.
import { registerHooks } from 'node:module';
import { existsSync } from 'node:fs';
// [CX-VFD01] Why: exercise this exact worktree without installing or rebuilding sibling code.
// Rejected: importing the builder's dist (would verify a different, mutable artifact).
const root = new URL('../../../', import.meta.url);
const aliases = {
  '@triplex-build/triplex/feed': 'packages/core/src/feed/index.ts',
  '@triplex-build/triplex-host/feed': 'packages/host/src/feed/index.ts',
  '@triplex-build/triplex-testkit/feed': 'packages/testkit/src/feed/index.ts',
};
registerHooks({
  resolve(specifier, context, next) {
    if (aliases[specifier]) return { url: new URL(aliases[specifier], root).href, shortCircuit: true };
    if (specifier.startsWith('.') && specifier.endsWith('.js') && context.parentURL?.startsWith(root.href)) {
      const source = new URL(specifier.slice(0, -3) + '.ts', context.parentURL);
      if (existsSync(source)) return { url: source.href, shortCircuit: true };
    }
    return next(specifier, context);
  },
});
