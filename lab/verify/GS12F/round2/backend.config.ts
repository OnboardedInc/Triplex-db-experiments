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
    include: ["lab/verify/GS12F/round2/backend-boundaries.test.ts"],
    maxWorkers: 1,
    testTimeout: 120_000,
  },
});
