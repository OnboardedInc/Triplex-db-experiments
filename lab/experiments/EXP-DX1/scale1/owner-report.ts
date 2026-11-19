import fs from "node:fs";
import { createHash } from "node:crypto";
import { Histogram } from "../../../bench/lib/hist.ts";
import {
  bootstrap90,
  histogramDistribution,
  percentile,
} from "../../../bench/lib/verdict-statistics.ts";
import path from "node:path";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
type Stage = {
  tag: string;
  attempt: any;
  terminal: any;
  summary: any;
  disk: any;
  size: any;
  resources: any;
  partial: any;
};
const load = (dir: string, f: string) =>
  fs.existsSync(path.join(dir, f)) ? JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")) : null;
const round = (n: number, d = 2) => (Number.isFinite(n) ? n.toFixed(d) : "—");
const metric = (b: any) =>
  b && Number.isFinite(b.value)
    ? `${round(b.value)} · ${b.n ?? "—"}${b.interval90 ? ` [${round(b.interval90.low)}, ${round(b.interval90.high)}]` : ""}`
    : "—";
const bar = (s: Stage, id: string, scope = false) =>
  (scope ? s.summary?.perScope?.[0]?.bars : s.summary?.pooledBars)?.find((b: any) => b.id === id);
export function updateReport(evidence: string) {
  const stages: Stage[] = [];
  if (fs.existsSync(evidence))
    for (const tag of fs.readdirSync(evidence)) {
      const dir = path.join(evidence, tag, "summaries"),
        attempt = load(dir, "attempt.json");
      if (!attempt) continue;
      const terminal = load(dir, "terminal.json");
      if (
        terminal?.source !== attempt.source ||
        terminal.nonce !== attempt.nonce ||
        terminal.slot !== attempt.slot ||
        terminal.cleanup !== true
      )
        throw Error("Unbound transfer");
      stages.push({
        tag,
        attempt,
        terminal,
        summary: load(dir, "summary.json"),
        disk: load(dir, "seed-disk.json"),
        size: load(dir, "sizing.json"),
        resources: load(dir, "resource-summary.json"),
        partial: load(dir, "partial.json"),
      });
    }
  stages.sort((a, b) => a.attempt.at - b.attempt.at);
  const recent = (item: number, mode: string) =>
    stages.filter((s) => s.attempt.item === item && s.attempt.mode === mode).at(-1);
  const one = recent(2, "reader"),
    ten = recent(4, "reader"),
    a1 = recent(2, "activation"),
    a10 = recent(4, "activation"),
    base = recent(1, "zero");
  const cost = (s: Stage | undefined) =>
    s?.summary
      ? `${metric(s.summary.commit.p99)} ms commit p99, ${metric(bar(s, "NS-P1-READ-P99-256-MS"))} ms read p99, ${round(s.size?.simultaneousPeakBytes / 1024 ** 3)} GiB simultaneous client and engine cgroup peak, ${round(s.disk?.bytesPerFact)} database bytes per current fact${s.summary.invalid.length ? " (unjudged)" : ""}`
      : s?.terminal.service === "capacity-refused"
        ? `capacity refused on ${s.attempt.capacity.limits.join(" and ")}`
        : "awaiting a completed bare-metal reader arm";
  const act = (s: Stage | undefined) =>
    s?.summary
      ? `${s.summary.perScope.map((p: any) => round(p.deep.r2.wallMs / 1000)).join(", ")} s across ${s.summary.scopeCount} sweeps, with ${s.summary.perScope.reduce((n: number, p: any) => n + (p.deep.activationOracle?.checked ?? 0), 0)} independently checked people`
      : "pending";
  const emptied = stages.find((s) => s.resources?.firstObservedEngineOOM);
  const refused = stages.find((s) => s.terminal.service === "capacity-refused");
  const partialTen =
    recent(4, "seed") ??
    stages.filter((s) => s.attempt.item === 4 && !s.summary && s.partial?.scopes.length).at(-1);
  const partialPeople =
    partialTen?.partial?.scopes.reduce(
      (n: number, s: any) => n + (s.progress?.subjects ?? s.people ?? 0),
      0,
    ) ?? 0;
  const lines = [
    "# DX-SCALE1 · deep accounts",
    "",
    `One account of 100,000 people — ${cost(one)}.`,
    `Ten accounts of 100,000 people — ${cost(ten)}.${partialTen ? ` The bounded seed acknowledged ${partialPeople.toLocaleString("en-US")} of 1,000,000 people across ${partialTen.partial.scopes.length} attempted databases.` : ""}`,
    `Activation for one account is ${act(a1)}. Activation for ten accounts is ${act(a10)}.`,
    emptied
      ? `First recorded engine memory-limit kill was in ${emptied.resources.firstObservedEngineOOM.role}, attempt ${emptied.tag}.`
      : refused
        ? `The first capacity refusal was ${refused.tag} on ${refused.attempt.capacity.limits.join(" and ")}. This was an admission estimate.`
        : "The first shared resource to reach its limit is still unknown.",
    "Three experiments could distinguish the limits. Give senders another physical core if offer delays dominate, enlarge the transactor object cache if storage misses dominate, and distribute databases across transactors if their JVM saturates.",
    `The 10,000-person fixture generates 1,604,464 current facts, or 160.45 per person. ${base?.disk ? `Its measured PostgreSQL allocation is ${round(base.disk.bytesPerFact)} bytes per fact.` : "Bytes per fact on the bench await the first completed seed measurement."}`,
    "",
    "**Bench measurements**",
    "",
    "| Item and arm | Scope | Commit p50 ms | Commit p99 ms | L256 read p99 ms | L256 feed p99 ms | Status |",
    "| --- | --- | --- | --- | --- | --- | --- |",
  ];
  for (let item = 1; item <= 4; item++) {
    const modes = item === 1 ? ["zero", "reader"] : ["zero", "reader", "activation", "seed"];
    for (const mode of modes) {
      const s = recent(item, mode);
      if (!s) continue;
      const m = s.summary;
      const ids =
        mode === "activation"
          ? ["pooled"]
          : m?.scopeCount > 1
            ? ["pooled", "account 0"]
            : ["account 0"];
      for (const id of ids) {
        const sentinel = id === "account 0",
          c = sentinel ? m?.perScope?.[0]?.commit : m?.commit;
        lines.push(
          `| ${item} ${mode} | ${id} | ${metric(c?.p50)} | ${metric(c?.p99)} | ${metric(bar(s, "NS-P1-READ-P99-256-MS", sentinel))} | ${metric(bar(s, "NS-P3 lag p99 ms at L256", sentinel))} | ${m?.invalid?.length ? "Unjudged" : m ? "Observed" : s.terminal.service} · ${s.tag} |`,
        );
      }
    }
  }
  for (const [singleItem, tenItem] of [
    [1, 3],
    [2, 4],
  ] as const) {
    const a = recent(singleItem, "reader"),
      b = recent(tenItem, "reader");
    if (!a?.summary || !b?.summary) continue;
    const pair = [a, b].map((s) => {
      const f = fs.readFileSync(path.join(evidence, s.tag, "summaries/s0/ns-report.json"));
      if (createHash("sha256").update(f).digest("hex") !== s.summary.perScope[0].hashes.report)
        throw Error("Account comparison input mismatch");
      return JSON.parse(f.toString());
    });
    const [alone, together] = pair;
    const same =
      alone.deep.trace === together.deep.trace &&
      alone.deep.seed.sha256 === together.deep.seed.sha256 &&
      JSON.stringify(alone.benchSources) === JSON.stringify(together.benchSources) &&
      JSON.stringify(a.attempt.cpus) === JSON.stringify(b.attempt.cpus);
    if (!same) {
      lines.push(
        "",
        `Account 0 at ${a.attempt.spec.people} people has differing comparison inputs. Its interference ratio is unjudged.`,
      );
      continue;
    }
    const ratio = (label: string, x: any, y: any) => {
      if (!x || !y) return "—";
      const d = histogramDistribution(Histogram.fromJSON(x), label),
        n = histogramDistribution(Histogram.fromJSON(y), label),
        den = percentile(d, 0.99),
        num = percentile(n, 0.99);
      if (!den || num === null) return "—";
      const ci = bootstrap90(n, 0.99, label, d);
      return `${round(num / den)}× (n=${n.n}/${d.n}${ci ? `, 90% [${round(ci.low)}, ${round(ci.high)}]` : ""})`;
    };
    const a0 = a.summary.perScope[0],
      b0 = b.summary.perScope[0];
    lines.push(
      "",
      `With nine busy neighbors, account 0 at ${a.attempt.spec.people} people had commit p99 ${ratio("ACK", a0.commitHistogram, b0.commitHistogram)}, L256 read p99 ${ratio("reads", alone.histograms["L256.read"], together.histograms["L256.read"])}, and feed lag p99 ${ratio("lag", alone.histograms["L256.feedLag"], together.histograms["L256.feedLag"])} relative to running alone.${a.summary.invalid.length || b.summary.invalid.length ? " These observations are unjudged." : ""}`,
    );
    const soloAct = recent(singleItem, "activation"),
      multiAct = recent(tenItem, "activation");
    if (soloAct?.summary && multiAct?.summary) {
      const first = soloAct.summary.perScope[0].deep.r2,
        second = multiAct.summary.perScope[0].deep.r2;
      lines.push(
        `Account 0 activation took ${round(second.wallMs / 1000)} s with neighbors and ${round(first.wallMs / 1000)} s alone, one sweep per side.`,
      );
    }
  }
  if (!stages.length)
    lines.push("| 1–4 | 1 or 10 | — | — | — | — | Awaiting bench release and public source |");
  const readers = [1, 2, 3, 4]
    .map((i) => recent(i, "reader"))
    .filter((s): s is Stage => Boolean(s?.resources?.engines && s.size));
  lines.push(
    "",
    "**Shared resources**",
    "",
    "| Reader arm | PostgreSQL | Transactor | Write gateway | Read gateway | Transactor cache hits / requests | Lowest free disk, GiB |",
    "| --- | --- | --- | --- | --- | --- | ---: |",
  );
  if (!readers.length) lines.push("| Awaiting first reader arm | — | — | — | — | — | — |");
  for (const s of readers) {
    const roles = ["pg", "tx", "gw-w", "gw-r"].map((role) => {
      const e = s.resources.engines[role];
      return e
        ? `${round(e.maxBytes / 1024 ** 3)} GiB / ${round(e.maxBusyThreeSamples, 0)}% (n=${e.n})`
        : "—";
    });
    const c = s.resources.jvms.tx;
    lines.push(
      `| ${s.attempt.spec.people} × ${s.attempt.spec.scopes} | ${roles.join(" | ")} | ${c?.cacheRequests ? c.cacheHits + " / " + c.cacheRequests : "—"} | ${round(s.resources.minimumFreeFilesystemBytes / 1024 ** 3)} |`,
    );
  }
  lines.push(
    "Each engine cell gives peak cgroup memory and its highest CPU use sustained across three samples. One fully used core is 100%. Each transfer includes PostgreSQL page counters, gateway heap observations and per-scope driver measurements.",
  );
  lines.push(
    "",
    "Cells give estimate · n [90% interval] where available. The regular arms target 5,910 seconds of offers. Each transferred summary retains every per-account bar, pooled sample distributions and the count of accounts meeting each obligation.",
    "",
    "Before handoff, a read-only capacity check found 87.5 GiB available RAM and 638.0 GiB free disk. With the stated priors, ten 100k seeds would fit on disk in waves of two. The 1,639 GiB live-memory estimate requires calibration on the 10k baseline. These figures are estimates. [Assumptions](PROFILE.md)",
    "",
    "**Population and checks**",
    "",
    "| People per account | Placements | Tasks | Subtasks | Field values | Current facts |",
    "| ---: | ---: | ---: | ---: | ---: | ---: |",
    "| 10,000 | 18,000 | 57,000 | 313,500 | 758,100 | 1,604,464 |",
    "| 100,000 | 180,000 | 570,000 | 3,135,000 | 7,581,000 | 16,045,255 |",
    "",
    "Ten full accounts target 160,452,550 current facts. The first account has 56,505 primary offers and 1,633 resends over the regular arm. The eligible daily roster is 200 or 2,000 people depending on the rung. [Profile and assumptions](PROFILE.md)",
    "",
    "The functional Datomic trial used two four-person databases at once. Each accepted 70 primary commands. O-REPLAY checked 16 historical/current reads and 508 entity queries across both. O-DOMAIN checked eight R2 outputs and durable outbox states. The original slot image lacked the current write endpoint. The successful retry used the existing source-matched image. [Evidence manifest](SHA256SUMS)",
    "",
    "**Audit of evidence and verdicts**",
    "",
    "- `deep-profile.ts` checks a fresh empty scope, consecutively acknowledged seed contents and IDs, the independent population count and the frozen seed and command hashes. The coordinator binds each ready file to its nonce, source, slot and account.",
    "- The NS driver keeps the receipt-clock, full-row, feed/replay, old-basis, split-read, history and O-REPLAY checks. Deep terminal samples come from actual public reads at the seed and latest cut. The regular trace and phase plan have distinct identity fields.",
    "- `deep-activation.ts` binds each fresh release receipt to its cut, hashes each evaluated world/output, re-reads the same cut, and checks both releases plus the durable R2 outbox against O-DOMAIN for every person.",
    "- `measurements.ts` checks source-file hashes, fork exits, complete planned offers, exact receipt times and positions, and recomputes the sampled oracle comparisons from retained bytes. Missing or invalid accounts leave the pooled result unjudged.",
    "- `bench.ts` reads database and volume allocation on the owned stack at the seed barrier, records the component limits and restores an empty exact-prefix inventory. `control.ts` checks archive size, hash, nonce and source before indexing a transfer.",
    "- The functional tests use new databases and real public receipts. They check replacement semantics, duplicate receipts, independent replay and publication. The renderer fix preserves fresh output destinations for derived evidence. A timed-out local terminal read was traced to a closed replica. The collector now uses the live source at both recorded positions.",
    "",
    "The acceptance contract and frozen v3 verdict rules retain their original pins. See [handoff](HANDOFF.md) for the queue and [resource layout](PROFILE.md) for sharing and measurement boundaries.",
  );
  while (lines.length > 60 && lines.includes("")) lines.splice(lines.lastIndexOf(""), 1);
  if (lines.length > 60) throw Error("Owner report exceeds 60 lines");
  fs.writeFileSync(path.join(here, "REPORT.md"), lines.join("\n") + "\n");
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  updateReport(process.argv[2]!);
