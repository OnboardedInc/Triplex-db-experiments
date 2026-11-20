import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { factsFor, layoutOf } from "./plan.ts";

type Trial = {
  tag: string;
  attempt: any;
  terminal: any;
  seed?: any;
  decision?: any;
  restored?: any;
  loaderProgress?: any;
  decisionResources?: any[];
  telemetry?: any;
};
const roles = ["tx", "pg", "gw-w", "gw-r"] as const;
const sameAttempt = (a: any, x: any) =>
  x?.source === a.source && x.slot === a.slot && x.nonce === a.nonce;
type SeedSample = {
  at: number;
  scope: number;
  persons: number;
  commands: number;
  facts: number;
  bytes: number;
  resources: Record<(typeof roles)[number], { peak: number }>;
};
const fmt = (v: unknown, precision = 2) =>
  typeof v === "number" && Number.isFinite(v) ? v.toFixed(precision) : "unmeasured";
const metric = (x: any, stem: "p50" | "p99") => {
  if (!x || typeof x[stem] !== "number") return "unmeasured";
  const ci = x[stem === "p50" ? "interval50" : "interval99"];
  return (
    fmt(x[stem]) +
    " (n=" +
    x.n +
    (ci ? ", 90% [" + fmt(ci.low) + ", " + fmt(ci.high) + "]" : "") +
    ")"
  );
};
const ratio = (r: any) =>
  !Number.isFinite(r?.value)
    ? "unmeasured (n=" + (r?.n ?? 0) + "/" + (r?.denominatorN ?? 0) + ")"
    : fmt(r.value) +
      "× (n=" +
      r.n +
      "/" +
      r.denominatorN +
      (r.interval90
        ? ", 90% [" + fmt(r.interval90.low) + ", " + fmt(r.interval90.high) + "]"
        : "") +
      (r.pass === null ? ", descriptive" : "") +
      ")";

function seedProgress(t: Trial, lines: string[]) {
  const a = t.attempt;
  const terminalAt = Date.parse(t.terminal.endedAt);
  assert(Number.isFinite(terminalAt) && terminalAt >= a.at);
  const pins = JSON.parse(
    fs.readFileSync(
      path.join(import.meta.dirname, a.layout === "single" ? "single-pins.json" : "pins.json"),
      "utf8",
    ),
  );
  const population = pins.items.find((p: any) => p.seed.people === a.people)?.seed.digest;
  const scope = layoutOf(a.layout).map((accounts) => ({
    people: accounts.length * a.people,
    facts: accounts.length * factsFor(a.people),
    samples: [] as SeedSample[],
  }));
  // [DX-SCALE1] Why: a failed seed leaves valid acknowledged progress with a measured clock.
  // Rejected: counting projected rows as committed or using a later scope's samples as an earlier scope's throughput.
  for (const s of t.loaderProgress?.records ?? []) {
    const limit = scope[s.scope];
    if (
      !limit ||
      !population ||
      !sameAttempt(a, s) ||
      s.population !== population ||
      s.people !== a.people ||
      s.layout !== a.layout ||
      !Number.isFinite(s.at) ||
      s.at < a.at ||
      s.at > terminalAt
    )
      continue;
    assert(Number.isSafeInteger(s.persons) && s.persons >= 0 && s.persons <= limit.people);
    assert(Number.isSafeInteger(s.facts) && s.facts >= 0 && s.facts <= limit.facts);
    assert(Number.isSafeInteger(s.commands) && s.commands >= 0);
    const last = limit.samples.at(-1);
    assert(
      !last ||
        (s.at > last.at &&
          s.persons >= last.persons &&
          s.facts >= last.facts &&
          s.commands >= last.commands),
    );
    limit.samples.push(s);
  }
  const records = scope.flatMap((s) => s.samples);
  if (!records.length) return;
  const rate = (a: SeedSample, b: SeedSample) =>
    a === b
      ? "unmeasured"
      : fmt(((b.facts - a.facts) * 1000) / (b.at - a.at)) +
        " (n=" +
        (b.commands - a.commands) +
        " frames, " +
        fmt((b.at - a.at) / 1000, 1) +
        " s)";
  lines.push(
    "Loader checkpoints record acknowledged progress before the independent claim and feed verification.",
    "",
    "| Scope | Latest sampled people | Latest sampled facts | Early facts/s | Late facts/s | PostgreSQL GiB at last sample |",
    "| ---: | ---: | ---: | --- | --- | ---: |",
  );
  for (const [i, s] of scope.entries()) {
    const first = s.samples[0],
      last = s.samples.at(-1);
    if (!first || !last) continue;
    const samples = s.samples;
    lines.push(
      "| " +
        [
          i + 1,
          last.persons,
          last.facts,
          rate(first, samples[Math.min(5, samples.length - 1)]!),
          rate(samples[Math.max(0, samples.length - 6)]!, last),
          fmt(last.bytes / 1024 ** 3),
        ].join(" | ") +
        " |",
    );
  }
  const peaks = roles.map((role) =>
    Math.max(...records.map((s) => s.resources?.[role]?.peak ?? 0)),
  );
  lines.push(
    "",
    "Observed ingest cgroup peaks in GiB, from " + records.length + " progress snapshots.",
    "",
    "| Transactor | PostgreSQL | Write gateway | Read gateway |",
    "| ---: | ---: | ---: | ---: |",
    "| " + peaks.map((n) => (n > 0 ? fmt(n / 1024 ** 3) : "unmeasured")).join(" | ") + " |",
    "",
  );
}

function recordPredictions(dir: string, trials: Trial[]) {
  const file = path.join(dir, "PREDICTIONS.md");
  if (!fs.existsSync(file)) return;
  const rows = fs.readFileSync(file, "utf8").split("\n");
  const separator = "<br>Observed ";
  const writeRow = (key: string, column: number, observation: string) => {
    const row = rows.findIndex((line) => line.startsWith("| " + key + " |"));
    assert(row >= 0, "Missing forecast for " + key);
    const columns = rows[row]!.split("|");
    const forecast = columns[column]?.split(separator)[0]?.trimEnd();
    assert(forecast);
    columns[column] = forecast + separator + observation + " ";
    rows[row] = columns.join("|");
  };
  // [DX-SCALE1] Why: put source-bound observations beside the original forecast for each tested cell. Rejected: replacing the forecast or adding a retrospective prediction.
  for (const t of trials) {
    const a = t.attempt,
      seed = t.seed,
      measurement = t.decision;
    if (a.phase === "seed") {
      const key =
        a.layout === "single"
          ? "Single-account image"
          : a.people === 10000
            ? "Small pooled image"
            : a.layout === "pooled"
              ? "Full pooled image"
              : "Full split image";
      writeRow(
        key,
        2,
        seed && t.terminal.service === "success"
          ? fmt(seed.ingestMs / 3600000) +
              " h at " +
              fmt((1000 * seed.facts) / seed.ingestMs) +
              " facts/s. " +
              t.tag +
              "."
          : t.tag + " ended with " + t.terminal.service + ".",
      );
      continue;
    }
    if (!measurement || t.terminal.service !== "success") continue;
    if (a.layout === "single") {
      for (const c of measurement.cells)
        writeRow(
          "Single " + c.cell,
          a.withReaders ? 4 : 3,
          fmt(c.goodput, 2) +
            "/s (n=" +
            c.inWindow +
            "), " +
            fmt(c.writes.p50) +
            "/" +
            fmt(c.writes.p99) +
            " ms. [Cell results](DECISION-RESULTS.md)",
        );
      continue;
    }
    if (a.isolation) {
      for (const comparison of measurement.comparisons) {
        const rate = comparison.rate;
        const cells = measurement.cells.filter((c: any) => c.cell === rate);
        assert.equal(cells.length, 12);
        const total = (field: string) => cells.reduce((n: number, c: any) => n + c[field], 0);
        writeRow(
          "ISO " + rate,
          a.mode === "prepared" ? 3 : 2,
          fmt(total("inWindow") / total("seconds")) +
            "/s (n=" +
            total("inWindow") +
            "), " +
            total("preDispatchExpiry") +
            " pre-dispatch expiries, quiet save p99 " +
            ratio(comparison.ratios[0]) +
            ". [Cell results](DECISION-RESULTS.md)",
        );
      }
      continue;
    }
    const column =
      a.people === 10000 ? 2 : (a.layout === "pooled" ? 3 : 5) + Number(a.mode === "prepared");
    for (const comparison of measurement.comparisons) {
      const rate = comparison.rate;
      const results = measurement.cells.filter((c: any) => c.cell === rate);
      assert(results.length === 2);
      writeRow(
        String(rate),
        column,
        results
          .map(
            (c: any) =>
              fmt(c.goodput, 1) +
              "/s (n=" +
              c.inWindow +
              "), " +
              fmt(c.writes.p50) +
              "/" +
              fmt(c.writes.p99) +
              " ms",
          )
          .join(" and ") +
          ". Quiet save p99 " +
          ratio(comparison.ratios[0]) +
          ". [Cell results](DECISION-RESULTS.md)",
      );
    }
  }
  fs.writeFileSync(file, rows.join("\n"));
}

export function placementReport(dir: string, trials: Trial[]) {
  if (!trials.length) return "";
  const lines = [
    "# Decision cells",
    "",
    "Offered rate and goodput use the same rated interval. The historical pilot uses 90-second cells. The full-size one-database study uses 12 five-minute pairs per rate and writer policy. The single account uses 150, 120, 300 and 60 seconds at 3.5, 4.9, 23.5 and 39.4/s, from the same image with and without a 600-second reader dose. p50 and p99 use original durable acknowledgements. Expiry is before SDK dispatch. The sentinel keeps 3.5/s and replays 64 pinned reader seats in both conditions. Every durable feed change is checked.",
    "",
    "The primary budget requires p50 ≤10 ms, p99 ≤50 ms, all primary dispositions exact with no expiry, rejection or missing offers, at least 99% of ACKs in the window and at most 1 s of drain. The quiet p99 bar is ≤1.25× for saves, pinned reads and feed lag. November 20 ruling uses one database. Full-size paired intervals preserve five-minute windows, with adjacent-pair blocks as sensitivity.",
    "",
  ];
  const pooled: { tag: string; mode: string; people: number; summary: any }[] = [];
  const single: Trial[] = [];
  for (const t of trials) {
    const d = t.decision,
      a = t.attempt,
      seed = t.seed;
    const binding = (x: any) => assert(sameAttempt(a, x));
    binding(t.terminal);
    lines.push(
      "## " + t.tag,
      "",
      a.people +
        " deep people per account, " +
        a.layout +
        " layout, " +
        a.mode +
        " writer" +
        (a.layout === "single" && a.phase === "cells"
          ? a.withReaders
            ? " with 64 reader seats"
            : " with zero readers"
          : "") +
        ". Source `" +
        a.source +
        "`. " +
        (t.terminal.writerRelease === "WFIX1" ? "Audited write path." : "Unfixed write path."),
      "",
    );
    if (seed && t.terminal.service === "success") {
      binding(seed);
      assert(
        seed.people === a.people &&
          seed.facts === layoutOf(a.layout).flat().length * factsFor(a.people) &&
          seed.completed >= seed.started &&
          seed.started >= a.at,
      );
      lines.push(
        seed.facts.toLocaleString("en-US") +
          " current facts across " +
          seed.scopes.length +
          " database(s). Ingest took " +
          fmt(seed.ingestMs / 3600000) +
          " hours at " +
          fmt((1000 * seed.facts) / seed.ingestMs) +
          " facts/s. Exact claim and feed verification took " +
          fmt(seed.verifyMs / 3600000) +
          " hours. PostgreSQL added " +
          fmt(seed.disk.bytesPerFact) +
          " bytes per fact (one physical seed).",
        "",
      );
    }
    if (a.phase === "seed" && t.loaderProgress) seedProgress(t, lines);
    if (!d || t.terminal.service !== "success") {
      if (!seed || t.terminal.service !== "success")
        lines.push(
          "Terminal status " +
            t.terminal.service +
            ". Cells with a sealed writer ledger " +
            (t.terminal.timedFiles ?? 0) +
            ". Matched decision unmeasured.",
          "",
        );
      continue;
    }
    binding(d);
    assert(
      d.mode === a.mode &&
        d.from === a.from &&
        d.cells.length === (a.isolation ? 96 : a.layout === "single" ? 4 : 10) &&
        d.comparisons.length === (a.layout === "single" ? 0 : 4),
    );
    lines.push(
      "| Cell | Offered/s | Durable ACKs/s (n) | Pre-dispatch expiry | Missing | Refused / uncertain / recovered | p50 ms | p99 ms | Quiet save p99 ms | Reader p99 ms | Feed p99 ms | ACK / disposition drain ms |",
      "| --- | ---: | --- | ---: | ---: | ---: | --- | --- | --- | --- | --- | ---: |",
    );
    for (const c of d.cells)
      lines.push(
        "| " +
          [
            c.label,
            fmt(c.offered),
            fmt(c.goodput) +
              " (n=" +
              c.inWindow +
              (c.goodputInterval90
                ? ", 90% [" +
                  fmt(c.goodputInterval90.low) +
                  ", " +
                  fmt(c.goodputInterval90.high) +
                  "]"
                : "") +
              ")",
            c.preDispatchExpiry,
            c.missing,
            [c.refused, c.uncertain, c.recovered].join(" / "),
            metric(c.writes, "p50"),
            metric(c.writes, "p99"),
            metric(c.quiet, "p99"),
            metric(c.read, "p99"),
            metric(c.feed, "p99"),
            fmt(c.drainMs) + " / " + fmt(c.dispositionDrainMs),
          ].join(" | ") +
          " |",
      );
    if (a.layout !== "single")
      lines.push(
        "",
        "| Offered/s | Quiet save ratio | Quiet read ratio | Quiet feed ratio | All loaded cells within absolute budget |",
        "| ---: | --- | --- | --- | --- |",
      );
    for (const c of d.comparisons)
      lines.push(
        "| " +
          [c.rate, ...c.ratios.map(ratio), c.completeCapacity ? "yes" : "no"].join(" | ") +
          " |",
      );
    if (a.isolation) {
      lines.push(
        "",
        "| Offered/s | Metric | Paired p99 ms loaded / alone | Paired 90% | Adjacent-pair 90% | Log SE | Leave-one-pair-out | Compatible with 1.25 / 2 | All three upper limits ≤1.25 |",
        "| ---: | --- | --- | --- | --- | ---: | --- | --- | --- |",
      );
      const interval = (p: any) => (p ? "[" + fmt(p.low) + ", " + fmt(p.high) + "]" : "unmeasured");
      for (const c of d.comparisons)
        for (const [i, r] of c.ratios.entries()) {
          const p = r.paired;
          lines.push(
            "| " +
              [
                c.rate,
                ["save", "read", "feed"][i],
                p ? fmt(p.loadedP99) + " / " + fmt(p.aloneP99) : "unmeasured",
                interval(p?.primary),
                interval(p?.longer),
                fmt(p?.primary.logSE),
                p ? p.leaveOnePairOut.map((x: number) => fmt(x)).join("–") : "unmeasured",
                p
                  ? [p.compatibleWith125, p.compatibleWith200]
                      .map((b) => (b ? "yes" : "no"))
                      .join(" / ")
                  : "unmeasured",
                p ? (c.family95Within125 ? "yes" : "no") : "unmeasured",
              ].join(" | ") +
              " |",
          );
        }
      const telemetry = t.telemetry;
      assert(sameAttempt(a, telemetry));
      lines.push(
        "",
        "Effective JVMs from the restored process startup logs.",
        "",
        "| JVM | Collector | Available cores | Captured pauses |",
        "| --- | --- | ---: | ---: |",
      );
      for (const [role, j] of Object.entries(telemetry.jvms as Record<string, any>))
        lines.push("| " + [role, j.collector, j.activeProcessors, j.pauses].join(" | ") + " |");
      lines.push(
        "",
        "| Cell | HTTP trace / native completion joined | ACKs |",
        "| --- | ---: | ---: |",
      );
      for (const c of d.cells) {
        const capture = telemetry.cells[c.label];
        assert.equal(capture.acked, c.acked);
        lines.push(
          "| " +
            [c.label, capture.gatewayJoined + " / " + capture.nativeJoined, c.acked].join(" | ") +
            " |",
        );
      }
      lines.push(
        "",
        "Absolute GC logs and per-save offer, socket, gateway, native and reply clocks are in the raw archive. The compact capture gives every join denominator and keeps seven ranked quiet saves per window. Missing joins leave that stage unmeasured. Native entry uses a millisecond transaction stamp.",
        "",
      );
    }
    lines.push("");
    lines.push(
      "| Cell | SDK timer p99 ms | Admission p99 ms | Request send p99 ms | Gateway queue p99 ms | Preparation p99 ms | Native entry p99 ms | Native compute p99 ms | Logical saves / native tx |",
      "| --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    );
    for (const c of d.cells)
      lines.push(
        "| " +
          [
            c.label,
            ...[
              "timer",
              "admission",
              "requestSend",
              "gatewayQueue",
              "preparation",
              "nativeEntry",
              "nativeCompute",
            ].map((k) => metric(c.stages?.[k], "p99")),
            c.acked + c.recovered + " / " + c.nativeTransactions,
          ].join(" | ") +
          " |",
      );
    lines.push(
      "",
      "Separate WAL latency is unmeasured. Per-cell cgroup, storage and sender dose records are in the compact evidence.",
      "",
    );
    // [DX-SCALE1] Why: report per-role peaks only from the cell's sealed cgroup snapshots. Rejected: adding asynchronous role peaks or using heap caps as measured memory.
    const samples = (t.decisionResources ?? []).filter(
      (s) =>
        sameAttempt(a, s) &&
        s.population === d.population &&
        s.start >= a.at &&
        d.cells.some((c: any) => c.label === s.key && s.afterAt >= s.start + c.seconds * 1000),
    );
    if (samples.length) {
      lines.push(
        "Cgroup peaks in GiB through each sampled cell, including that arm's restore and startup.",
        "",
        "| Cell | Transactor | PostgreSQL | Write gateway | Read gateway |",
        "| --- | ---: | ---: | ---: | ---: |",
      );
      for (const c of d.cells) {
        const s = samples.find((x) => x.key === c.label);
        lines.push(
          "| " +
            [
              c.label,
              ...roles.map((role) => fmt((s?.after?.[role]?.peak ?? NaN) / 1024 ** 3)),
            ].join(" | ") +
            " |",
        );
      }
      lines.push("");
    }
    if (a.layout === "single") single.push(t);
    if (a.layout === "pooled")
      pooled.push({ tag: t.tag, mode: a.mode, people: a.people, summary: d });
  }
  const reader = single.filter((t) => t.attempt.withReaders).at(-1);
  const zero =
    reader &&
    single
      .filter((t) => {
        // [DX-SCALE1] Why: bracket the reader effect only across the sealed image and same frozen writer program. Rejected: comparing different sources or separately loaded seeds.
        return (
          !t.attempt.withReaders &&
          t.attempt.source === reader.attempt.source &&
          t.attempt.mode === reader.attempt.mode &&
          t.attempt.from === reader.attempt.from &&
          sameAttempt(t.attempt, t.restored?.identity) &&
          sameAttempt(reader.attempt, reader.restored?.identity) &&
          /^[a-f0-9]{64}$/.test(t.restored?.origin?.sha256 ?? "") &&
          t.restored.origin.sha256 === reader.restored?.origin?.sha256 &&
          t.decision.cells.every((c: any, i: number) => {
            const r = reader.decision.cells[i];
            return c.label === r.label && c.seconds === r.seconds && c.planned === r.planned;
          })
        );
      })
      .at(-1);
  if (reader && zero) {
    lines.push(
      "## Matched single-account reader dose",
      "",
      "Latency differences compare the two restores of the sealed image from " +
        zero.attempt.from +
        ". Each condition ran once.",
      "",
      "| Offered/s | Save p99 with readers / zero (n / n) | Feed p99 with readers / zero (n / n) |",
      "| ---: | --- | --- |",
    );
    for (const [i, r] of reader.decision.cells.entries()) {
      const z = zero.decision.cells[i];
      const compare = (key: "writes" | "feed") =>
        Number.isFinite(r[key].p99) && z[key].p99 > 0
          ? fmt(r[key].p99 / z[key].p99) + "× (" + r[key].n + " / " + z[key].n + ")"
          : "unmeasured";
      lines.push("| " + [r.offered, compare("writes"), compare("feed")].join(" | ") + " |");
    }
    lines.push("");
  }
  fs.writeFileSync(path.join(dir, "DECISION-RESULTS.md"), lines.join("\n").trimEnd() + "\n");
  recordPredictions(dir, trials);
  const recent = pooled.filter((r) => r.people === 100000).at(-1);
  if (!recent) {
    const pilot = pooled.filter((r) => r.people === 10000).at(-1);
    if (pilot) {
      // [DX-SCALE1] Why: report the first tested miss and keep the two populations distinct.
      // Rejected: inferring the full-size boundary from a smaller audited scope.
      const firstMiss = pilot.summary.comparisons.find(
        (c: any) => !c.completeCapacity || c.ratios.some((r: any) => r.pass !== true),
      );
      const quietMiss = pilot.summary.comparisons.find((c: any) => c.ratios[0]?.pass === false);
      const firstExpiry = pilot.summary.cells
        .filter((c: any) => c.preDispatchExpiry)
        .sort((a: any, b: any) => a.offered - b.offered)[0];
      return (
        "The audited 10,000-person-per-account pilot " +
        (quietMiss
          ? "had quiet save p99 " +
            ratio(quietMiss.ratios[0]) +
            " of alone at " +
            quietMiss.rate +
            "/s."
          : firstMiss
            ? "first missed or left unjudged a declared bar at " + firstMiss.rate + "/s."
            : "held the measured windows through 394/s.") +
        (firstExpiry
          ? " Pre-dispatch expiry first appeared at " + firstExpiry.offered + "/s."
          : "") +
        " Full-size placement remains unmeasured. [Decision cells](DECISION-RESULTS.md)"
      );
    }
    return "Full-size placement remains unmeasured. [Decision cells](DECISION-RESULTS.md)";
  }
  const first = recent.summary.comparisons.find(
    (c: any) => !c.completeCapacity || c.ratios.some((r: any) => r.pass !== true),
  );
  return first
    ? "At full size, the " +
        recent.mode +
        " pooled arm first missed or left unjudged a declared bar at " +
        first.rate +
        "/s. [Decision cells](DECISION-RESULTS.md)"
    : "The " +
        recent.mode +
        " pooled arm held the measured windows through 394/s. The 620/s headroom test remains unmeasured. [Decision cells](DECISION-RESULTS.md)";
}
