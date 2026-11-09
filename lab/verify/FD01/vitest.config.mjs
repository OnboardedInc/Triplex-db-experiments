import { fileURLToPath } from 'node:url';
// [CX-VFD01] Why: reuse the installed Vitest binary, while all reviewed imports point here.
// Rejected: dependency install (unnecessary lock/cache writes for four dependency-free feed modules).
const at = (p) => fileURLToPath(new URL('../../../' + p, import.meta.url));
export default {
  root: at('.'),
  cacheDir: at('lab/verify/FD01/.cache'),
  resolve: { alias: [
    { find: /^vitest$/, replacement: '/Users/sam/projects/triplex-db-2/node_modules/vitest/dist/index.js' },
    { find: /^@triplex-build\/triplex\/feed$/, replacement: at('packages/core/src/feed/index.ts') },
    { find: /^@triplex-build\/triplex-host\/feed$/, replacement: at('packages/host/src/feed/index.ts') },
    { find: /^@triplex-build\/triplex-testkit\/feed$/, replacement: at('packages/testkit/src/feed/index.ts') },
  ] },
  test: { environment: 'node', include: ['packages/host/test/feed/feed.test.ts'] },
};
