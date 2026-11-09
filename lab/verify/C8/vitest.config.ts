import { defineConfig } from "vitest/config";
import { workspaceAliases } from "../../../vitest.workspace-aliases.ts";

// [CX-VC8] Why: source-bound reviewer probes without package edits or builds. Rejected: built exports (absent in this worktree).
export default defineConfig({
  resolve: { alias: workspaceAliases() },
  test: {
    include: ["lab/verify/C8/*.test.ts"],
    maxWorkers: 1,
    fileParallelism: false,
    testTimeout: 30_000,
  },
});
