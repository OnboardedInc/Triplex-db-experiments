import { defineConfig } from "vitest/config";
import { workspaceAliases } from "../../../../vitest.workspace-aliases.ts";
export default defineConfig({
  resolve: {
    alias: [
      ...workspaceAliases(),
      {
        find: /.*packages\/w0\/dist\/index\.js$/,
        replacement: new URL("../../../../packages/w0/src/index.ts", import.meta.url).pathname,
      },
    ],
  },
  test: {
    root: import.meta.dirname,
    include: ["seed.test.ts"],
    maxWorkers: 1,
    fileParallelism: false,
    testTimeout: 600000,
  },
});
