/** PAIR-0 recorder, rules, round book and analysis tests (EXP-M01; R22 sections 2.4, 4, 7). Offline: no engine, no VM. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { createHash } from "node:crypto";
import { Histogram } from "../lib/hist.ts";
import { applyRules, calibOf, cpuList, loadNoiseConfig, makeRoundPlan, parseHost, summarizeRound, type HostSample, type VmSample } from "../lib/noise.ts";
import { RoundBook } from "../lib/rounds.ts";
import { analysePair } from "../lib/pair-analysis.ts";
import { syntheticBlocks } from "../lib/paired.ts";
import { TRACE_DEFAULTS, generateTrace, inBurst } from "../lib/trace.ts";
import { evidenceOf, recompute } from "../duet.ts";

const REPO = path.resolve(import.meta.dirname, "../../..");
const { config: cfg, sha256: cfgSha } = loadNoiseConfig(path.join(REPO, "lab/config/noise.json"));

test("noise.json: every rule names a known class and the screening series puts one whole burst inside every measured window", () => {
  for (const r of cfg.rules) assert.ok(["hard", "soft", "record", "hard-after-partition", "hard-in-cpuset-regime"].includes(r.class), r.id);
  assert.equal(new Set(cfg.rules.map((r) => r.id)).size, cfg.rules.length, "rule ids are unique");
  const plan = makeRoundPlan(cfg, { mode: "aa", series: "screening-b180", rounds: 8, seed: "ns-v2", sha256: cfgSha });
  assert.equal(plan.warmupS, 180);
  assert.equal(plan.durationS, 180 * 9);
  const p = { ...TRACE_DEFAULTS, ...plan.traceParams };
  for (const r of plan.rounds) {
    assert.equal(r.toS - r.fromS, 150);
    assert.equal(r.calibPre[1] + 2, r.fromS);
    let burstS = 0;
    for (let t = r.fromS; t < r.toS; t++) if (inBurst(t, p)) burstS++;
    assert.equal(burstS, 60, `${r.id} holds the whole 60 s burst`);
    assert.ok(!inBurst(r.calibPre[0], p) && !inBurst(r.calibPost[0], p), "calibration never overlaps a burst");
  }
  // About 3,300 commands per round (R22 finding 4) in the screening series.
  const events = generateTrace({ seed: "ns-v2", subjects: 10_000, durationS: plan.durationS, params: p }).filter((e) => !e.resend);
  const r1 = plan.rounds[0]!;
  const inR1 = events.filter((e) => e.atMs >= r1.fromS * 1000 && e.atMs < r1.toS * 1000).length;
  assert.ok(inR1 > 3000 && inR1 < 4000, `commands in a screening round: ${inR1}`);
  assert.throws(() => makeRoundPlan(cfg, { mode: "aa", series: "screening-b180", rounds: 1, seed: "x", roundOverride: { measuredS: 170 }, sha256: "" }), /does not fit/);
});

test("host parser reads sysctl, vm_stat and top", () => {
  const h = parseHost(1, "{ 11.23 12.01 13.00 }\n2\ntotal = 28672.00M  used = 27531.25M  free = 1140.75M  (encrypted)\n",
    "Mach Virtual Memory Statistics: (page size of 16384 bytes)\nPages occupied by compressor:            894229.\nDecompressions:                      1912738766.\nPageouts:                               1021635.\n",
    "Processes: 900 total\nCPU usage: 50.12% user, 20.5% sys, 29.38% idle\n");
  assert.deepEqual(h, { t: 1, loadAvg1: 11.23, pressureLevel: 2, swapUsedBytes: 27531.25 * 1024 ** 2, pageouts: 1021635, decompressions: 1912738766, compressorPages: 894229, cpuIdlePct: 29.38 });
  assert.deepEqual([...cpuList("0-1,4")], [0, 1, 4]);
});

const vmSample = (t: number, mono: number, over: Partial<VmSample> = {}, groups: any[] = []): VmSample => ({
  type: "sample", t, tag: "", mono, wall: t / 1000, cpu: [100 * mono, 0, 50 * mono, 300 * mono, 0, 0, 0, 0], load: ["6.1", "6", "6"],
  psi: { cpu: { some: Math.round(mono * 0.3e6) }, memory: { some: 0, full: 0 }, io: { some: Math.round(mono * 0.01e6), full: 0 } }, cgroups: groups, hiccupMaxMs: 3, hiccupN: 9000,
  hiccupSeconds: [[Math.floor(t / 1000) - 110, 3, 900], [Math.floor(t / 1000) - 60, 4, 900]], ...over,
});
const group = (id: string, cpuset: string, usageCores: number, mono: number, extra: any = {}) => ({ id, cpuMax: "max 100000", cpuWeight: 100, cpuset, usageUsec: Math.round(usageCores * mono * 1e6), nrPeriods: 0, nrThrottled: 0, evMax: 0, evOomKill: 0, ...extra });
const calm = { pre: { host: calibOf("host", 0, Array(20).fill(20)), vm: calibOf("vm", 0, Array(20).fill(21)) }, post: { host: calibOf("host", 0, Array(20).fill(21)), vm: calibOf("vm", 0, Array(20).fill(21)) } };
const hostAt = (t: number, pageouts: number): HostSample => ({ t, loadAvg1: 9, pressureLevel: 2, swapUsedBytes: 1, pageouts, decompressions: 10, compressorPages: 1 });

test("round summary: PSI shares, arm counters, neighbour on an arm's vCPUs, partition, restarts and missing signals", () => {
  const arms = [{ arm: "A" as const, containerId: "aaaa", cpuset: "0-1" }, { arm: "B" as const, containerId: "bbbb", cpuset: "2-3" }];
  const mk = (neighborCpus: string, t0Usage = 0) => [
    vmSample(0, 100, {}, [group("aaaa", "0-1", 1.5, 100), group("bbbb", "2-3", 1.4, 100), group("cccc", neighborCpus, 1.0, 100, { usageUsec: t0Usage || 100e6 })]),
    vmSample(160_000, 260, {}, [group("aaaa", "0-1", 1.5, 260, { usageUsec: 1.5 * 100e6 + 1.5 * 160e6 }), group("bbbb", "2-3", 1.4, 260, { usageUsec: 1.4 * 100e6 + 1.4 * 160e6 }), group("cccc", neighborCpus, 1.0, 260, { usageUsec: 100e6 + 0.8 * 160e6 })]),
  ];
  const base = { id: "R01", window: { fromMs: 1000, toMs: 151_000 }, host: [hostAt(0, 10), hostAt(160_000, 30)], arms, armsRequired: true, calib: calm, clients: [{ eluMean: 0.3, eluMax: 0.5, hiccupMaxMs: 4 }, { eluMean: 0.35, eluMax: 0.6, hiccupMaxMs: 5 }] };
  const unpinned = summarizeRound({ ...base, vm: mk("0-5") });
  assert.ok(Math.abs(unpinned.signals["vm.psi.cpuSomeShare"]! - 0.3) < 1e-9);
  assert.ok(Math.abs(unpinned.arms["A"]!.cores! - 1.5) < 1e-9);
  assert.equal(unpinned.arms["A"]!.throttledShare, 0, "no quota: no CFS periods");
  assert.equal(unpinned.partitioned, false);
  assert.ok(Math.abs(unpinned.signals["neighbors.maxCoresOnArmCpus"]! - 0.8) < 1e-9);
  assert.equal(unpinned.signals["host.pageoutsDelta"], 20);
  assert.equal(unpinned.signals["signals.missing"], 0, unpinned.missing.join(","));
  assert.equal(unpinned.signals["hiccup.vmMaxMs"], 4, "VM per-second maxima mapped onto host time");
  assert.equal(unpinned.signals["hiccup.maxMs"], 5, "the worse of the VM and the drivers");
  const pinned = summarizeRound({ ...base, vm: mk("4-5") });
  assert.equal(pinned.partitioned, true);
  assert.equal(pinned.signals["neighbors.maxCoresOnArmCpus"], 0);
  // Rules: neighbour CPU is hard only after partition; unpinned, it is recorded and not applied.
  const ru = applyRules(unpinned, cfg.rules, { regime: "cpuset" });
  assert.deepEqual(ru.excluded, []);
  assert.ok(ru.notApplied.some((n) => n.id === "neighbor-cpu"));
  const rp = applyRules({ ...pinned, signals: { ...pinned.signals, "neighbors.maxCoresOnArmCpus": 0.6 }, partitioned: true }, cfg.rules, { regime: "cpuset" });
  assert.deepEqual(rp.excluded, ["neighbor-cpu"]);
  // A restart (usage counter went backwards) and a missing VM sample each exclude the round.
  const restarted = summarizeRound({ ...base, vm: [mk("0-5")[0]!, vmSample(160_000, 260, {}, [group("aaaa", "0-1", 0.01, 1), group("bbbb", "2-3", 1.4, 260), group("cccc", "0-5", 1, 260)])] });
  assert.equal(restarted.signals["arms.restarts"], 1);
  assert.ok(applyRules(restarted, cfg.rules, { regime: "cpuset" }).excluded.includes("arm-restart"));
  const noVm = summarizeRound({ ...base, vm: [] });
  assert.ok(noVm.missing.includes("vm"));
  assert.ok(applyRules(noVm, cfg.rules, { regime: "cpuset" }).excluded.includes("signals-missing"));
});

test("rules: soft amber and exclusion, calibration drift window, cpuset-only throttling rule", () => {
  const n = (signals: Record<string, number | null>) => ({ id: "R", window: { fromMs: 0, toMs: 1 }, signals: { "signals.missing": 0, ...signals }, arms: {}, neighbors: [], partitioned: true, calib: calm, missing: [] });
  assert.deepEqual(applyRules(n({ "vm.psi.cpuSomeShare": 0.45 }), cfg.rules, { regime: "cpuset" }).amber, ["vm-psi-cpu-some"]);
  assert.deepEqual(applyRules(n({ "vm.psi.cpuSomeShare": 0.65 }), cfg.rules, { regime: "cpuset" }).excluded, ["vm-psi-cpu-some"]);
  assert.deepEqual(applyRules(n({ "calib.hostDrift": 1.2 }), cfg.rules, { regime: "cpuset" }).excluded, ["calib-drift-host"]);
  assert.deepEqual(applyRules(n({ "calib.hostDrift": 0.9 }), cfg.rules, { regime: "cpuset" }).excluded, []);
  assert.deepEqual(applyRules(n({ "arms.throttledShareMax": 0.77 }), cfg.rules, { regime: "cpuset" }).excluded, ["arm-throttled"]);
  assert.deepEqual(applyRules(n({ "arms.throttledShareMax": 0.77 }), cfg.rules, { regime: "quota" }).excluded, [], "quota arms are a different regime, never compared (Q60c)");
  assert.deepEqual(applyRules(n({ "host.pressureLevelMax": 4 }), cfg.rules, { regime: "cpuset" }).excluded, ["host-mem-pressure-critical"]);
  assert.deepEqual(applyRules(n({ "hiccup.maxMs": 150 }), cfg.rules, { regime: "cpuset" }).excluded, ["hiccup"]);
});

test("round book: every offered command counts, censored at its censor time; rounds emit only when complete", () => {
  const plan = makeRoundPlan(cfg, { mode: "aa", series: "screening-b180", rounds: 2, seed: "s", sha256: "" });
  const t0 = 1_000_000;
  const r1 = plan.rounds[0]!;
  const cmds = [{ seq: 1, atMs: r1.fromS * 1000 + 10 }, { seq: 2, atMs: r1.fromS * 1000 + 20 }, { seq: 3, atMs: r1.fromS * 1000 + 30 }, { seq: 4, atMs: 5 }];
  const book = new RoundBook(plan.rounds, t0, cmds, [{ seq: 1, atMs: r1.fromS * 1000 + 40 }]);
  const client = () => ({ eluMean: 0.1, eluMax: 0.2, hiccupMaxMs: 1 });
  const at = (ms: number) => t0 + r1.fromS * 1000 + ms;
  book.recordCommand({ seq: 1, scheduledAt: at(10), finishedAt: at(25), latencyMs: 15, outcome: "committed" });
  book.recordCommand({ seq: 2, scheduledAt: at(20), finishedAt: at(30_020), latencyMs: 30_000, outcome: "expired" });
  book.recordCommand({ seq: 4, scheduledAt: t0 + 5, finishedAt: t0 + 6, latencyMs: 1, outcome: "committed" }); // warm-up: no round
  book.recordProbe({ seq: 1, scheduledAt: at(40), finishedAt: at(45), latencyMs: 5, ok: true, expired: false });
  assert.deepEqual(book.ready(t0 + r1.toS * 1000 + 1, client), [], "command 3 is still pending");
  book.recordCommand({ seq: 3, scheduledAt: at(30), finishedAt: at(1030), latencyMs: 1000, outcome: "typed-conflict" });
  const [row] = book.ready(t0 + r1.toS * 1000 + 1, client);
  assert.equal(row!.id, "R01");
  assert.deepEqual(row!.commands, { expected: 3, finished: 3, committed: 1, censored: 2, pendingAtEnd: 0, byOutcome: { committed: 1, expired: 1, "typed-conflict": 1 } });
  assert.equal(row!.summary.commitAll.count, 3);
  assert.equal(row!.summary.commitCensored.minMs, 1000);
  assert.equal(row!.perSecond.commitGoodput[0], 1);
  assert.equal(row!.perSecond.commitMaxMs[0], 30_000);
  assert.equal(row!.probes.ok, 1);
  // A command that never finishes is censored at the end; a round after an early stop is dropped.
  const book2 = new RoundBook(plan.rounds, t0, [{ seq: 9, atMs: r1.fromS * 1000 + 1 }], []);
  const rows = book2.finalize(t0 + r1.fromS * 1000 + 61_001, client, t0 + r1.toS * 1000 + 5);
  assert.equal(rows.length, 1);
  assert.equal(rows[0]!.commands.pendingAtEnd, 1);
  assert.equal(rows[0]!.summary.commitCensored.maxMs, 61_000);
});

test("analysis: A/A synthetic rounds grade, exclusions drop rounds, and recompute reproduces the result bit for bit", () => {
  // A faster config for tests, hashed like the real one.
  const small = { ...JSON.parse(fs.readFileSync(path.join(REPO, "lab/config/noise.json"), "utf8")), rounds: { ...cfg.rounds, boots: 300 }, aaCheck: { trials: 30, boots: 150, seed: 11 } };
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tx2-m01-"));
  const cfgFile = path.join(dir, "noise.json");
  fs.writeFileSync(cfgFile, JSON.stringify(small));
  const smallSha = createHash("sha256").update(fs.readFileSync(cfgFile)).digest("hex");
  const blocks = syntheticBlocks({ rounds: 9, perRound: 800, ratio: 1, rho: 0.8, seed: 4 });
  const histograms: Record<string, any> = {};
  for (const b of blocks) for (const [arm, r] of [["A", b.a], ["B", b.b]] as const) {
    histograms[`${b.id}.${arm}.commitAll`] = r.all.toJSON();
    histograms[`${b.id}.${arm}.commitCensored`] = new Histogram().toJSON();
    histograms[`${b.id}.${arm}.commit`] = r.all.toJSON();
    for (const m of ["probeAll", "probe", "probeCensored"]) histograms[`${b.id}.${arm}.${m}`] = new Histogram().toJSON();
  }
  const clean = (id: string, extra: Record<string, number> = {}) => ({ id, window: { fromMs: 0, toMs: 1 }, signals: { "signals.missing": 0, "vm.psi.cpuSomeShare": 0.2, ...extra }, partitioned: true, missing: [] });
  const noise = blocks.map((b, k) => clean(b.id, k === 2 ? { "vm.psi.memFullShare": 0.05 } : {}));
  // Calibration samples, and signals that follow from them (Q67f: the checker recomputes these).
  const spin = (base: number) => ({ ms: Array.from({ length: 20 }, (_, i) => base + (i % 3) * 0.5) });
  const calibration = { reference: [], rounds: Object.fromEntries(blocks.map((b) => [b.id, { pre: { host: spin(20), vm: spin(21) }, post: { host: spin(20.5), vm: spin(21) } }])) };
  for (const n of noise) {
    const c = calibration.rounds[n.id]!, k = (x: { ms: number[] }, w: "host" | "vm") => calibOf(w, 0, x.ms);
    Object.assign(n.signals, { "calib.hostDrift": k(c.post.host, "host").min / k(c.pre.host, "host").min, "calib.vmDrift": k(c.post.vm, "vm").min / k(c.pre.vm, "vm").min, "calib.interferenceMax": Math.max(...[c.pre.host, c.pre.vm, c.post.host, c.post.vm].map((x) => k(x, "host").interference)) });
  }
  const arm = () => ({ offered: { commands: 800, commandsDigest: "same", probes: 0, probesDigest: "same" }, commands: { committed: 800, censored: 0, pendingAtEnd: 0, byOutcome: { committed: 800 } }, probes: { ok: 0, errors: 0, expired: 0, pendingAtEnd: 0 } });
  const accounting = Object.fromEntries(blocks.map((b) => [b.id, { A: arm(), B: arm() }]));
  const placement = { A: { slot: "s1", regime: "cpuset", cpuset: "0-1", cpuMax: "max 100000", memCapBytes: 1, cores: 2 }, B: { slot: "s3", regime: "cpuset", cpuset: "2-3", cpuMax: "max 100000", memCapBytes: 1, cores: 2 } };
  const input = { mode: "aa" as const, rounds: blocks.map((b) => ({ id: b.id, kind: "aa" as const, preflight: false })), histograms, noise: noise as any, regime: "cpuset" as const, claim: { kind: "superiority" as const, target: 1.25 }, level: 0.95, accounting, calibration, placement };
  const res = analysePair({ ...input, config: small });
  assert.deepEqual(res.noise.exclusions, { R03: ["vm-psi-mem-full"] });
  assert.equal(res.stats.p50!.rounds, 8);
  assert.equal(res.noise.aa.rounds, 8);
  assert.ok(res.noise.aa.sdLogP50! > 0 && res.noise.aa.sdLogP50! < 0.39);
  assert.ok(["GREEN", "AMBER"].includes(res.noise.windowGrade.grade));
  assert.ok(["EQUIVALENT_WITHIN_TARGET", "INCONCLUSIVE_NEED_MORE_ROUNDS", "FASTER", "SLOWER"].includes(res.stats.primary.decision));
  assert.ok(res.stats.metrics.commitAll.aa.procedureFalsePositive.p50.trials > 0);
  assert.deepEqual(res.checks.accounting.problems, []);
  assert.deepEqual(res.checks.calibration.problems, []);
  assert.deepEqual(res.checks.placement!.problems, [], "disjoint 0-1 / 2-3 of equal size is a valid duet (Q67g)");
  assert.equal(res.checks.rounds.isRegisteredLook, false, "9 rounds is not a registered look (Q67f)");
  // Recompute from a receipt-shaped document built only from the retained evidence: same numbers, same verdict.
  const smallText = fs.readFileSync(cfgFile, "utf8");
  const evidence = evidenceOf(input, res, smallText);
  const clone = (x: unknown) => JSON.parse(JSON.stringify(x));
  const doc: any = { gate: "PAIR", verdict: "INVALID", lease: { holder: "t" }, pair: { evidence, noiseConfigSha256: smallSha, devOverrides: [] }, stats: clone(res.stats), noise: clone({ ...res.noise, calibration: { ref: { hostMinMs: 20 } } }), checks: clone(res.checks) };
  const again = recompute(doc);
  assert.equal(again.match, true, again.diffs.join("\n"));
  assert.equal(again.verdict, "INVALID");
  assert.ok(again.problems.some((x) => /not a registered look/.test(x)));
  // Counterexamples (round 8, finding 7): labels that the evidence does not support never survive a recompute.
  assert.equal(recompute({ ...doc, stats: { ...doc.stats, p50: { ...doc.stats.p50, lo: 0.1, hi: 0.2 } } }).match, false, "a made-up interval");
  assert.equal(recompute({ ...doc, noise: { ...doc.noise, windowGrade: { ...doc.noise.windowGrade, grade: "GREEN" === doc.noise.windowGrade.grade ? "RED" : "GREEN" } } }).match, false, "a relabelled window grade");
  const shed = clone(accounting);
  shed.R01.A.offered.commands = 810; // 10 offered commands missing from commitAll: a committed-only histogram passed off as commitAll
  const shedDoc = { ...doc, pair: { ...doc.pair, evidence: { ...evidence, accounting: { json: JSON.stringify(shed), sha256: createHash("sha256").update(JSON.stringify(shed)).digest("hex") } } } };
  const r = recompute(shedDoc);
  assert.ok(r.problems.some((x) => /commitAll holds 800 of 810 offered/.test(x)));
  assert.equal(r.verdict, "FAIL");
  assert.equal(r.match, false);
  assert.throws(() => recompute({ gate: "PAIR", verdict: "PAIRED_DECIDED", stats: {}, noise: {} }), /no evidence/, "no numbers at all");
  assert.throws(() => recompute({ ...doc, pair: { ...doc.pair, evidence: { ...evidence, histograms: { ...evidence.histograms, json: "{}" } } } }), /does not match its sha256/);
  assert.throws(() => recompute(doc, path.join(REPO, "lab/config/noise.json")), /sha256/);
});
