// [CX-VINTQ] Why: review-only probes resolve this checkout's public package exports. Rejected: importing another worktree's implementation.
import { defineConfig } from "vitest/config";
import { workspaceAliases } from "../../../vitest.workspace-aliases.ts";
export default defineConfig({
  resolve: { alias: workspaceAliases() },
  test: {
    root: import.meta.dirname,
    include: ["*.test.ts"],
    maxWorkers: 1,
    fileParallelism: false,
    testTimeout: 30000,
  },
});
