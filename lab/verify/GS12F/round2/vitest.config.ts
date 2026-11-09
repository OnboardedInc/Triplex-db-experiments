import { defineConfig } from "vitest/config";
import { workspaceAliases } from "../../../../vitest.workspace-aliases";
export default defineConfig({
  resolve: { alias: workspaceAliases() },
  test: {
    include: [
      "lab/verify/GS12F/round2/original-probes.test.ts",
      "lab/verify/GS12F/round2/independent.test.ts",
      "test/integration/test/value-domains.test.ts",
    ],
    maxWorkers: 1,
    testTimeout: 120_000,
  },
});
