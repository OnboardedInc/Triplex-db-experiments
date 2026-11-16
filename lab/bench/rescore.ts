import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { applyCommitVerdicts, type VerdictClock } from "./lib/verdict.ts";
import { generateTrace, traceDigest } from "./lib/trace.ts";
import { verifiedRawManifest } from "../trace/pack-oracle.mjs";

const args = process.argv.slice(2);
const opt = (key: string, fallback?: string) => { const i = args.indexOf(`--${key}`); return i < 0 ? fallback : args[i + 1]; };
const run = opt("run"), output = opt("output"), baselinePath = opt("baseline");
const clock = opt("clock", "ack") as VerdictClock, windows = opt("windows", "recorded");
if (!run || !output || !["ack", "finish"].includes(clock) || !["legacy", "recorded"].includes(windows ?? ""))
  throw Error("rescore --run DIR [--baseline DIR] --output NEW.json [--clock ack|finish] [--windows recorded|legacy]");
const repo = path.resolve(import.meta.dirname, "../.."), source = execFileSync("git", ["rev-parse", "HEAD"], { cwd: repo, encoding: "utf8" }).trim();
const sha = (data: string | Buffer) => createHash("sha256").update(data).digest("hex");
const programFiles = ["lab/bench/rescore.ts", "lab/bench/lib/verdict.ts", "lab/bench/lib/verdict-statistics.ts", "lab/bench/lib/verdict-plan.ts", "lab/bench/lib/phases.ts", "lab/bench/lib/trace.ts", "lab/bench/lib/hist.ts", "lab/trace/instrument.mjs", "lab/trace/pack-oracle.mjs"];
const hashes = Object.fromEntries(programFiles.map(f => [f, sha(fs.readFileSync(path.join(repo, f)))]));
const startedAt = Date.now();
async function readBoundRun(input: string) {
  const dir = fs.realpathSync(input), tag = path.basename(dir), json = (f: string) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  if (!/^tx2-dxt1-[a-z0-9-]+$/.test(tag)) throw Error("Foreign rescore run prefix");
  const m = json("trace-run.json"), b = json("driver/ns-report.json");
  if (m.tag !== tag || m.slot !== tag || !/^[a-f0-9]{40}$/.test(m.source) ||
      fs.readFileSync(path.join(dir, "head.txt"), "utf8").trim() !== m.source ||
      !["DONE", "ERROR"].includes(b.status)) throw Error("Historical source/slot/report binding differs");
  // [DX-T1-12] Why: rescore actual old bytes against their committed checksum preimage; never trust a newly resealed edited report.
  // Rejected: overwrite an old run, copy its PASS into a fresh run receipt, or verify only its rendered Markdown.
  const anchorPath = `lab/experiments/EXP-DX1/t1/runs/${tag}/SHA256SUMS`;
  const anchor = execFileSync("git", ["show", `${source}:${anchorPath}`], { cwd: repo, encoding: "utf8" });
  const expected = new Map(anchor.trim().split("\n").map(l => { const i = l.indexOf("  "); return [l.slice(i + 2), l.slice(0, i)]; }));
  const extraAnchors: { path: string; sha256: string }[] = [];
  // [DX-T1-12] Why: older per-run indices sealed viewers only; their original global evidence manifests seal raw inputs.
  // Rejected: invent an old raw anchor now or weaken verification when the per-run format predates raw sealing.
  for (const file of fs.readdirSync(path.join(repo, "lab/experiments/EXP-DX1/t1")).filter(f => /^EVIDENCE-.*SHA256SUMS$/.test(f))) {
    const relative = `lab/experiments/EXP-DX1/t1/${file}`;
    let text: string;
    try { text = execFileSync("git", ["show", `${source}:${relative}`], { cwd: repo, encoding: "utf8", maxBuffer: 16 << 20, stdio: ["ignore", "pipe", "ignore"] }); }
    catch { continue; }
    const lines = text.split("\n").filter(l => l.slice(66).startsWith(tag + "/"));
    if (!lines.length) continue;
    for (const line of lines) {
      const name = line.slice(66 + tag.length + 1), digest = line.slice(0, 64);
      if (expected.has(name) && expected.get(name) !== digest) throw Error("Conflicting committed historical anchors");
      expected.set(name, digest);
    }
    extraAnchors.push({ path: relative, sha256: sha(text) });
  }
  const actual = await verifiedRawManifest(dir);
  const required = new Set(["trace-run.json", "head.txt", "source-build-hashes.json", "driver/ns-report.json", "driver/ns-writes.jsonl", "containers.json", "driver-container.json", "config/sql.properties"]);
  const unrelatedChanges: string[] = [];
  for (const line of actual.trim().split("\n")) {
    const i = line.indexOf("  "), name = line.slice(i + 2), digest = line.slice(0, i);
    if (expected.get(name) !== digest) {
      if (required.has(name)) throw Error(`Historical rescore input checksum differs: ${tag}/${name}`);
      unrelatedChanges.push(name);
    }
    required.delete(name);
  }
  if (required.size) throw Error(`Missing historical rescore input: ${[...required].join(",")}`);
  const text = fs.readFileSync(path.join(dir, "driver/ns-writes.jsonl"), "utf8");
  const rows = text.trim().split("\n").filter(Boolean).map(l => JSON.parse(l));
  if (!rows.length || new Set(rows.filter(w => w.stream === "background" && !w.resend).map(w => w.seq)).size !== rows.filter(w => w.stream === "background" && !w.resend).length)
    throw Error("Incomplete or duplicate historical primary rows");
  return { report: b, rows, identity: { tag, source: m.source, slot: m.slot, level: m.level,
    reportSha256: sha(fs.readFileSync(path.join(dir, "driver/ns-report.json"))), writesSha256: sha(text), anchorPath, anchorSha256: sha(anchor), extraAnchors, rawSealSha256: sha(actual),
    unrelatedChanges, qualification: "Only original anchored rescore inputs qualify this historical computation; raw/oracle archive changes are disclosed and cannot qualify a fresh oracle verdict" } };
}
const input = await readBoundRun(run), baseline = baselinePath ? await readBoundRun(baselinePath) : null;
if (baseline && (baseline.report.config.zeroReaders !== true || baseline.report.trace.digest !== input.report.trace.digest ||
    baseline.report.config.seed !== input.report.config.seed || baseline.report.config.rungSubjects !== input.report.config.rungSubjects ||
    baseline.report.config.historyGrowthSubjects !== input.report.config.historyGrowthSubjects ||
    JSON.stringify(baseline.report.benchSources) !== JSON.stringify(input.report.benchSources))) throw Error("Historical baseline identity differs");
if (windows === "legacy" && input.report.config.profile === "v3") throw Error("Legacy compatibility check requires an original short-profile run");
const events = generateTrace({ seed: input.report.config.seed, subjects: input.report.config.rungSubjects, durationS: input.report.trace.durationS ?? 7200, params: input.report.trace.params });
if (traceDigest(events) !== input.report.trace.digest || hashes["lab/bench/lib/trace.ts"] !== input.report.generator.traceSha256)
  throw Error("Historical frozen generator or event digest differs");
const recompute = (selected: VerdictClock, legacy: boolean) => {
  const copy = structuredClone(input.report);
  applyCommitVerdicts(copy, input.rows, baseline?.rows ?? null, events, { clock: selected, legacy });
  return { verdict: copy.verdict, priorities: copy.priorities };
};
const ack = recompute("ack", false), finish = recompute("finish", false);
const result: any = {
  schema: "ns-rescore/3", historical: true, freshExecution: false, eligibleForNewRunVerdict: false,
  startedAt, createdAt: Date.now(), computationSource: source, programHashes: hashes,
  input: input.identity, baseline: baseline?.identity ?? null,
  v2Original: Object.fromEntries(Object.entries(input.report.priorities).map(([k, p]: [string, any]) => [k, p.bars ?? []])),
  v3Rescore: clock === "ack" ? ack : finish, ack, finish,
  limits: ["historical observations only; original run eligibility/oracle is not promoted", "old short windows below 500 are unjudged", "read-based statistics retain the original complete histograms", "original files are never changed"],
};
if (clock === "finish" && windows === "legacy") {
  result.legacyCompatibility = recompute("finish", true);
  const differences: any[] = [];
  const equal = (a: any, b: any): boolean => typeof a === "number" && typeof b === "number" ? Math.abs(a - b) <= 0.001 : JSON.stringify(a) === JSON.stringify(b);
  for (const [priority, bars] of Object.entries(result.v2Original) as [string, any[]][])
    for (const original of bars) {
      const next = result.legacyCompatibility.priorities[priority].bars?.find((b: any) => b.id === original.id);
      if (!next || !equal(original.value, next.value) || original.pass !== next.pass) differences.push({ priority, id: original.id, original, recomputed: next });
    }
  result.legacyDifferences = differences;
  if (differences.length) throw Error(`Legacy rescore differs: ${JSON.stringify(differences.map(d => ({ id: d.id, value: d.recomputed?.value, pass: d.recomputed?.pass })))}`);
}
for (const [file, digest] of Object.entries(hashes)) if (sha(fs.readFileSync(path.join(repo, file))) !== digest) throw Error("Rescore program changed during attempt");
fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
fs.writeFileSync(output, JSON.stringify(result, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify({ output: path.basename(output), historical: true, allPrimary: ack.priorities.P2.allPrimary,
  legacyDifferences: result.legacyDifferences?.length ?? null, semanticPromotion: false }));
