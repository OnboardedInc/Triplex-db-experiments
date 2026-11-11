import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
// [DX-V1-R2] Why: bind this round's reviewed source, rebuilt modules, fixtures and logs separately from round one.
// Rejected: overwriting historical bindings or borrowing an engine identity for an offline test.
const root = path.resolve(import.meta.dirname, "../../../.."),
  own = "lab/verify/DX-V1";
const outputDirectory = path.join(root, own, "round2");
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const name = path.join(dir, e.name);
    return e.isDirectory() ? walk(name) : [name];
  });
const records = (files) =>
  [...new Set(files)].sort().map((name) => {
    const file = path.resolve(root, name),
      bytes = fs.readFileSync(file);
    return {
      path: file.startsWith(root + "/") ? path.relative(root, file) : file,
      bytes: bytes.length,
      sha256: digest(bytes),
    };
  });
const sources = execFileSync(
  "git",
  [
    "ls-files",
    "packages/datomic/src",
    "packages/datomic/gateway/src/triplex/gateway",
    "packages/core/src",
    "packages/w0/src",
    "lab/bench",
    "lab/experiments/EXP-DX1/r3",
  ],
  { cwd: root, encoding: "utf8" },
)
  .trim()
  .split("\n");
const built = [
  "packages/core/dist",
  "packages/datomic/dist",
  "packages/qualification/dist",
  "packages/w0/dist",
]
  .flatMap((dir) => walk(path.join(root, dir)))
  .filter((f) => f.endsWith(".js"));
const pages = "/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-R1/tx2-dxr1-1000-d/pages";
const externalFiles = walk(pages).filter((f) =>
  /\/(request-\d+\.json|response-\d+\.json\.gz)$/.test(f),
);
for (const name of [
  "p4-footprint-b.log.gz",
  "p4-offline-rate-c.log.gz",
  "p4-gates-final.log.gz",
  "p4-reader-oracle.log.gz",
  "p4-review-option.log.gz",
])
  externalFiles.push(`/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-R3/${name}`);
const external = records(externalFiles),
  durable = "/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-V1/round2";
fs.mkdirSync(durable, { recursive: true });
const externalFile = path.join(durable, "recorded-inputs.json");
fs.writeFileSync(externalFile, JSON.stringify(external, null, 2) + "\n");
const externalIndex = { ...records([externalFile])[0], entries: external.length };
const output = {
  kind: "DX-V1-round2-offline-binding",
  createdAt: new Date().toISOString(),
  node: process.version,
  reviewedHead: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
  branch: execFileSync("git", ["branch", "--show-current"], { cwd: root, encoding: "utf8" }).trim(),
  engine: "none; no containers, engine slot or measurement lock; old logs are historical inputs",
  source: records(sources),
  built: records(built),
  external: externalIndex,
  dependencies: records([
    "pnpm-lock.yaml",
    "pnpm-workspace.yaml",
    "package.json",
    "node_modules/effect/package.json",
  ]),
  local: records(
    walk(path.join(root, own)).filter(
      (f) =>
        f !== path.join(root, own, "REPORT.md") &&
        f !== path.join(outputDirectory, "binding.json") &&
        f !== path.join(outputDirectory, "SHA256SUMS"),
    ),
  ),
};
fs.writeFileSync(
  path.join(outputDirectory, "binding.json"),
  JSON.stringify(output, null, 2) + "\n",
);
fs.writeFileSync(
  path.join(outputDirectory, "SHA256SUMS"),
  [...output.source, ...output.built, ...output.dependencies, externalIndex, ...output.local]
    .map((r) => `${r.sha256}  ${r.path}`)
    .join("\n") + "\n",
);
console.log(
  JSON.stringify({
    reviewedHead: output.reviewedHead,
    source: output.source.length,
    built: output.built.length,
    external: external.length,
    local: output.local.length,
  }),
);
