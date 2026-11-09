// [CX-VRQ01] Why: rerun both original offline lane entries against this checkout's source.
// Rejected: builder dist and default shared caches (would weaken source and ownership binding).
import { fileURLToPath } from 'node:url';
import { workspaceAliases } from '../../../vitest.workspace-aliases';
export default {
  cacheDir: fileURLToPath(new URL('./cache/lanes', import.meta.url)),
  resolve: { alias: workspaceAliases() },
  test: {
    include: ['packages/xtdb/test/route-equivalence.test.ts', 'packages/qlever/test/route-equivalence.test.ts'],
    fileParallelism: false,
    maxWorkers: 1,
  },
};
