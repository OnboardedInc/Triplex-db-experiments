// [CX-VP2Q-4-R7] Why: run the package's actual inventory gate with an isolated source-read mutation.
// Rejected: a CLI setupFiles switch (unsupported by the installed Vitest CLI).
import path from "node:path";
import { defineConfig } from "vitest/config";
import { workspaceAliases } from "../../../../vitest.workspace-aliases";
export default defineConfig({
  resolve: { alias: workspaceAliases() },
  test: {
    root: path.resolve(import.meta.dirname, "../../../../packages/qlever"),
    include: ["test/transport-code-inventory.test.ts"],
    setupFiles: [path.join(import.meta.dirname, "round7-guard-mutation.ts")],
    maxWorkers: 1,
    fileParallelism: false,
    testTimeout: 30000,
  },
});
