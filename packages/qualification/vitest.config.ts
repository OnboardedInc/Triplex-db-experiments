import { defineConfig } from "vitest/config";
import { workspaceAliases } from "../../vitest.workspace-aliases.ts";
export default defineConfig({
  resolve: { alias: workspaceAliases() },
  test: { testTimeout: 240_000, maxWorkers: 1, fileParallelism: false },
});
