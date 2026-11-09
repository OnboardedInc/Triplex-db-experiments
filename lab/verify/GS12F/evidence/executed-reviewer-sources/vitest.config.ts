import { defineConfig } from "vitest/config";
import { workspaceAliases } from "../../../vitest.workspace-aliases";
export default defineConfig({
  resolve: { alias: workspaceAliases() },
  test: { include: ["lab/verify/GS12F/*.test.ts"], maxWorkers: 1, testTimeout: 120_000 },
});
