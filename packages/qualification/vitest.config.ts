import { defineConfig } from "vitest/config";
import { workspaceAliases } from "../../vitest.workspace-aliases.ts";
export default defineConfig({
  resolve: { alias: workspaceAliases() },
  test: {
    // [EXP-000] Why: the default glob also collected node:test files (*.test.mjs under
    // experiments/, load/*.test.ts) and reported them as "No test suite found" failures.
    // load/*.test.ts and compare.test.mjs run under `node --test` (script "test:node").
    // experiments/**/*.test.mjs read homebase .devloop/ and .runtime/ artifacts that are
    // not in this archive, so no lab gate runs them.
    // Rejected: deleting them (load/ is reused for G7; experiments/ is homebase provenance).
    include: ["test/**/*.test.ts"],
    testTimeout: 240_000,
    maxWorkers: 1,
    fileParallelism: false,
  },
});
