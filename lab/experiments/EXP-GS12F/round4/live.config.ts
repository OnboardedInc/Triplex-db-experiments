import { defineConfig } from "vitest/config";
import { workspaceAliases } from "../../../../vitest.workspace-aliases";
export default defineConfig({
  resolve: { alias: workspaceAliases() },
  test: {
    include: ["lab/experiments/EXP-GS12F/round4/live-control.ts"],
    maxWorkers: 1,
    testTimeout: 180000,
  },
});
