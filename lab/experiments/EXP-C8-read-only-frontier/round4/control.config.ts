import { defineConfig } from "vitest/config";
import { workspaceAliases } from "../../../../vitest.workspace-aliases.ts";
// [EXP-C8-R4] Why: observe the unmodified default eight-reader C8 control at wire level.
// Rejected: editing assertions, reducing readers or raising the 30-second timeout.
export default defineConfig({
  resolve: { alias: workspaceAliases() },
  test: {
    include: ["packages/qualification/test/c8-reads-never-write.test.ts"],
    setupFiles: ["lab/experiments/EXP-C8-read-only-frontier/round4/control-trace.ts"],
    maxWorkers: 1,
    fileParallelism: false,
    testTimeout: 600000,
  },
});
