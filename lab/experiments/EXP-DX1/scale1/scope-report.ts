import { livePeakWindow } from "./deep-live.ts";
import assert from "node:assert/strict";
import { Histogram } from "../../../bench/lib/hist.ts";
import { histogramDistribution, ratioBar } from "../../../bench/lib/verdict-statistics.ts";
import fs from "node:fs";
import path from "node:path";
const fmt = (n: unknown, d = 2) =>
  typeof n === "number" && Number.isFinite(n) ? n.toFixed(d) : "—";
const metric = (m: any) =>
  m && Number.isFinite(m.value)
    ? fmt(m.value) +
      " (n=" +
      m.n +
      (m.interval90
        ? ", 90% [" + fmt(m.interval90.low) + ", " + fmt(m.interval90.high) + "]"
        : "") +
      ")"
    : "—";
const ratio = (x: any, y: any) =>
  x?.value != null && y?.value > 0 ? fmt(x.value / y.value) + "×" : "—";
const quantile = (xs: number[], p: number) =>
  [...xs].sort((a, b) => a - b)[Math.max(0, Math.ceil(p * xs.length) - 1)];
type Run = {
  tag: string;
  attempt: any;
  terminal: any;
  summary: any;
  open?: any;
  restart?: any;
  limit?: any;
  groupSettings?: any;
};
const MI = 1024 ** 2;
function windowTable(run: Run, lines: string[]) {
  const m = run.summary;
  if (!m) {
    lines.push("The attempt ended with " + run.terminal.service + ".");
    return;
  }
  if (m.tenants) {
    assert(m.layout === run.attempt.layout && m.sourceCuts.length === run.attempt.spec.scopes);
    const counts = m.sourceCuts.flatMap((s: any) => Object.entries(s.counts));
    assert(new Set(counts.map((pair: any) => pair[0])).size === run.attempt.spec.accounts);
    lines.push(
      "Account 1 supplies the quiet comparison. The first window has one active account. The stored roster is held fixed.",
      "",
      "| Window | Acknowledged commits/s | Quiet commit p99 ratio | Quiet read p99 ratio | Quiet feed p99 ratio |",
      "| --- | ---: | --- | --- | --- |",
    );
    for (const w of m.tenants.windows)
      lines.push(
        "| " +
          [
            w.name,
            fmt(w.sustainedCommitsPerS) + " (" + w.acked + " ACKs / " + fmt(w.seconds) + " s)",
            ...w.ratios.map((r: any) => metric(r) + " " + r.status),
          ].join(" | ") +
          " |",
      );
    if (run.attempt.live) {
      lines.push(
        "",
        "| Field-save load | Offered / s | Durable ACKs / s | Expiries | Quiet account at 3.5/s |",
        "| --- | ---: | ---: | ---: | --- |",
      );
      for (const w of m.tenants.windows)
        lines.push(
          "| " +
            [
              w.name,
              fmt(w.fullOfferedPerS) + " (" + w.fullOffered + ")",
              fmt(w.sustainedCommitsPerS) + " (" + w.acked + ")",
              w.fullExpired,
              w.sentinelRate === 3.5 ? "yes" : "no",
            ].join(" | ") +
            " |",
        );
      for (const q of m.tenants.ninePeakQuiet)
        lines.push(
          "Three nine-neighbour peak minutes, " + q.id + ": " + metric(q) + " " + q.status + ".",
        );
      const b = m.tenants.loadBoundary,
        lo = b.highestLowerObservedWithinBar,
        hi = b.lowestObservedFailure;
      lines.push(
        "",
        "Highest lower measured rate within the quiet bars: " +
          (lo ? fmt(lo.offeredPerS) + " offered/s in " + lo.window : "unresolved") +
          ". Lowest measured expiry or judged quiet p99 miss: " +
          (hi
            ? fmt(hi.offeredPerS) +
              " offered/s, " +
              fmt(hi.ackPerS) +
              " durable ACKs/s, " +
              hi.expired +
              " expiries in " +
              hi.window
            : "unresolved") +
          ".",
      );
    }
    const miss = m.tenants.firstSteadyMiss;
    lines.push(
      "",
      miss
        ? "First measured steady load outside 1.25× was " +
            miss.name +
            " at " +
            fmt(miss.commitsPerS) +
            " acknowledged commits/s."
        : "No sampled steady load recorded a judged ratio above 1.25×.",
    );
    lines.push(
      "The pinned roster counted " +
        counts.reduce((n: number, v: any) => n + v[1], 0) +
        " subjects. " +
        (m.layout === "pooled"
          ? "The two sampled accounts share one native read and the count shares its cut."
          : "The aggregate uses one named position per physical database.") +
        " Per-account latencies, counts and 90% intervals are in the attempt summary.",
    );
    return;
  }
  const sentinel = m.perScope[0];
  assert(sentinel.account === 0 && sentinel.interference.length > 0);
  const first = sentinel.interference[0],
    validation = m.invalid.length ? "Unjudged" : "Complete observation";
  lines.push(
    validation +
      ". Scope 1 is the fixed sentinel. Each cell gives p99 in milliseconds, its sample count and the reported 90% interval.",
    "",
    "| Window | Readers | Offer-to-ACK p99 | Read p99 | Feed lag p99 | Commit / first window | Read / first window |",
    "| --- | ---: | --- | --- | --- | ---: | ---: |",
  );
  for (const w of sentinel.interference)
    lines.push(
      "| " +
        [
          w.window,
          w.readers,
          metric(w.commit.p99),
          metric(w.read),
          metric(w.feedLag),
          ratio(w.commit.p99, first.commit.p99),
          ratio(w.read, first.read),
        ].join(" | ") +
        " |",
    );
  if (run.attempt.mode === "interference") {
    const single = sentinel.interference.find((w: any) => w.window === "one-burst"),
      all = sentinel.interference.find((w: any) => w.window === "all-burst");
    assert(single && all);
    lines.push(
      "",
      "With all ten accounts bursting, the sentinel’s p99 ratios relative to its isolated burst were " +
        ratio(all.commit.p99, single.commit.p99) +
        " for commits, " +
        ratio(all.read, single.read) +
        " for reads and " +
        ratio(all.feedLag, single.feedLag) +
        " for feed lag.",
    );
  }
}
function memIndex(point: any) {
  const rows = (point.engines.tx.metrics ?? [])
    .map((m: any) => m.memoryIndexMB)
    .filter((s: any) => s && Number.isFinite(s.sum) && s.count > 0);
  const n = rows.reduce((a: number, s: any) => a + s.count, 0);
  return n ? { value: rows.reduce((a: number, s: any) => a + s.sum, 0) / n, n } : null;
}
// [DX-SCALE1] Why: the actual open and restart witnesses distinguish a database limit, JVM cost and application-reader cost. Rejected: attributing a client memory peak to the transactor or reporting a recovered health check as 100 reopened databases.
export function scopeReport(reportFile: string, runs: Run[], releases: Run[] = []) {
  if (!runs.length && !releases.length) return null;
  const file = path.join(path.dirname(reportFile), "SCOPES.md"),
    lines = ["# Deep scope measurements", ""];
  let owner = "";
  if (releases.length) {
    lines.push(
      "## Activation costs",
      "",
      "Each row is one verified release. Evaluation includes the pinned world reads and performs zero writes. Each guarded page commits atomically. The two commit-time columns distinguish pages containing changed items from pages containing guards alone. Changed facts count assertions and retractions. Queue rates cover the marker through the last acknowledged page and include live writers in that database.",
      "",
      "| Attempt / release | Wall s | Marker ms / commits | Evaluation ms | Changed people / roster | Body fact writes / preparation ms | Guard fact writes / preparation ms | Mixed page commits / ms | Guard-only commits / ms | Source receipts / native transactions / changed facts | Logical / native transactions/s | Changed facts/s |",
      "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    );
    for (const s of releases)
      for (const scope of s.summary.perScope) {
        const d = scope.deep;
        for (const [i, name] of ["R1", "R2"].entries()) {
          const r = i === 0 ? d.r1 : d.r2,
            c = r?.cost;
          if (!c) continue;
          assert(
            c.subjects === d.activationOracle.checked &&
              c.changedSubjects === d.activationOracle.changedItemsByRelease[i],
          );
          assert(c.queue.first === r.cut.position && c.queue.last === r.publicationPosition);
          const q = c.queue,
            pair = (n: number, ms: number) => n + " / " + fmt(ms);
          lines.push(
            "| " +
              [
                s.tag + " / " + name,
                fmt(r.wallMs / 1000),
                fmt(c.markerMs) + " / " + c.markerCommits,
                fmt(c.evaluationMs),
                c.changedSubjects +
                  " / " +
                  c.subjects +
                  " (" +
                  fmt((100 * c.changedSubjects) / c.subjects) +
                  "%)",
                pair(c.bodyFacts, c.bodyPrepareMs),
                pair(c.guardFacts, c.guardPrepareMs),
                pair(c.mixedPages, c.mixedCommitMs),
                pair(c.guardOnlyPages, c.guardOnlyCommitMs),
                q.observed + " / " + q.physicalTransactions + " / " + q.changedFacts,
                q.qualified ? fmt(q.logicalPerS) + " / " + fmt(q.physicalPerS) : "unjudged",
                q.qualified ? fmt(q.changedFactsPerS) : "unjudged",
              ].join(" | ") +
              " |",
          );
        }
      }
    lines.push("");
  }
  for (const s of runs) {
    const bind = (a: any) =>
      assert(
        a.source === s.attempt.source && a.slot === s.attempt.slot && a.nonce === s.attempt.nonce,
      );
    lines.push(
      "## " + (s.attempt.item === 3 ? "Ten deep accounts" : "One hundred small accounts"),
      "",
      "Layout " +
        (s.attempt.layout ?? "separate") +
        ". Evidence tag " +
        s.tag +
        ". Runtime " +
        s.attempt.source +
        ".",
      "",
    );
    if (s.limit) {
      bind(s.limit);
      assert(s.limit.prior.length === s.limit.opened);
      owner =
        s.limit.opened +
        " of 100 databases completed opening and snapshot checks on both peers. The next failed operation was " +
        String(s.limit.operation ?? "opening the database") +
        ".";
      lines.push(
        owner +
          " Its full exception and previously opened database identities are in the transfer.",
      );
      continue;
    }
    windowTable(s, lines);
    if (s.open) {
      bind(s.open);
      assert(
        s.open.opened.length === 100 &&
          new Set(s.open.opened.map((r: any) => r.database)).size ===
            (s.attempt.layout === "pooled" ? 1 : 100),
      );
      lines.push(
        "",
        "Each idle plateau had one physical-stack observation after 65 seconds. Deltas cover 99 additional idle accounts and reader views. Heap usage includes garbage collection.",
        "",
        "| Open scopes | TX threads / named pipeline threads | TX heap MiB | Native memory index MB (n) | PG database MiB | PG cgroup MiB | Write gateway heap MiB | Read gateway heap MiB |",
        "| ---: | --- | ---: | --- | ---: | ---: | ---: | ---: |",
      );
      for (const p of s.open.points) {
        bind(p);
        const m = memIndex(p);
        lines.push(
          "| " +
            [
              p.openScopes,
              p.engines.tx.threads + " / " + p.engines.tx.pipelineThreads,
              fmt(p.engines.tx.heapUsed / MI),
              m ? fmt(m.value) + " (" + m.n + ")" : "—",
              fmt(p.postgres.databaseBytes / MI),
              fmt(p.engines.pg.bytes / MI),
              fmt(p.engines["gw-w"].heapUsed / MI),
              fmt(p.engines["gw-r"].heapUsed / MI),
            ].join(" | ") +
            " |",
        );
      }
      const a = s.open.points.find((p: any) => p.openScopes === 1),
        z = s.open.points.find((p: any) => p.openScopes === 100);
      assert(a && z);
      const d = (fn: (v: any) => number, scale = 1) => fmt((fn(z) - fn(a)) / 99 / scale);
      lines.push(
        "",
        "The 1-to-100 difference per idle scope was " +
          d((p) => p.engines.tx.threads) +
          " transactor threads, " +
          d((p) => p.engines.tx.heapUsed, MI) +
          " MiB used transactor heap, " +
          d((p) => p.postgres.databaseBytes, MI) +
          " MiB PostgreSQL allocation, and " +
          d((p) => p.engines["gw-w"].heapUsed, MI) +
          " / " +
          d((p) => p.engines["gw-r"].heapUsed, MI) +
          " MiB write/read gateway heap. Memory-index samples are native process-wide callback observations.",
      );
    }
    if (s.summary && s.attempt.item === 4) {
      const readers = s.summary.perScope
        .filter((p: any) => s.attempt.layout === "pooled" || p.account !== 0)
        .flatMap((p: any) => p.deep.readerIsolates ?? [])
        .map((w: any) => w.heapUsed / MI);
      if (readers.length)
        lines.push(
          "",
          (s.attempt.layout === "pooled"
            ? "For the shared reader workers, median startup isolate heap was "
            : "Per idle application reader, median startup isolate heap was ") +
            fmt(quantile(readers, 0.5)) +
            " MiB and p99 was " +
            fmt(quantile(readers, 0.99)) +
            " MiB (n=" +
            readers.length +
            ").",
        );
    }
    if (s.restart) {
      bind(s.restart);
      const r = s.restart;
      assert(
        r.results.length === 100 &&
          r.results.every(
            (d: any) =>
              d.proof.rows > 75 && d.proof.position > 0 && /^[a-f0-9]{64}$/.test(d.proof.digest),
          ),
      );
      const elapsed = (r.allReopenedAt - r.coldStart) / 1000,
        ts = r.results.map((x: any) => x.ms);
      owner =
        "All 100 small accounts reproduced their pre-restart reads after reopening " +
        (s.attempt.layout === "pooled" ? "one database" : "100 databases") +
        " in " +
        fmt(elapsed) +
        " s.";
      lines.push(
        "",
        owner +
          " Gateway readiness took " +
          fmt((r.gatewayReady - r.coldStart) / 1000) +
          " s. With " +
          r.reopenConcurrency +
          " concurrent opens, per-database open plus verified read p50/p99 was " +
          fmt(quantile(ts, 0.5)) +
          " / " +
          fmt(quantile(ts, 0.99)) +
          " ms (n=100).",
      );
    }
    lines.push("");
  }
  for (const [item, alignment] of [
    [3, undefined],
    [3, "staggered"],
    [3, "coincident"],
    [4, undefined],
  ] as const) {
    const side = (name: string) =>
      runs
        .filter(
          (r) =>
            r.attempt.item === item &&
            r.attempt.live === alignment &&
            r.attempt.layout === name &&
            !r.attempt.groupControl &&
            r.summary?.tenants,
        )
        .at(-1);
    const pooled = side("pooled"),
      separate = side("separate");
    if (!pooled || !separate) continue;
    const logical = (run: Run) =>
      Object.assign({}, ...run.summary.perScope.map((p: any) => p.deep.logicalTraces));
    assert.deepEqual(logical(pooled), logical(separate));
    assert.deepEqual(pooled.attempt.cpus, separate.attempt.cpus);
    const reason =
      [
        ...pooled.summary.invalid,
        ...separate.summary.invalid,
        ...(pooled.attempt.source === separate.attempt.source
          ? []
          : ["different runtime revisions"]),
      ].join(", ") || null;
    lines.push(
      "## Direct comparison, item " + item,
      "",
      "The numerator uses one database. The denominator uses a database per account. Each ratio compares the quiet account during the same phase of each topology.",
      "",
      "| Phase | Commit p99 ratio | Read p99 ratio | Feed-lag p99 ratio |",
      "| --- | --- | --- | --- |",
    );
    for (const x of pooled.summary.tenants.windows) {
      const y = separate.summary.tenants.windows.find((w: any) => w.name === x.name);
      assert(y);
      const values = ["commit", "read", "feed"].map((k) => {
        const a = histogramDistribution(Histogram.fromJSON(x.quietHistograms[k]), k),
          b = histogramDistribution(Histogram.fromJSON(y.quietHistograms[k]), k);
        const r = ratioBar("layout/" + item + "/" + x.name + "/" + k, a, b, 1.25, {
          minimum: k === "commit" ? 500 : 1,
          invalid: reason,
        });
        return r.value === null
          ? "—"
          : fmt(r.value) +
              "× (n=" +
              r.n +
              "/" +
              r.denominatorN +
              (r.interval90
                ? ", 90% [" + fmt(r.interval90.low) + ", " + fmt(r.interval90.high) + "]"
                : "") +
              ")" +
              (reason ? " unjudged" : "");
      });
      lines.push("| " + [x.name, ...values].join(" | ") + " |");
    }
    lines.push("");
  }
  for (const treatment of runs.filter((r) => r.attempt.groupControl && r.summary?.tenants)) {
    const control = runs.find((r) => r.tag === treatment.attempt.groupControl);
    assert(
      control &&
        control.attempt.live === treatment.attempt.live &&
        control.attempt.source === treatment.attempt.source &&
        !control.attempt.groupControl,
    );
    assert.deepEqual(control.attempt.cpus, treatment.attempt.cpus);
    assert.deepEqual(control.attempt.spec, treatment.attempt.spec);
    assert.equal(control.attempt.live, treatment.attempt.live);
    assert.equal(control.groupSettings?.gatewayImage, treatment.groupSettings?.gatewayImage);
    assert.deepEqual(
      control.summary.perScope[0].deep.logicalTraces,
      treatment.summary.perScope[0].deep.logicalTraces,
    );
    assert.equal(
      control.summary.perScope[0].deep.seed.sha256,
      treatment.summary.perScope[0].deep.seed.sha256,
    );
    lines.push(
      treatment.attempt.live
        ? "## Group commit with " + treatment.attempt.live + " field-save peaks"
        : "## Group commit with all ten accounts bursting",
      "",
      "Both arms replayed the same preceding windows. Native transaction IDs identify saves grouped into a single durable transaction. Commands carry the frozen profile’s subject and account identity. The gateway shares one scheduling class for unnamespaced entities without per-entity membership hints.",
      "",
      "| Gateway option | Logical ACKs / seconds | Saves/s | Native transactions/s | Multi-save transactions | Fact changes/s | Pooled commit p99 ms | Judgement |",
      "| --- | --- | ---: | ---: | ---: | ---: | --- | --- |",
    );
    const peakName = treatment.attempt.live ? livePeakWindow(treatment.attempt.live) : "all-burst";
    for (const s of [control, treatment]) {
      const enable = Boolean(s.attempt.groupControl),
        g = s.groupSettings;
      assert(
        g?.source === s.attempt.source &&
          g.nonce === s.attempt.nonce &&
          g.slot === s.attempt.slot &&
          g.enabled === enable,
      );
      const w = s.summary.tenants.windows.find((v: any) => v.name === peakName),
        q = s.summary.perScope[0].deep.allBurstQueue;
      assert(w && q && q.expected === w.acked && q.from === w.from && q.to === w.to);
      const p = w.pooled.commit;
      lines.push(
        "| " +
          [
            enable ? "On" : "Off",
            w.acked + " / " + fmt(w.seconds),
            fmt(w.sustainedCommitsPerS),
            q.qualified ? fmt(q.physicalPerS) : "unjudged",
            q.qualified ? q.multiCommandTransactions : "unjudged",
            q.qualified ? fmt(q.changedFactsPerS) : "unjudged",
            metric({ value: p.p99Ms, n: p.n, interval90: p.interval90 }),
            s.summary.invalid.length ? "Unjudged · " + s.summary.invalid.join(", ") : "Observed",
          ].join(" | ") +
          " |",
      );
    }
    lines.push("");
    const speeds = [control, treatment].map((s) => {
      const w = s.summary.tenants.windows.find((v: any) => v.name === peakName);
      return (
        fmt(w.sustainedCommitsPerS) + " saves/s (" + w.acked + " ACKs in " + fmt(w.seconds) + " s)"
      );
    });
    owner =
      (treatment.attempt.live
        ? "The " + treatment.attempt.live + " field-save peak sustained "
        : "The ten-account burst sustained ") +
      speeds[0] +
      " with grouping off and " +
      speeds[1] +
      " with grouping on." +
      ([control, treatment].some((s) => s.summary.invalid.length)
        ? " The comparison is unjudged."
        : "");
  }
  fs.writeFileSync(file, lines.join("\n") + "\n");
  return (
    owner ||
    (runs.length
      ? "Scope-level interference observations are available."
      : "Activation write counts and measured durations are available for both releases.")
  );
}
