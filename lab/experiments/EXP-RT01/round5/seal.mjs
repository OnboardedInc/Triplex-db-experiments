import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
const dir = import.meta.dirname,
  root = path.resolve(dir, "../../../.."),
  experiment = path.dirname(dir),
  durable = "/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-RT01/round5";
const hash = (p) => createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const read = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const test = read(path.join(durable, "test1/execution.json")),
  pins = read(path.join(durable, "pins1/inventory.json"));
// [EXP-RT01] Why: a small test repair still needs current, content-checked evidence. Rejected: inheriting the earlier offline verdict or trusting a zero exit alone.
assert.equal(test.exit, 0);
assert.equal(test.contentMatches, true);
assert.equal(test.sourceUnchanged, true);
for (const kind of ["stdout", "stderr"])
  assert.equal(hash(path.join(durable, "test1", kind + ".txt")), test[kind + "Sha256"]);
assert.match(
  fs.readFileSync(path.join(durable, "test1/stdout.txt"), "utf8"),
  /Tests\s+2 passed \(2\)/,
);
for (const [p, h] of Object.entries(test.before)) {
  assert.equal(test.after[p], h, p);
  assert.equal(hash(path.join(root, p)), h, p);
}
const git = (...args) => execFileSync("git", args, { cwd: root, maxBuffer: 32 * 1024 ** 2 });
const digest = (b) => createHash("sha256").update(b).digest("hex");
assert.equal(
  digest(git("show", pins.main + ":lab/acceptance/obligations.json")),
  pins.authoritySha256,
);
assert.equal(pins.paths.length, 243);
assert.equal(pins.directPinEntries, 302);
assert.equal(pins.expandedPinEntries, 602);
for (const p of pins.paths) {
  const file = path.join(root, p.path);
  assert.equal(fs.existsSync(file) ? hash(file) : null, p.branchSha256, p.path);
  assert.equal(digest(git("show", pins.main + ":" + p.path)), p.mainSha256, p.path);
}
const changed = pins.paths.filter((p) => p.classification === "RT01-change");
assert.deepEqual(
  changed.map((p) => p.path),
  ["packages/testkit/src/index.ts"],
);
assert.equal(git("diff", pins.fork, "--", "lab/acceptance", "lab/oracles/replay").length, 0);
const result = {
  observedAt: new Date().toISOString(),
  head: test.head,
  context: test.context,
  tests: 2,
  sourceUnchanged: true,
  main: pins.main,
  mainContractVersion: pins.mainContractVersion,
  directPinEntries: pins.directPinEntries,
  expandedPinEntries: pins.expandedPinEntries,
  pinnedPaths: pins.paths.length,
  RT01PinChanges: changed,
  upstreamOnlyPinDifferences: pins.paths.filter(
    (p) => p.classification === "upstream-only-divergence",
  ).length,
  liveQualified: false,
  contractChanged: false,
};
fs.writeFileSync(path.join(dir, "RESULT.json"), JSON.stringify(result, null, 2) + "\n");
const files = [];
const visit = (p) => {
  for (const item of fs.readdirSync(p, { withFileTypes: true })) {
    const file = path.join(p, item.name);
    if (item.isDirectory()) visit(file);
    else files.push(file);
  }
};
visit(durable);
files.sort();
fs.writeFileSync(
  path.join(dir, "DURABLE-SHA256SUMS"),
  files.map((p) => `${hash(p)}  ${p}`).join("\n") + "\n",
);
fs.writeFileSync(
  path.join(dir, "DURABLE-INDEX.json"),
  JSON.stringify(
    {
      root: durable,
      files: files.length,
      bytes: files.reduce((n, p) => n + fs.statSync(p).size, 0),
      attempts: ["test1", "pins1"],
      retention:
        "All raw outputs retained outside Git; targeted tests and read-only immutable-main pin inventory",
    },
    null,
    2,
  ) + "\n",
);
const listed = [
  ...new Set(
    git("ls-files", "-co", "--exclude-standard", "lab/experiments/EXP-RT01")
      .toString()
      .trim()
      .split("\n"),
  ),
]
  .filter(Boolean)
  .sort();
const sums = (base, items) =>
  fs.writeFileSync(
    path.join(base, "SHA256SUMS"),
    items
      .map((p) => `${hash(path.join(root, p))}  ${path.relative(base, path.join(root, p))}`)
      .join("\n") + "\n",
  );
for (const p of listed) assert.ok(fs.statSync(path.join(root, p)).size <= 1000000, p);
sums(
  dir,
  listed.filter(
    (p) => p.startsWith("lab/experiments/EXP-RT01/round5/") && !p.endsWith("/SHA256SUMS"),
  ),
);
sums(
  experiment,
  [...new Set([...listed, "lab/experiments/EXP-RT01/round5/SHA256SUMS"])]
    .filter((p) => p !== "lab/experiments/EXP-RT01/SHA256SUMS")
    .sort(),
);
let verified = 0;
for (const [base, name] of [
  [dir, "SHA256SUMS"],
  [dir, "DURABLE-SHA256SUMS"],
  [experiment, "SHA256SUMS"],
])
  for (const line of fs.readFileSync(path.join(base, name), "utf8").trim().split("\n")) {
    const [h, p] = line.split("  ");
    assert.equal(hash(path.resolve(base, p)), h, p);
    verified++;
  }
console.log(
  JSON.stringify({
    tests: 2,
    pinnedPaths: 243,
    RT01PinChanges: 1,
    manifestEntriesVerified: verified,
  }),
);
