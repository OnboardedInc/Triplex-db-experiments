import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { registerHooks } from 'node:module';
// [CX-VFD01-R2] Why: execute immutable Git b60cce1e preimages without changing either checkout.
// Rejected: using mutable builder source or dist from a different build.
export const { subject, base } = JSON.parse(fs.readFileSync(new URL('./subject.json', import.meta.url)));
const root = pathToFileURL(subject + '/');
const aliases = {
  '@triplex-build/triplex/feed': 'packages/core/src/feed/index.ts',
  '@triplex-build/triplex-host/feed': 'packages/host/src/feed/index.ts',
  '@triplex-build/triplex-testkit/feed': 'packages/testkit/src/feed/index.ts',
};
registerHooks({ resolve(s, c, next) {
  if (aliases[s]) return { url: new URL(aliases[s], root).href, shortCircuit: true };
  if (s.startsWith('.') && s.endsWith('.js') && c.parentURL?.startsWith(root.href)) {
    const p = new URL(s.slice(0, -3) + '.ts', c.parentURL);
    if (fs.existsSync(p)) return { url: p.href, shortCircuit: true };
  }
  return next(s, c);
} });
