// [CX-VHS01-R3] Why: reproduce the seed's mismatched runtime index from frozen source with explicit build entry orders. Rejected: assuming an unreproduced hash has an innocuous cause.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { build } from "tsdown";
const out = process.env.VHS01_OUT;
if (!out) throw Error("bound runner required");
const cwd = process.cwd();
const entries = execFileSync("rg", ["--files", "packages/core/src"], { encoding: "utf8" })
  .trim()
  .split("\n")
  .filter((p) => p.endsWith(".ts"))
  .map((p) => p.slice("packages/core/".length))
  .sort();
const orders = [
  undefined,
  undefined,
  undefined,
  undefined,
  entries.slice().reverse(),
  entries,
  entries
    .slice()
    .sort(
      (a, b) =>
        Number(!a.startsWith("src/runtime/")) - Number(!b.startsWith("src/runtime/")) ||
        a.localeCompare(b),
    ),
];
const result = [];
process.chdir(path.join(cwd, "packages/core"));
for (let n = 0; n < orders.length; n++) {
  const dir = path.join(out, "order-" + n);
  await build({
    config: "tsdown.config.ts",
    ...(orders[n] ? { entry: orders[n] } : {}),
    outDir: dir,
    ...(n === 0 ? {} : { dts: false }),
  });
  const hashes = Object.fromEntries(
    ["runtime/Runtime.js", "runtime/index.js"].map((p) => [
      p,
      createHash("sha256")
        .update(fs.readFileSync(path.join(dir, p)))
        .digest("hex"),
    ]),
  );
  result.push({ n, entries: orders[n], hashes });
  fs.writeFileSync(path.join(out, "rebuilds.json"), JSON.stringify(result, null, 2));
  if (
    hashes["runtime/index.js"] ===
    "5fb7784a60c25e491950b1947ccb198e91c04e524b33e58cb34c67e430ff9660"
  )
    break;
}
console.log(JSON.stringify(result.map(({ n, hashes }) => ({ n, hashes }))));
