import { defineConfig } from "vitest/config";
import { workspaceAliases } from "../../../vitest.workspace-aliases";
export default defineConfig({
  resolve: { alias: workspaceAliases() },
  test: {
    include: ["lab/experiments/EXP-GS12F/other-adapters.test.ts"],
    testTimeout: 120_000,
    maxWorkers: 1,
  },
});
