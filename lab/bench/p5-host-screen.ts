/** [EXP-P5B-R3] Why: R34 B1 screening on the HS01-layout host store: activation wall at 1 and 4 workers, per-stage cost, and the live
 * read and commit p99 with the sweep on against off, every arm on its own copy-on-write clone of one sealed seed store.
 * Rejected: reusing trafficArm (its memory-only fork, 64-reader O-REPLAY ledger and split reads are not wired to the mapped host, and
 * an untested integration would hide the number this round needs) and sweeping the seed store itself (each arm must start from the same bytes).
 * DIAGNOSTIC: one host, shared cores, no duet (M01 is not merged); nothing here is a claim.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import os from "node:os";
import { performance } from "node:perf_hooks";
import { openMappedHost } from "./lib/host-store.ts";
import { generateTrace } from "./lib/trace.ts";
import { applyW0Trace, percentile, waitUntil } from "./lib/w0-traffic.ts";
import { runW0Sweep, subjectList } from "./lib/sweep.ts";
import { readW0Fingerprint } from "./lib/w0-fingerprint.ts";
import { publishRecords } from "./lib/w0-outbox.ts";
import { loadW0Pins } from "./lib/evaluate.ts";
import { Rng, seedOf } from "./lib/rng.ts";
import {
  DomainOracle,
  deliveriesWire,
  emptyWireState,
  equalBytes,
  requireFingerprint,
  wireRecord,
} from "./lib/w0-gates.ts";
import { W0, V_W0, canonical, sha256 } from "./lib/w0-world.ts";

const argv = process.argv.slice(2),
  opt = (k: string, d: string) => {
    const i = argv.indexOf("--" + k);
    return i < 0 ? d : argv[i + 1]!;
  },
  flag = (k: string) => argv.includes("--" + k);
const [seedDir, outDir] = argv.filter((a, i) => !a.startsWith("--") && !argv[i - 1]?.startsWith("--"));
if (!seedDir || !outDir) throw Error("usage: p5-host-screen.ts <sealed B0 dir> <new output dir> [--rounds R] [--window-s S]");
const ROUNDS = Number(opt("rounds", "4")),
  WINDOW_S = Number(opt("window-s", "60")),
  WARM_S = Number(opt("warm-s", "20")),
  LAT_WORKERS = Number(opt("lat-workers", "4")),
  READERS = Number(opt("readers", "4")),
  // [EXP-P5B-R3] Why: one mapped writer commits about 55 commands/s (one frame per command, an fsync each), the frozen burst offers about 55/s, so the no-sweep arm is already saturated.
  // DILATE stretches the offer schedule by this factor (the commands and their valid times are unchanged): a named screening series, never the frozen trace. Rejected: concurrent
  // writers (the position map needs acknowledgements in order) and dropping the burst (about 1 command/s gives no p99).
  DILATE = Number(opt("dilate", "2")),
  SAMPLE_EVERY = Number(opt("sample-every", "10")),
  FLOOR = 5 * 1024 ** 3;
fs.mkdirSync(outDir, { recursive: false });
const b0 = JSON.parse(fs.readFileSync(path.join(seedDir, "receipt.json"), "utf8"));
if (b0.status !== "B0-COMPLETE-DIAGNOSTIC" || b0.G0?.status !== "R34-FINGERPRINT-MATCH" || !b0.sourceStable)
  throw Error("screening needs a B0 receipt with a matching G0 on stable source");
const N: number = b0.N,
  scope: string = b0.scope,
  mapFile = path.join(seedDir, "position-map.json"),
  mapSha: string = b0.positionBinding.mapHash,
  seedBasis: number = b0.seed.basis.tx;
const expected = JSON.parse(fs.readFileSync(path.join(seedDir, "oracle.json"), "utf8"));
const sourceFiles = [
  "lab/bench/p5-host-screen.ts",
  "lab/bench/lib/host-store.ts",
  "lab/bench/lib/sweep.ts",
  "lab/bench/lib/sweep-worker.ts",
  "lab/bench/lib/w0-traffic.ts",
  "lab/bench/lib/w0-outbox.ts",
  "lab/bench/lib/w0-world.ts",
  "lab/bench/lib/position-map.ts",
  "lab/bench/lib/evaluate.ts",
  "lab/experiments/EXP-P5N/PREDICTIONS.json",
  "packages/qlever/dist/broker/log.js",
  "packages/qlever/dist/broker/sqlite-worker.js",
  "packages/w0/dist/index.js",
];
const hashes = () => Object.fromEntries(sourceFiles.map((f) => [f, sha256(fs.readFileSync(f))]));
const before = hashes();
const free = () => {
  const s = fs.statfsSync(outDir);
  return s.bavail * s.bsize;
};
const report: any = {
  format: "EXP-P5N-round1-B1/1",
  tag: opt("tag", ""),
  predictionsSha256: sha256(fs.readFileSync("lab/experiments/EXP-P5N/PREDICTIONS.json")),
  git: spawnSync("git", ["rev-parse", "HEAD"]).stdout.toString().trim(),
  gitDirty: spawnSync("git", ["status", "--short", "--", "lab/bench", "packages"]).stdout.toString().trim().length > 0,
  attempt: randomUUID(),
  startedAt: new Date().toISOString(),
  classification: "DIAGNOSTIC",
  acceptance: false,
  status: "RUNNING",
  N,
  scope,
  seedDir,
  seedReceiptSha256: sha256(fs.readFileSync(path.join(seedDir, "receipt.json"))),
  mapSha256: mapSha,
  sources: before,
  runtime: { node: process.version, platform: process.platform, arch: process.arch },
  params: { ROUNDS, WINDOW_S, WARM_S, LAT_WORKERS, READERS, DILATE },
  activation: {},
  latency: { rounds: [] },
};
const save = () => fs.writeFileSync(path.join(outDir, "screen.json"), JSON.stringify(report, null, 2) + "\n");
save();

function cloneStore(name: string) {
  if (free() < FLOOR + 512 * 1024 ** 2) throw Error("RESOURCE-ABORT host disk below 5 GiB plus margin");
  const dst = path.join(outDir, "arms", name);
  fs.mkdirSync(dst, { recursive: true });
  const f0 = free(),
    start = performance.now();
  // APFS clone: no bytes are copied until a page changes. A plain copy would double the store and is refused below.
  const r = spawnSync("cp", ["-cR", path.join(seedDir, "store"), path.join(dst, "store")]);
  if (r.status !== 0) throw Error("clonefile copy failed: " + r.stderr);
  const spent = f0 - free();
  if (spent > 256 * 1024 ** 2) throw Error("clone consumed " + spent + " bytes; not copy-on-write");
  return { dst, cloneMs: performance.now() - start, cloneBytes: spent };
}
async function openArm(name: string) {
  const { dst, cloneMs, cloneBytes } = cloneStore(name);
  const h = await openMappedHost(path.join(dst, "store"), scope, {
    reopen: { mapFile, mapSha256: mapSha, N },
    idSeed: scope + ":arm:" + name,
    clockStart: V_W0 + 3_600_000,
  });
  // [EXP-P5B-R3] Why: fail closed when a clone's counts differ from the seed's (R34 4.4 item 4). Rejected: trusting the clone.
  const c = await h.comp.storeCounts();
  for (const k of ["position", "assertions", "retired", "frames"] as const)
    if (c[k] !== b0.seed.counts[k]) throw Error(`clone count ${k} ${c[k]} != seed ${b0.seed.counts[k]}`);
  return { h, dst, cloneMs, cloneBytes, startCounts: c };
}
const walBytes = (dst: string) => {
  try {
    return fs.statSync(path.join(dst, "store", "broker.db-wal")).size;
  } catch {
    return 0;
  }
};
const summarize = (xs: number[]) =>
  xs.length ? { count: xs.length, p50: percentile(xs, 0.5), p99: percentile(xs, 0.99), max: xs.reduce((a, b) => (b > a ? b : a), 0) } : { count: 0 };

// ---------------------------------------------------------------- activation arms (B1 wall, per-stage cost, correctness sample)
async function activationArm(name: string, W: number) {
  const arm = await openArm(name),
    { h, dst } = arm,
    comp = h.comp;
  const oracle = new DomainOracle();
  const subjects = subjectList(N),
    index = new Map(subjects.map((s, i) => [s, i]));
  try {
    const rss0 = process.memoryUsage().rss;
    const t0 = performance.now();
    const act = await comp.transact(
      [{ op: "assert", entityId: "p5:tenant", attribute: "p5/activation", value: { type: "string", value: "R2" }, validFrom: V_W0 }],
      { commandId: name + ":activate" },
    );
    if (!act.ok || act.value.position !== seedBasis + 1) throw Error("activation position mismatch");
    const activationCommitMs = performance.now() - t0;
    const basis = { position: act.value.position, validAt: V_W0 },
      activations = [{ tx: basis.position, from: W0.POPULATION_VALID_TIME, release: W0.R2.hash }];
    const sample: { subject: string; world: unknown; output: string }[] = [],
      pubLog: { evaluations: any[]; deliveries: readonly any[] }[] = [],
      coverage = new Set<string>();
    let publishMs = 0,
      walMax = 0;
    // Publication stage split: the outbox reads each subject's prior state (pull), claims, then commits one frame per page.
    const stage = { pullMs: 0, pulls: 0, transactMs: 0, transacts: 0, claimMs: 0 };
    const timed = {
      ...comp,
      pull: async (...a: Parameters<typeof comp.pull>) => {
        const t = performance.now();
        try {
          return await comp.pull(...a);
        } finally {
          stage.pullMs += performance.now() - t;
          stage.pulls++;
        }
      },
      transact: async (...a: Parameters<typeof comp.transact>) => {
        const t = performance.now();
        try {
          return await comp.transact(...a);
        } finally {
          stage.transactMs += performance.now() - t;
          stage.transacts++;
        }
      },
      transactionByCommand: async (...a: Parameters<typeof comp.transactionByCommand>) => {
        const t = performance.now();
        try {
          return await comp.transactionByCommand(...a);
        } finally {
          stage.claimMs += performance.now() - t;
        }
      },
    } as typeof comp;
    // [EXP-P5N] Why: step 1 baseline. Reset the writer's time split and read the harness counters at the sweep start so the activation commit and the sweep are measured alone.
    await h.broker.appendStats(true);
    const hs0 = { ...h.hstats },
      elu0 = performance.eventLoopUtilization();
    const walTimer = setInterval(() => (walMax = Math.max(walMax, walBytes(dst))), 100);
    const load0 = os.loadavg();
    const started = performance.now();
    const sweep = await runW0Sweep({
      comp,
      composition: "host",
      lane: "qlever",
      scope,
      subjects,
      basis,
      sweepId: name,
      cursor: path.join(dst, "cursor.json"),
      workers: W,
      activations,
      readThroughOwner: true,
      sampleEvery: SAMPLE_EVERY,
      onPage: async (records) => {
        const t = performance.now();
        const actual = await publishRecords(timed, records.map((r: any) => r.record));
        publishMs += performance.now() - t;
        for (const r of records) {
          if (coverage.has(r.subject)) throw Error("G4 duplicate evaluation");
          coverage.add(r.subject);
          if (r.world !== undefined)
            sample.push({ subject: r.subject, world: r.world, output: W0.outputJson(r.output) });
        }
        pubLog.push({ evaluations: records.map((r: any) => r.record), deliveries: actual.deliveries });
      },
    });
    const wallMs = performance.now() - started;
    const eluMain = performance.eventLoopUtilization(elu0).utilization;
    const writerSplit: any = await h.broker.appendStats(false);
    const hostSplit = Object.fromEntries(Object.entries(h.hstats).map(([k, v]) => [k, (v as number) - (hs0 as any)[k]]));
    clearInterval(walTimer);
    if (coverage.size !== N || !sweep.complete) throw Error("G4 incomplete coverage");
    const rssGrowth = process.memoryUsage().rss - rss0;
    // Untimed checks against the independent oracle: G2 on a 1-in-50 sample, G5 over every published page in publication order.
    for (const s of sample) {
      const exp = await oracle.call("reconcile", {
        world: s.world,
        activations,
        basis: { tx: basis.position, validTime: W0.POPULATION_VALID_TIME },
      });
      equalBytes("G2 reconcile (" + s.subject + ")", s.output, exp);
    }
    let state: any = emptyWireState(),
      deliveries = 0;
    for (const p of pubLog) {
      const exp = JSON.parse(await oracle.call("publish", { state, evaluations: p.evaluations.map(wireRecord) }));
      equalBytes("G5 deliveries", canonical(deliveriesWire(p.deliveries)), canonical(deliveriesWire(exp.deliveries)));
      state = exp.state;
      deliveries += p.deliveries.length;
    }
    const m = sweep.metrics,
      sum = (f: (x: any) => number) => m.reduce((a: number, x: any) => a + f(x), 0),
      tx = m.map((x: any) => x.store.transactionMs as number).sort((a: number, b: number) => a - b);
    const endCounts = await comp.storeCounts();
    const per: number[][] = writerSplit.per,
      col = (i: number) => per.map((x) => x[i]!).sort((a, b) => a - b),
      pct = (xs: number[], q: number) => xs[Math.min(xs.length - 1, Math.ceil(xs.length * q) - 1)]!,
      sumW = (k: string) => writerSplit[k] as number;
    const unattributedS =
      (wallMs - m.reduce((a: number, x: any) => a + x.store.transactionMs, 0) -
        sum((x) => x.cpu.decode) * 1000 - sum((x) => x.cpu.kernel) * 1000 - sum((x) => x.cpu.read) * 1000 - publishMs) / 1000;
    const timeline = m.map((x: any) => ({ page: x.page, ...x.tl }));
    fs.writeFileSync(path.join(outDir, `timeline-${name}.json`), JSON.stringify(timeline));
    return {
      load: { start: load0, end: os.loadavg(), freeMemBytes: os.freemem() },
      instrument: {
        // Per-commit time split from the writer thread (ms, summed over the sweep's commits) and per-commit percentiles. Columns of `per`: lsn, prepare, beginWait, frame+dict, member, factRows, factMs, journalRows, journalMs, marker, commit(COMMIT+fsync), total.
        writer: {
          appends: writerSplit.appends,
          sumMs: Object.fromEntries(["prepareMs", "beginMs", "frameMs", "dictMs", "memberMs", "factMs", "journalMs", "markerMs", "commitMs", "totalMs"].map((k) => [k, sumW(k)])),
          rows: { fact: writerSplit.factRows, journal: writerSplit.journalRows, journalPerCommit: writerSplit.journalRows / writerSplit.appends, factPerCommit: writerSplit.factRows / writerSplit.appends },
          perCommitMs: Object.fromEntries(
            [["prepare", 1], ["beginWait", 2], ["frameDict", 3], ["member", 4], ["factRows", 6], ["journalRows", 8], ["marker", 9], ["commitFsync", 10], ["total", 11]].map(([k, i]) => [k, { p50: pct(col(i as number), 0.5), p99: pct(col(i as number), 0.99), max: pct(col(i as number), 1), mean: col(i as number).reduce((a, b) => a + b, 0) / per.length }]),
          ),
          journalShareOfWriterTotal: sumW("journalMs") / sumW("totalMs"),
          journalShareOfWall: sumW("journalMs") / wallMs,
          perCommitJournalRows: [...new Set(per.map((x) => x[7]))],
        },
        host: { ...hostSplit, perCommitMs: Object.fromEntries(Object.entries(hostSplit).map(([k, v]) => [k, (v as number) / writerSplit.appends])) },
        eluMainThread: eluMain,
        unattributedS,
        parseMsTotal: m.reduce((a: number, x: any) => a + (x.tl.parsedAt - x.tl.resultAt), 0),
        timelineFile: `timeline-${name}.json`,
      },
      name,
      workers: W,
      N,
      wallMs,
      subjectsPerS: N / (wallMs / 1000),
      publishMsTotal: publishMs,
      publishStage: stage,
      activationCommitMs,
      pages: m.length,
      pageTransactionMs: { p50: tx[Math.floor(tx.length / 2)], p99: tx[Math.ceil(tx.length * 0.99) - 1], max: tx.at(-1) },
      cpuS: { read: sum((x) => x.cpu.read), decode: sum((x) => x.cpu.decode), kernel: sum((x) => x.cpu.kernel) },
      cpuScope: m[0]?.cpuScope,
      storeCpuS: sum((x) => x.store.cpuMicros) / 1e6,
      walMaxBytes: walMax,
      rssGrowthBytes: rssGrowth,
      correctness: { coverage: coverage.size, g2Sampled: sample.length, g5Pages: pubLog.length, deliveries },
      counts: { start: arm.startCounts, end: endCounts },
      clone: { ms: arm.cloneMs, bytes: arm.cloneBytes },
    };
  } finally {
    oracle.close();
    await comp.close();
  }
}

// ---------------------------------------------------------------- latency arms (commit and live-read p99, sweep on vs off)
async function latencyArm(name: string, withSweep: boolean, seed: string, oldCutCheck: boolean) {
  const arm = await openArm(name),
    { h, dst } = arm,
    comp = h.comp;
  const live = { ...comp, sweepPage: (s: readonly string[], b: any) => h.livePage(s, b) } as typeof comp;
  const total = WARM_S + WINDOW_S,
    // The first burst starts at trace second 120; align it with the end of the warm-up in schedule time.
    OFFSET_S = 120 - WARM_S / DILATE;
  const events = generateTrace({ seed, subjects: N, durationS: OFFSET_S + total / DILATE }).filter(
    (e) => e.atMs >= OFFSET_S * 1000 && e.atMs < (OFFSET_S + total / DILATE) * 1000,
  );
  const commits: { rel: number; lat: number; queue: number }[] = [],
    reads: { rel: number; ms: number }[] = [],
    sweeps: any[] = [];
  const hot = new Map<number, number>(),
    rng = new Rng(seedOf(seed + ":readers"));
  let stopped = false,
    failed: any,
    busy = false,
    queued = 0,
    serial: Promise<void> = Promise.resolve(),
    duplicates = 0,
    lostAck = 0;
  const startAt = performance.now() + 500,
    rel = (t: number) => t - startAt;
  const submit = (event: (typeof events)[number], scheduled: number) => {
    queued++;
    serial = serial.then(async () => {
      busy = true;
      const begun = performance.now();
      try {
        const r: any = await applyW0Trace(live, event);
        const ack = performance.now();
        if (r.duplicate) duplicates++;
        else hot.set(event.subject, ack);
        if (event.ackLoss) lostAck++;
        commits.push({ rel: rel(scheduled), lat: ack - scheduled, queue: begun - scheduled });
      } finally {
        busy = false;
        queued--;
      }
    });
    return serial;
  };
  const writer = (async () => {
    for (const e of events) {
      const at = startAt + (e.atMs - OFFSET_S * 1000) * DILATE;
      await waitUntil(at);
      if (failed) break;
      void submit(e, at).catch((x) => (failed = x));
    }
    await serial;
  })();
  const endAt = startAt + total * 1000;
  const readers = Array.from({ length: READERS }, () =>
    (async () => {
      while (!stopped && performance.now() < endAt && !failed) {
        const hotNow = [...hot].filter(([, at]) => performance.now() - at <= 60000).map(([s]) => s);
        const subject = hotNow.length && rng.int(100) < 60 ? hotNow[rng.int(hotNow.length)]! : rng.int(N);
        const t = performance.now();
        await h.livePage([W0.placementId(subject)], {
          position: await comp.currentPosition(),
          validAt: V_W0 + OFFSET_S * 1000 + Math.floor(rel(t) / DILATE),
        });
        reads.push({ rel: rel(t), ms: performance.now() - t });
        await new Promise<void>((r) => setImmediate(r));
      }
    })().catch((x) => (failed = x)),
  );
  const sweeper = (async () => {
    if (!withSweep) return;
    await waitUntil(startAt + WARM_S * 1000);
    for (let k = 0; performance.now() < endAt && !failed; k++) {
      const release = k % 2 ? "R1" : "R2";
      // The W0 kernel accepts whole-second instants only (a fractional millisecond fails W0.E_BASIS).
      const validAt =
        V_W0 + Math.floor((OFFSET_S * 1000 + rel(performance.now()) / DILATE) / 1000) * 1000;
      const t0 = performance.now();
      const act = await comp.transact(
        [{ op: "assert", entityId: "p5:tenant", attribute: "p5/activation", value: { type: "string", value: release }, validFrom: validAt }],
        { commandId: `${name}:act:${k}` },
      );
      if (!act.ok) throw Error("activation failed: " + act.tag);
      const basis = { position: act.value.position, validAt };
      let gateWaitMs = 0;
      const s = await runW0Sweep({
        comp,
        composition: "host",
        lane: "qlever",
        scope,
        subjects: subjectList(N),
        basis,
        sweepId: `${name}:${k}`,
        cursor: path.join(dst, `cursor-${k}.json`),
        workers: LAT_WORKERS,
        activations: [{ tx: basis.position, from: W0.POPULATION_VALID_TIME, release: W0.RELEASES_BY_NAME.get(release)!.hash }],
        readThroughOwner: true,
        // Publication yields to queued live commits, as in the round A arm; the wait is recorded, never hidden.
        beforePublish: async () => {
          const w = performance.now();
          while (busy || queued > 0) {
            if (failed) throw failed;
            await new Promise((r) => setTimeout(r, 1));
          }
          gateWaitMs += performance.now() - w;
        },
        onPage: async (records) => {
          await comp.publishOutbox(records.map((r: any) => r.record));
        },
      });
      sweeps.push({ k, release, startRel: rel(t0), wallMs: performance.now() - t0, complete: s.complete, pages: s.metrics.length, gateWaitMs });
    }
  })();
  try {
    await Promise.all([writer, sweeper]);
    stopped = true;
    await Promise.all(readers);
    if (failed) throw failed;
    const inWin = (x: { rel: number }) => x.rel >= WARM_S * 1000 && x.rel < total * 1000;
    const c = commits.filter(inWin).map((x) => x.lat),
      q = commits.filter(inWin).map((x) => x.queue),
      r = reads.filter(inWin).map((x) => x.ms);
    let oldCut: any = null;
    if (oldCutCheck) {
      // Old-cut exactness after later commits retire rows: the seed basis must still produce the O-DOMAIN digests (Q89i through the HS01 history table).
      await loadW0Pins();
      const t = performance.now();
      const obs = await readW0Fingerprint(comp, N, { position: seedBasis, validAt: V_W0 }, new AbortController().signal);
      requireFingerprint(obs, expected, N);
      oldCut = { status: "FINGERPRINT-MATCH-AFTER-TRAFFIC", wallS: (performance.now() - t) / 1000 };
    }
    return {
      name,
      withSweep,
      trace: { seed, offered: events.length, committed: commits.length, duplicates, lostAck, sha256: sha256(JSON.stringify(events)) },
      commit: summarize(c),
      commitQueue: summarize(q),
      liveRead: summarize(r),
      allCommit: summarize(commits.map((x) => x.lat)),
      sweeps,
      sweepDutyShare: withSweep ? sweeps.reduce((a, s) => a + s.wallMs, 0) / (total * 1000) : 0,
      walMaxBytes: walBytes(dst),
      oldCut,
      raw: { commits, reads },
    };
  } finally {
    stopped = true;
    await writer.catch(() => {});
    await Promise.all(readers);
    await comp.close();
  }
}

const ratio = (a?: number, b?: number) => (a !== undefined && b ? a / b : null);
try {
  await loadW0Pins();
  if (!flag("skip-act")) {
    for (const W of opt("act-workers", "1,4").split(",").map(Number)) {
      if (free() < FLOOR + 1024 ** 3) throw Error("RESOURCE-ABORT: host disk below 5 GiB plus margin");
      report.activation["W" + W] = await activationArm("act-W" + W, W);
      save();
      console.log(JSON.stringify({ arm: "act-W" + W, wallMs: report.activation["W" + W].wallMs }));
    }
  }
  if (!flag("skip-lat")) {
    const rng = new Rng(seedOf("p5b-r3:" + scope));
    for (let r = 0; r < ROUNDS + 1; r++) {
      const aa = r === ROUNDS,
        sweepFirst = rng.int(2) === 0,
        order = aa ? ["base-a", "base-b"] : sweepFirst ? ["sweep", "base"] : ["base", "sweep"];
      const round: any = { round: r, aa, order, seed: "p5b-r3-trace:" + r };
      for (const arm of order) {
        if (free() < FLOOR + 1024 ** 3) throw Error("RESOURCE-ABORT: host disk below 5 GiB plus margin");
        const res = await latencyArm(`lat-${r}-${arm}`, arm === "sweep", round.seed, arm === "sweep" && r === 0);
        const raw = res.raw;
        delete (res as any).raw;
        fs.writeFileSync(path.join(outDir, `lat-${r}-${arm}-raw.json`), JSON.stringify(raw));
        round[arm] = res;
        // Disposable clone: remove only this arm's own directory, keep the receipt and raw samples.
        fs.rmSync(path.join(outDir, "arms", `lat-${r}-${arm}`), { recursive: true, force: true });
        console.log(JSON.stringify({ arm: `lat-${r}-${arm}`, commitP99: res.commit.p99, readP99: res.liveRead.p99 }));
      }
      const t = round.sweep ?? round["base-a"],
        b = round.base ?? round["base-b"];
      round.ratios = {
        commitP99: ratio(t.commit.p99, b.commit.p99),
        commitP50: ratio(t.commit.p50, b.commit.p50),
        readP99: ratio(t.liveRead.p99, b.liveRead.p99),
        readP50: ratio(t.liveRead.p50, b.liveRead.p50),
      };
      report.latency.rounds.push(round);
      save();
    }
    // Pooled ratio over the non-A/A rounds: samples pooled across rounds, then the p99 of each side.
    const pool = (kind: "sweep" | "base", f: "commit" | "liveRead") =>
      report.latency.rounds
        .filter((x: any) => !x.aa)
        .flatMap((x: any) =>
          JSON.parse(fs.readFileSync(path.join(outDir, `lat-${x.round}-${kind}-raw.json`), "utf8"))[f === "commit" ? "commits" : "reads"]
            .filter((s: any) => s.rel >= WARM_S * 1000 && s.rel < (WARM_S + WINDOW_S) * 1000)
            .map((s: any) => (f === "commit" ? s.lat : s.ms)),
        ) as number[];
    const sc = pool("sweep", "commit"),
      bc = pool("base", "commit"),
      sr = pool("sweep", "liveRead"),
      br = pool("base", "liveRead");
    report.latency.pooled = {
      rounds: ROUNDS,
      commit: { sweep: summarize(sc), base: summarize(bc), p99Ratio: ratio(percentile(sc, 0.99), percentile(bc, 0.99)) },
      liveRead: { sweep: summarize(sr), base: summarize(br), p99Ratio: ratio(percentile(sr, 0.99), percentile(br, 0.99)) },
      note: "sweep arms run activations back to back (about 100% duty) for the whole window; one activation alone loads the store less",
    };
  }
  report.sourceStable = canonical(before) === canonical(hashes());
  if (!report.sourceStable) throw Error("source changed during the attempt");
  report.status = "B1-COMPLETE-DIAGNOSTIC";
} catch (e: any) {
  report.status = "ERROR";
  report.error = String(e.stack ?? e);
  process.exitCode = 1;
  console.error(report.error);
} finally {
  report.finishedAt = new Date().toISOString();
  report.freeEnd = free();
  save();
  console.log(JSON.stringify({ status: report.status, out: outDir }));
}
