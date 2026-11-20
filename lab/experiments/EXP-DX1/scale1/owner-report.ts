import fs from "node:fs";
import assert from "node:assert/strict";
import { scopeReport } from "./scope-report.ts";
import { functionalNote } from "./functional-note.ts";
import { placementReport } from "./decision/report.ts";
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
  delta: any;
  seedAnatomy: any;
  seed: any;
  decision: any;
  restored: any;
  decisionResources: any[];
  loaderProgress: any;
  boundedLatency: { read: any; feedLag: any } | null;
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
function boundedLatency(dir: string, attempt: any, summary: any) {
  if (!attempt.bounded || attempt.mode !== "reader" || !summary) return null;
  const bytes = fs.readFileSync(path.join(dir, "s0/ns-report.json"));
  const scope = summary.perScope[0];
  assert.equal(createHash("sha256").update(bytes).digest("hex"), scope.hashes.report);
  const report = JSON.parse(bytes.toString("utf8"));
  const identity = report.deep.identity;
  assert(
    identity.source === attempt.source &&
      identity.slot === attempt.slot &&
      identity.nonce === attempt.nonce &&
      identity.bounded === true &&
      identity.account === 0 &&
      identity.arm === attempt.mode,
  );
  const distribution = (name: string) => {
    const values = report.histograms["bounded-readers." + name];
    if (!values) return null;
    const key = attempt.tag + "/bounded-readers/" + name;
    const d = histogramDistribution(Histogram.fromJSON(values), key);
    return { value: percentile(d, 0.99), n: d.n, interval90: bootstrap90(d, 0.99, key) };
  };
  return { read: distribution("read"), feedLag: distribution("feedLag") };
}
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
        delta: load(dir, "delta-measurement.json"),
        seedAnatomy: load(dir, "seed-anatomy.json"),
        seed: load(dir, "seed.json"),
        decision: load(dir, "measurement.json"),
        restored: load(dir, "restored.json"),
        decisionResources: Object.keys(transfer.summaryFiles).flatMap((name) =>
          /^r[01]-[a-z0-9]+-resources\.json$/.test(name) ? [load(dir, name)] : [],
        ),
        loaderProgress: load(dir, "seed-progress.json"),
        boundedLatency: boundedLatency(dir, attempt, summary),
      });
    }
  stages.sort((a, b) => a.attempt.at - b.attempt.at);
  const recent = (item: number, mode: string) =>
    stages.filter((s) => s.attempt.item === item && s.attempt.mode === mode).at(-1);
  const one = recent(2, "reader") ?? recent(2, "zero"),
    a1 = stages
      .filter(
        (s) =>
          s.attempt.item === 2 &&
          s.attempt.mode === "activation" &&
          !s.attempt.activationMode &&
          !s.attempt.publication,
      )
      .at(-1),
    a10 = recent(5, "activation"),
    base = recent(1, "zero");
  const cost = (s: Stage | undefined) =>
    s?.summary
      ? `${metric(s.summary.commit.p99)} ms commit p99, ${metric(s.boundedLatency?.read ?? bar(s, "NS-P1-READ-P99-256-MS"))} ms read p99, ${round(s.size?.simultaneousPeakBytes / 1024 ** 3)} GiB simultaneous client and engine cgroup peak, ${round(s.disk?.bytesPerFact)} database bytes per current fact${s.summary.invalid.length ? " (unjudged)" : ""}`
      : s?.terminal.service === "capacity-refused"
        ? `capacity refused on ${s.attempt.capacity.limits.join(" and ")}`
        : "awaiting a completed bare-metal arm";
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
      const diagnostic = "evidence/" + firstReader.tag + "-diagnostic.md";
      if (incompleteReader && fs.existsSync(path.join(here, diagnostic)))
        incompleteReader += " [Matched client and gateway timing](" + diagnostic + ")";
    }
  }
  const ledgerLimit = stages
    .flatMap((s) => {
      const witness = load(path.join(evidence, "diagnostics", s.tag), "reader-limit-terminal.json");
      if (!witness) return [];
      const ns = path.join(evidence, s.tag, "summaries/s0/ns-report.json"),
        report = JSON.parse(fs.readFileSync(ns, "utf8"));
      assert(
        witness.source === s.attempt.source &&
          witness.slot === s.attempt.slot &&
          witness.nonce === s.attempt.nonce &&
          witness.tag === s.tag &&
          witness.terminalUTC === s.terminal.endedAt &&
          s.terminal.scopeReports === 0 &&
          witness.seals.report === createHash("sha256").update(fs.readFileSync(ns)).digest("hex") &&
          report.status === "ERROR" &&
          String(report.error).includes(witness.error) &&
          witness.limitBytes === 64 * 1024 ** 3 &&
          witness.requestedBytes > witness.limitBytes &&
          witness.error.includes(
            String(witness.requestedBytes) + " > " + String(witness.limitBytes),
          ) &&
          Number.isSafeInteger(witness.checkpointReads),
      );
      return [witness];
    })
    .at(-1);
  const refused = stages.find((s) => s.terminal.service === "capacity-refused");
  const partialTen =
    recent(5, "seed") ??
    stages.filter((s) => s.attempt.item === 5 && !s.summary && s.partial?.scopes.length).at(-1);
  const partialPeople =
    partialTen?.partial?.scopes.reduce(
      (n: number, s: any) => n + (s.progress?.subjects ?? s.people ?? 0),
      0,
    ) ?? 0;
  const growth = partialTen?.seedAnatomy;
  let growthLine = "";
  if (growth) {
    assert(
      growth.identity.source === partialTen!.attempt.source &&
        growth.identity.slot === partialTen!.attempt.slot &&
        growth.identity.nonce === partialTen!.attempt.nonce,
    );
    const full = growth.windows?.filter((w: any) => w.to - w.from === growth.windowMs) ?? [];
    const early = full[0],
      late = full.at(-1);
    const io = growth.serialPoint;
    growthLine =
      (early && late
        ? " The first and last full five-minute bins seeded " +
          round((early.facts * 1000) / growth.windowMs) +
          " and " +
          round((late.facts * 1000) / growth.windowMs) +
          " facts/s (" +
          early.acks +
          " and " +
          late.acks +
          " seed receipts)."
        : "") +
      (io?.coveredCommits
        ? " The serial point averaged " +
          round(io.sqlReadsPerCoveredCommit) +
          " SQL reads/seed commit (n=" +
          io.coveredCommits +
          ")."
        : "");
  }
  const detail = scopeReport(
    file,
    stages.filter((s) => s.attempt.mode === "interference" || s.attempt.mode === "small"),
    stages.filter((s) =>
      s.summary?.perScope?.some((p: any) => p.deep?.r2?.cost && p.deep?.activationOracle),
    ),
  );
  const currentDecision = placementReport(
    path.dirname(file),
    stages.filter((s) => s.attempt.study === "decision"),
  );
  const single = stages.filter(
    (s) => s.attempt.layout === "single" && s.terminal.service === "success",
  );
  const singlePeak = single.flatMap((s) => {
    const peak = s.decision?.cells.find((c: any) => c.cell === 39.4);
    return peak
      ? [
          (s.attempt.withReaders ? "with readers " : "with zero readers ") +
            metric({
              value: peak.writes.p99,
              n: peak.writes.n,
              interval90: peak.writes.interval99,
            }) +
            " ms at 39.4/s",
        ]
      : [];
  });
  const singleDisk = single.find((s) => s.seed)?.seed;
  const singleReadPeak = single
    .filter((s) => s.attempt.withReaders)
    .at(-1)
    ?.decision?.cells.find((c: any) => c.cell === 39.4)?.read;
  const setup = stages
    .filter(
      (s) =>
        s.tag.startsWith("arm-p6-i1-seed-") && s.terminal.service === "success" && s.disk?.facts,
    )
    .at(-1);
  const deltas = stages.filter((s) => s.delta && s.terminal.service === "success");
  for (const s of deltas) {
    assert.deepEqual(s.delta.binding, {
      source: s.attempt.source,
      slot: s.attempt.slot,
      nonce: s.attempt.nonce,
    });
    assert(
      s.attempt.activationMode === "delta" &&
        s.delta.subjects === 100000 &&
        s.delta.loaded.count === 90,
    );
  }
  const delta = deltas.at(-1)?.delta;
  const fieldTrials = stages.filter((s) => s.tag.startsWith("arm-p6-i1-") && s.attempt.live);
  const archivedWriter = fieldTrials
    .flatMap((s) => {
      const manifest = path.join(here, "evidence", s.tag + "-writer.sha256"),
        report = path.join(evidence, s.tag, "archived-writer.json");
      if (!fs.existsSync(manifest) || !fs.existsSync(report)) return [];
      const bytes = fs.readFileSync(report);
      const expected = fs.readFileSync(manifest, "utf8").split("\n")[0];
      assert.equal(
        expected,
        createHash("sha256").update(bytes).digest("hex") + "  " + s.tag + "/archived-writer.json",
      );
      const recovered = JSON.parse(bytes.toString("utf8"));
      assert.deepEqual(
        [recovered.source, recovered.slot, recovered.nonce, recovered.archive],
        [s.attempt.source, s.attempt.slot, s.attempt.nonce, s.terminal.rawArchive.sha256],
      );
      const alone = recovered.windows.find((w: any) => w.name === "alone"),
        steady = recovered.windows.find((w: any) => w.name === "ten-steady"),
        expiry = recovered.windows.find((w: any) => w.expired > 0);
      assert(alone?.quiet.n >= 500 && steady?.quiet.n >= 500 && expiry?.planned > expiry.expired);
      return [
        "The smaller staggered run used the unfixed write path and acknowledged " +
          steady.good.toLocaleString("en-US") +
          " offers at " +
          round(steady.offeredPerS, 0) +
          "/s with account 1 commit p99 at " +
          round(steady.quiet.p99 / alone.quiet.p99) +
          "× alone. The first " +
          expiry.expired.toLocaleString("en-US") +
          " pre-dispatch expiries occurred at " +
          round(expiry.offeredPerS, 0) +
          "/s. [Staggered capacity](STAGGERED-CAPACITY.md)",
      ];
    })
    .at(-1);
  const thresholds = fieldTrials.flatMap((s) => {
    const b = s.summary?.tenants?.loadBoundary;
    if (!b || b.unjudged) return [];
    const miss = b.lowestObservedFailure;
    const on = s.attempt.groupControl ? "grouped" : "ungrouped";
    return [
      s.attempt.layout +
        " " +
        s.attempt.live +
        " " +
        on +
        " " +
        (miss
          ? round(miss.offeredPerS) + " offered/s (" + miss.expired + " expiries)"
          : "no observed failure"),
    ];
  });
  const breakdown = a1?.summary?.perScope?.find((p: any) => p.deep?.r2?.cost)?.deep.r2.cost;
  const costLine = breakdown
    ? ` R2 evaluated in ${round(breakdown.evaluationMs)} ms, changed ${breakdown.changedSubjects}/${breakdown.subjects} outputs and wrote ${breakdown.bodyFacts} body facts plus ${breakdown.guardFacts} guard facts across ${breakdown.mixedPages + breakdown.guardOnlyPages} pages. The queue carried ${round(breakdown.queue.physicalPerS)} native transactions/s and ${round(breakdown.queue.changedFactsPerS)} fact changes/s.`
    : "";
  const lines = [
    "# DX-SCALE1 · deep accounts",
    "",
    ...(fs.existsSync(path.join(here, "COMMIT-ANATOMY.md"))
      ? [
          "Deep reader goodput is unmeasured. Deep and thin commit p99 were 30.99 and 32.84 ms over the first 900 seconds. The archived deep tail aligned with six write-gateway GC pauses. [Commit anatomy](COMMIT-ANATOMY.md)",
        ]
      : []),
    singlePeak.length
      ? "One account of 100,000 people had commit p99 " +
        singlePeak.join(" and ") +
        "." +
        (singleReadPeak?.n
          ? " Read p99 was " +
            metric({
              value: singleReadPeak.p99,
              n: singleReadPeak.n,
              interval90: singleReadPeak.interval99,
            }) +
            " ms at that rate."
          : "") +
        (singleDisk
          ? " PostgreSQL added " + round(singleDisk.disk.bytesPerFact) + " bytes/fact."
          : "") +
        " [Decision cells](DECISION-RESULTS.md)"
      : `One account of 100,000 people — ${cost(one)}.`,
    currentDecision ||
      `Ten full-size accounts await the matched placement screen. ${partialTen?.partial ? `The earlier bounded seed acknowledged ${partialPeople.toLocaleString("en-US")} of 1,000,000 people across ${partialTen.partial.scopes.length} databases.` : ""}${growthLine} [Review response](REVIEW.md)`,
    `The owner's release target is under one second. Page-guard activation for one account is ${ledgerLimit && !a1 ? "unmeasured" : act(a1)}. Activation among ten is ${ledgerLimit && !a10 ? "unmeasured" : act(a10)}.${costLine}${delta ? ` DELTA release-to-correct-read p99 was ${round(delta.loaded.p99)} ms (n=${delta.loaded.count}).` : ""}`,
    emptied
      ? `First recorded engine memory-limit kill was in ${emptied.resources.firstObservedEngineOOM.role}, attempt ${emptied.tag}.`
      : refused
        ? `The first capacity refusal was ${refused.tag} on ${refused.attempt.capacity.limits.join(" and ")}. This was an admission estimate.`
        : "The first shared resource to reach its limit is still unknown.",
    archivedWriter ??
      (thresholds.length
        ? "Write-capacity diagnostic. First measured expiry or quiet commit p99 miss by arm " +
          thresholds.join(", ") +
          ". [Scope measurements](SCOPES.md)"
        : (setup
            ? "Ten 10,000-person accounts seeded " +
              setup.disk.facts.toLocaleString("en-US") +
              " facts in one database (" +
              round(setup.disk.bytesPerFact) +
              " PostgreSQL bytes/fact, one seed). "
            : "") +
          "The field-save profile offers 35/s steady, 235/s at its five-minute plateau and 394/s at coincident peaks."),
    "Three changes to test are shortening write-gateway GC pauses, reusing verified predecessor preparation and grouping ready saves. Their effects on the full account are unmeasured.",
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
    "| Item and arm | Scope | Commit p50 ms | Commit p99 ms | Read p99 ms | Feed p99 ms | Status |",
    "| --- | --- | --- | --- | --- | --- | --- |",
  ];
  for (let item = 1; item <= 5; item++) {
    const modes = item === 1 ? ["zero", "reader"] : ["zero", "reader", "activation", "seed"];
    // [DX-SCALE1] Why: a corrected reader needs a matched new zero. Preserve earlier terminal attempts alongside their replacements so a control or incomplete arm never disappears from the record. Rejected: reporting only the last tag for each mode.
    for (const s of stages.filter(
      (s) => s.attempt.item === item && modes.includes(s.attempt.mode),
    )) {
      const mode = s.attempt.mode,
        m = s.summary,
        itemName = /^arm-p6-i([1-5])-/.exec(s.tag)?.[1] ?? item + " (earlier)";
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
          `| ${itemName} ${mode}${s.delta ? " DELTA" : ""} | ${id} | ${metric(c?.p50)} | ${metric(c?.p99)} | ${metric(s.boundedLatency?.read ?? (s.delta ? { value: s.delta.loaded.readP99, n: s.delta.loaded.checked } : bar(s, "NS-P1-READ-P99-256-MS", sentinel)))} | ${metric(s.boundedLatency?.feedLag ?? bar(s, "NS-P3 lag p99 ms at L256", sentinel))} | ${m?.invalid?.length ? "Unjudged" : m ? "Observed" : s.terminal.service === "success" && s.disk?.facts ? s.disk.facts.toLocaleString("en-US") + " seeded facts" : s.terminal.service} · ${s.tag} |`,
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
    "Cells give estimate · n [90% interval] where available. The bounded read and feed latencies cover 64 readers on two cores for ten minutes. The earlier 10k ladder filled its 64 GiB observation allowance after 381,428,503 reads. [Failure evidence](evidence/arm-d19-i1-reader-b-diagnostic.md)",
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
    "- `source.ts` pins source and summary files. `control.ts` checks the fresh transfer, file hashes, nonce and cleanup. `catalog.ts` rechecks each report before indexing. `owner-report.ts` rehashes transferred summaries. `functional-note.ts` checks manifest hashes, clean sources, nonces, terminal oracle comparisons and original receipt counts before publishing local results. The deep-live generator checks frozen field-save content and minute geometry. Its two calendars preserved all ten business-intent digests, and 20 focused tests passed, including an independent replay of 8 pinned reads after 70 field saves on the in-memory composition (254 entity queries). The native field-save follow-up and the post-merge trace-suite rerun were waiting for a local heavy-job slot at the campaign stop. [Field-save evidence](evidence/part5-functional.sha256) The tenant collector binds observed offers, expiries, ACKs and quiet ratios to those windows. Predictions are updated from the same verified transfers. The launcher records each freshly fetched upstream head and its changed paths. A guarded arm accepts independent lazy-publisher changes confined to its separate directory. The detached queue checks each attempt, source, nonce, stage and terminal cleanup before advancing. The restarted queue advances past failed arms and retains them for retry. The bounded reader collector checks every observation against the complete receipt model in memory, seals the one-in-100 sample and every error and mismatch, and rechecks attempt identity, counts and bytes on collection. The zero comparison independently binds gateway and transactor spans and full receipt journal bytes to each historical attempt. Bounded latency summaries recheck the exact per-scope report bytes, nonce, source, slot, account and arm before reading histograms. DELTA verifies the source hash, slot, nonce, 1,000-subject native preflight, empty 100,000-person destination, independent broad and narrow rows, and retained read bytes before advancing. The bounded DELTA runner checks every reader invocation at its exact native cut and saves every hundredth plus errors and mismatches. The million seed estimate binds the prior volume and dump sizes, fresh terminal evidence and actual cgroup samples. The decision runner checks receipt, field and two-account bytes in fresh preflight. It verifies the active writer function and flags from each restored database against the source, slot, attempt nonce and seed cut. It compares the full typed journal changes including assertion and retirement clocks, valid ranges and exact values. The loader checks every original claim and feed row at the sealed cut. The decision checker independently replays planned field values and predecessors in native position order, verifies cold rows and before/after cuts, and binds every sample to the frozen tape, slot, source and nonce. Finalization rechecks timing, dispositions, seed/archive bindings and durability before the compact transfer. Packaging can retry the same native evidence.",
    "- The single-account comparison checks both fresh attempt identities, the same sealed image hash and identical write-cell inputs. The cgroup table checks the same attempt and population with a snapshot taken after each named cell. A retry checks the original accepted transfer and image metadata hashes plus the actual restored bytes, the bound population and the new pinned readback.",
    "- " + functionalNote(evidence, path.join(here, "evidence/part4-functional.sha256")),
    "",
    "All 43 acceptance files were checked for references to changed baseline sources. No acceptance pin changed. The frozen v3 offer digest remains unchanged. [Predictions and observations](PREDICTIONS.md) are recorded for each item. See [handoff](HANDOFF.md) for the queue and [resource layout](PROFILE.md) for sharing and measurement boundaries.",
  );
  const interference = stages
    .filter(
      (s) =>
        s.attempt.item === 3 &&
        s.summary?.layout === "pooled" &&
        !s.attempt.groupControl &&
        !s.attempt.live,
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
  while (lines.length > 60) {
    const historical = lines.findIndex((l) => l.startsWith("| ") && l.includes(" · arm-d19-"));
    if (historical < 0) break;
    lines.splice(historical, 1);
  }
  if (lines.length > 60) throw Error("Owner report exceeds 60 lines");
  const predictionFile = path.join(path.dirname(file), "PREDICTIONS.md");
  if (fs.existsSync(predictionFile)) {
    const rows = fs.readFileSync(predictionFile, "utf8").split("\n");
    for (const item of [1, 2, 3, 4, 5]) {
      const attempts = stages.filter((s) => s.attempt.item === item);
      if (!attempts.length) continue;
      const actual =
        attempts
          .map((s) => {
            const m = s.summary,
              id = s.tag;
            if (!m && ledgerLimit?.tag === id)
              return (
                id +
                " · second reader failure at the 64 GiB collector limit after " +
                ledgerLimit.checkpointReads.toLocaleString("en-US") +
                " checkpointed reads"
              );
            if (!m)
              return (
                id +
                " · " +
                (s.limit
                  ? String(s.limit.opened) + "/" + s.limit.requested + " databases opened"
                  : s.terminal.service === "capacity-refused"
                    ? "capacity refused on " + s.attempt.capacity.limits.join(", ")
                    : "incomplete")
              );
            const p = m.commit.p99,
              boundary = m.tenants?.loadBoundary,
              b = boundary?.lowestObservedFailure,
              lo = boundary?.highestLowerObservedWithinBar;
            return (
              id +
              " · " +
              (m.invalid.length ? "unjudged, " : "") +
              "commit p99 " +
              metric(p) +
              " ms" +
              (boundary && !(s.attempt.live && s.attempt.bounded)
                ? ", lowest observed expiry or quiet miss " +
                  (b ? round(b.offeredPerS) + " offered/s" : "unresolved") +
                  ", highest lower measured within the bars " +
                  (lo ? round(lo.offeredPerS) + " offered/s" : "unresolved")
                : "") +
              (s.disk ? ", " + round(s.disk.bytesPerFact) + " database B/current fact" : "") +
              (s.restart ? ", " + s.restart.results.length + " reopened" : "") +
              (m.perScope?.[0]?.deep?.r2?.wallMs
                ? ", R2 " + round(m.perScope[0].deep.r2.wallMs / 1000) + " s"
                : "")
            );
          })
          .join(". ") + ".";
      const idx = rows.findIndex((l) => l.startsWith("| " + item + " ·"));
      assert(idx >= 0);
      const cells = rows[idx]!.split("|");
      assert(cells.length === 5);
      cells[3] = " " + actual + " ";
      rows[idx] = cells.join("|");
    }
    for (const item of [1, 3, 4, 5]) {
      const attempts = stages.filter((s) => s.tag.startsWith("arm-p6-i" + item + "-"));
      if (!attempts.length) continue;
      const idx = rows.findIndex((l) => l.startsWith("| P6." + item + " ·"));
      assert(idx >= 0);
      const cells = rows[idx]!.split("|");
      assert(cells.length === 5);
      cells[3] =
        " " +
        attempts
          .map((s) => {
            const m = s.summary,
              boundary = m?.tenants?.loadBoundary,
              failure = boundary?.lowestObservedFailure;
            if (!m)
              return (
                s.tag +
                " · " +
                (s.terminal.service === "success" && s.delta
                  ? "release-to-correct-read p99 " +
                    round(s.delta.loaded.p99) +
                    " ms (n=" +
                    s.delta.loaded.count +
                    ")"
                  : s.terminal.service === "success" && s.disk?.facts
                    ? s.disk.facts.toLocaleString("en-US") +
                      " seed facts in " +
                      round((s.disk.after.at - s.disk.before.at) / 60000) +
                      " minutes, " +
                      round(s.disk.bytesPerFact) +
                      " database bytes per fact"
                    : s.limit
                      ? s.limit.opened + "/" + s.limit.requested + " databases opened"
                      : s.terminal.service)
              );
            const expiry = boundary?.firstExpiry;
            return (
              s.tag +
              " · p99 " +
              metric(m.commit.p99) +
              " ms" +
              (failure && !(s.attempt.live && s.attempt.bounded)
                ? ", first quiet ratio miss or expiry at " + round(failure.offeredPerS) + "/s"
                : "") +
              (expiry ? ", expiry from " + round(expiry.offeredPerS) + "/s" : "") +
              (s.restart ? ", " + s.restart.results.length + " reopened" : "") +
              (m.perScope?.[0]?.deep?.r2?.wallMs
                ? ", R2 " + round(m.perScope[0].deep.r2.wallMs / 1000) + " s"
                : "") +
              (m.invalid.length ? ", unjudged checks recorded" : "")
            );
          })
          .join(". ") +
        ". ";
      rows[idx] = cells.join("|");
    }
    fs.writeFileSync(predictionFile, rows.join("\n"));
  }
  fs.writeFileSync(file, lines.join("\n") + "\n");
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  updateReport(process.argv[2]!);
