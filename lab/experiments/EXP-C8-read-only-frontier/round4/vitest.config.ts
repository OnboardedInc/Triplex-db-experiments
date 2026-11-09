import { defineConfig } from "vitest/config";
import { workspaceAliases } from "../../../../vitest.workspace-aliases.ts";
// [EXP-C8-R4] Why: run source-level diagnostics with the existing dependency tree.
// Rejected: installed dist (cannot attribute queries to the requested revisions).
export default defineConfig({
  resolve: { alias: workspaceAliases() },
  test: {
    include: ["lab/experiments/EXP-C8-read-only-frontier/round4/*.test.ts"],
    maxWorkers: 1,
    fileParallelism: false,
    testTimeout: 600000,
  },
});
