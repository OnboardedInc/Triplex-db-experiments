// [EXP-P5-R2] Why: execute exact reviewed-branch harness preimages in this owned worktree without editing its owner. Rejected: importing mutable sibling sources or claiming an unrun stack.
import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import ts from "typescript";
const ref = process.argv[2] ?? "exp/RQ01-route-equivalence";
const head = execFileSync("git", ["rev-parse", ref], { encoding: "utf8" }).trim();
const dir = path.resolve("runs/P5/r2-rq01-" + head.slice(0, 8) + "-" + Date.now());
fs.mkdirSync(dir, { recursive: true });
const sources = {};
const queue = ["route-coverage", "route-equivalence", "offline-route-fixtures"],
  seen = new Set();
for (const name of queue) {
  if (seen.has(name)) continue;
  seen.add(name);
  const file = `packages/testkit/src/${name}.ts`,
    bytes = execFileSync("git", ["show", `${head}:${file}`]);
  for (const match of bytes.toString().matchAll(/from\s+["']\.\/([^"']+)\.js["']/g))
    if (!seen.has(match[1])) queue.push(match[1]);
  fs.writeFileSync(path.join(dir, name + ".ts"), bytes);
  sources[file] = createHash("sha256").update(bytes).digest("hex");
  const result = ts.transpileModule(bytes.toString(), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
    fileName: name + ".ts",
  });
  fs.writeFileSync(path.join(dir, name + ".js"), result.outputText);
}
fs.writeFileSync(
  path.join(dir, "index.js"),
  'export * from "./route-equivalence.js";\nexport * from "./offline-route-fixtures.js";\n',
);
fs.mkdirSync(path.join(dir, "node_modules/@triplex-build"), { recursive: true });
const link = path.join(dir, "node_modules/@triplex-build/triplex");
if (!fs.existsSync(link)) fs.symlinkSync(path.resolve("packages/core"), link, "dir");
const digestFile = (p) => createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const routeSources = Object.fromEntries(
  [
    "lab/bench/test/p5-g6.stacked.ts",
    "lab/bench/lib/memory.ts",
    "lab/bench/lib/w0-world.ts",
    "pnpm-lock.yaml",
    ...fs
      .readdirSync("packages/w0/dist")
      .filter((f) => f.endsWith(".js"))
      .map((f) => "packages/w0/dist/" + f),
  ].map((f) => [f, digestFile(f)]),
);
const test = spawnSync(
  process.execPath,
  ["--experimental-strip-types", "--test", "lab/bench/test/p5-g6.stacked.ts"],
  {
    env: { ...process.env, TX2_RQ01_HARNESS_URL: pathToFileURL(path.join(dir, "index.js")).href },
    encoding: "utf8",
    maxBuffer: 16 << 20,
  },
);
const sourceStable = Object.entries(routeSources).every(([f, h]) => digestFile(f) === h);
fs.writeFileSync(path.join(dir, "test.tap"), test.stdout + test.stderr);
fs.writeFileSync(
  path.join(dir, "stack.json"),
  JSON.stringify(
    {
      head,
      sources,
      routeSources,
      sourceStable,
      node: process.version,
      testSourceSha256: createHash("sha256")
        .update(fs.readFileSync("lab/bench/test/p5-g6.stacked.ts"))
        .digest("hex"),
      compilerVersion: ts.version,
      compiled: Object.fromEntries(
        fs
          .readdirSync(dir)
          .filter((f) => f.endsWith(".js"))
          .map((f) => [
            f,
            createHash("sha256")
              .update(fs.readFileSync(path.join(dir, f)))
              .digest("hex"),
          ]),
      ),
      exit: test.status,
      signal: test.signal,
    },
    null,
    2,
  ),
);
process.stdout.write(test.stdout + test.stderr);
process.exitCode = sourceStable ? (test.status ?? 1) : 1;
