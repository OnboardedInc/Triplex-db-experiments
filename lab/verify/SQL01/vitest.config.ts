import { defineConfig } from "vitest/config";
import { workspaceAliases } from "../../../vitest.workspace-aliases.ts";
export default defineConfig({
  resolve: { alias: workspaceAliases() },
  test: { root: import.meta.dirname, include: ["*.test.ts"], maxWorkers: 1, fileParallelism: false, testTimeout: 180_000 },
});
