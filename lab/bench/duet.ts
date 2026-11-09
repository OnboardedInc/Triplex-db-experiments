import { readLatencyRun } from "../receipts/parse.ts";
import { requireQleverConnectionMode } from "../receipts/latency.mjs";
#!/usr/bin/env node
/**
 * PAIR-0 duet coordinator (EXP-M01; R22 section 7; RULINGS Q60a-h). Normally run by `node lab/bin/gate.mjs PAIR`,
 * which takes the measurement lease, binds both slots' identity and cgroup values, and writes the receipt.
 *
 *   node lab/bench/duet.ts run --out runs/PAIR/<id>/duet --lane xtdb --mode aa|ab --rounds 8 [--series screening-b180]
 *     --url-a URL --url-b URL [--container-a NAME --container-b NAME --cpuset-a 0-1 --cpuset-b 2-3] [--cpus 2]
 *     [--regime cpuset|quota|none] [--rung 10k] [--composition public] [--seed ns-v2] [--readers 0] [--probe-per-s 20]
 *     [--claim superiority:1.25|hold:1.10] [--no-vm]
 *     development (recorded; never a measurement): [--subjects N] [--round key=value ...] [--trace-param key=value ...]
 *     [--warmup-periods N] [--env-a K=V ...] [--env-b K=V ...]
 *   node lab/bench/duet.ts recompute (--report runs/.../pair-report.json | --receipt lab/runs/PAIR/<id>.json) [--noise-config FILE]
 *
 * [EXP-M01] Why: two drivers replay the same trace window at the same instant against two identically configured
 * slots (a duet), so both arms share whatever the host does in that window (R22 section 1: concurrent window medians
 * correlate 0.985, windows 60 s apart 0.08). The coordinator owns the round plan, the barrier, the noise recorder
 * and calibration between rounds, the sequential looks (A/B only), and the analysis (lib/pair-analysis.ts).
 * Rejected: same-engine ABBA as the first implementation (R22's fallback; it shares almost none of the fast noise);
 * one driver process with two compositions (one event loop would couple the arms' client stalls).
 */
import { spawn, execFileSync, type ChildProcess } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import zlib from "node:zlib";
import { analysePair, type PairInput } from "./lib/pair-analysis.ts";
import {
  VmAgent, hostSample, hostSpin, loadNoiseConfig, makeRoundPlan, restoreDockerContext, summarizeRound,
  type Calib, type HostSample, type NoiseConfig, type RoundNoise, type RoundPlan, type VmSample,
} from "./lib/noise.ts";
import type { Claim } from "./lib/paired.ts";

const REPO = path.resolve(import.meta.dirname, "../..");
const DOCKER_HOST = "unix:///Users/sam/.colima/triplex2/docker.sock";
const sha256 = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, Math.max(0, ms)));
const log = (line: string) => process.stderr.write(`[duet ${new Date().toISOString().slice(11, 19)}] ${line}\n`);

function args(argv: string[]) {
  const one = (k: string, d?: string) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
  const many = (k: string) => argv.flatMap((a, i) => (a === `--${k}` ? [argv[i + 1]!] : []));
  const kv = (k: string) => Object.fromEntries(many(k).map((s) => { const j = s.indexOf("="); return [s.slice(0, j), s.slice(j + 1)]; }));
  return { one, many, kv, flag: (k: string) => argv.includes(`--${k}`) };
}
export function parseClaim(text: string | undefined, cfg: NoiseConfig): Claim {
  if (!text) return { kind: "superiority", target: cfg.claims.superiority };
  const [kind, value] = text.split(":");
  if (kind === "superiority") return { kind, target: Number(value ?? cfg.claims.superiority) };
  if (kind === "hold") return { kind, margin: Number(value ?? cfg.claims.holdP50) };
  throw new Error(`--claim superiority:R or hold:M, not ${text}`);
}
const containerId = (name: string | undefined) => {
  if (!name) return null;
  try { return execFileSync("docker", ["-H", DOCKER_HOST, "inspect", "-f", "{{.Id}}", name], { encoding: "utf8" }).trim(); } catch { return null; }
};
const atomicWrite = (file: string, text: string) => { const tmp = `${file}.${process.pid}.tmp`; fs.writeFileSync(tmp, text); fs.renameSync(tmp, file); };

// ---------------------------------------------------------------- run

async function run(argv: string[]) {
  const a = args(argv);
  const out = path.resolve(a.one("out") ?? "");
  if (!out.startsWith(path.join(REPO, "runs") + path.sep)) throw new Error("--out must be under runs/");
  const lane = a.one("lane", "xtdb")!;
  const mode = a.one("mode", "aa") as "aa" | "ab";
  const { config: cfg, sha256: noiseSha } = loadNoiseConfig(path.join(REPO, "lab/config/noise.json"));
  const roundsWanted = Number(a.one("rounds", String(mode === "aa" ? cfg.rounds.min : cfg.rounds.max)));
  const series = a.one("series", "screening-b180")!;
  const seed = a.one("seed", "ns-v2")!;
  const composition = a.one("composition", "public")!;
  const regime = a.one("regime", composition === "memory" ? "none" : "cpuset") as "cpuset" | "quota" | "none";
  const claim = parseClaim(a.one("claim"), cfg);
  // Q67g: each arm's placement (slot, regime, cpuset, cpuMax, memCapBytes, cores), bound by the gate; absent offline.
  const placement = a.one("placement") ? JSON.parse(fs.readFileSync(path.resolve(a.one("placement")!), "utf8")) : undefined;
  const noiseConfigText = fs.readFileSync(path.join(REPO, "lab/config/noise.json"), "utf8");
  const num = (o: Record<string, string>) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, Number(v)]));
  const dev = { subjects: a.one("subjects") ?? null, round: num(a.kv("round")), traceParams: num(a.kv("trace-param")), warmupPeriods: a.one("warmup-periods") ? Number(a.one("warmup-periods")) : null, envA: a.kv("env-a"), envB: a.kv("env-b") };
  const devOverrides = [dev.subjects ? "subjects" : null, Object.keys(dev.round).length ? "round" : null, Object.keys(dev.traceParams).length ? "trace-param" : null, dev.warmupPeriods !== null ? "warmup-periods" : null, Object.keys(dev.envA).length ? "env-a" : null, Object.keys(dev.envB).length ? "env-b" : null].filter(Boolean) as string[];
  const plan = makeRoundPlan(cfg, { mode, series, rounds: roundsWanted, seed, readers: Number(a.one("readers", "0")), probePerS: Number(a.one("probe-per-s", "20")), roundOverride: dev.round, traceOverride: dev.traceParams, warmupPeriods: dev.warmupPeriods ?? undefined, sha256: noiseSha });
  fs.mkdirSync(out, { recursive: true });
  const planFile = path.join(out, "round-plan.json");
  fs.writeFileSync(planFile, JSON.stringify(plan, null, 2) + "\n");
  const planSha = sha256(fs.readFileSync(planFile));
  const barrier = path.join(out, "barrier");
  fs.mkdirSync(barrier, { recursive: true });
  const arms = (["A", "B"] as const).map((arm) => {
    const k = arm.toLowerCase();
    const container = a.one(`container-${k}`);
    return { arm, url: a.one(`url-${k}`) ?? `memory://${arm}`, container: container ?? null, containerId: containerId(container), cpuset: a.one(`cpuset-${k}`) ?? null, env: arm === "A" ? dev.envA : dev.envB };
  });
  if (composition !== "memory" && arms.some((x) => !x.url.startsWith("postgres://") && !x.url.startsWith("http"))) throw new Error("--url-a and --url-b are required for an engine composition");
  const report: Record<string, any> = {
    format: "tx2-pair-report/1", status: "RUNNING", startedAt: new Date().toISOString(), mode, series, lane, composition, regime, claim, seed,
    roundsPlanned: plan.rounds.length, planSha256: planSha, noiseConfigSha256: noiseSha, devOverrides, dev,
    arms: Object.fromEntries(arms.map((x) => [x.arm, { url: x.url, container: x.container, containerId: x.containerId, cpuset: x.cpuset }])),
  };
  const save = () => fs.writeFileSync(path.join(out, "pair-report.json"), JSON.stringify(report) + "\n");
  save();

  // ---- both drivers
  const children: Record<string, { child: ChildProcess; exit: Promise<number | null>; report: string }> = {};
  for (const x of arms) {
    const dir = path.join(out, x.arm);
    fs.mkdirSync(dir, { recursive: true });
    const reportFile = path.join(dir, "ns-report.json");
    const driverArgs = [path.join(REPO, "lab/bench/driver.ts"), "--lane", lane, "--rung", a.one("rung", "10k")!, "--output", reportFile, "--arm", x.arm, "--round-plan", planFile, "--barrier-dir", barrier, "--composition", composition, "--seed", seed];
    if (dev.subjects) driverArgs.push("--subjects", dev.subjects);
    if (a.one("seed-budget-s")) driverArgs.push("--seed-budget-s", a.one("seed-budget-s")!);
    const envVar = lane === "xtdb" ? "XTDB_URL" : "QLEVER_URL";
    const env = { ...process.env, [envVar]: x.url, TX2_ENGINE_CPUS: a.one("cpus", "2")!, ...(x.container ? { TX2_ENGINE_CONTAINER: x.container } : {}), ...x.env };
    if (!x.container) delete env["TX2_ENGINE_CONTAINER"];
    const logFd = fs.openSync(path.join(dir, "driver.log"), "w");
    const child = spawn(process.execPath, driverArgs, { cwd: REPO, env, stdio: ["ignore", logFd, logFd] });
    children[x.arm] = { child, exit: new Promise((r) => child.on("exit", (code) => { fs.closeSync(logFd); r(code); })), report: reportFile };
    log(`arm ${x.arm}: driver pid ${child.pid} -> ${x.url}${x.container ? ` (${x.container})` : ""}`);
  }
  const exited: Record<string, number | null | undefined> = {};
  for (const [arm, c] of Object.entries(children)) void c.exit.then((code) => { exited[arm] = code; });
  const killAll = () => { for (const c of Object.values(children)) if (c.child.exitCode === null) c.child.kill("SIGTERM"); };

  // ---- noise recorder (host every cadence, VM agent over one colima ssh session)
  const host: HostSample[] = [], vm: VmSample[] = [];
  const samplesFile = path.join(out, "noise-samples.jsonl");
  const sampleOut = fs.openSync(samplesFile, "w");
  const agent = a.flag("no-vm") ? null : new VmAgent("triplex2", cfg.hiccup.sleepMs);
  const vmUp = agent ? await agent.start() : false;
  if (agent && !vmUp) log(`VM agent did not start (${agent.errors.slice(0, 2).join("; ")}): every round will be excluded by signals-missing`);
  let sampling = false, lastTop = 0, samplerOn = true;
  const sampleOnce = async () => {
    if (sampling || !samplerOn) return;
    sampling = true;
    try {
      const withTop = Date.now() - lastTop >= cfg.sampling.hostTopEveryS * 1000;
      if (withTop) lastTop = Date.now();
      const [h, v] = await Promise.all([hostSample(withTop), vmUp ? agent!.sample() : Promise.resolve(null)]);
      host.push(h);
      fs.writeSync(sampleOut, JSON.stringify({ kind: "host", ...h }) + "\n");
      if (v) { vm.push(v); fs.writeSync(sampleOut, JSON.stringify({ kind: "vm", ...v }) + "\n"); }
    } finally { sampling = false; }
  };
  await sampleOnce();
  const sampler = setInterval(() => void sampleOnce(), cfg.sampling.cadenceS * 1000);
  const calibs: Record<string, { pre: { host: Calib | null; vm: Calib | null }; post: { host: Calib | null; vm: Calib | null } }> = {};
  const spin = async (): Promise<{ host: Calib; vm: Calib | null }> => {
    const h = hostSpin(cfg.calibration.units, cfg.calibration.hostUnitIterations);
    const v = vmUp ? await agent!.calib(cfg.calibration.units, cfg.calibration.vmUnitIterations) : null;
    fs.writeSync(sampleOut, JSON.stringify({ kind: "calib", host: h, vm: v }) + "\n");
    return { host: h, vm: v };
  };

  let traceStart = 0;
  const calibRef: { host: Calib; vm: Calib | null }[] = [];
  let stoppedAfter: number | null = null;
  const looks: any[] = [];
  try {
    // ---- barrier: both arms seeded with the same population and trace digest
    const readyFile = (arm: string) => path.join(barrier, `${arm}.ready.json`);
    while (!(fs.existsSync(readyFile("A")) && fs.existsSync(readyFile("B")))) {
      if (Object.keys(exited).length) throw new Error(`driver ${Object.keys(exited).join(",")} exited (code ${Object.values(exited).join(",")}) before the barrier; see ${path.relative(REPO, out)}/<arm>/driver.log`);
      await sleep(250);
    }
    const ready = Object.fromEntries(["A", "B"].map((arm) => [arm, JSON.parse(fs.readFileSync(readyFile(arm), "utf8"))]));
    report.ready = ready;
    const mismatch = ready["A"].seededSubjects !== ready["B"].seededSubjects || ready["A"].traceDigest !== ready["B"].traceDigest || ready["A"].planSha256 !== ready["B"].planSha256;
    if (mismatch) {
      atomicWrite(path.join(barrier, "go.json"), JSON.stringify({ abort: `arms differ: ${JSON.stringify(ready)}` }) + "\n");
      throw new Error(`arms are not paired (subjects ${ready["A"].seededSubjects}/${ready["B"].seededSubjects}, trace ${ready["A"].traceDigest}/${ready["B"].traceDigest})`);
    }
    traceStart = Date.now() + 5000;
    atomicWrite(path.join(barrier, "go.json"), JSON.stringify({ startAtAbsMs: traceStart, at: new Date().toISOString() }) + "\n");
    report.traceStartAbsMs = traceStart;
    log(`go: both arms at ${new Date(traceStart).toISOString()} (${ready["A"].seededSubjects} subjects, trace ${ready["A"].traceDigest})`);
    save();

    // ---- calibration reference: the first runs in the warm-up period, before its burst (R22 section 4.3)
    await sleep(traceStart + 1000 - Date.now());
    const ref: { host: Calib; vm: Calib | null }[] = [];
    for (let i = 0; i < cfg.calibration.referenceRuns; i++) ref.push(await spin());
    const refMin = (xs: (Calib | null)[]) => { const v = xs.filter(Boolean).map((c) => c!.min); return v.length ? Math.min(...v) : null; };
    report.calibrationReference = { runs: ref.length, hostMinMs: refMin(ref.map((r) => r.host)), vmMinMs: refMin(ref.map((r) => r.vm)), at: new Date().toISOString() };
    calibRef.push(...ref);

    // ---- rounds: calibration before and after each measured block; looks in A/B mode
    for (const [k, r] of plan.rounds.entries()) {
      if (Object.keys(exited).length) throw new Error(`driver ${Object.keys(exited).join(",")} exited during the rounds`);
      await sleep(traceStart + r.calibPre[0] * 1000 - Date.now());
      const pre = await spin();
      await sleep(traceStart + r.calibPost[0] * 1000 - Date.now());
      const post = await spin();
      calibs[r.id] = { pre, post };
      log(`round ${r.id} done: calib host ${pre.host.min.toFixed(1)}->${post.host.min.toFixed(1)} ms, vm ${pre.vm?.min.toFixed(1) ?? "-"}->${post.vm?.min.toFixed(1) ?? "-"} ms`);
      if (mode === "ab" && cfg.rounds.looks.includes(k + 1) && k + 1 < plan.rounds.length) {
        const look = await lookAt(k + 1);
        looks.push(look);
        if (look.decisive) {
          atomicWrite(path.join(barrier, "stop.json"), JSON.stringify({ afterRound: r.id, endAbsMs: Date.now() }) + "\n");
          log(`look at ${k + 1} rounds: ${look.decision}; stopping both arms`);
          stoppedAfter = k + 1;
          break;
        }
      }
    }
  } catch (error: any) {
    report.status = "ERROR";
    report.error = String(error?.stack ?? error);
    log(`error: ${error?.message ?? error}`);
    if (!fs.existsSync(path.join(barrier, "go.json"))) atomicWrite(path.join(barrier, "go.json"), JSON.stringify({ abort: String(error?.message ?? error) }) + "\n");
    else killAll();
  }

  // ---- wind down: drivers finish their own drain and write reports; keep sampling until they do
  let exitTimer: ReturnType<typeof setTimeout> | undefined;
  const exitCodes = await Promise.race([Promise.all(Object.values(children).map((c) => c.exit)), new Promise<null>((r) => { exitTimer = setTimeout(() => r(null), 30 * 60_000); })]);
  clearTimeout(exitTimer);
  if (exitCodes === null) { killAll(); report.error ??= "drivers did not exit within 30 min of the last round"; report.status = "ERROR"; }
  await sleep(cfg.sampling.cadenceS * 1000 + 500);
  samplerOn = false;
  clearInterval(sampler);
  while (sampling) await sleep(100);
  if (agent) { await agent.stop(); report.vmAgent = { hello: agent.hello, errors: agent.errors.slice(0, 20) }; }
  else await restoreDockerContext();
  fs.closeSync(sampleOut);
  fs.writeFileSync(`${samplesFile}.gz`, zlib.gzipSync(fs.readFileSync(samplesFile)));
  fs.rmSync(samplesFile);
  report.samples = { host: host.length, vm: vm.length, file: path.relative(REPO, `${samplesFile}.gz`), sha256: sha256(fs.readFileSync(`${samplesFile}.gz`)) };

  const driverReports: Record<string, any> = {};
  for (const [arm, c] of Object.entries(children)) {
    driverReports[arm] = fs.existsSync(c.report) ? readLatencyRun(c.report, { lane, expectedMode: lane === "qlever" ? requireQleverConnectionMode(process.env.TRIPLEX_QLEVER_CONNECTION_MODE ?? "keep-alive") : null }).unwrap().data : null;
    const d = driverReports[arm];
    report.arms[arm] = {
      ...report.arms[arm], exitCode: exited[arm] ?? null, report: path.relative(REPO, c.report), reportSha256: fs.existsSync(c.report) ? sha256(fs.readFileSync(c.report)) : null,
      status: d?.status ?? "MISSING", error: d?.error ? String(d.error).slice(0, 1000) : undefined, scope: d?.scope, seededSubjects: d?.seed?.seededSubjects, seedComplete: d?.seed?.complete,
      backend: d?.composition?.backend, compositionName: d?.composition?.name, assignments: d?.composition?.assignments, correctness: d?.correctness ? { reads: d.correctness.reads, correct: d.correctness.correct, violations: d.correctness.violations, errors: d.correctness.errors, byKind: d.correctness.byKind, violationKinds: d.correctness.violationKinds } : null,
      client: d?.client ? { saturatedRounds: d.client.saturatedRounds, processCpu: d.client.processCpu } : null, writer: d?.writer, probe: d?.pair?.probe, trace: d?.trace ? { digest: d.trace.digest, seed: d.trace.seed, params: d.trace.params, generated: d.trace.generated } : null,
      generator: d?.generator, benchSources: d?.benchSources,
    };
  }
  if (report.status !== "ERROR" && Object.values(driverReports).some((d) => d?.status !== "DONE")) {
    report.status = "ERROR";
    report.error = `driver status ${Object.entries(driverReports).map(([k, d]) => `${k}=${d?.status ?? "MISSING"}`).join(", ")}`;
  }
  if (report.status !== "ERROR") {
    // A fixed-size A/A run is one analysis at 95%; an A/B run's final analysis is its last registered look (Pocock 98.2%).
    const level = mode === "ab" ? cfg.rounds.lookLevel : cfg.rounds.level;
    const input = { gradingVersion: 2 as const, ...analysisInput(stoppedAfter === null ? plan : { ...plan, rounds: plan.rounds.slice(0, stoppedAfter) }, driverReports, host, vm, calibs, arms, regime, claim, mode, composition, calibRef), level, placement: placement ?? null };
    const result = analysePair({ ...input, config: cfg });
    report.trace = { digest: driverReports["A"].trace.digest, seed, generatorSha256: driverReports["A"].generator.traceSha256, params: driverReports["A"].trace.params, digestB: driverReports["B"].trace.digest };
    report.roundsRun = input.rounds.length;
    report.looks = looks;
    report.stoppedAfter = stoppedAfter;
    report.calibration = { reference: report.calibrationReference, rounds: Object.fromEntries(Object.entries(calibs).map(([id, c]) => [id, { pre: { host: c.pre.host?.min ?? null, vm: c.pre.vm?.min ?? null }, post: { host: c.post.host?.min ?? null, vm: c.post.vm?.min ?? null } }])) };
    report.noiseRounds = input.noiseFull;
    const { noiseFull: _full, ...stored } = input;
    report.evidence = evidenceOf(stored, result, noiseConfigText);
    report.stats = result.stats;
    report.noise = { ...result.noise, calibration: { ref: report.calibrationReference } };
    report.checks = result.checks;
    report.status = "DONE";
  }
  report.endedAt = new Date().toISOString();
  save();
  log(`pair report: ${path.relative(REPO, path.join(out, "pair-report.json"))} (${report.status})`);
  if (report.status !== "DONE") process.exitCode = 1;

  async function lookAt(k: number) {
    const ids = plan.rounds.slice(0, k).map((r) => r.id);
    const files = (arm: string) => ids.map((id) => path.join(barrier, `${arm}.${id}.json`));
    const until = Date.now() + 90_000;
    while (Date.now() < until && ![...files("A"), ...files("B")].every((f) => fs.existsSync(f))) await sleep(500);
    await sleep(cfg.sampling.cadenceS * 1000 + 500); // a sample after the round's end brackets its window
    if (![...files("A"), ...files("B")].every((f) => fs.existsSync(f))) return { rounds: k, decisive: false, decision: "round files missing", at: new Date().toISOString() };
    const partial: Record<string, any> = { A: { pair: { rounds: [] }, histograms: {} }, B: { pair: { rounds: [] }, histograms: {} } };
    for (const arm of ["A", "B"]) for (const f of files(arm)) {
      const row = JSON.parse(fs.readFileSync(f, "utf8"));
      partial[arm].pair.rounds.push(row);
      for (const [name, h] of Object.entries(row.hist)) partial[arm].histograms[`${row.id}.${arm}.${name}`] = h;
    }
    const sub = { ...plan, rounds: plan.rounds.slice(0, k) };
    const input = analysisInput(sub, partial, host, vm, calibs, arms, regime, claim, mode, composition, calibRef);
    const res = analysePair({ ...input, config: cfg, level: cfg.rounds.lookLevel });
    return { rounds: k, level: cfg.rounds.lookLevel, decision: res.stats.primary.decision, decisive: res.stats.primary.decisive, p50: res.stats.p50, grade: res.noise.windowGrade.grade, at: new Date().toISOString() };
  }
}

/** The exact input `analysePair` needs (retained as hashed evidence in the report and the receipt: RULINGS Q67f). */
function analysisInput(plan: RoundPlan, reports: Record<string, any>, host: HostSample[], vm: VmSample[], calibs: Record<string, any>, arms: { arm: "A" | "B"; containerId: string | null; cpuset: string | null }[], regime: "cpuset" | "quota" | "none", claim: Claim, mode: "aa" | "ab", composition: string, calibRef: { host: Calib; vm: Calib | null }[]) {
  const rowsA = new Map<string, any>(reports["A"].pair.rounds.map((r: any) => [r.id, r]));
  const rowsB = new Map<string, any>(reports["B"].pair.rounds.map((r: any) => [r.id, r]));
  const rounds = plan.rounds.filter((r) => rowsA.has(r.id) && rowsB.has(r.id) && rowsA.get(r.id).commands.expected > 0);
  const histograms: Record<string, any> = {};
  for (const arm of ["A", "B"]) for (const [name, h] of Object.entries(reports[arm].histograms ?? {})) if (rounds.some((r) => name.startsWith(`${r.id}.`))) histograms[name] = h;
  const noiseFull: RoundNoise[] = rounds.map((r) => summarizeRound({
    id: r.id, window: { fromMs: rowsA.get(r.id).fromMs, toMs: rowsA.get(r.id).toMs }, host, vm,
    arms: arms.map((x) => ({ arm: x.arm, containerId: x.containerId, cpuset: x.cpuset })), armsRequired: composition !== "memory",
    calib: calibs[r.id] ?? { pre: { host: null, vm: null }, post: { host: null, vm: null } },
    clients: [rowsA.get(r.id)?.client ?? null, rowsB.get(r.id)?.client ?? null],
  }));
  const noise = noiseFull.map((n) => ({ id: n.id, window: n.window, signals: n.signals, partitioned: n.partitioned, missing: n.missing, arms: n.arms, neighbors: n.neighbors })) as unknown as RoundNoise[];
  const spin = (c: Calib | null | undefined) => (c ? { at: c.at, ms: c.ms } : null);
  const calibration = {
    reference: calibRef.map((r) => ({ host: spin(r.host), vm: spin(r.vm) })),
    rounds: Object.fromEntries(rounds.map((r) => { const c = calibs[r.id]; return [r.id, { pre: { host: spin(c?.pre.host), vm: spin(c?.pre.vm) }, post: { host: spin(c?.post.host), vm: spin(c?.post.vm) } }]; })),
  };
  const acc = (row: any) => ({ offered: row.offered, commands: { committed: row.commands.committed, censored: row.commands.censored, pendingAtEnd: row.commands.pendingAtEnd, byOutcome: row.commands.byOutcome }, probes: { ok: row.probes.ok, errors: row.probes.errors, expired: row.probes.expired, pendingAtEnd: row.probes.pendingAtEnd } });
  const accounting = Object.fromEntries(rounds.map((r) => [r.id, { A: acc(rowsA.get(r.id)), B: acc(rowsB.get(r.id)) }]));
  const out = { gradingVersion: 2 as const, mode, rounds: rounds.map((r) => ({ id: r.id, kind: r.kind, preflight: r.preflight, fromS: r.fromS, toS: r.toS })), histograms, noise, regime, claim, accounting, calibration, noiseFull };
  return out as Omit<PairInput, "config"> & { noiseFull: RoundNoise[] };
}

// ---------------------------------------------------------------- evidence and recompute

/**
 * RULINGS Q67f: everything an independent checker needs, each item as one JSON string with its sha256: the rounds
 * (A/A rounds by kind), per-round per-arm histograms (mergeable form, with the censored views), the noise signals per
 * round with the exclusions and rule ids applied, the calibration samples, the offered-command accounting (digests
 * and counts), each arm's placement, the analysis parameters, and the noise rules themselves (lab/config/noise.json).
 */
export const EVIDENCE_KEYS = ["analysis", "rounds", "histograms", "signals", "calibration", "accounting", "placement", "noiseConfig"] as const;
export function evidenceOf(input: any, result: any, noiseConfigText: string) {
  const item = (value: unknown) => { const json = typeof value === "string" ? value : JSON.stringify(value); return { sha256: sha256(json), json }; };
  return {
    analysis: item({ ...(input.gradingVersion === 2 ? { gradingVersion: 2 } : {}), mode: input.mode, regime: input.regime, claim: input.claim, level: input.level }),
    rounds: item(input.rounds),
    histograms: item(input.histograms),
    signals: item({ rounds: input.noise, exclusions: result.noise.exclusions, rules: result.noise.rules }),
    calibration: item(input.calibration),
    accounting: item(input.accounting),
    placement: item(input.placement ?? null),
    noiseConfig: item(noiseConfigText),
  };
}

/**
 * Recomputes every paired number from the retained evidence alone (a PAIR receipt's `pair.evidence` or a pair report's
 * `evidence`) and compares it field by field with what the document claims: stats, noise (grade, exclusions), checks
 * (rounds a registered look, accounting, calibration-derived signals, placement) and, for a receipt, the verdict.
 * The rules come from the evidence itself; `cfgFile` only overrides them for experiments.
 */
export function recompute(doc: any, cfgFile?: string) {
  const ev = doc.pair?.evidence ?? doc.evidence;
  if (!ev) throw new Error("no evidence in this document (pair.evidence or evidence)");
  for (const k of EVIDENCE_KEYS) {
    if (!ev[k]) throw new Error(`evidence item ${k} is missing`);
    if (sha256(ev[k].json) !== ev[k].sha256) throw new Error(`evidence item ${k} does not match its sha256`);
  }
  const cfgText = cfgFile ? fs.readFileSync(cfgFile, "utf8") : ev.noiseConfig.json;
  const wantSha = doc.pair?.noiseConfigSha256 ?? doc.noiseConfigSha256;
  if (sha256(cfgText) !== wantSha) throw new Error(`noise config has sha256 ${sha256(cfgText)}, the run used ${wantSha}`);
  const config = JSON.parse(cfgText) as NoiseConfig;
  const J = (k: string) => JSON.parse(ev[k].json);
  const analysis = J("analysis"), signals = J("signals"), placement = J("placement");
  const input: PairInput = { ...analysis, rounds: J("rounds"), histograms: J("histograms"), noise: signals.rounds, calibration: J("calibration"), accounting: J("accounting"), placement, config };
  const result = analysePair(input);
  const stored = { stats: doc.stats, noise: { ...doc.noise, calibration: undefined }, checks: doc.checks, exclusions: signals.exclusions, rules: signals.rules };
  const fresh = { stats: result.stats, noise: { ...result.noise, calibration: undefined }, checks: result.checks, exclusions: result.noise.exclusions, rules: result.noise.rules };
  const diffs: string[] = [];
  const walk = (x: any, y: any, at: string) => {
    if (typeof x !== typeof y || Array.isArray(x) !== Array.isArray(y) || (x === null) !== (y === null)) { diffs.push(`${at}: ${JSON.stringify(x)?.slice(0, 80)} vs ${JSON.stringify(y)?.slice(0, 80)}`); return; }
    if (x && typeof x === "object") { for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) walk(x[k], y[k], `${at}.${k}`); return; }
    if (x !== y && !(Number.isNaN(x) && Number.isNaN(y))) diffs.push(`${at}: ${x} vs ${y}`);
  };
  walk(JSON.parse(JSON.stringify(stored)), JSON.parse(JSON.stringify(fresh)), "");
  // Problems a correct receipt cannot carry, whatever its labels say (Q67f counterexamples: RED window, committed-only
  // primary, no numbers at all).
  const problems = [
    ...(result.checks.rounds.isRegisteredLook ? [] : [`${result.checks.rounds.count} rounds is not a registered look (${result.checks.rounds.registeredLooks.join(", ")})`]),
    ...result.checks.accounting.problems, ...result.checks.calibration.problems, ...(result.checks.placement?.problems ?? ["no placement evidence"]),
  ];
  let verdict: string | null = null;
  if (doc.gate === "PAIR") {
    const departures = [...(doc.pair?.devOverrides?.length ? [`development overrides: ${doc.pair.devOverrides.join(", ")}`] : []), ...(doc.lease ? [] : ["no measurement lease"]),
      ...(result.checks.rounds.isRegisteredLook ? [] : ["rounds not a registered look"]), ...(result.checks.placement?.problems ?? ["no placement"])];
    verdict = result.checks.accounting.ok && result.checks.calibration.ok ? pairVerdictOf({ grade: result.noise.windowGrade.grade, decision: result.stats.primary.decision, departures }).verdict : "FAIL";
    if (doc.verdict !== "FAIL" && verdict !== doc.verdict) diffs.push(`verdict: ${doc.verdict} vs recomputed ${verdict}`);
  }
  return { match: diffs.length === 0, diffs, problems, verdict, primary: result.stats.primary, grade: result.noise.windowGrade.grade };
}
const { pairVerdictOf } = (await import(new URL("../bin/receipt.mjs", import.meta.url).href)) as any;

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  if (cmd === "run") return run(rest);
  if (cmd === "recompute") {
    const a = args(rest);
    const file = a.one("receipt") ?? a.one("report");
    if (!file) throw new Error("recompute needs --receipt FILE or --report FILE");
    const r = recompute(JSON.parse(fs.readFileSync(path.resolve(file), "utf8")), a.one("noise-config") ? path.resolve(a.one("noise-config")!) : undefined);
    console.log(JSON.stringify({ match: r.match, verdict: r.verdict, primary: r.primary, grade: r.grade, problems: r.problems, diffs: r.diffs.slice(0, 20) }, null, 2));
    if (!r.match) process.exitCode = 1;
    return;
  }
  throw new Error("usage: duet.ts run ... | duet.ts recompute (--receipt FILE | --report FILE)");
}
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) main().catch((e) => { log(String(e?.stack ?? e)); process.exitCode = 1; });

