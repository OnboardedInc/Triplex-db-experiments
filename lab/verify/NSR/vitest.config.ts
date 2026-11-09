import { defineConfig } from "vitest/config";
import { workspaceAliases } from "../../../vitest.workspace-aliases.ts";
// [CX-VNSR] Why: review source directly while keeping every test outside the candidate tree. Rejected: relying on a sibling worktree's built package bytes.
export default defineConfig({
  resolve: { alias: workspaceAliases() },
  test: {
    include: ["lab/verify/NSR/*.test.ts", "packages/host/test/feed/nsr.test.ts"],
    environment: "node",
  },
});
