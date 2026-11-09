import { defineConfig } from "vitest/config";
import { workspaceAliases } from "../../../../vitest.workspace-aliases.ts";
// [CX-VNSR-R3] Why: test current source and the independent adapted round-2 cases. Rejected: running historical tests that deliberately expect the old defects.
export default defineConfig({
  resolve: { alias: workspaceAliases() },
  test: {
    environment: "node",
    include: [
      "lab/verify/NSR/round3/reviewer-storage.test.ts",
      "packages/host/test/feed/nsr.test.ts",
      "packages/host/test/feed/nsr-target.test.ts",
      "packages/host/test/feed/nsr-mounts.test.ts",
    ],
  },
});
