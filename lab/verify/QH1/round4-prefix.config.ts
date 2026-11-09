// [CX-VQH1-R4] Why: rerun the builder's semantic regressions with exact pre-fix modules, without editing product files.
// Rejected: interpreting a green fixed-tree test as proof that its assertions detect F1.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { defineConfig } from "vitest/config";
import { workspaceAliases } from "../../../vitest.workspace-aliases.ts";

const targets = [
  "packages/core/src/store/TriplesLive.ts",
  "packages/core/src/kv/layers/KvTriplesLive.ts",
];
export default defineConfig({
  resolve: { alias: workspaceAliases() },
  plugins: [
    {
      name: "cx-vqh1-r4-pre-fix-control",
      enforce: "pre",
      transform(_code, id) {
        const target = targets.find((p) => path.resolve(p) === id.split("?")[0]);
        if (target === undefined) return;
        const code = execFileSync(
          "git",
          ["show", "7965540b857cc2ea063a79f227410edd0ef3fab2:" + target],
          { encoding: "utf8" },
        );
        fs.writeFileSync(
          path.join(path.dirname(process.env.QH1_RESULT!), path.basename(target)),
          code,
        );
        return { code, map: null };
      },
    },
  ],
  test: {
    include: [
      "lab/verify/QH1/reach-cut.test.ts",
      "packages/core/test/kv/layers/KvTriples.reach-cut.test.ts",
    ],
    maxWorkers: 1,
    fileParallelism: false,
    testTimeout: 120000,
  },
});
