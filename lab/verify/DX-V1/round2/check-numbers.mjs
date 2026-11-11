import fs from "node:fs";
import assert from "node:assert/strict";
import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
// [DX-V1-R2] Why: recompute reported ratios from the builder's exact logs without claiming a new timed run.
// Rejected: rerunning an unleased rate measurement or accepting rounded prose as the raw observation.
const directory = "/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-R3";
const inputs = [];
function read(name) {
  const file = `${directory}/${name}`,
    bytes = fs.readFileSync(file);
  inputs.push({
    path: file,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    bytes: bytes.length,
  });
  return gunzipSync(bytes)
    .toString()
    .split("\n")
    .filter((line) => line.startsWith("{"))
    .map((line) => JSON.parse(line));
}
const footprint = read("p4-footprint-b.log.gz")[0],
  rates = read("p4-offline-rate-c.log.gz");
assert.equal(footprint.subjects, 1000);
assert.equal(footprint.entities, 145138);
assert.equal(footprint.facts, 442196);
assert.equal(footprint.beforePackedBytes, 46211688);
assert.equal(footprint.afterPackedBytes, 67690600);
assert.equal(
  footprint.beforePackedBytesPerSubject,
  footprint.beforePackedBytes / footprint.subjects,
);
assert.equal(footprint.afterPackedBytesPerSubject, footprint.afterPackedBytes / footprint.subjects);
assert.equal(rates.length, 2);
for (const row of rates) {
  assert.equal(row.reads, 200000);
  assert.equal(row.differences, 0);
  assert(Math.abs(row.readsPerS - (row.reads * 1000) / row.wallMs) < 1e-9);
}
console.log(
  JSON.stringify(
    {
      inputs,
      footprint,
      packedIncreasePercent: (footprint.afterPackedBytes / footprint.beforePackedBytes - 1) * 100,
      packedPlusAccountedSidecars: footprint.afterPackedBytes + footprint.preparedSidecarBytes,
      rates,
      rateCostPercent: (1 - rates[1].readsPerS / rates[0].readsPerS) * 100,
      clientCpuIncreasePercent:
        (rates[1].clientCpuMsPerPull / rates[0].clientCpuMsPerPull - 1) * 100,
      interpretation:
        "Numbers match the raw historical offline logs. One arm per implementation, old first, no paired repetitions/variance/writer/engine; not a live rate result.",
    },
    null,
    2,
  ),
);
