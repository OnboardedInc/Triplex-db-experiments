// [CX-VRQ01] Why: rerun the original test file using existing pinned tools, with all new writes here.
// Rejected: dependency install (unnecessary for this offline review).
import { fileURLToPath } from 'node:url';
export default {
  cacheDir: fileURLToPath(new URL('./cache/vite', import.meta.url)),
  resolve: { alias: [{ find: '@triplex-build/triplex/content', replacement: fileURLToPath(new URL('./content-shim.mjs', import.meta.url)) }] },
  test: { include: ['packages/testkit/test/route-equivalence.test.ts'], fileParallelism: false },
};
