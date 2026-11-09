import { defineConfig } from "vitest/config";
import path from "node:path";
import fs from "node:fs";
import { createRequire } from "node:module";

// [CX-VDF01-R4] Why: the current broker's public runtime imports must use its pinned core revision.
// Rejected: resolving missing newer exports against the older reviewer checkout or changing imported source.
const root = path.resolve(import.meta.dirname, "../../..");
const core = path.join(import.meta.dirname, "round4/sources/broker/packages/core");
const manifest = JSON.parse(fs.readFileSync(path.join(core, "package.json"), "utf8"));
const alias = Object.entries(manifest.exports).map(([key, target]: [string, any]) => ({
  find: key === "." ? "@triplex-build/triplex" : `@triplex-build/triplex/${key.slice(2)}`,
  replacement: path.join(core, (typeof target === "string" ? target : target.import ?? target.default ?? target.types).replace("./dist/", "src/").replace(/\.js$/, ".ts")),
}));
alias.sort((a, b) => b.find.length - a.find.length);
alias.push({ find: "postgres", replacement: createRequire(path.join(root, "packages/xtdb/package.json")).resolve("postgres") });
export default defineConfig({ resolve: { alias }, test: { environment: "node", testTimeout: 30000 } });
