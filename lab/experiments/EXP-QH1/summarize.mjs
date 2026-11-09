// [EXP-QH1] Why: retain independently inspectable raw bytes and their actual command outcomes.
// Rejected: a synthesized PASS from exit codes, or committing bulky oracle/SQLite/dependency output.
import fs from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
const base = "/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-QH1";
const sha = (file) => {
  const h = createHash("sha256"),
    fd = fs.openSync(file, "r"),
    buf = Buffer.alloc(4 * 1024 ** 2);
  let n;
  try {
    while ((n = fs.readSync(fd, buf, 0, buf.length, null))) h.update(buf.subarray(0, n));
  } finally {
    fs.closeSync(fd);
  }
  return h.digest("hex");
};
const receipts = fs
  .readdirSync(base)
  .map((d) => path.join(base, d, "receipt.json"))
  .filter((p) => fs.existsSync(p))
  .map((file) => ({ file, receipt: JSON.parse(fs.readFileSync(file)) }))
  .filter((x) => x.receipt.label);
const selected = (label) => {
  const items = receipts
    .filter((x) => x.receipt.label === label)
    .sort((a, b) => a.receipt.end.localeCompare(b.receipt.end));
  if (items.length !== 1) throw Error("Need one explicit attempt: " + label);
  return items[0];
};
const baseline = JSON.parse(fs.readFileSync(path.join(base, "baseline-G0.json"))),
  candidate = JSON.parse(fs.readFileSync(path.join(base, "candidate-G0-G5.json")));
for (const [label, artifact] of [
  ["baseline-G0-retry", baseline],
  ["candidate-G0-G5", candidate],
]) {
  const { receipt: r } = selected(label);
  if (
    r.result.code !== 0 ||
    !artifact.buildsStillMatch ||
    Date.parse(artifact.started) < Date.parse(r.start) ||
    Date.parse(artifact.ended) > Date.parse(r.end)
  )
    throw Error("Measurement not fresh/bound: " + label);
}
if (baseline.hashes.length !== 10000 || candidate.hashes.length !== 10000)
  throw Error("Incomplete sample");
let differences = 0;
for (let i = 0; i < 10000; i++)
  if (JSON.stringify(baseline.hashes[i]) !== JSON.stringify(candidate.hashes[i])) differences++;
const retainedBuildDifferences = [];
for (const [file, expected] of Object.entries(candidate.builds))
  if (sha(file) !== expected) retainedBuildDifferences.push({ file, expected, current: sha(file) });
if (
  retainedBuildDifferences.some((x) => !x.file.endsWith(".d.ts") && !x.file.endsWith(".d.ts.map"))
)
  throw Error("Measured runtime bytes differ from retained runtime");
const analysis = {
  diagnostic: true,
  baselineCandidateSample: 10000,
  differences,
  retainedRuntimeMatches: true,
  regeneratedNonexecutedDeclarations: retainedBuildDifferences,
  rounds: candidate.rounds.map((r) => ({
    clients: r.clients,
    round: r.round,
    pulls: r.pulls,
    cpuUsPerPull: r.totalCpuUs / r.pulls,
    pullsPerCpuSecond: r.pullsPerCpuSecond,
    p50: r.p50,
    p99: r.p99,
    largestP99: r.buckets["801-2000"].p99,
    mainCpuUsPerPull: r.mainCpuUs / r.pulls,
    namedWorkerCpuUsPerPull: Object.values(r.threadCpuUs).reduce((a, b) => a + b, 0) / r.pulls,
    otherCpuUsPerPull: r.otherCpuUs / r.pulls,
  })),
};
fs.writeFileSync(path.join(base, "analysis-bound.json"), JSON.stringify(analysis, null, 2));
if (differences) throw Error("Read-route answers differ");
// Files are sealed: all producing command receipts above are terminal. Exclude caches and this live collector.
const skip = process.env.QH1_RESULT ? path.dirname(process.env.QH1_RESULT) : undefined;
const files = [];
function visit(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (
      file === skip ||
      entry.name === "node_modules" ||
      entry.name === "npm-cache" ||
      entry.name.startsWith("MANIFEST-")
    )
      continue;
    if (entry.isDirectory()) visit(file);
    else if (entry.isFile()) files.push(file);
  }
}
visit(base);
files.sort();
const manifest = path.join(base, "MANIFEST-" + randomUUID() + ".sha256"),
  lines = files.map((file) => sha(file) + "  " + file);
fs.writeFileSync(manifest, lines.join("\n") + "\n", { flag: "wx" });
const index = {
  status: "DIAGNOSTIC",
  acceptanceClaim: false,
  base: "2f7b42d6",
  evidenceRoot: base,
  manifest: {
    path: manifest,
    sha256: sha(manifest),
    files: files.length,
    excludes: [
      "dependency caches/node_modules",
      "this active collector attempt",
      "manifest self references",
    ],
  },
  analysis: {
    path: path.join(base, "analysis-bound.json"),
    sha256: sha(path.join(base, "analysis-bound.json")),
  },
  sample: {
    independentOraclePulls: 100000,
    fixtureRoots: 30,
    availableReferenceCuts: 180,
    sampledDistinctCuts: 90,
    tenKRowRouteComparisons: 10000,
    rowRouteDifferences: differences,
  },
  attempts: receipts.map(({ file, receipt: r }) => ({
    label: r.label,
    path: path.dirname(file),
    receiptSha256: sha(file),
    start: r.start,
    end: r.end,
    result: r.result,
    sourceStillMatches: r.sourceStillMatches,
    sourceObjects: r.sourceObjects ?? null,
    logSha256: r.logSha256,
    command: r.command,
  })),
  limits: [
    "full four-arm G0 attribution incomplete",
    "G5 CPU screen fails",
    "final frozen G7 p99 ratio fails",
    "no W0-rung independent-oracle qualification",
    "no writer-on/100k/depth-10/20-percent-expired qualification",
    "no VM acceptance or independent review",
    "five declaration files regenerated after measurements; every measured runtime JS/map byte retained",
  ],
};
fs.writeFileSync(
  "lab/experiments/EXP-QH1/evidence-index.json",
  JSON.stringify(index, null, 2) + "\n",
);
fs.writeFileSync(
  "lab/experiments/EXP-QH1/SHA256SUMS",
  sha(manifest) +
    "  " +
    manifest +
    "\n" +
    sha(path.join(base, "analysis-bound.json")) +
    "  " +
    path.join(base, "analysis-bound.json") +
    "\n",
);
console.log(
  JSON.stringify({
    status: index.status,
    manifest: index.manifest,
    analysis: index.analysis,
    attempts: receipts.length,
    differences,
  }),
);
