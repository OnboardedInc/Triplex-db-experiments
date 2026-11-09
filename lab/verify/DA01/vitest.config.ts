import { defineConfig } from 'vitest/config';
import { workspaceAliases } from '../../../vitest.workspace-aliases.js';
// [CX-VDA01] Why: execute this worktree's source and tests without editing the candidate. Rejected: importing a sibling's source or trusting its dist.
export default defineConfig({
  resolve: { alias: workspaceAliases() },
  test: { include: ['lab/verify/DA01/*.test.ts', 'packages/datomic/test/*.test.ts'], fileParallelism: false, testTimeout: 60000 },
});
