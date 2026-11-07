import { defineConfig } from "vitest/config";
import { workspaceAliases } from "../../vitest.workspace-aliases";

export default defineConfig({
  resolve: {
    alias: workspaceAliases(),
  },
  test: {
    include: ["test/**/*.test.ts"],
    exclude: ["test/**/*.workerd.test.ts"],
  },
});
