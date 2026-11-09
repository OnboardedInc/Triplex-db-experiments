import { defineConfig } from "vitest/config";
import { workspaceAliases } from "../../../../vitest.workspace-aliases";
export default defineConfig({
  resolve: { alias: workspaceAliases() },
  test: {
    include: ["lab/verify/GS12F/round3/live-control.ts"],
    maxWorkers: 1,
    testTimeout: 120000,
  },
});
