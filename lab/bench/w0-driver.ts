import fs from "node:fs";
import path from "node:path";
import { randomUUID, createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { openComposition } from "./lib/composition.ts";
import { loadW0Pins } from "./lib/evaluate.ts";
import { seedW0 } from "./lib/w0-seed.ts";
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
    lane = opt("lane", "xtdb")! as "xtdb" | "qlever";
  const output = path.resolve(opt("output", `runs/P5/${randomUUID()}/receipt.json`)!);
  if (!output.startsWith(path.resolve("runs") + path.sep))
    throw new Error("--output must be inside worktree runs/");
  const dir = path.dirname(output);
  fs.mkdirSync(dir, { recursive: true });
  if (fs.existsSync(output)) throw new Error("attempt output already exists");
  const attempt = randomUUID(),
    scope = "p5-" + attempt;
  const startedAt = new Date().toISOString();
  const report: any = {
    format: "triplex-db-2/p5-screening/1",
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
  };
  for (const f of [
    "lab/bench/w0-driver.ts",
    "lab/bench/lib/evaluate.ts",
    "lab/world/W0/SPEC.md",
    "lab/acceptance/oracle-contract.json",
    "lab/bench/lib/w0-world.ts",
    "lab/bench/lib/w0-seed.ts",
    "lab/bench/lib/sweep.ts",
    "lab/bench/lib/sweep-worker.ts",
    "lab/bench/lib/w0-trace.ts",
    "lab/bench/lib/composition.ts",
    "lab/bench/lib/memory.ts",
    "lab/bench/lib/w0-public.ts",
    "lab/bench/lib/w0-outbox.ts",
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
  report.pins = await loadW0Pins();
  const comp = await openComposition(composition, lane, scope),
    oracle = new DomainOracle();
  const subjects = subjectList(N),
    workers = Number(opt("workers", "1"));
  let expectedState: any = emptyWireState();
  try {
    console.error(`[P5] ${attempt} seeding ${N}`);
    report.seed = await seedW0(comp, N, path.join(dir, "seed.ndjson"));
    save();
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
    report.preview = await runW0Sweep({
      comp,
      composition,
      lane,
      scope,
      subjects,
      basis: b0,
      sweepId: attempt + ":g0",
      cursor: path.join(dir, "preview-cursor.json"),
      workers,
      onPage: async (records, page) => {
        fs.writeFileSync(path.join(dir, `preview-${page}.json`), canonical(records));
      },
    });
    const worlds = createHash("sha256"),
      outputs = createHash("sha256");
    worlds.update("[");
    outputs.update("[");
    let count = 0,
      facts = 0;
    for (let p = 0; p < Math.ceil(N / 64); p++)
      for (const r of JSON.parse(fs.readFileSync(path.join(dir, `preview-${p}.json`), "utf8"))) {
        worlds.update(count ? "," : "");
        worlds.update(canonical(r.world));
        outputs.update(count ? "," : "");
        outputs.update(W0.outputJson(r.output));
        facts += r.world.facts.length;
        count++;
      }
    worlds.update("]");
    outputs.update("]");
    const fingerprint = {
      basisTx: b0.position,
      facts,
      worlds: "sha256:" + worlds.digest("hex"),
      R2: "sha256:" + outputs.digest("hex"),
    };
    requireFingerprint(fingerprint, expected, N);
    report.seed.fingerprint = fingerprint;
    report.gates.G0 = { status: "PASS", subjects: count, fingerprint };
    save();
    if (argv.includes("--g0-only")) {
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
    const activationPage = async (records: readonly any[], page: number) => {
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
      const actual = await comp.publishOutbox(evaluations);
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
    };
    console.error("[P5] activation and publication");
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
      onPage: activationPage,
    });
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
    const end = await comp.storeCounts();
    // G9 counts read directly from the store and independently folded from actual committed journal changes.
    let position = 0,
      assertions = 0,
      retired = 0;
    while (true) {
      const f = await comp.feedPage(position, 1000);
      if (!f.transactions.length) break;
      for (const tx of f.transactions) {
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
      "No 64-reader live traffic or latency ratios",
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
    report.error = String(error.stack ?? error);
    process.exitCode = 1;
    throw error;
  } finally {
    oracle.close();
    await comp.close();
    report.finishedAt = new Date().toISOString();
    save();
  }
  return report;
}
