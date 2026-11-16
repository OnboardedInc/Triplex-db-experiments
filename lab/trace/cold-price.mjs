// @ts-nocheck -- [DX-T1-12] Why: checked sealed-run inputs price cold diagnostics without inventing acceptance. Rejected: hand-edited tables or wall-clock joins to Mac samples.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { pathToFileURL } from "node:url";
import { percentile, alignClockRecord } from "./report.mjs";
import { verdictEnd, verdictMs } from "./instrument.mjs";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const q = (xs) => ({ n: xs.length, p50: percentile(xs, 0.5), p99: percentile(xs, 0.99) });
export function gapPrices(rows, gaps, count) {
  const primary = rows.filter((w) => w.stream === "background" && !w.resend);
  if (
    new Set(primary.map((w) => w.commandId)).size !== primary.length ||
    primary.some(
      (w) => w.expired || w.outcome !== "committed" || w.facts !== 10 || w.attempts !== 1,
    )
  )
    throw Error("Changed or unfinished gap cohort");
  primary.forEach(verdictMs);
  return gaps.map((gap) => {
    const ws = primary.filter((w) => !w.idleWarmup && w.idleGapMs === gap);
    if (ws.length !== count) throw Error("Incomplete gap population");
    return {
      gap,
      ack: q(ws.map(verdictMs)),
      ackService: q(ws.map((w) => verdictEnd(w) - w.startedAt)),
      finish: q(ws.map((w) => w.latencyMs)),
      transact: q(ws.map((w) => w.transactReturnedAt - w.transactCalledAt)),
    };
  });
}
export function adjacentPrices(runs) {
  return runs.flatMap((r, i) => {
    if (!["six", "warmup", "warmup-reverse", "threshold"].includes(r.mode)) return [];
    if (!runs[i - 1] || !runs[i + 1] || runs[i - 1].mode !== runs[i + 1].mode)
      throw Error("Missing adjacent controls");
    return [
      {
        candidate: r.tag,
        controls: [runs[i - 1].tag, runs[i + 1].tag],
        groups: r.groups.map((g) => {
          const before = runs[i - 1].groups.find((x) => x.gap === g.gap)?.ackService.p50,
            after = runs[i + 1].groups.find((x) => x.gap === g.gap)?.ackService.p50;
          if (!Number.isFinite(before) || !Number.isFinite(after))
            throw Error("Controls use different gaps");
          return {
            gap: g.gap,
            before,
            after,
            value: g.ackService.p50,
            gainMs: (before + after) / 2 - g.ackService.p50,
            bookendDriftMs: Math.abs(before - after),
          };
        }),
      },
    ];
  });
}
export async function priceSession(base, prefix) {
  const computationFiles = [
    import.meta.url,
    new URL("./instrument.mjs", import.meta.url),
    new URL("./report.mjs", import.meta.url),
  ].map((url) => ({ url, sha256: sha(fs.readFileSync(new URL(url))) }));
  if (!/^tx2-dxt1-[a-z0-9-]+$/.test(prefix)) throw Error("Invalid owned session");
  const session = path.join(base, prefix + "-session"),
    source = fs.readFileSync(path.join(session, "head.txt"), "utf8").trim(),
    modes = fs.readFileSync(path.join(session, "modes.txt"), "utf8").trim().split(/\s+/);
  if (
    ![
      "eight six eight six eight",
      "plain warmup plain threshold plain warmup-reverse plain",
    ].includes(modes.join(" "))
  )
    throw Error("Unknown diagnostic protocol");
  if (
    JSON.parse(
      fs.readFileSync(path.join(session, "cpu-restore.jsonl"), "utf8").trim().split("\n").at(-1),
    ).after !== "0-7" ||
    fs.readFileSync(path.join(session, "remaining.txt"), "utf8").trim()
  )
    throw Error("Unproven cleanup");
  const runs = [],
    inputs = [];
  let build;
  for (let i = 0; i < modes.length; i++) {
    const mode = modes[i],
      tag = `${prefix}-${i + 1}-${mode}`,
      dir = path.join(base, tag),
      seal = fs.readFileSync(path.join(dir, "SHA256SUMS")),
      hashes = new Map(
        seal
          .toString()
          .trim()
          .split("\n")
          .map((l) => [l.slice(66), l.slice(0, 64)]),
      );
    const read = (name) => {
      const file = path.join(dir, name),
        bytes = fs.readFileSync(file),
        digest = sha(bytes);
      if (digest !== hashes.get(name)) throw Error("Unsealed input " + name);
      inputs.push({ file, sha256: digest });
      return bytes;
    };
    const b = JSON.parse(read("driver/ns-report.json")),
      m = JSON.parse(read("trace-run.json")),
      t = JSON.parse(read("trace-summary.json"));
    if (
      b.status !== "DONE" ||
      b.finalizationErrors.length ||
      !b.config.zeroReaders ||
      !b.config.readerLadderOnly ||
      b.config.idleKeep !== "none" ||
      b.config.probe10PerS !== 0 ||
      b.seed.seededSubjects !== 10000 ||
      m.source !== source ||
      m.tag !== tag ||
      m.slot !== tag ||
      m.session !== prefix ||
      !t.complete ||
      t.errors.length ||
      b.oracle.status !== "NOT-RUN"
    )
      throw Error("Unbound/incomplete diagnostic");
    if (
      fs.readFileSync(path.join(session, `${i + 1}-exit.txt`), "utf8").trim() !== "0" ||
      fs.readFileSync(path.join(session, `${i + 1}-remaining.txt`), "utf8").trim()
    )
      throw Error("Failed arm cleanup");
    const buildHash = sha(read("source-build-hashes.json"));
    if (build && build !== buildHash) throw Error("Build changed");
    build = buildHash;
    const all = read("driver/ns-writes.jsonl").toString().trim().split("\n").map(JSON.parse),
      primary = all.filter((w) => w.stream === "background" && !w.resend),
      warm = b.config.idleWarmupCommits;
    if (
      warm !== (["warmup", "warmup-reverse"].includes(mode) ? 5000 : 200) ||
      primary.length !== warm + b.config.idleCommits * b.config.idleGapsMs.length ||
      b.correctness.reads !== primary.length ||
      b.correctness.correct !== primary.length ||
      b.correctness.errors ||
      b.correctness.violations
    )
      throw Error("Changed prefix/readback population");
    const groups = gapPrices(all, b.config.idleGapsMs, b.config.idleCommits),
      raw = read("trace/SHA256SUMS"),
      requests = [],
      events = [],
      host = [];
    for (const name of hashes.keys())
      if (/^trace\/raw\/.*\.jsonl\.gz$/.test(name)) {
        const bytes = read(name);
        for (const line of gunzipSync(bytes).toString().trim().split("\n")) {
          if (!line) continue;
          const r = JSON.parse(line);
          if (r.run !== tag || r.source !== source || r.slot !== tag)
            throw Error("Foreign trace input");
          if (r.type === "request") requests.push(r);
          if (r.type === "event") events.push(r);
          if (r.process === "system-darwin" && r.type === "resource") host.push(r);
        }
      }
    const writer = requests.find((r) => r.name === "driver.commit" && r.thread === 0),
      reference = writer?.clock;
    if (!reference) throw Error("No writer clock");
    const aligned = events.map((r) => alignClockRecord(r, reference)),
      firstGap = Math.min(...primary.filter((w) => !w.idleWarmup).map((w) => w.scheduledAt)),
      warmIds = new Set(primary.filter((w) => w.idleWarmup).map((w) => w.traceId));
    const ryow = requests
      .filter((r) => r.name === "driver.ryow" && warmIds.has(r.attributes?.commitTraceId))
      .map((r) => alignClockRecord(r, reference));
    const compiles = aligned.filter((e) => e.name === "jdk.Compilation"),
      byRole = {};
    const sorted = primary.toSorted((a, b) => verdictEnd(a) - verdictEnd(b));
    const after = (e, n) =>
      sorted.length >= n && e.end > verdictEnd(sorted[n - 1]) && e.end <= verdictEnd(sorted.at(-1));
    for (const role of ["tx", "gw-w", "gw-r"]) {
      const es = compiles.filter((e) => e.process === role),
        qualified = es.filter((e) => e.clockAlignmentQualified !== false);
      byRole[role] = {
        events: es.length,
        qualified: qualified.length,
        c2: es.filter((e) => e.fields?.compiler === "c2").length,
        after1000: sorted.length >= 1000 ? qualified.filter((e) => after(e, 1000)).length : null,
        after5000: sorted.length >= 5000 ? qualified.filter((e) => after(e, 5000)).length : null,
        criticalC2After1000: qualified
          .filter(
            (e) =>
              after(e, 1000) &&
              e.fields?.compiler === "c2" &&
              /datomic|triplex|artemis|postgres/.test(e.compiledMethod ?? ""),
          )
          .map((e) => e.compiledMethod),
        methods: [
          ...new Set(qualified.filter((e) => after(e, 1000)).map((e) => e.compiledMethod)),
        ].slice(0, 40),
      };
    }
    const gateway = new Map(
      requests
        .filter((r) => r.name.startsWith("gateway ") && r.name.endsWith("/transact"))
        .map((r) => [r.traceId, r]),
    );
    for (const g of groups) {
      const ws = primary.filter((w) => !w.idleWarmup && w.idleGapMs === g.gap);
      g.peerWait = q(
        ws
          .map((w) =>
            gateway
              .get(w.traceId)
              ?.spans.filter((s) => s.layer === "peer-wait" && s.name.includes("transact"))
              .reduce((n, s) => n + s.end - s.start, 0),
          )
          .filter(Number.isFinite),
      );
    }
    runs.push({
      tag,
      mode,
      source,
      level: m.level,
      rawSealSha256: sha(raw),
      host: {
        scope: "Whole arm only; Mac clocks are not aligned to guest phase windows",
        nonVmCpu: q(host.map((h) => h.otherCpu).filter((x) => Number.isFinite(x) && x >= 0)),
        swapGiB: q(
          host
            .map((h) => Number(/used = ([0-9.]+)M/.exec(h.swap)?.[1]) / 1024)
            .filter(Number.isFinite),
        ),
      },
      groups,
      compilation: byRole,
      prefixDrain: {
        scope:
          "Read traces are sampled: positive overlaps prove carry-over; missing or non-overlapping samples cannot prove complete drainage.",
        expectedRyow: warm,
        observedRyow: ryow.length,
        unqualifiedRyow: ryow.filter((r) => r.clockAlignmentQualified === false).length,
        endsAfterFirstGap: ryow.filter(
          (r) => r.clockAlignmentQualified !== false && r.end > firstGap,
        ).length,
        lastRyowMinusFirstGapMs: ryow.length
          ? Math.max(...ryow.map((r) => r.end)) - firstGap
          : null,
      },
    });
  }
  for (const input of inputs)
    if (sha(fs.readFileSync(input.file)) !== input.sha256)
      throw Error("Input changed during analysis");
  for (const c of computationFiles)
    if (sha(fs.readFileSync(new URL(c.url))) !== c.sha256)
      throw Error("Computation source changed");
  return {
    schema: "triplex.cold-price/1",
    source,
    scope:
      "Sealed same-session diagnosis only; 150 commits per gap are UNJUDGED for a performance bar. Zero-reader oracle is NOT-RUN. Compiler chronology requires qualified guest clocks.",
    runs,
    comparisons: adjacentPrices(runs),
    inputs: inputs.map((x) => ({ ...x, file: path.relative(base, x.file) })),
    computationSha256: sha(fs.readFileSync(new URL(import.meta.url))),
    computationFiles: computationFiles.map((c) => ({
      file: path.basename(new URL(c.url).pathname),
      sha256: c.sha256,
    })),
  };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [base, prefix, out] = process.argv.slice(2);
  const result = await priceSession(base, prefix);
  fs.writeFileSync(out, JSON.stringify(result, null, 2) + "\n", { flag: "wx" });
  console.log(
    JSON.stringify({
      runs: result.runs.map((r) => ({
        tag: r.tag,
        host: r.host,
        drain: r.prefixDrain,
        groups: r.groups.map((g) => ({
          gap: g.gap,
          ack: g.ack.p50,
          service: g.ackService.p50,
          peer: g.peerWait.p50,
        })),
      })),
      comparisons: result.comparisons,
    }),
  );
}
