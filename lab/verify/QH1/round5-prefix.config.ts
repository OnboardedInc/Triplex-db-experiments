// [CX-VQH1-R5] Why: replay semantic closure assertions on exact pre-hook adapters, without changing product files on disk.
// Rejected: a negative control that fails only because pullPosition is missing, before checking the returned graph.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { defineConfig } from "vitest/config";
import { workspaceAliases } from "../../../vitest.workspace-aliases.ts";
const targets = [
  "packages/xtdb/src/XtdbStorageAdapter.ts",
  "packages/datomic/src/DatomicStorageAdapter.ts",
  "packages/qlever/src/QleverStorageAdapter.ts",
];
export default defineConfig({
  resolve: { alias: workspaceAliases() },
  plugins: [
    {
      name: "cx-vqh1-r5-pre-hook-control",
      enforce: "pre",
      transform(_code, id) {
        const target = targets.find((p) => path.resolve(p) === id.split("?")[0]);
        if (!target) return;
        const code = execFileSync(
          "git",
          ["show", "febcd098cf52b8c7bbf3956df46741b985d42550:" + target],
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
    root: import.meta.dirname,
    include: ["round5-review.test.ts"],
    maxWorkers: 1,
    fileParallelism: false,
  },
});
