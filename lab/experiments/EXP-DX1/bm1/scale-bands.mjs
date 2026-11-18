import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { verdictMs } from "../../../trace/instrument.mjs";
import { percentile, records } from "../../../trace/report.mjs";

const run = path.resolve(process.argv[2]);
const source = fs.readFileSync(path.join(run, "head.txt"), "utf8").trim();
const names = ["trace-run.json", "driver/ns-report.json", "driver/ns-writes.jsonl"];
const hashes = new Map(
  fs.readFileSync(path.join(run, "SHA256SUMS"), "utf8").trim().split("\n")
    .filter((line) => line.includes("  "))
    .map((line) => [line.slice(66), line.slice(0, 64)]),
);
for (const name of names) {
  const hash = createHash("sha256");
  for await (const chunk of fs.createReadStream(path.join(run, name))) hash.update(chunk);
  if (hash.digest("hex") !== hashes.get(name)) throw Error("Unsealed scale input " + name);
}
const manifest = JSON.parse(fs.readFileSync(path.join(run, names[0]), "utf8"));
const bench = JSON.parse(fs.readFileSync(path.join(run, names[1]), "utf8"));
// [DX-BM1] Why: compute band latencies only for a complete, colocated exact ACK denominator.
// Rejected: substituting end-of-bookkeeping timestamps or using a partial writer file as the total.
if (manifest.tag !== path.basename(run) || manifest.slot !== manifest.tag ||
    manifest.source !== source || manifest.hostPlatform !== "linux-bare-metal" ||
    bench.status !== "DONE" || !bench.seed.complete || bench.seed.seededSubjects !== 100000)
  throw Error("Incomplete or foreign scale attempt");

const groups = { "5-10": [], "11-25": [], "26-50": [] };
let expired = 0;
for await (const row of records(path.join(run, names[2]))) {
  if (row.stream !== "background" || row.resend) continue;
  if (row.expired) expired++;
  if (row.outcome !== "committed" || row.expired) continue;
  if (!Number.isInteger(row.facts) || row.facts < 5 || row.facts > 50)
    throw Error("Unexpected frozen trace fact count");
  const band = row.facts <= 10 ? "5-10" : row.facts <= 25 ? "11-25" : "26-50";
  groups[band].push(verdictMs(row));
}
const bands = Object.fromEntries(Object.entries(groups).map(([band, values]) => [band, {
  n: values.length, p50Ms: percentile(values, 0.5), p99Ms: percentile(values, 0.99),
}]));
if (Object.values(bands).reduce((sum, b) => sum + b.n, 0) !== bench.priorities.P2.allPrimary.count)
  throw Error("Scale ACK denominator differs from the terminal driver report");
console.log(JSON.stringify({
  scope: "All closed primary committed ACKs; includes bursts. Diagnostic.",
  tag: manifest.tag, source, expired, seedSeconds: bench.seed.wallS, bands,
  inputs: Object.fromEntries(names.map((name) => [name, hashes.get(name)])),
}, null, 2));
