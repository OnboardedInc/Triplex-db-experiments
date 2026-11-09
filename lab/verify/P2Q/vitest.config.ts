// V-P2Q verifier tests. Run from the worktree root:
//   npx vitest run --config lab/verify/P2Q/vitest.config.ts            (offline checks)
//   V_P2Q_LIVE=1 QLEVER_URL=http://127.0.0.1:7070 npx vitest run --config lab/verify/P2Q/vitest.config.ts tests/live
import { defineConfig } from "vitest/config";
import { workspaceAliases } from "../../../vitest.workspace-aliases";
export default defineConfig({
  resolve: { alias: workspaceAliases() },
  test: {
    root: import.meta.dirname,
    include: ["tests/**/*.test.ts"],
    testTimeout: 600_000,
    hookTimeout: 120_000,
    maxWorkers: 1,
    fileParallelism: false,
  },
});
