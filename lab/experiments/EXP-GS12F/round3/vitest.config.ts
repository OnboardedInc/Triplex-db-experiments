import { defineConfig } from "vitest/config";
import { workspaceAliases } from "../../../../vitest.workspace-aliases";
export default defineConfig({
  resolve: { alias: workspaceAliases() },
  test: {
    include: [
      "lab/experiments/EXP-GS12F/round3/*.test.ts",
      "test/integration/test/value-domains.test.ts",
    ],
    maxWorkers: 1,
    testTimeout: 120_000,
  },
});
