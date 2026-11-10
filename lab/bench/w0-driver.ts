import { startW0Live, matchW0Live } from "./lib/w0-live.ts";
import { measurementLease } from "./lib/w0-lease.ts";
import { latencyReceipt, requireQleverConnectionMode } from "../receipts/latency.mjs";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { openComposition } from "./lib/composition.ts";
import { loadW0Pins } from "./lib/evaluate.ts";
import { seedW0 } from "./lib/w0-seed.ts";
import { fingerprintSweep } from "./lib/w0-fingerprint.ts";
import { runW0Sweep, subjectList } from "./lib/sweep.ts";
import { W0, V_W0, canonical, sha256, triplexValue, worldOf } from "./lib/w0-world.ts";
import {
  DomainOracle,
  equalBytes,
  requireCounts,
  requireFingerprint,
  wireRecord,
  deliveriesWire,
  emptyWireState,
} from "./lib/w0-gates.ts";
const execute = promisify(execFile);
export async function runW0Driver(argv: string[]) {
  const opt = (k: string, d?: string) => {
    const i = argv.indexOf("--" + k);
    return i < 0 ? d : argv[i + 1];
  };
  const N = Number(opt("rung", "1000")!.replace("k", "000"));
  W0.rung(N);
  const composition = opt("composition", "memory")!,
    lane = opt("lane", "xtdb")! as "xtdb" | "qlever" | "datomic";
  const output = path.resolve(opt("output", `runs/P5/${randomUUID()}/receipt.json`)!);
  if (!output.startsWith(path.resolve("runs") + path.sep))
    throw new Error("--output must be inside worktree runs/");
  const dir = path.dirname(output);
  fs.mkdirSync(dir, { recursive: true });
  if (fs.existsSync(output)) throw new Error("attempt output already exists");
  const attempt = randomUUID(),
    scope = opt("scope", "p5-" + attempt)!;
  const startedAt = new Date().toISOString();
  const report: any = latencyReceipt({
    format: "triplex-db-2/p5-screening/1",
    qleverConnectionMode:
      lane === "qlever"
        ? requireQleverConnectionMode(process.env.TRIPLEX_QLEVER_CONNECTION_MODE ?? "keep-alive")
        : null,
    attempt,
    scope,
    startedAt,
    N,
    composition,
    lane,
    status: "RUNNING",
    classification: "DIAGNOSTIC",
    acceptance: false,
    gates: {},
    limitations: [],
    sources: {},
  });
  for (const f of [
    "lab/bench/w0-driver.ts",
    "lab/bench/lib/evaluate.ts",
    "lab/world/W0/SPEC.md",
    "lab/acceptance/oracle-contract.json",
    "lab/bench/lib/w0-world.ts",
    "lab/bench/lib/w0-fingerprint.ts",
    "lab/bench/lib/w0-seed.ts",
    "lab/bench/lib/sweep.ts",
    "lab/bench/lib/sweep-worker.ts",
    "lab/bench/lib/w0-trace.ts",
    "lab/bench/lib/w0-traffic.ts",
    "lab/bench/lib/composition.ts",
    "lab/bench/lib/memory.ts",
    "lab/bench/lib/w0-public.ts",
    "lab/bench/lib/w0-datomic-reader.ts",
    "lab/bench/lib/w0-journal.ts",
    "lab/bench/lib/w0-claims.ts",
    "lab/bench/lib/w0-live.ts",
    "lab/bench/lib/w0-live-worker.ts",
    "lab/bench/lib/w0-lease.ts",
    "lab/bench/lib/http-counts.ts",
    ...(lane === "datomic"
      ? [
          "packages/datomic/dist/index.js",
          "packages/datomic/dist/DatomicStorageAdapter.js",
          "packages/datomic/dist/DatomicClient.js",
          "packages/datomic/dist/reach.js",
        ]
      : []),
    "lab/bench/lib/w0-outbox.ts",
    "lab/bench/lib/w0-http.ts",
    "lab/bench/lib/w0-gates.ts",
    "lab/bench/lib/w0-oracle.py",
    "lab/bench/lib/trace.ts",
    "lab/bench/lib/triplex.ts",
    "packages/w0/dist/index.js",
  ])
    report.sources[f] = sha256(fs.readFileSync(f));
  const save = () => fs.writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
  save();
  process.env["TX2_P5_CLOCK_START"] = String(V_W0);
  if (lane === "datomic") process.env.TX2_W0_POINT_JOURNAL = "1";
  if (opt("seed-receipt")) process.env.TX2_W0_RESTORE_INDEXED_JOURNAL = "1";
  report.pins = await loadW0Pins();
  const lease = await measurementLease();
  let traffic: Awaited<ReturnType<typeof startW0Live>> | undefined;
  const comp = await openComposition(composition, lane, scope),
    oracle = new DomainOracle();
  const subjects = subjectList(N),
    workers = Number(opt("workers", "1"));
  let expectedState: any = emptyWireState();
  try {
    console.error(`[P5] ${attempt} seeding ${N}`);
    // [DX-H5] Why: a restored seed re-runs all content/count/fingerprint gates before timing.
    // Rejected: treating a sealed volume or historical G0 status as fresh correctness evidence.
    const seedReceipt = opt("seed-receipt");
    if (seedReceipt) {
      const bytes = fs.readFileSync(seedReceipt);
      const previous = JSON.parse(bytes.toString());
      if (
        previous.scope !== scope ||
        previous.N !== N ||
        previous.lane !== lane ||
        previous.composition !== composition ||
        previous.status !== "G0-PASS"
      )
        throw Error("sealed seed binding mismatch");
      if (previous.seed.mapper !== sha256(fs.readFileSync("lab/bench/lib/w0-seed.ts")))
        throw Error("sealed seed mapper changed");
      report.seed = previous.seed;
      report.seedRestore = {
        receiptSha256: sha256(bytes),
        path: seedReceipt,
        freshFingerprintRequired: true,
      };
    } else
      report.seed = await seedW0(
        comp,
        N,
        path.join(dir, "seed.ndjson"),
        lease.checkpoint,
        Number(opt("seed-concurrency", "1")),
      );
    save();
    await lease.checkpoint(true);
    requireCounts(await comp.storeCounts(), report.seed.counts);
    console.error("[P5] independent population fingerprint");
    await execute(
      "python3",
      [
        "-I",
        "lab/oracles/domain/cli.py",
        "--population",
        "--rung",
        String(N),
        "--fingerprint",
        "--out",
        path.join(dir, "o-domain-population.json"),
      ],
      { maxBuffer: 4 << 20 },
    );
    const expected = JSON.parse(
      fs.readFileSync(path.join(dir, "o-domain-population.json"), "utf8"),
    );
    for (const [file, hash] of Object.entries(expected.sources))
      if (sha256(fs.readFileSync(path.join("lab/oracles/domain", file))) !== hash)
        throw new Error("G0 O-DOMAIN source binding mismatch");
    report.oracle = {
      receiptSha256: sha256(fs.readFileSync(path.join(dir, "o-domain-population.json"))),
      sources: expected.sources,
    };
    const b0 = { position: report.seed.basis.tx, validAt: V_W0 };
    console.error("[P5] G0 preview sweep");
    const previewMetrics: any[] = [];
    const gate = await fingerprintSweep(
      {
        endpoint: comp.backend.url,
        scope,
        basis: b0,
        expected: { ...expected.fingerprint, N },
        counts: report.seed.counts,
      },
      async () => ({
        endpoint: comp.backend.url,
        scope,
        comp,
        close: async () => {},
        observePage: (records, page, metrics) => {
          fs.writeFileSync(path.join(dir, `preview-${page}.json`), canonical(records));
          previewMetrics.push({ page, ...metrics });
        },
      }),
    );
    const fingerprint = gate.observed,
      count = N;
    report.preview = {
      ...gate,
      metrics: previewMetrics,
      cpuScope: "main-thread-no-live-preview",
      note: "Preview reader uses the main/write gateway; fingerprint bytes and count gates are unchanged.",
    };
    requireFingerprint(fingerprint, expected, N);
    report.seed.fingerprint = fingerprint;
    report.gates.G0 = { status: "PASS", subjects: count, fingerprint };
    save();
    await lease.checkpoint(true);
    if (argv.includes("--g0-only")) {
      for (const [file, hash] of Object.entries(report.sources))
        if (sha256(fs.readFileSync(file)) !== hash)
          throw Error("source changed before seal: " + file);
      report.status = "G0-PASS";
      report.limitations.push("Activation and screening rounds not requested");
      return report;
    }
    const activation = await comp.transact(
      [
        {
          op: "assert",
          entityId: "p5:tenant",
          attribute: "p5/activation",
          value: { type: "string", value: "R2" },
          validFrom: V_W0,
        },
      ],
      { commandId: attempt + ":activate" },
    );
    if (!activation.ok || activation.value.position !== b0.position + 1)
      throw new Error("activation position mismatch");
    const basis = { position: activation.value.position, validAt: V_W0 },
      activations = [{ tx: basis.position, from: W0.POPULATION_VALID_TIME, release: W0.R2.hash }];
    report.activation = { receipt: activation.value, basis };
    // Mutations are retroactive so valid-time visibility cannot make this a false position-cut test.
    const mutationSubjects: string[] = [];
    for (let p = 0; p < Math.ceil(N / 64) && mutationSubjects.length < Math.ceil(N / 100); p++) {
      const records = JSON.parse(fs.readFileSync(path.join(dir, `preview-${p}.json`), "utf8"));
      for (const r of records) {
        if (mutationSubjects.length >= Math.ceil(N / 100)) break;
        const wm = r.world.facts.find((f: any) => f.e === r.subject && f.a === "weeklyMinutes");
        if (!wm) continue;
        const v = wm.v > 2400 ? 1200 : 3000;
        const changed = {
          ...r.world,
          facts: r.world.facts
            .filter((f: any) => f !== wm)
            .concat([{ e: r.subject, a: "weeklyMinutes", v, tx: basis.position + 1 }]),
        };
        const before = JSON.parse(
          await oracle.call("reconcile", {
            world: r.world,
            activations,
            basis: { tx: basis.position, validTime: W0.POPULATION_VALID_TIME },
          }),
        );
        const after = JSON.parse(
          await oracle.call("reconcile", {
            world: changed,
            activations,
            basis: { tx: basis.position + 1, validTime: W0.POPULATION_VALID_TIME },
          }),
        );
        if (before.error || after.error)
          throw new Error("G3 oracle error " + canonical({ before, after }));
        if (canonical(before.flags) === canonical(after.flags)) continue;
        const page = await comp.sweepPage([r.subject], basis),
          old = page.rows.find((t) => t.entityId === r.subject && t.attribute === "weeklyMinutes")!;
        const m = await comp.transact(
          [
            { op: "retract", id: old.id },
            {
              op: "assert",
              entityId: r.subject,
              attribute: "weeklyMinutes",
              value: triplexValue("weeklyMinutes", v),
              validFrom: V_W0 - 86400000,
            },
          ],
          { commandId: attempt + ":mutation:" + r.subject },
        );
        if (!m.ok || m.value.position <= basis.position) throw new Error("mutation failed");
        const latest = worldOf(
          r.subject,
          (await comp.sweepPage([r.subject], { position: m.value.position, validAt: V_W0 })).rows,
        );
        equalBytes(
          "G3 positive latest witness",
          canonical(latest.facts.find((f) => f.e === r.subject && f.a === "weeklyMinutes")?.v),
          canonical(v),
        );
        mutationSubjects.push(r.subject);
      }
    }
    if (mutationSubjects.length !== Math.ceil(N / 100))
      throw new Error("G3 insufficient positive mutation witnesses");
    const coverage = new Set<string>(),
      published = new Map<string, any>();
    // [DX-H5] Why: Python reconcile CPU is production-path gate cost inside the same VM/cgroup.
    // Rejected: treating oracle wall time as client JS CPU or assuming it costs nothing.
    const oracleCpuNs = () => {
      try {
        const value = Number(
          fs.readFileSync(`/proc/${oracle.child.pid}/schedstat`, "utf8").trim().split(/\s+/)[0],
        );
        return Number.isFinite(value) && value > 0 ? value : null;
      } catch {
        return null;
      }
    };
    const threadCpuMs = (start: NodeJS.CpuUsage, end: NodeJS.CpuUsage) =>
      (end.user - start.user + end.system - start.system) / 1000;
    const activationPage = async (records: readonly any[], page: number) => {
      const verificationCpuStart = process.threadCpuUsage(),
        oracleCpuStart = oracleCpuNs();
      const verifyStart = performance.now();
      fs.writeFileSync(path.join(dir, `activation-${page}.json`), canonical(records));
      const original = JSON.parse(fs.readFileSync(path.join(dir, `preview-${page}.json`), "utf8"));
      for (let i = 0; i < records.length; i++) {
        const r = records[i]!;
        equalBytes("G1 pinned world", canonical(r.world), canonical(original[i].world));
        const expectedOutput = await oracle.call("reconcile", {
          world: r.world,
          activations,
          basis: { tx: basis.position, validTime: W0.POPULATION_VALID_TIME },
        });
        equalBytes("G2 reconcile", W0.outputJson(r.output), expectedOutput);
        if (coverage.has(r.subject)) throw new Error("G4 duplicate evaluation");
        coverage.add(r.subject);
      }
      const evaluations = records.map((r) => r.record);
      const expectedPublish = JSON.parse(
        await oracle.call("publish", {
          state: expectedState,
          evaluations: evaluations.map(wireRecord),
        }),
      );
      const verificationBeforeMs = performance.now() - verifyStart;
      const verificationCpuBeforePublish = process.threadCpuUsage();
      const publishStart = performance.now();
      const actual: any = await comp.publishOutbox(evaluations);
      const publicationWallMs = performance.now() - publishStart;
      const verifyAfter = performance.now(),
        verificationCpuAfterPublish = process.threadCpuUsage();
      equalBytes(
        "G5 deliveries",
        canonical(deliveriesWire(actual.deliveries)),
        canonical(deliveriesWire(expectedPublish.deliveries)),
      );
      expectedState = expectedPublish.state;
      for (const d of actual.deliveries) {
        const key = d.id + ":" + d.seq;
        if (published.has(key)) throw new Error("duplicate visible delivery");
        published.set(key, d);
      }
      const verificationOracleCpuEnd = oracleCpuNs();
      return {
        verificationMs: verificationBeforeMs + performance.now() - verifyAfter,
        verificationMainThreadIntervalCpuMs:
          threadCpuMs(verificationCpuStart, verificationCpuBeforePublish) +
          threadCpuMs(verificationCpuAfterPublish, process.threadCpuUsage()),
        verificationOracleCpuMs:
          oracleCpuStart === null || verificationOracleCpuEnd === null
            ? null
            : (verificationOracleCpuEnd - oracleCpuStart) / 1e6,
        publicationWallMs,
        ...(actual.timing ?? {}),
      };
    };
    if (argv.includes("--live")) {
      const options = {
        comp,
        composition,
        lane,
        scope,
        N,
        dir,
        seed: opt("traffic-seed", "DX-H2-frozen-v1")!,
        offsetS: Number(opt("traffic-offset-s", "0")),
      };
      console.error("[P5] no-sweep live traffic (64 readers)");
      traffic = await startW0Live({ ...options, id: attempt + ":baseline" });
      await new Promise((r) => setTimeout(r, Number(opt("baseline-s", "60")) * 1000));
      report.live = {
        baseline: await traffic.stop(),
        note: "Sequential windows on one evolving store, same frozen generator and offset; command IDs namespaced by arm. Diagnostic ratios; no clone/A-A or statistical acceptance.",
      };
      traffic = undefined;
      save();
      await lease.checkpoint(true);
      console.error("[P5] sweep live traffic (64 readers)");
      traffic = await startW0Live({ ...options, id: attempt + ":sweep" });
    }
    console.error("[P5] activation and publication");
    let publicationChain = Promise.resolve();
    let publicationError: unknown;
    const cursor = path.join(dir, "activation-cursor.json");
    report.sweep = await runW0Sweep({
      comp,
      composition,
      lane,
      scope,
      subjects,
      basis,
      sweepId: attempt + ":activation",
      cursor,
      workers,
      activations,
      metricsFile: path.join(dir, "activation-pages.ndjson"),
      onPage: (records, page) => {
        const queued = performance.now();
        const task = publicationChain.then(async () => {
          if (publicationError) throw publicationError;
          traffic?.check();
          const publishQueueMs = performance.now() - queued;
          return { publishQueueMs, ...(await activationPage(records, page)) };
        });
        // [DX-H2] Why: the independent publish fold follows ACK order across workers.
        // Rejected: racing callbacks over one expected outbox state.
        publicationChain = task.then(
          () => {},
          (e) => {
            publicationError = e;
          },
        );
        return task;
      },
    });
    if (traffic) {
      report.live.sweep = await traffic.stop();
      traffic = undefined;
      report.live.matched = matchW0Live(report.live.baseline, report.live.sweep);
    }
    if (coverage.size !== N || !report.sweep.complete) throw new Error("G4 incomplete coverage");
    report.gates.G1 = {
      status: "PASS",
      subjects: N,
      expectation: "fresh O-DOMAIN fingerprint; no pre-capture trace in this diagnostic",
    };
    report.gates.G2 = {
      status: "PASS",
      subjects: N,
      oracle: "fresh O-DOMAIN reconcile per subject",
    };
    report.gates.G3 = {
      status: "PASS",
      positiveWitnesses: mutationSubjects,
      negativeWitnesses: subjects
        .filter((s) => !mutationSubjects.includes(s))
        .slice(0, mutationSubjects.length),
    };
    report.gates.G5 = {
      status: "PASS",
      deliveries: published.size,
      oracle: "O-DOMAIN publish; per-frame state folded from independent expected state",
    };
    report.gates.G7 = { status: "PASS", pages: report.sweep.metrics.length, basis };
    await lease.checkpoint(true);
    const end = await comp.storeCounts();
    // G9 counts read directly from the store and independently folded from actual committed journal changes.
    let position = 0,
      assertions = 0,
      retired = 0;
    // [DX-H2] Why: smaller D pages bound transport cost without changing the complete G9 fold. Rejected: sampling counts.
    while (true) {
      const f = await comp.feedPage(position, lane === "datomic" ? 100 : 1000);
      if (!f.transactions.length) break;
      for (const tx of f.transactions) {
        fs.appendFileSync(path.join(dir, "stored-journal.ndjson"), canonical(tx) + "\n");
        position = tx.position;
        for (const c of tx.changes) {
          if (c.op === "assert") assertions++;
          if (c.op === "retract") retired++;
        }
      }
    }
    const expectedCounts = {
      position,
      assertions,
      retired,
      ...("frames" in end ? { frames: position } : {}),
    };
    requireCounts(end, expectedCounts);
    report.counts = { start: report.seed.counts, end, expectedEnd: expectedCounts };
    report.gates.G9 = { status: "PASS", end };
    // Resume cursor no-op: persisted pages must not publish again. Abrupt process-stop coverage is a separate gate.
    const resumed = await runW0Sweep({
      comp,
      composition,
      lane,
      scope,
      subjects,
      basis,
      sweepId: attempt + ":activation",
      cursor,
      workers,
      activations,
      onPage: async () => {
        throw new Error("completed cursor replayed");
      },
    });
    report.gates.G4 = {
      status: "PARTIAL",
      coverage: N,
      resumeComplete: resumed.complete,
      reason:
        "completed-cursor resume verified; ten abrupt controller-process stops are not yet implemented",
    };
    report.gates.G6 = {
      status: "NOT-RUN",
      reason: "stacked RQ01 cases; separate reviewer integration required",
    };
    report.limitations.push(
      "No pre-capture mapped trace/O-REPLAY gate yet",
      ...(report.live
        ? [
            "Sequential traffic arms share evolving state; no matched clones or A/A calibration",
            "Live readers use current-position uniform subjects; not the full TARGETS section 2.2 read-basis/hot mix or a full live-read semantic oracle",
          ]
        : ["No 64-reader live traffic or latency ratios"]),
      "Controller unit-tested but not wired to live measurements",
      "No engine maintenance G8",
      "No ten abrupt controller-process resume cycles",
    );
    for (const [file, hash] of Object.entries(report.sources))
      if (sha256(fs.readFileSync(file)) !== hash)
        throw new Error("source changed during attempt: " + file);
    report.status = "PARTIAL";
  } catch (error: any) {
    report.status = "FAIL";
    report.error = (await import("node:util")).inspect(error, { depth: 16 });
    process.exitCode = 1;
    throw error;
  } finally {
    if (traffic) {
      try {
        report.interruptedTraffic = await traffic.stop();
      } catch (e) {
        report.trafficError = String(e);
      }
    }
    lease.release();
    report.measurementHolds = lease.holds;
    oracle.close();
    await comp.close();
    report.finishedAt = new Date().toISOString();
    save();
  }
  return report;
}
