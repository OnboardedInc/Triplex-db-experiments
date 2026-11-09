// [EXP-RQ01-QA2] Why: execute the reviewed suites with locally owned caches and existing pinned external modules.
// Rejected: copying builder results or installing unrelated workspace dependencies.
import { fileURLToPath } from 'node:url';
import base from '../lane-a5.config';
export default {
  ...base,
  cacheDir: fileURLToPath(new URL('../cache/round2-suite', import.meta.url)),
  test: {
    include: ['packages/testkit/test/**/*.test.ts', 'packages/testkit/test/**/*.test.mjs', 'packages/xtdb/test/route-equivalence.test.ts', 'packages/qlever/test/route-equivalence.test.ts'],
    fileParallelism: false,
    maxWorkers: 1,
  },
};
