// [CX-VNSR] Why: check retained bytes and source identities independently of the builder's summary. Rejected: treating a copied PASS label as a fresh full G0 run.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
const evidence = "/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-NSR";
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const manifest = fs.readFileSync("lab/experiments/EXP-NSR/SHA256SUMS", "utf8").trim().split("\n");
let bytes = 0;
for (const line of manifest) {
  const match = /^([0-9a-f]{64})\s+(.+)$/.exec(line);
  assert.ok(match, line);
  const content = fs.readFileSync(path.join(evidence, match[2]));
  assert.equal(sha(content), match[1], match[2]);
  bytes += content.length;
}
const receiptFile = "lab/runs/G0/G0-qlever-20261109T073657Z-30e916.json";
const receipt = JSON.parse(fs.readFileSync(receiptFile));
assert.deepEqual(receipt.counts, {
  executed: 1220,
  pass: 1220,
  fail: 0,
  skip: 71,
  expectedSkip: 71,
  unexpectedSkip: 0,
});
assert.equal(receipt.git.head, "c194baf7626fcd4efcbcf6e997e116647557a231");
assert.equal(receipt.slot, null);
assert.equal(receipt.runKind, "diagnostic");
assert.equal(receipt.verdict, "PASS");
const rawDiff = execFileSync("git", ["diff", "--name-only", receipt.git.head, "05c26355"], {
  encoding: "utf8",
})
  .trim()
  .split("\n")
  .filter(Boolean);
assert.ok(
  rawDiff.every((p) => p.startsWith("lab/experiments/EXP-NSR/") || p.startsWith("lab/runs/G0/")),
);
let objects = 0;
function checkObject(v) {
  if (v && typeof v === "object") {
    if (typeof v.sha256 === "string" && typeof v.path === "string") {
      const local = path.join(evidence, "repository-runs/objects", v.sha256);
      const content = fs.readFileSync(local);
      assert.equal(sha(content), v.sha256, local);
      if (v.bytes !== undefined) assert.equal(content.length, v.bytes);
      objects++;
    }
    for (const child of Object.values(v)) checkObject(child);
  }
}
checkObject(receipt.objects);
const changed = execFileSync("git", ["diff", "--name-only", "d523f632", "05c26355"], {
  encoding: "utf8",
})
  .trim()
  .split("\n");
const pinHits = [];
const pinChanges = [];
for (const file of fs.readdirSync("lab/acceptance").filter((p) => p.endsWith(".json"))) {
  let data;
  try {
    data = JSON.parse(fs.readFileSync(path.join("lab/acceptance", file), "utf8"));
  } catch {
    continue;
  }
  function visit(v, pointer) {
    if (v && typeof v === "object")
      for (const [key, child] of Object.entries(v)) {
        if (changed.includes(key) && typeof child === "string" && /^[a-f0-9]{64}$/.test(child)) {
          const oldSha256 = sha(execFileSync("git", ["show", `d523f632:${key}`]));
          const newSha256 = sha(fs.readFileSync(key));
          pinHits.push({
            file,
            pointer: pointer + "/" + key,
            path: key,
            pin: child,
            oldSha256,
            newSha256,
          });
          if (oldSha256 !== newSha256) pinChanges.push(pinHits.at(-1));
        }
        visit(child, pointer + "/" + key);
      }
  }
  visit(data, "");
}
console.log(
  JSON.stringify(
    {
      historicalManifestVerified: manifest.length,
      bytes,
      receiptFile,
      receiptSha256: sha(fs.readFileSync(receiptFile)),
      counts: receipt.counts,
      runKind: receipt.runKind,
      slot: receipt.slot,
      referencedObjectsVerified: objects,
      sourceDiffAfterTestedHead: rawDiff,
      changedPinnedPaths: pinChanges,
      pinHits,
      limitation:
        "Historical builder evidence audit; not a fresh 1220-test execution or independent qualification.",
    },
    null,
    2,
  ),
);
