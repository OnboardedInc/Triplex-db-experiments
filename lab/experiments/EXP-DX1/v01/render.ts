import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

type Bar = { id: string; value: unknown; pass: boolean | null; bar?: string };
type Row = { name: string; bar: string; reading: string; status: string; samples: string; evidence: string };
export type Run = {
  source: string;
  age: "fresh" | "1B";
  toy: boolean;
  startedAt: string;
  forecast: string;
  campaign: string;
  seal?: string;
  partial?: boolean;
  error?: string;
};

const bars = [
  "256 readers: zero violations, goodput ≥ L64, read p99 ≤ 100 ms, writer p99 ≤ 1.25× baseline and max ≤ 2 s. Stress: goodput ≥ 0.9× L256, writer p99 ≤ 2×, zero violations, recovery ≤ 60 s.",
  "L256 scheduled offer to durable ACK: p50 ≤ 10 ms, p99 ≤ 50 ms in 5–10 and 11–25 bands; p99 ≤ 100 ms in 26–50. Exact immediate readback and receipts; correct progress and bounded queue.",
  "Zero gaps, order violations or duplicate effects; exact resume and affected subjects; three crash points; L256 durable lag p99 ≤ 250 ms.",
  "Weighted p50 ≤ 5 ms, p99 ≤ 25 ms; large p99 ≤ 50 ms; ≥ 1,100 pulls/s/core; depth-10 p99 and engine bytes ≤ 1.1× depth 1.",
  "100k/account ≤ 100 s and live read/write p99 ≤ 1.5×. Publish < 1 s with permanent record and visible new answers; report background settlement.",
  "Quiet commit, read and feed p99 each ≤ 1.25× alone during burst, Publish and import; zero wrong reads or expired commands.",
  "≤ 64 resident B/untouched person outside Postgres; cold first-read p99 ≤ 100 ms; report idle bytes and threads per role.",
  "Deep 16M-fact and wide 4.5M-person imports; live read/write p99 ≤ 1.5×; target ≥ 3,000 facts/s.",
  "Zero acknowledged writes lost; writes resume ≤ 60 s, reads continue, move pauses writes ≤ 30 s, receipts/bases/feed remain valid.",
];
const names = ["Pinned reads", "Commits", "Change feed", "Current pulls", "Publish", "Quiet account", "Idle cost", "Live imports", "Machine loss and move"];
const gaps = [
  "No verified matched zero/reader pair.",
  "No verified fixed workload with 256 readers.",
  "No verified fixed workload with 256 readers. Dependency fanout lacks an independent oracle in this tape.",
  "The driver does not measure engine-side bytes read at history depths 1, 3 and 10.",
  "The joined permanent-record and replay check is separate from the matched field campaign; the frozen pair leaves no room for that campaign.",
  "The matched multi-account field campaign exceeds the time left after the fixed reader pair.",
  "The native census requires matched growing populations and first-touch samples; the held seed has one population.",
  "The pooled field campaign probes a deep import only; the matched wide import is unavailable here.",
  "The integrated one-stack driver has no two-machine failover plus move campaign.",
];

const json = (file: string) => JSON.parse(fs.readFileSync(file, "utf8"));
const fmt = (value: unknown) => typeof value === "number" && Number.isFinite(value)
  ? Number(value.toFixed(3)).toString()
  : value === null || value === undefined ? "—" : JSON.stringify(value);
const shown = (checks: Bar[]) => checks.filter((bar) => bar.value !== null && bar.value !== undefined)
  .map((bar) => `${bar.id.replace(/^NS-P\d[ -]/, "")} ${fmt(bar.value)}`).join("; ");
function result(checks: Bar[], eligible: boolean) {
  // [DX-V01] Why: the driver records fallback share alongside required pinned-read bars.
  // Rejected: treating a reported-only quantity as an unmeasured obligation.
  const required = checks.filter((b) => b.bar !== "reported");
  if (!eligible || !required.length) return "NOT MEASURED";
  if (required.some((b) => b.pass === false)) return "FAIL";
  return required.every((b) => b.pass === true) ? "PASS" : "NOT MEASURED";
}

function unavailable(name: string, bar: string, reason: string): Row {
  return { name, bar, reading: reason, status: "NOT MEASURED", samples: "0", evidence: "—" };
}
const markdown = (value: string) => value.replaceAll("|", "\\|").replace(/[\r\n]/g, " ");

export function render(run: Run, destination: string) {
  const rows = names.map((name, i) => unavailable(`P${i + 1} ${name}`, bars[i]!, run.error ?? gaps[i]!));
  const correctness = [
    unavailable("Journal queryable", "Original changes and ordered cursor are queryable", "Layout K native journal query gate is separate from the legacy SDK feed."),
    unavailable("Erased value never returned", "All covered current and historical routes return the marker", "The erasure/restore regression needs its own synthetic stack and authority."),
    unavailable("Receipts", "Exact durable receipt, immediate readback, retries and lost ACK", run.error ?? "No verified receipt witnesses."),
    unavailable("No acknowledged write lost", "Zero lost after a machine failure or move", "No machine-loss or move drill ran."),
  ];
  const evidence = (file: string) => {
    const rel = path.relative(destination, path.join(run.campaign, file));
    return `[${file}](${rel.split(path.sep).map(encodeURIComponent).join("/")})`;
  };
  const settings: Record<string, unknown> = {};
  const zeroReaderObservations: string[] = [];
  const publication = path.join(run.campaign, "comparison.json");
  if (!run.error) {
    assert(run.toy || (run.seal && /^[a-f0-9]{64}$/.test(run.seal)), "Physical evidence requires a pinned seal");
    const plan = json(path.join(run.campaign, "campaign.json"));
    assert(plan.source === run.source && plan.smoke === run.toy && plan.heldSeal === run.seal);
    assert(plan.createdAt >= Date.parse(run.startedAt));
    let verifiedResults: any[];
    if (run.partial) {
      // [DX-V01] Why: render the available toy evidence after a native refusal.
      // Rejected: turning an unverified arm into a sample source or a verdict.
      assert(run.toy && !fs.existsSync(publication));
      verifiedResults = plan.cases.flatMap((c: any) => {
        assert(/^[0-9]+-(frozen|field)-(zero|reader)$/.test(c.key));
        const record = path.join(run.campaign, c.key, "recorded.json");
        if (!fs.existsSync(record)) return [];
        const item = json(record);
        assert.deepEqual(item.arm.case, c);
        return [item];
      });
    } else {
      const comparison = json(publication);
      assert(comparison.source === run.source && comparison.smoke === run.toy);
      assert.equal(comparison.binding, plan.binding);
      assert.deepEqual(comparison.results.map((r: any) => r.arm.case), plan.cases);
      verifiedResults = comparison.results;
    }
    // [DX-V01] Why: read only a completed native producer's archived source-bound comparisons.
    // Rejected: interpreting raw driver exit codes or an unrelated report as a verdict.
    if (!run.toy) {
      assert.equal(plan.placement, "physical");
      assert.deepEqual(plan.cases.map((c: any) => c.key), ["100000-frozen-zero", "100000-frozen-reader"]);
    }
    settings.treatment = plan.treatment;
    for (const item of verifiedResults) {
      assert(["measured", "diagnostic", "preflight"].includes(item.state));
      assert(item.binding === plan.binding && item.arm.source === run.source && item.arm.startedAt >= plan.createdAt);
      const key = item.arm.case.key;
      const reading = path.join(run.campaign, key, "ns-report.json");
      const bytes = fs.readFileSync(reading);
      assert.equal(createHash("sha256").update(bytes).digest("hex"), item.files.find(([file]: string[]) => file === "ns-report.json")?.[1]);
      const raw = JSON.parse(bytes.toString("utf8"));
      assert.deepEqual(raw.deep.identity, item.arm.identity);
      assert.equal(raw.status, "DONE");
      const armReport = evidence(key + "/ns-report.json");
      const p = raw.priorities;
      if (run.toy && item.arm.case.load === "zero") {
        const capture = raw.receiptCapture;
        zeroReaderObservations.push(`- ${key}: ${capture.matched} receipts matched, ${capture.missing} missing, ${capture.mismatches} mismatched. ${armReport}`);
      }
      settings[key] = { config: raw.config, writePath: raw.deep.writePath, trace: raw.deep.trace };
      for (const file of ["gateway-jvm.json", "placement.json"]) {
        if (fs.existsSync(path.join(run.campaign, key, file))) {
          settings[key + "/" + file] = json(path.join(run.campaign, key, file));
        }
      }
      if (item.arm.case.profile === "field" && item.arm.case.load === "reader") {
        const field = item.summary.field;
        const publish = field.effects.find((e: any) => e.name === "publish");
        const imported = field.effects.find((e: any) => e.name === "import");
        Object.assign(rows[4]!, {
          reading: `${fmt(publish.wallMs)} ms page-cut Publish; permanent-record deadline and restart proof unmeasured.`,
          status: "DIAGNOSTIC", samples: String(publish.coverage.size), evidence: evidence(key + "/recorded.json"),
        });
        Object.assign(rows[5]!, {
          reading: field.ratios.map((x: any) => `${x.tested} ${x.values.map((v: Bar) => fmt(v.value)).join("/")}`).join("; "),
          status: "DIAGNOSTIC", samples: String(raw.correctness.reads), evidence: evidence(key + "/recorded.json"),
        });
        Object.assign(rows[7]!, {
          reading: `${fmt(imported.factsPerSecond)} facts/s deep import; wide import unmeasured.`,
          status: "DIAGNOSTIC", samples: String(imported.facts), evidence: evidence(key + "/recorded.json"),
        });
      }
      if (item.arm.case.profile !== "frozen" || item.arm.case.load !== "reader") continue;
      const eligible = item.state === "measured";
      const receipt = raw.receiptCapture;
      const receiptChecks: Bar[] = p.P2.bars.filter((b: Bar) => /read-your-own-write|return the original receipt/.test(b.id));
      assert.equal(receiptChecks.length, 3);
      Object.assign(correctness[2]!, {
        reading: `${receipt.matched} matched, ${receipt.missing} missing, ${receipt.mismatches} mismatched. ${shown(receiptChecks)}`,
        samples: String(receipt.matched),
        status: run.toy ? "DIAGNOSTIC" : receipt.matched > 0
          ? result([...receiptChecks, { id: "capture", value: receipt.matched, pass: receipt.missing === 0 && receipt.mismatches === 0 }], true)
          : "NOT MEASURED",
        evidence: armReport,
      });
      const samples = [
        `${raw.correctness.reads} reads overall`,
        `${Object.values(p.P2.bandsAtL256).map((b: any) => b.count).join("/")} L256 commits by size`,
        `${p.P3.lag.atL256?.count ?? 0} L256 lag samples`,
        `${p.P4.weightedMix?.read.count ?? 0} weighted pulls`,
      ];
      for (const i of [0, 1, 2, 3]) {
        const checks: Bar[] = p[`P${i + 1}`].bars;
        const invalid = !eligible && !run.toy ? item.summary.invalid.join("; ") : "";
        const diagnostic = run.toy ? `Toy samples. ${shown(checks)}`
          : [shown(checks), invalid, i >= 2 ? gaps[i] : ""].filter(Boolean).join(". ");
        Object.assign(rows[i]!, {
          reading: diagnostic || "No applicable observations.",
          status: run.toy ? "DIAGNOSTIC" : i < 2 || checks.some((b) => b.pass === false)
            ? result(checks, eligible)
            : "NOT MEASURED",
          samples: samples[i]!, evidence: armReport,
        });
      }
    }
    const setup = path.join(run.campaign, "physical-inputs.json");
    if (!run.partial || fs.existsSync(setup)) settings.placement = json(setup);
  }
  const table = (data: Row[]) => data.map(({ name, bar, reading, status, samples, evidence }) =>
    `| ${[name, bar, reading, status, samples, evidence].map(markdown).join(" | ")} |`).join("\n");
  const header = "| Check | Bar | Reading | Result | Samples | Evidence |\n| --- | --- | --- | --- | --- | --- |";
  return [
    "# Triplex scorecard v0.1", "",
    run.toy ? "**Mac toy run. All numbers are diagnostic.**" : "**Bare-metal scorecard.**",
    ...(run.partial ? ["", "The native fixture stopped before every arm could be verified. Only collected arms supply numbers."] : []),
    "", `Source \`${run.source}\` · age label \`${run.age}\` · started ${run.startedAt}`,
    run.seal ? `Held seal SHA-256 \`${run.seal}\`` : "Population ten accounts of four deep people.",
    "", run.forecast, "", "## Run settings", "",
    "The following settings and linked JVM observations identify the measured paths.", "",
    "```json", JSON.stringify(settings, null, 2), "```", "",
    "## Priorities", "", header, table(rows), "",
    "## Standing correctness checks", "", header, table(correctness), "",
    ...(zeroReaderObservations.length ? ["## Diagnostic zero-reader observations", "", ...zeroReaderObservations, ""] : []),
  ].join("\n");
}
