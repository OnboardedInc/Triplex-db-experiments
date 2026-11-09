import { defineConfig } from "vitest/config";
import { workspaceAliases } from "../../../../vitest.workspace-aliases";
export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^foundationdb$/,
        replacement: new URL("./foundationdb-stub.ts", import.meta.url).pathname,
      },
      ...workspaceAliases(),
    ],
  },
  test: {
    include: [
      "lab/experiments/EXP-GS12F/round4/*.test.ts",
      "test/integration/test/value-domains.test.ts",
    ],
    maxWorkers: 1,
    testTimeout: 120000,
  },
});
