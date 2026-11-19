import fs from "node:fs";
import assert from "node:assert/strict";
import { scopeReport } from "./scope-report.ts";
import { functionalNote } from "./functional-note.ts";
import { summaryFiles } from "./source.ts";
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
  open: any;
  restart: any;
  limit: any;
  groupSettings: any;
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
export function updateReport(evidence: string, file = path.join(here, "REPORT.md")) {
  const stages: Stage[] = [];
  if (fs.existsSync(evidence))
    for (const tag of fs.readdirSync(evidence)) {
      const dir = path.join(evidence, tag, "summaries"),
        attempt = load(dir, "attempt.json");
      if (!attempt) continue;
      const terminal = load(dir, "terminal.json");
      const transfer = load(path.dirname(dir), "transfer.json");
      assert(
        transfer?.tag === tag &&
          transfer.source === attempt.source &&
          transfer.nonce === attempt.nonce,
      );
      assert.deepEqual(summaryFiles(dir), transfer.summaryFiles);
      const summary = load(dir, "summary.json");
      if (summary)
        assert(
          summary.source === attempt.source &&
            summary.slot === attempt.slot &&
            summary.nonce === attempt.nonce &&
            summary.arm === attempt.mode &&
            summary.scopeCount === attempt.spec.scopes,
        );
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
        summary,
        disk: load(dir, "seed-disk.json"),
        size: load(dir, "sizing.json"),
        resources: load(dir, "resource-summary.json"),
        partial: load(dir, "partial.json"),
        open: load(dir, "open-scopes.json"),
        restart: load(dir, "restart.json"),
        limit: load(dir, "database-limit.json"),
        groupSettings: load(dir, "group-settings.json"),
      });
    }
  stages.sort((a, b) => a.attempt.at - b.attempt.at);
  const recent = (item: number, mode: string) =>
    stages.filter((s) => s.attempt.item === item && s.attempt.mode === mode).at(-1);
  const one = recent(2, "reader"),
    ten = recent(5, "reader"),
    a1 = recent(2, "activation"),
    a10 = recent(5, "activation"),
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
  const firstReader = stages.find(
    (s) => s.attempt.item === 1 && s.attempt.mode === "reader" && !s.summary,
  );
  let incompleteReader = "";
  if (firstReader) {
    const run = load(path.join(evidence, firstReader.tag, "summaries/s0"), "ns-report.json");
    if (run?.deep?.identity && Array.isArray(run.phases)) {
      assert(
        run.deep.identity.source === firstReader.attempt.source &&
          run.deep.identity.nonce === firstReader.attempt.nonce &&
          run.deep.identity.slot === firstReader.attempt.slot,
      );
      const missed = run.phases.filter((p: any) => {
        const observed = run.phaseProgress?.[p.idx];
        return (
          /^L[0-9]+$/.test(p.name) &&
          p.actualEnd > p.actualStart &&
          observed?.reads > 0 &&
          observed.routes.fallback === observed.reads
        );
      });
      if (missed.length)
        incompleteReader = ` The first reader attempt routed all ${missed.reduce((n: number, p: any) => n + run.phaseProgress[p.idx].reads, 0).toLocaleString("en-US")} reads at ${missed.map((p: any) => p.name).join(", ")} through the gateway and failed replica coverage.`;
    }
  }
  const refused = stages.find((s) => s.terminal.service === "capacity-refused");
  const partialTen =
    recent(5, "seed") ??
    stages.filter((s) => s.attempt.item === 5 && !s.summary && s.partial?.scopes.length).at(-1);
  const partialPeople =
    partialTen?.partial?.scopes.reduce(
      (n: number, s: any) => n + (s.progress?.subjects ?? s.people ?? 0),
      0,
    ) ?? 0;
  const detail = scopeReport(
    file,
    stages.filter((s) => s.attempt.mode === "interference" || s.attempt.mode === "small"),
    stages.filter((s) =>
      s.summary?.perScope?.some((p: any) => p.deep?.r2?.cost && p.deep?.activationOracle),
    ),
  );
  const breakdown = a1?.summary?.perScope?.find((p: any) => p.deep?.r2?.cost)?.deep.r2.cost;
  const costLine = breakdown
    ? ` R2 evaluated in ${round(breakdown.evaluationMs)} ms, changed ${breakdown.changedSubjects}/${breakdown.subjects} outputs and wrote ${breakdown.bodyFacts} body facts plus ${breakdown.guardFacts} guard facts across ${breakdown.mixedPages + breakdown.guardOnlyPages} pages. The queue carried ${round(breakdown.queue.physicalPerS)} native transactions/s and ${round(breakdown.queue.changedFactsPerS)} fact changes/s.`
    : "";
  const lines = [
    "# DX-SCALE1 · deep accounts",
    "",
    `One account of 100,000 people — ${cost(one)}.`,
    `Ten accounts of 100,000 people sharing one database — ${cost(ten)}.${partialTen ? ` The bounded seed acknowledged ${partialPeople.toLocaleString("en-US")} of 1,000,000 people across ${partialTen.partial.scopes.length} attempted databases.` : ""}`,
    `The owner's release target is under one second. Activation for one account is ${act(a1)}. Activation among ten is ${act(a10)}.${costLine}`,
    emptied
      ? `First recorded engine memory-limit kill was in ${emptied.resources.firstObservedEngineOOM.role}, attempt ${emptied.tag}.`
      : refused
        ? `The first capacity refusal was ${refused.tag} on ${refused.attempt.capacity.limits.join(" and ")}. This was an admission estimate.`
        : "The first shared resource to reach its limit is still unknown.",
    "Three changes to test are grouping queued saves, reducing per-save work at the serial commit point, and publishing a release with a constant number of writes. Their effects on the full account are unmeasured.",
    `The 10,000-person fixture generates 1,604,464 current facts, or 160.45 per person. ${base?.disk ? `PostgreSQL grew by ${round(base.disk.bytesPerFact)} bytes per fact and the volume including WAL grew by ${round(base.disk.volumeBytesPerFact)} bytes per fact (one seed).` : "The first observed seed used 594.29 PostgreSQL bytes per fact and 1,214.95 allocated volume bytes per fact, including WAL (n=1 fresh stack)."}`,
    "",
    ...(base?.summary
      ? [
          `The zero-reader 10k arm acknowledged ${base.summary.commit.p99.n.toLocaleString("en-US")} primary commands. Commit p99 was ${round(base.summary.commit.p99.value)} ms (90% interval ${round(base.summary.commit.p99.interval90.low)}–${round(base.summary.commit.p99.interval90.high)} ms), ${base.summary.commit.p99.value > 50 ? "above" : "within"} the 50 ms bar. Peak simultaneous client and engine memory was ${round(base.size.simultaneousPeakBytes / 1024 ** 3)} GiB.${incompleteReader}`,
        ]
      : []),
    "",
    "**Bench measurements**",
    "",
    "| Item and arm | Scope | Commit p50 ms | Commit p99 ms | L256 read p99 ms | L256 feed p99 ms | Status |",
    "| --- | --- | --- | --- | --- | --- | --- |",
  ];
  for (let item = 1; item <= 5; item++) {
    const modes = item === 1 ? ["zero", "reader"] : ["zero", "reader", "activation", "seed"];
    for (const mode of modes) {
      const s = recent(item, mode);
      if (!s) continue;
      const m = s.summary;
      const ids =
        mode === "activation"
          ? ["pooled"]
          : m?.scopeCount > 1
            ? ["pooled", "account 1"]
            : ["account 1"];
      for (const id of ids) {
        const sentinel = id === "account 1",
          c = sentinel ? m?.perScope?.[0]?.commit : m?.commit;
        lines.push(
          `| ${item} ${mode} | ${id} | ${metric(c?.p50)} | ${metric(c?.p99)} | ${metric(bar(s, "NS-P1-READ-P99-256-MS", sentinel))} | ${metric(bar(s, "NS-P3 lag p99 ms at L256", sentinel))} | ${m?.invalid?.length ? "Unjudged" : m ? "Observed" : s.terminal.service === "success" ? "Incomplete" : s.terminal.service} · ${s.tag} |`,
        );
      }
    }
  }
  for (const [singleItem, tenItem] of [
    [1, 3],
    [2, 5],
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
  if (!stages.length) lines.push("| 1 zero | 1 | — | — | — | — | Running on the dedicated bench |");
  const readers = [1, 2, 3, 5]
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
    "",
    "Each engine cell gives peak cgroup memory and its highest CPU use sustained across three samples. One fully used core is 100%. Each transfer includes PostgreSQL page counters, gateway heap observations and per-scope driver measurements.",
  );
  lines.push(
    "",
    "Cells give estimate · n [90% interval] where available. The regular arms target 5,910 seconds of offers. Each transferred summary retains every per-account bar, pooled sample distributions and the count of accounts meeting each obligation.",
    "",
    "The dedicated server arrived with 93.4 GiB RAM, 12 physical cores and two 894.3 GiB NVMe devices. The baseline uses the root device, SMT enabled, the performance governor and six reader cores. The second device arrived unformatted. [Assumptions](PROFILE.md)",
    "",
    "**Population and checks**",
    "",
    "| People per account | Placements | Tasks | Subtasks | Field values | Current facts |",
    "| ---: | ---: | ---: | ---: | ---: | ---: |",
    "| 10,000 | 18,000 | 57,000 | 313,500 | 758,100 | 1,604,464 |",
    "| 100,000 | 180,000 | 570,000 | 3,135,000 | 7,581,000 | 16,045,255 |",
    "",
    "Ten full accounts store 160,452,550 business facts and 2,003,920 tenant and roster facts. The first account has 56,505 primary offers and 1,633 resends over the regular arm. The eligible daily roster is 200 or 2,000 people depending on the rung. [Profile and assumptions](PROFILE.md)",
    "",
    "Local Datomic functional checks drove two 40-person accounts through the zero-reader, reader and guarded activation arms. All 10,319,892 observed reads matched the model. O-REPLAY matched 262 sampled reads across 8,097 entity queries. The worker matched all 523 receipt reads. O-DOMAIN matched 160 stored decisions across 80 people and two releases, including two R2 decisions whose work items stayed unchanged. [Evidence manifest](SHA256SUMS)",
    "",
    "The tenant build passed 16 focused checks, 1,567 package tests and 18 additional Node tests. The package suites skipped 102 opt-in tests. All 116 seed digests and the logical offers and reader windows reproduced. On fresh local Datomic databases, 1,613,811 of 1,613,811 reads matched. O-REPLAY checked 110 reads across 3,402 entity queries. All 40 acknowledged writes reached their correct tenant feed. One gateway request read two accounts at position 22 and the pinned count was eight. The separate databases reached positions 8 and 14. A prior local attempt exposed a report-file lookup error, corrected before these trials. [Evidence manifest](SHA256SUMS)",
    "",
    "**Audit of evidence and verdicts**",
    "",
    "- `tenants.ts`, `tenant-proof.ts` and the NS driver bind fresh empty or verified restored scopes, per-account intent and population hashes, receipt IDs and positions to the pinned two-root and catalog queries. O-REPLAY checks both roots. O-DOMAIN checks the activated account at each published page cut.",
    "- `tenant-feed.ts` and `tenant-metrics.ts` route effects and advance each tenant cursor in the same SQLite transaction as the physical checkpoint. They verify source, epoch, receipt positions and each account’s observed subjects. Each quiet-account ratio uses correct reads, receipt-clock commits and witnessed lag from the same phase and identity. Aggregate throughput counts actual primary acknowledgements.",
    "- `seed-image.ts` verifies the sealed PostgreSQL bytes, original scope, source, seed identity and original command receipts after restoration. `seed-anatomy.ts` binds serial SQL counts and adoption timestamps to the assigned source and slot. Missing observations stay unjudged.",
    "- The merged ACT1 collector checks the full native schedule and page coverage from this attempt, then compares the sealed seed hash, worker count, clone nonce, source and slot. The reader starts its live feed after every worker installs the same verified seed cut. The feed measures each witnessed source position immediately after its SQLite commit, including pages followed by an injected crash.",
    "",
    "- `deep-profile.ts` checks a fresh empty scope, acknowledged seed contents and IDs, population counts and frozen hashes. A seed-only grant checks the same population with an independently pinned empty offer schedule. The coordinator binds each ready file and physical database to its nonce, source, slot and account. The six-worker startup fixture requires a full canonical replica-to-gateway comparison on its own cut.",
    "- The NS driver keeps the receipt-clock, full-row, feed/replay, old-basis, split-read, history and O-REPLAY checks. Deep terminal samples come from actual public reads at the seed and latest cut. The interference and small-account plans bind each scope’s business commands to a new frozen schedule. Their windows fix the sentinel’s offers and reader counts. After timed small-account traffic drains, `tenant-checks.ts` submits a tagged correction per account, loses its ACK and verifies the duplicate and original receipt against the durable tenant cursor.",
    "- `deep-activation.ts` checks the observed release, each page receipt and its changed bodies against the source cut, roster hashes and O-DOMAIN. `deep-commit-meter.ts` binds native transaction IDs, members, datoms and logical change rows to actual source replies. `measurements.ts` opens the new attempt’s receipt ledger, rehashes its bytes, validates its source, nonce and database, and recomputes the reported release and burst rates.",
    "- `measurements.ts` checks source hashes, cohort exits, complete planned offers and receipt positions, then recomputes the oracle comparisons and pooled bars from this attempt’s samples. Missing or invalid accounts leave the pooled result unjudged.",
    "- `bench.ts` reads database and volume allocation on the owned stack at the seed barrier, records the component limits and restores an empty exact-prefix inventory. `resources.ts` reads that stack’s cgroups and bound cache counters. `archive.ts` rehashes decoded raw files before removing their originals. `small-host.ts` binds each open, empty snapshot and post-restart full-row hash to its database and original cut. `scope-report.ts` reads verified transfer bytes and checks the roster and restart denominators.",
    "- `source.ts` pins source and summary files. `control.ts` checks the fresh transfer, file hashes, nonce and cleanup. `catalog.ts` rechecks each report before indexing. `owner-report.ts` rehashes transferred summaries. `functional-note.ts` checks manifest hashes, clean sources, nonces, terminal oracle comparisons and original receipt counts before publishing local results. The detached queue checks each attempt, source, nonce, stage and terminal cleanup before advancing. A second failed item stops the queue.",
    "- " + functionalNote(evidence, path.join(here, "evidence/part4-functional.sha256")),
    "",
    "All 43 acceptance files were checked for references to changed baseline sources. No acceptance pin changed. The frozen v3 offer digest remains unchanged. See [handoff](HANDOFF.md) for the queue and [resource layout](PROFILE.md) for sharing and measurement boundaries.",
  );
  const interference = stages
    .filter(
      (s) => s.attempt.item === 3 && s.summary?.layout === "pooled" && !s.attempt.groupControl,
    )
    .at(-1)?.summary?.tenants;
  if (interference) {
    const m = interference.firstSteadyMiss;
    lines.splice(
      8,
      0,
      m
        ? "The quiet account first missed its 1.25× steady-load bar at " +
            round(m.commitsPerS) +
            " acknowledged commits/s (" +
            m.acknowledged +
            " commits in " +
            round(m.seconds) +
            " s)."
        : "The tested steady windows produced no judged quiet-account ratio above 1.25×.",
    );
  }
  if (detail) lines.splice(8, 0, detail + " [Scope measurements](SCOPES.md)");
  if (lines.length > 60) {
    const start = lines.indexOf("**Population and checks**"),
      end = lines.findIndex((l) => l.startsWith("Local Datomic functional checks"));
    lines.splice(
      start,
      end - start,
      "The full rung has 16,045,255 current facts per account. [Population and traffic assumptions](PROFILE.md)",
      "",
    );
  }
  if (lines.length > 60) {
    for (const prefix of [
      "Each engine cell",
      "Cells give estimate",
      "Before handoff, a read-only",
    ]) {
      if (lines.length <= 60) break;
      const pos = lines.findIndex((l) => l.startsWith(prefix));
      if (pos >= 0) lines.splice(pos, lines[pos + 1] === "" ? 2 : 1);
    }
  }
  if (lines.length > 60) lines.splice(lines.indexOf("**Bench measurements**"), 2);
  if (lines.length > 60) throw Error("Owner report exceeds 60 lines");
  fs.writeFileSync(file, lines.join("\n") + "\n");
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  updateReport(process.argv[2]!);
