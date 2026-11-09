import { defineConfig } from "vitest/config";
import { workspaceAliases } from "../../../../vitest.workspace-aliases.ts";
export default defineConfig({
  resolve: { alias: workspaceAliases() },
  test: {
    root: import.meta.dirname,
    include: ["retention.test.ts"],
    maxWorkers: 1,
    testTimeout: 180000,
  },
});
