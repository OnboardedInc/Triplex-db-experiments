import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { factsFor } from "./plan.ts";

type Trial = {
  tag: string;
  attempt: any;
  terminal: any;
  seed?: any;
  decision?: any;
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
        a.people === 10000
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
    "Offered rate and goodput use the same 90-second wall interval. p50 and p99 use original durable acknowledgements. Expiry is before the SDK dispatch. Socket timing covers requests with a successful HTTP response. Refusals and ambiguous outcomes carry their own denominators. The quiet account keeps 3.5/s. Exactly 64 reader seats replay the same pinned tape in the quiet control and each loaded comparison. Full-source feed differences are checked at each durable position.",
    "",
    "The primary budget requires p50 ≤10 ms, p99 ≤50 ms, all primary dispositions exact with no expiry, rejection or missing offers, at least 99% of ACKs in the window and at most 1 s of drain. A quiet comparison requires 500 observations on each side and p99 ≤1.25× for saves, pinned reads and feed lag. The two layouts share one PostgreSQL, transactor JVM, physical cores and gateways. The two-database layout has two native commit pipelines inside that JVM.",
    "",
  ];
  const pooled: { tag: string; mode: string; summary: any }[] = [];
  for (const t of trials) {
    const d = t.decision,
      a = t.attempt,
      seed = t.seed;
    const binding = (x: any) =>
      assert(x.source === a.source && x.nonce === a.nonce && x.slot === a.slot);
    binding(t.terminal);
    lines.push(
      "## " + t.tag,
      "",
      a.people +
        " deep people per account, " +
        a.layout +
        " layout, " +
        a.mode +
        " writer. Source `" +
        a.source +
        "`.",
      "",
    );
    if (seed && t.terminal.service === "success") {
      binding(seed);
      assert(
        seed.people === a.people &&
          seed.facts === 10 * factsFor(a.people) &&
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
      d.mode === a.mode && d.from === a.from && d.cells.length === 10 && d.comparisons.length === 4,
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
    lines.push(
      "",
      "| Offered/s | Quiet save ratio | Quiet read ratio | Quiet feed ratio | Both absolute cells within budget |",
      "| ---: | --- | --- | --- | --- |",
    );
    for (const c of d.comparisons)
      lines.push(
        "| " +
          [c.rate, ...c.ratios.map(ratio), c.completeCapacity ? "yes" : "no"].join(" | ") +
          " |",
      );
    lines.push("");
    lines.push(
      "| Cell | SDK timer p99 ms | Admission p99 ms | Request send p99 ms | Gateway queue p99 ms | Native entry p99 ms | Native compute p99 ms | Logical saves / native tx |",
      "| --- | --- | --- | --- | --- | --- | --- | --- |",
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
    if (a.people === 100000 && a.layout === "pooled")
      pooled.push({ tag: t.tag, mode: a.mode, summary: d });
  }
  fs.writeFileSync(path.join(dir, "DECISION-RESULTS.md"), lines.join("\n").trimEnd() + "\n");
  recordPredictions(dir, trials);
  const recent = pooled.at(-1);
  if (!recent)
    return "Full-size placement remains unmeasured. [Decision cells](DECISION-RESULTS.md)";
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
