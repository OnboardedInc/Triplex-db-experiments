import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createReadStream, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createGunzip } from "node:zlib";
import { V3_OFFER_SECONDS, V3_PLAN_ID } from "../../../bench/lib/phases.ts";
import { generateTrace, traceDigest } from "../../../bench/lib/trace.ts";
import { checkV3Trace } from "../../../bench/lib/verdict-plan.ts";
import { commitBar } from "../../../bench/lib/verdict-statistics.ts";
import { VERDICT_CLOCK, verdictMs } from "../../../trace/instrument.mjs";
import { percentile, records } from "../../../trace/report.mjs";

const json = (file: string) => JSON.parse(readFileSync(file, "utf8"));
const text = (file: string) => readFileSync(file, "utf8").trim();
const number = (value: number | null) => (value == null ? "—" : value.toFixed(3));
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
const events = generateTrace({ seed: "ns-v2", subjects: 10_000, durationS: 7200 });
const plan = checkV3Trace(events);
const offered = events.filter((event) => event.atMs < V3_OFFER_SECONDS * 1000);
const key = (row: { seq: number; resend: boolean }) => `${row.seq}:${row.resend}`;
const expected = new Map(offered.map((event) => [key(event), event]));
const expectedPrimary = offered.filter((event) => !event.resend).length;
const expectedDuplicates = offered.length - expectedPrimary;
const expectedLost = offered.filter((event) => !event.resend && event.ackLoss).length;

async function digest(file: string) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest("hex");
}

async function verifyJournal(file: string, journal: any) {
  assert.equal(await digest(file), journal.archive.sha256, "journal archive bytes differ");
  const hash = createHash("sha256");
  let bytes = 0;
  for await (const chunk of createReadStream(file).pipe(createGunzip())) {
    hash.update(chunk);
    bytes += chunk.length;
  }
  assert(
    bytes === journal.bytes && hash.digest("hex") === journal.sha256,
    "decoded journal bytes differ",
  );
}

// [DX-DRV1] Why: the table verifies source-bound terminal bytes and recomputes the frozen ACK percentile.
// Rejected: comparing stale summaries, an incomplete offered cohort or the post-check finish clock.
async function readArm(
  source: string,
  runs: string,
  logs: string,
  tag: string,
  candidate: boolean,
) {
  assert.equal(text(path.join(logs, tag + ".exit")), "0", "controller failed or refused");
  const directory = path.join(runs, tag);
  const file = (relative: string) => path.join(directory, relative);
  const seals = new Map(
    text(file("SHA256SUMS"))
      .split("\n")
      .map((line) => [line.slice(66), line.slice(0, 64)]),
  );
  for (const name of [
    "head.txt",
    "source-build-hashes.json",
    "trace-run.json",
    "trace-summary.json",
    "driver/ns-report.json",
    "driver/ns-writes.jsonl",
    "WRITER-STATS.json",
  ])
    assert.equal(await digest(file(name)), seals.get(name), `sealed bytes differ for ${name}`);
  for (const kind of ["containers", "networks", "volumes"])
    assert.equal(text(file(`remaining-${kind}.txt`)), "", `owned ${kind} remained`);

  const run = json(file("trace-run.json")),
    report = json(file("driver/ns-report.json"));
  const trace = json(file("trace-summary.json")),
    writer = json(file("WRITER-STATS.json"));
  const pins = json(file("source-build-hashes.json"));
  const start = Number(text(path.join(logs, tag + ".started"))) * 1000;
  const end = Number(text(path.join(logs, tag + ".ended"))) * 1000 + 999;
  assert(
    start <= run.startedAt &&
      run.startedAt <= Date.parse(report.startedAt) &&
      Date.parse(report.startedAt) <= report.traceStartAbsMs &&
      report.traceStartAbsMs + V3_OFFER_SECONDS * 1000 <= Date.parse(report.endedAt) &&
      Date.parse(report.endedAt) <= end,
    "arm timestamps fall outside the controller bracket",
  );
  assert.equal(text(file("head.txt")), source);
  assert(
    run.tag === tag &&
      run.slot === tag &&
      run.source === source &&
      run.session === tag.slice(0, -2) &&
      run.hostPlatform === "linux-bare-metal" &&
      run.level === "summary",
    "arm identity differs",
  );
  assert(
    trace.complete &&
      trace.tag === tag &&
      trace.source === source &&
      writer.tag === tag &&
      writer.source === source &&
      writer.commands === expectedPrimary,
    "incomplete or foreign trace metrics",
  );
  for (const name of [
    "lab/bench/driver.ts",
    "lab/bench/lib/model-journal-thread.ts",
    "lab/bench/lib/receipt-capture.ts",
    "lab/bench/lib/replica-worker.ts",
    "lab/trace/instrument.mjs",
  ])
    assert(Object.hasOwn(report.benchSources, name), `missing driver source pin for ${name}`);
  for (const [name, sha] of Object.entries(report.benchSources)) {
    assert(
      /^(lab\/bench\/(lib\/)?[a-z0-9.-]+\.ts|lab\/trace\/instrument\.mjs)$/.test(name),
      "invalid driver source path",
    );
    assert.equal(sha, pins[name], `driver build manifest differs for ${name}`);
    assert.equal(sha, await digest(name), `checkout source differs for ${name}`);
  }

  const config = report.config;
  assert(
    report.status === "DONE" &&
      !report.finalizationErrors?.length &&
      !report.invalidReasons?.length &&
      report.seed?.seededSubjects === 10_000 &&
      config.rungSubjects === 10_000 &&
      config.zeroReaders &&
      config.profile === "v3" &&
      config.matchDurationS === V3_OFFER_SECONDS &&
      config.schedulerTiming === "precise" &&
      config.writerMaxInFlight === 32 &&
      config.writerDeadlineMs === 30_000 &&
      config.readPath === "replica" &&
      config.strictRecordClocks &&
      config.idleKeep === "none" &&
      config.devOverrides.length === 0 &&
      report.verdictClock === VERDICT_CLOCK &&
      report.verdictPlanId === V3_PLAN_ID &&
      report.trace.digest === traceDigest(events) &&
      report.verdictPlan.primaryPrefixSha256 === plan.primaryPrefixSha256,
    "run differs from the frozen v3 zero profile",
  );
  assert.equal(config.receiptCapture, candidate ? "replica-worker" : "sender");
  assert.equal(config.expectedStateRetention, candidate ? "worker-journal" : "heap");
  assert(
    report.writer.expired === 0 &&
      report.writer.pendingAtEnd === 0 &&
      report.writer.completed === report.writer.offered &&
      Math.abs(report.writer.offeredUntilTraceS - V3_OFFER_SECONDS) < 0.002,
    "writer did not finish every offer",
  );

  const timings = Array.from({ length: V3_OFFER_SECONDS }, () => ({ count: 0, late: 0, max: 0 }));
  const seen = new Set<string>(),
    positions = new Set<number>(),
    latencies: number[] = [];
  const bursts = Array.from({ length: 10 }, () => [] as number[]);
  for await (const row of records(file("driver/ns-writes.jsonl"))) {
    if (row.stream !== "background") continue;
    const id = key(row),
      event = expected.get(id);
    assert(
      event &&
        !seen.has(id) &&
        Math.abs(event.atMs - row.offsetMs) <= 0.001 &&
        Math.abs(row.scheduledAt - report.traceStartAbsMs - row.offsetMs) <= 0.001 &&
        event.subject === row.subject &&
        event.facts === row.facts &&
        event.kind === row.kind &&
        event.burst === row.burst &&
        event.ackLoss === row.ackLoss &&
        event.correction === row.correction,
      "missing, duplicate or substituted frozen offer",
    );
    seen.add(id);
    assert(row.expired === false);
    if (event.resend) {
      assert.equal(row.outcome, "duplicate-returned-original");
      continue;
    }
    assert(
      row.outcome === "committed" &&
        Number.isSafeInteger(row.position) &&
        !positions.has(row.position),
    );
    positions.add(row.position);
    assert(
      Number.isFinite(row.offeredAt) &&
        row.offeredAt >= row.scheduledAt &&
        row.offeredAt <= row.startedAt,
    );
    const latency = verdictMs(row),
      late = row.offeredAt - row.scheduledAt;
    latencies.push(latency);
    if (row.burst) {
      const { firstBurstAtS, burstPeriodS } = report.trace.params;
      bursts[Math.floor((row.offsetMs / 1000 - firstBurstAtS) / burstPeriodS)]!.push(latency);
    }
    const second = timings[Math.floor(event.atMs / 1000)]!;
    second.count++;
    second.late += late;
    second.max = Math.max(second.max, late);
  }
  assert.equal(seen.size, expected.size);
  assert.equal(latencies.length, expectedPrimary);
  const p2 = report.priorities.P2,
    p3 = report.priorities.P3;
  const counts = report.correctness,
    ryow = p2.readYourOwnWrite;
  assert(
    counts.errors === 0 &&
      counts.violations === 0 &&
      counts.reads === expectedPrimary &&
      counts.correct === expectedPrimary &&
      ryow.pulls === expectedPrimary &&
      ryow.correct === expectedPrimary &&
      p2.accounting.unaccounted === 0 &&
      p2.duplicates.resends === expectedDuplicates &&
      p2.duplicates.considered === expectedDuplicates &&
      p2.duplicates.returnedOriginal === expectedDuplicates &&
      p2.lostAck.simulated === expectedLost &&
      p2.lostAck.returnedOriginal === expectedLost,
    "incomplete read, duplicate, lost-ACK or writer verification",
  );
  assert(
    p3.gaps === 0 &&
      p3.notReachedAtStop.count === 0 &&
      p3.visibleDuplicateEffects === 0 &&
      p3.counts.orderViolations === 0 &&
      p3.counts.incompleteChanges === 0 &&
      p3.counts.affectedMismatches === 0 &&
      p3.counts.corrections === p3.counts.correctionRangeReported &&
      p3.replay.exact === true &&
      p3.replay.mismatches === 0 &&
      p3.replay.replayed === p3.replay.firstDeliveries &&
      p3.replay.replayed > 0,
    "feed checks failed",
  );
  if (candidate) {
    const capture = report.receiptCapture,
      journal = report.expectedStateJournal,
      queue = report.expectedStateJournalQueue;
    assert(
      capture.submitted === expectedPrimary &&
        capture.retained === expectedPrimary &&
        capture.matched === expectedPrimary &&
        capture.mismatches === 0 &&
        capture.missing === 0 &&
        capture.peakOutstanding <= capture.capacity &&
        journal.run === tag &&
        journal.slot === tag &&
        journal.source === source &&
        journal.subjects === 10_000 &&
        journal.frames === queue.frames &&
        queue.frames >= expectedPrimary * 2 &&
        queue.peakOutstanding <= queue.capacity &&
        /^[a-f0-9]{64}$/.test(journal.sha256) &&
        /^ns[a-z0-9]+$/.test(report.runTag),
      "offloaded evidence is incomplete",
    );
    await verifyJournal(file(`driver/expected-model-${report.runTag}.bin.gz`), journal);
  }

  const bar = commitBar("NS-P2 all-primary p99 ms", latencies, 0.99, 50, VERDICT_CLOCK, {
    minimum: 500,
    estimator: "exact",
  });
  assert.deepEqual(
    bar,
    p2.bars.find((entry: { id: string }) => entry.id === bar.id),
  );
  assert.equal(p2.allPrimary.count, bar.n);
  assert.equal(p2.allPrimary.p99Ms, bar.value);
  const fallback = report.replica.receiptGateway;
  assert(
    fallback.queue.outstanding === 0 &&
      fallback.queue.active === 0 &&
      fallback.queue.peakActive <= 4,
  );
  const { receiptCapture, expectedStateRetention, ...commonConfig } = config;
  void receiptCapture;
  void expectedStateRetention;
  writeFileSync(
    path.join(logs, tag + ".lateness.tsv"),
    "offerSecond\tprimaryCommands\tsumLatenessMs\tmaxLatenessMs\n" +
      timings
        .map((row, second) => `${second}\t${row.count}\t${number(row.late)}\t${number(row.max)}`)
        .join("\n") +
      "\n",
    { flag: "wx" },
  );
  return {
    tag,
    commonConfig,
    pins,
    bar,
    p50: percentile(latencies, 0.5),
    correct: ryow.correct,
    over: latencies.filter((value) => value > 50).length,
    gcS: writer.gc.totalMs / 1000,
    heapMiB: writer.heapUsed.max / 2 ** 20,
    latenessS: sum(timings.map((row) => row.late)) / 1000,
    fallbackPeak: fallback.queue.peakOutstanding,
    observerPeak: report.receiptCapture?.peakOutstanding ?? null,
    burstOvers: bursts.map((rows) => rows.filter((value) => value > 50).length),
  };
}

const [source, runs, logs, prefix] = process.argv.slice(2);
assert(
  source &&
    /^[a-f0-9]{40}$/.test(source) &&
    runs &&
    logs &&
    prefix &&
    /^tx2-dxt1-drv1-[a-z0-9]{1,12}$/.test(prefix),
);
console.log(
  `# DX-DRV1 bare-metal v3 zero-reader comparison\n\nSource \`${source}\`. Fixed offers ${V3_OFFER_SECONDS} s. The latency bar is scheduled offer to final receipt and uses the uncorrected all-primary p99.\n`,
);
console.log(
  "| Arm | Correct RYOW | ACK p50 / p99 ms | p99 90% interval ms | Over 50 ms | P2 p99 bar | Sender heap MiB | Sender GC s | Offer lateness s | Capture / fallback peak |",
);
console.log("| --- | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: | ---: |");
const arms: Awaited<ReturnType<typeof readArm>>[] = [];
for (const [suffix, label] of [
  ["a", "Old before"],
  ["b", "New"],
  ["c", "Old after"],
]) {
  try {
    const arm = await readArm(source, runs, logs, `${prefix}-${suffix}`, suffix === "b");
    const control = arms[0];
    if (control) {
      assert.deepEqual(arm.commonConfig, control.commonConfig, "arm configuration differs");
      assert.deepEqual(arm.pins, control.pins, "arm builds differ");
    }
    console.log(
      `| ${label} | ${arm.correct}/${arm.bar.n} | ${number(arm.p50)} / ${number(arm.bar.value)} | ${number(arm.bar.interval90?.low ?? null)}–${number(arm.bar.interval90?.high ?? null)} | ${arm.over} | ${arm.bar.status} | ${number(arm.heapMiB)} | ${number(arm.gcS)} | ${number(arm.latenessS)} | ${arm.observerPeak ?? "—"} / ${arm.fallbackPeak} |`,
    );
    arms.push(arm);
  } catch (error) {
    console.error(`${prefix}-${suffix}: ${String(error)}`);
    console.log(`| ${label} | — | — | — | — | Unavailable | — | — | — | — |`);
    process.exitCode = 1;
  }
}
if (arms.length === 3) {
  const [before, candidate, after] = arms;
  const pre = before!.bar.value!,
    next = candidate!.bar.value!,
    post = after!.bar.value!;
  console.log(
    `\nNew p99 minus old before and after, in ms. ${number(next - pre)}, ${number(next - post)}. Absolute old-to-old drift ${number(Math.abs(pre - post))} ms.\n`,
  );
}
for (const arm of arms)
  console.log(`\n${arm.tag} burst counts over 50 ms. ${arm.burstOvers.join(", ")}.`);
console.log("\nPer-second offer lateness is in each arm's TSV alongside the controller logs.");
