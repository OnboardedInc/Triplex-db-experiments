import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, createReadStream, realpathSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

import { evalCpus, workerCount } from "../../../bench/lib/w0-cpus.ts";
export const armNames = [
  "narrow-full",
  "narrow-selector",
  "standard-full",
  "standard-pages",
] as const;
export type Arm = (typeof armNames)[number] | "standard-historical";
export const sha = (data: string | Buffer) => createHash("sha256").update(data).digest("hex");
const delayed = [
  "held pay change",
  "first item after empty evaluation",
  "equal transaction with earlier valid time",
];
export const nativeScheduleNames = [
  ...["historical", "full-state", "guard-fact", "page-cut"].flatMap((layout) =>
    delayed.map((name) => layout + " / " + name),
  ),
  ...["full-state", "guard-fact", "page-cut"].flatMap((layout) => [
    layout + " / lost ACK, rollback, retirement and restart",
    layout + " / concurrent first writers and stalled older snapshot",
  ]),
  "partial pages, sparse membership, a newer live winner and lost page ACK survive restart",
  "live same-page edits invalidate a stalled sweep including an equal-basis body replacement",
  "coverage cannot close over a duplicate, foreign range, different release or cut",
  "128 and 256 member writes use bounded native reads at a single position",
  "ordinary outbox entry points reopen the named page layout for an unhinted live reconcile",
];
export function checkSchedules(tap: string) {
  // [DX-ACT1] Why: the saved transcript must contain each native schedule at issue and at collection. Rejected: accepting a new hash of an incomplete transcript or an aggregate pass count.
  const rows = tap.split(/\r?\n/);
  const names = rows.flatMap((line) => {
    const m = /^ok (\d+) - (.+)$/.exec(line);
    return m ? [m[2]!] : [];
  });
  assert.deepEqual(names.sort(), [...nativeScheduleNames].sort(), "Incomplete native schedule set");
  const n = nativeScheduleNames.length;
  for (const line of [
    "TAP version 13",
    "1.." + n,
    "# tests " + n,
    "# pass " + n,
    "# fail 0",
    "# cancelled 0",
    "# skipped 0",
    "# todo 0",
  ])
    assert.ok(rows.includes(line), "Missing native schedule summary " + line);
  assert.ok(!rows.some((line) => /^(not ok |Bail out!)/.test(line)));
}
const extraFiles = [
  "bench.ts",
  "bench-proof.ts",
  "guard.test.ts",
  "page.test.ts",
  "deliver-held.ts",
  "check.ts",
].map((f) => "lab/experiments/EXP-DX1/act1/" + f);
export const programInputs = () =>
  Object.fromEntries(
    [
      ...extraFiles,
      "lab/world/W0/cases/C01-base-r1.json",
      "lab/bench/lib/memory.ts",
      "lab/bench/lib/composition.ts",
      "lab/bench/lib/sweep.ts",
      "lab/bench/lib/trace.ts",
      "lab/experiments/EXP-DX1/bm1/queue-day.sh",
    ].map((f) => [f, sha(readFileSync(f))]),
  );

export function requestPath(slot: string) {
  assert.match(slot, /^tx2-dxt1-bm1-[a-z0-9]{1,12}-activation-a$/);
  return join("runs", "act1-requests", slot + ".json");
}
export function benchArguments(argv: string[], slot: string, source: string, nonce: string) {
  if (!/^tx2-dxt1-bm1-act[a-z0-9]{9}-activation-a$/.test(slot)) return argv;
  const bytes = readFileSync(requestPath(slot));
  const request = JSON.parse(bytes.toString());
  assert.equal(request.slot, slot);
  assert.equal(request.source, source);
  assert.ok(request.arm === "standard-historical" || armNames.includes(request.arm));
  const workers = workerCount(String(request.workers ?? 2));
  assert.deepEqual(request.inputs, programInputs());
  const option = (k: string) => argv[argv.indexOf(k) + 1];
  assert.equal(option("--publication-id"), slot);
  assert.equal(option("--rung"), "100000");
  assert.equal(option("--seed-position"), "4338757");
  assert.ok(argv.includes("--live") && argv.includes("--post-capture"));
  const dir = join(option("--record-dir"), "..");
  // [DX-ACT1] Why: exercise the current gateway's real claim and CAS paths before touching the retained population. Rejected: inferring gateway support from the host-only smoke.
  const tap = spawnSync(
    process.execPath,
    [
      "--experimental-strip-types",
      "--test",
      "--test-reporter=tap",
      "--test-concurrency=1",
      "lab/experiments/EXP-DX1/act1/guard.test.ts",
      "lab/experiments/EXP-DX1/act1/page.test.ts",
    ],
    {
      encoding: "utf8",
      timeout: 360000,
      maxBuffer: 4 << 20,
      env: { ...process.env, DX_ACT1_NATIVE: "1" },
    },
  );
  writeFileSync(join(dir, "act1-schedules.tap"), tap.stdout + tap.stderr, { flag: "wx" });
  assert.equal(tap.status, 0, "Native guard schedules failed");
  checkSchedules(tap.stdout);
  writeFileSync(
    join(dir, "act1-schedules.json"),
    JSON.stringify({ slot, source, nonce, request: sha(bytes), tap: sha(tap.stdout + tap.stderr) }),
    { flag: "wx" },
  );
  const args = [...argv];
  args[args.indexOf("--baseline-ms") + 1] = "180000";
  args[args.indexOf("--workers") + 1] = String(workers);
  args[args.indexOf("--r1-publication-inflight") + 1] = "1";
  const layout =
    request.arm === "standard-historical"
      ? "historical"
      : request.arm === "standard-pages"
        ? "page-cut"
        : "guard-fact";
  if (layout === "page-cut") args[args.indexOf("--publication-size") + 1] = "256";
  return [
    ...args,
    "--publication-layout",
    layout,
    "--act1-arm",
    request.arm,
    "--act1-reserved-cores",
  ];
}

export function checkSweep(
  out: string,
  request: { slot: string; arm: Arm; source: string; workers?: number },
) {
  const load = (f: string) => JSON.parse(readFileSync(join(out, f), "utf8"));
  const a = load("activation-attempt.json"),
    s = load("act1-sweep.json"),
    gates = load("act1-schedules.json");
  const requested = readFileSync(requestPath(request.slot)),
    sealed = JSON.parse(requested.toString());
  assert.deepEqual(
    [sealed.source, sealed.slot, sealed.arm],
    [request.source, request.slot, request.arm],
  );
  assert.deepEqual(sealed.inputs, programInputs());
  assert.equal(sealed.workers ?? 2, request.workers ?? 2);
  assert.equal(s.slot, request.slot);
  assert.equal(s.slot, a.slot);
  assert.equal(a.run, a.slot);
  assert.equal(s.scope, a.scope);
  assert.equal(s.source, request.source);
  assert.equal(s.source, a.source);
  assert.equal(s.nonce, a.nonce);
  assert.equal(gates.source, a.source);
  assert.equal(gates.slot, a.slot);
  assert.equal(gates.nonce, a.nonce);
  assert.equal(gates.request, sha(requested));
  const transcript = readFileSync(join(out, "act1-schedules.tap"));
  assert.equal(gates.tap, sha(transcript));
  checkSchedules(transcript.toString());
  assert.equal(s.build, sha(readFileSync(join(out, "source.SHA256SUMS"))));
  assert.equal(s.build, a.sourceManifestSha256);
  assert.deepEqual(
    [a.subjects, s.N, s.checked, s.statesCompared, s.liveReaders],
    [100000, 100000, 100000, 100000, 256],
  );
  assert.equal(s.initialPosition, 4338757);
  assert.ok(s.statePosition > s.cut && s.cut > s.r1Position && s.r1Position > s.initialPosition);
  assert.equal(s.act1.arm, request.arm);
  const historical = request.arm === "standard-historical",
    paged = request.arm === "standard-pages";
  assert.equal(s.act1.layout, historical ? "historical" : paged ? "page-cut" : "guard-fact");
  assert.equal(s.act1.outcome, historical ? "incorrect-historical-control" : "exact");
  assert.match(s.expectedSha256, /^[a-f0-9]{64}$/);
  assert.equal(s.act1.guardMismatches, s.N - s.changed);
  if (historical) {
    assert.ok(s.changed > 0 && s.changed < s.N);
    assert.notEqual(s.expectedSha256, s.comparedSha256);
  } else {
    assert.equal(s.changed, s.N);
    assert.equal(s.expectedSha256, s.comparedSha256);
  }
  if (paged) {
    const c = s.act1.pageCoverage;
    assert.equal(c.roster, s.roster);
    assert.equal(c.size, s.N);
    assert.equal(c.pages, Math.ceil(s.N / 256));
    assert.match(c.receipts, /^[a-f0-9]{64}$/);
  }
  const requestedWorkers = workerCount(String(request.workers ?? 2));
  assert.equal(s.act1.workers, requestedWorkers);
  assert.equal(s.act1.coordinatorCpu, 6);
  assert.deepEqual(
    s.act1.evalCpus,
    evalCpus.slice(0, request.arm === "narrow-selector" ? 1 : requestedWorkers),
  );
  assert.deepEqual(
    s.act1.liveCpus,
    Array.from({ length: 2 }, () => ({ readers: [3, 5], writer: 6, follower: 6 })),
  );
  const releases = JSON.parse(readFileSync("lab/world/W0/releases/index.json", "utf8"));
  const markers = s.act1.activationFacts;
  assert.equal(markers.length, 2);
  assert.notEqual(markers[0].id, markers[1].id);
  for (const m of markers) {
    assert.ok(m.id);
    assert.equal(m.entityId, "p5:tenant:" + s.slot);
  }
  assert.deepEqual(
    markers.map((m: { position: number; hash: string }) => [m.position, m.hash]),
    [
      [s.r1Position, releases.R1],
      [s.cut, s.act1.releaseHash],
    ],
  );
  if (request.arm.startsWith("standard-")) assert.equal(s.act1.releaseHash, releases.R2);
  assert.match(s.comparedSha256, /^[a-f0-9]{64}$/);
  assert.match(s.trace, /^[a-f0-9]{64}$/);
  assert.match(s.act1.releaseHash, /^sha256:[a-f0-9]{64}$/);
  const roster = Array.from({ length: s.N }, (_, i) => "pl:s" + String(i).padStart(8, "0"));
  assert.equal(s.roster, sha(JSON.stringify(roster)));
  assert.ok(
    s.postCapture?.captured === s.cut &&
      s.postCapture.current > s.cut &&
      new Set(s.postCapture.subjects).size === 1000 &&
      new Set(s.postCapture.negativeSubjects).size === 1000,
  );
  const members = new Set(roster);
  const witnesses: string[] = [...s.postCapture.subjects, ...s.postCapture.negativeSubjects];
  assert.equal(witnesses.length, 2000);
  assert.equal(new Set(witnesses).size, 2000);
  assert.ok(witnesses.every((id) => members.has(id)));
  if (request.arm === "narrow-selector") {
    const c = s.act1.selector;
    assert.ok(c.candidates > 0 && c.excluded > 0);
    assert.equal(c.roster, s.roster);
    assert.equal(c.candidates + c.excluded, s.N);
    assert.equal(c.full, 0);
  }
  const wallSeconds = (s.evaluationMs + s.publicationMs) / 1000;
  assert.ok(Number.isFinite(wallSeconds) && wallSeconds > 0 && s.matched.matchedWindowMs > 0);
  for (const kind of ["read", "commit"]) {
    const metric = s.matched[kind];
    for (const arm of [metric.baseline, metric.sweep])
      assert.ok(
        Number.isInteger(arm.count) && arm.count > 0 && Number.isFinite(arm.p99) && arm.p99 > 0,
      );
    assert.equal(metric.p99Ratio, metric.sweep.p99 / metric.baseline.p99);
  }
  // [DX-ACT1] Why: hash every source and built byte again after the state checks. Rejected: promoting an old sweep, an underfilled ratio, or a completed process alone.
  for (const line of readFileSync(join(out, "source.SHA256SUMS"), "utf8").trimEnd().split("\n")) {
    const m = /^([0-9a-f]{64})  ([^\n]+)$/.exec(line);
    assert.ok(m);
    assert.ok(!m[2]!.startsWith("/") && !m[2]!.split("/").includes(".."));
    assert.equal(sha(readFileSync(m[2]!)), m[1]);
  }
  return {
    arm: request.arm,
    workers: requestedWorkers,
    outcome: s.act1.outcome,
    guardMismatches: s.act1.guardMismatches,
    expectedSha256: s.expectedSha256,
    evalCpus: s.act1.evalCpus,
    pageCoverage: s.act1.pageCoverage,
    scope: s.scope,
    slot: s.slot,
    source: s.source,
    build: s.build,
    trace: s.trace,
    roster: s.roster,
    comparedSha256: s.comparedSha256,
    release: s.act1.releaseHash,
    cut: s.cut,
    r1: s.r1Position,
    wallSeconds,
    coldWallSeconds: wallSeconds + (s.act1.selector?.buildMs ?? 0) / 1000,
    evaluationSeconds: s.evaluationMs / 1000,
    publicationSeconds: s.publicationMs / 1000,
    selector: s.act1.selector,
    matched: s.matched,
    fullWindowAnd500PerSide:
      s.matched.fullSweepCovered &&
      Math.min(s.matched.commit.baseline.count, s.matched.commit.sweep.count) >= 500,
    fullHistoryEnvelope: existsSync(join(out, "ACTIVATION-CHECK.json")),
    classification: "diagnostic",
  };
}

export async function checkTraffic(out: string) {
  const { matchW0Live } = await import("../../../bench/lib/w0-replica-live.ts");
  const s = JSON.parse(readFileSync(join(out, "act1-sweep.json"), "utf8"));
  const [before, during] = s.traffic;
  const digests: string[] = [];
  for (const [i, window] of [before, during].entries()) {
    assert.equal(window.readers, 256);
    assert.equal(window.failures, 0);
    assert.ok(window.offered > 0);
    assert.equal(window.acknowledged, window.offered);
    assert.equal(window.generatorTraceSha256, s.trace);
    const file = resolve(out, "traffic", (i ? "sweep" : "baseline") + "-traffic.ndjson");
    assert.equal(realpathSync(window.raw), realpathSync(file));
    const hash = createHash("sha256");
    for await (const chunk of createReadStream(file)) hash.update(chunk);
    digests.push(hash.digest("hex"));
  }
  assert.deepEqual(matchW0Live(before, during), s.matched);
  return digests;
}

export function workerTrials(values: string) {
  const counts = values.split(",").map(workerCount);
  if (new Set(counts).size !== counts.length) throw Error("Duplicate worker trial");
  const base = counts.includes(2) ? 2 : counts[0]!;
  return [
    ...armNames.map((arm) => ({ arm: arm as Arm, workers: base })),
    { arm: "standard-historical" as Arm, workers: base },
    ...counts
      .filter((w) => w !== base)
      .map((workers) => ({ arm: "standard-pages" as Arm, workers })),
  ];
}
export function workerFinding(results: readonly ReturnType<typeof checkSweep>[]) {
  const points = results
    .filter((r) => r.arm === "standard-pages")
    .map((r) => ({
      workers: r.workers,
      wallSeconds: r.wallSeconds,
      readRatio: r.matched.read.p99Ratio,
      commitRatio: r.matched.commit.p99Ratio,
      status: !r.fullWindowAnd500PerSide
        ? "insufficient"
        : r.matched.read.p99Ratio <= 1.5 && r.matched.commit.p99Ratio <= 1.5
          ? "within"
          : "over",
    }));
  const qualified = points.filter((p) => p.status === "within");
  return {
    points,
    largestObservedWithinBoth: qualified.length
      ? Math.max(...qualified.map((p) => p.workers))
      : null,
  };
}
