// @ts-nocheck -- [EXP-CHECKJS-R2] dynamic collections, runtime Buffer-to-JSON coercion, or validated values without static narrowing. Binding errors remain checked by lab/bin/checkjs.mjs.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { deltaCount } from "./delta-count.mjs";
const root = process.argv[2],
  output = process.argv[3];
if (!root || !output || fs.existsSync(output)) throw Error("root and new output required");
const sha = (b) => createHash("sha256").update(b).digest("hex");
const json = (f) => JSON.parse(fs.readFileSync(f));
let cells = 0,
  comparisons = 0,
  snapshots = 0;
for (const arm of ["M", "U"]) {
  const dir = path.join(root, `grid-${arm}-attempt2`),
    binding = json(path.join(dir, "binding.json"));
  assert.equal(binding.owner.holder, "CX-QG1");
  assert.equal(binding.owner.slot, "s1");
  assert.equal(
    binding.sources["grid.mjs"],
    sha(fs.readFileSync(path.join(root, "source-attempt2/grid.mjs"))),
  );
  const list = json(path.join(dir, "summary.json"));
  assert.equal(list.length, 8);
  for (const c of list) {
    assert.equal(c.binding.containerId, binding.containerId);
    assert.equal(c.c8.status, 0);
    assert.equal(c.p4.status, 0);
    const p4 = json(path.join(dir, `${c.label}-p4.json`));
    assert.equal(p4.sample.length, 20);
    assert.ok(p4.sample.every((x) => x.contentEqual && x.expectedSha256 === x.actualSha256));
    comparisons += 20;
    for (const side of ["before", "after"]) {
      const file = path.join(dir, `${c.label}-${side}.update-triples`);
      const raw = fs.existsSync(file)
        ? fs.readFileSync(file)
        : zlib.gunzipSync(fs.readFileSync(file + ".gz"));
      assert.deepEqual(deltaCount(raw), c[side].deltaTriples);
      snapshots++;
    }
    cells++;
  }
  const f = json(path.join(dir, "f05.json"));
  assert.deepEqual(f.before.data.res, [['"after"']]);
  assert.deepEqual(f.after.data.res, [['"after"']]);
  assert.ok(f.before.id < f.after.id);
  for (const r of [f.before, f.after]) {
    const meta = json(path.join(dir, `${r.id}.request.json`)),
      raw = fs.readFileSync(path.join(dir, `${r.id}.response`));
    assert.equal(meta.status, 200);
    assert.equal(meta.sha256, sha(raw));
    assert.ok(meta.at >= binding.owner.createdAt);
    assert.deepEqual(json(path.join(dir, `${r.id}.response`)).res, [['"after"']]);
  }
}
// [EXP-QG1] Why: replay content and binding checks on retained bytes from the named
// attempts. Rejected: promoting consistent artifacts to semantic/P4 acceptance.
fs.writeFileSync(
  output,
  JSON.stringify(
    {
      at: new Date().toISOString(),
      cells,
      c8ControlExitsZero: cells,
      sameGeneratorComparisons: comparisons,
      snapshotCountsReplayed: snapshots,
      f05ExactPairs: 2,
      measuredRunnerPreimagesMatch: true,
      qualified: false,
      verdict: "DIAGNOSTIC artifact integrity only; no performance or independent semantic PASS",
    },
    null,
    2,
  ),
);
console.log(JSON.stringify({ cells, comparisons, snapshots, qualified: false }));
