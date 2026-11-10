import { defineConfig } from "vitest/config";
import { workspaceAliases } from "../../../../vitest.workspace-aliases.js";
export default defineConfig({
  resolve: { alias: workspaceAliases() },
  test: { testTimeout: 180000, maxWorkers: 1 },
});
