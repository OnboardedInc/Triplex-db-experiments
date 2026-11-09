import { defineConfig } from "vitest/config";
import { workspaceAliases } from "../../../../vitest.workspace-aliases.ts";
// [CX-VNSR-R2] Why: run only the scoped round-2 controls against public source aliases. Rejected: running the old test that intentionally asserted the original symlink defect.
export default defineConfig({
  resolve: { alias: workspaceAliases() },
  test: {
    environment: "node",
    include: [
      "lab/verify/NSR/round2/*.test.ts",
      "packages/host/test/feed/nsr.test.ts",
      "packages/host/test/feed/nsr-target.test.ts",
    ],
  },
});
