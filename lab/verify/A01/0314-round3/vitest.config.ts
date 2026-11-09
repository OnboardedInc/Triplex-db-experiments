// [CX-VA01-0314] Why: resolve only this checkout's public exports. Rejected: another worktree's builds.
import { defineConfig } from "vitest/config";
import { workspaceAliases } from "../../../../vitest.workspace-aliases.ts";
export default defineConfig({
  resolve: { alias: workspaceAliases() },
  test: { root: import.meta.dirname, include: ["merged-value-domain.test.ts", "broker-envelope.test.ts"], maxWorkers: 1, fileParallelism: false, testTimeout: 30000 },
});
