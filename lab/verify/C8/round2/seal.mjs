import { createHash } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// [CX-VC8-2] Why: retain a machine-readable verdict and content hashes for the actual evidence. Rejected: relying on prose totals alone.
const output = path.dirname(fileURLToPath(import.meta.url));
const read = (name) => JSON.parse(readFileSync(path.join(output, name), "utf8"));
const original = read("original-results.json");
const delta = read("delta-results.json");
const offline = read("offline-runs.json");
const live = read("live-runs.json");
if (
  original.numPassedTests !== 15 ||
  original.numFailedTests !== 0 ||
  delta.numPassedTests !== 8 ||
  delta.numFailedTests !== 2 ||
  offline.length !== 5 ||
  offline.some((x) => x.status !== 0) ||
  live.length !== 3 ||
  live.some((x) => x.status !== 0)
)
  throw new Error("Unexpected result inventory");
const assertions = (result) =>
  result.testResults.flatMap((suite) =>
    suite.assertionResults.map((test) => ({ title: test.title, status: test.status })),
  );
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const files = [];
const collect = (dir, prefix = "") => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (
      entry.name === "sut" ||
      entry.name === "evidence-manifest.json" ||
      entry.name === "summary.json" ||
      entry.name === "seal.log"
    )
      continue;
    const file = path.join(prefix, entry.name);
    if (entry.isDirectory()) collect(path.join(dir, entry.name), file);
    else if (entry.isFile()) {
      const bytes = readFileSync(path.join(output, file));
      files.push({ path: file, bytes: bytes.length, sha256: sha(bytes) });
    }
  }
};
collect(output);
const report = readFileSync(path.join(output, "../VERIFY-round2.md"));
files.push({ path: "../VERIFY-round2.md", bytes: report.length, sha256: sha(report) });
writeFileSync(
  path.join(output, "evidence-manifest.json"),
  JSON.stringify({ format: "c8-review-evidence/1", files }, null, 2) + "\n",
);
writeFileSync(
  path.join(output, "summary.json"),
  JSON.stringify(
    {
      reviewer: "CX-VC8-2",
      verdict: "FIX-FIRST",
      revision: read("source-manifest.json").revision,
      findings: [
        {
          id: "F4-R2",
          severity: "P2",
          location: "packages/qualification/src/engine-write-counter.ts:478",
          problem: "Unclassified GET shapes remain clean",
        },
        {
          id: "F5-R2",
          severity: "P2",
          location: "packages/qualification/src/engine-write-counter.ts:354",
          problem: "Post-exception forwarded traffic disappears across resets",
        },
      ],
      original: assertions(original),
      delta: assertions(delta),
      offline,
      live,
      offlineTotals: { passed: 1004, skipped: 155, failed: 0 },
      notRun: [
        "XTDB live C8/transaction overlay",
        "full G1/G2",
        "P1 performance acceptance",
        "root build/docs/pack",
        "other backend integration",
      ],
      report: { path: "../VERIFY-round2.md", sha256: sha(report) },
    },
    null,
    2,
  ) + "\n",
);
console.log(
  JSON.stringify({
    verdict: "FIX-FIRST",
    original: "15/15",
    delta: "8 passed, 2 failed",
    offline: "1004 passed, 155 skipped",
    live: "3 runs passed",
    evidenceFiles: files.length,
  }),
);
