import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import { Histogram } from "../lib/hist.ts";
import { analysePair } from "../lib/pair-analysis.ts";
import { analyseSingleWindow } from "../lib/single-analysis.ts";
import { windowGrade } from "../lib/paired.ts";
import { evidenceOf, recompute } from "../duet.ts";
import { createHash } from "node:crypto";
const text = fs.readFileSync(new URL("../../config/noise.json", import.meta.url), "utf8");
const cfg = JSON.parse(text);
const rounds = () => Array.from({ length: 12 }, (_, i) => {
  const id = `R${String(i + 1).padStart(2, "0")}`;
  const signals = Object.fromEntries(cfg.rules.map((r: any) => [r.signal, r.excludeOutside ? 1 : 0]));
  signals["calib.interferenceMax"] = 1;
  return { id, armId: "A", burstPhase: "12:162/180", p50Ms: 1, noise: { id, window: { fromMs: i * 180000, toMs: i * 180000 + 150000 }, partitioned: true, missing: [], signals } as any };
});
const single = (r = rounds(), preflight = false) => analyseSingleWindow({ armId: "A", preflight, regime: "cpuset", config: cfg, rounds: r });

test("review F1: one hard memory event preserves paired GREEN but forbids single-arm timing", () => {
  const rs = rounds(); rs[0]!.noise.signals["vm.psi.memFullShare"] = 0.05;
  const h = new Histogram(); for (let i = 0; i < 100; i++) h.recordUs(1000);
  const histograms: Record<string, any> = {};
  for (const r of rs) for (const a of ["A", "B"]) for (const m of ["commitAll", "commit", "commitCensored", "probeAll", "probe", "probeCensored"]) histograms[`${r.id}.${a}.${m}`] = m === "commit" || m === "commitAll" ? h.toJSON() : new Histogram().toJSON();
  const arm = () => ({ offered: { commands: 100, commandsDigest: "fixture", probes: 0, probesDigest: "fixture" }, commands: { committed: 100, censored: 0, pendingAtEnd: 0, byOutcome: { committed: 100 } }, probes: { ok: 0, errors: 0, expired: 0, pendingAtEnd: 0 } });
  const spin = () => ({ ms: Array(20).fill(20) });
  const place = (slot: string, cpuset: string) => ({ slot, cpuset, regime: "cpuset", cpuMax: "max 100000", memCapBytes: 3758096384, cores: 2 });
  const input = { gradingVersion: 2 as const, mode: "aa" as const, rounds: rs.map(r => ({ id: r.id, kind: "aa" as const, preflight: false })), histograms, noise: rs.map(r => r.noise), config: cfg, regime: "cpuset" as const, accounting: Object.fromEntries(rs.map(r => [r.id, { A: arm(), B: arm() }])), calibration: { rounds: Object.fromEntries(rs.map(r => [r.id, { pre: { host: spin(), vm: spin() }, post: { host: spin(), vm: spin() } }])) }, placement: { A: place("s1", "0-1"), B: place("s3", "2-3") } };
  const paired = analysePair(input), one = single(rs);
  assert.equal(paired.noise.windowGrade.grade, "GREEN");
  assert.equal(paired.checks.accounting.ok, true); assert.equal(paired.checks.calibration.ok, true); assert.deepEqual(paired.checks.placement?.problems, []);
  assert.deepEqual(paired.noise.hardRuleHistory, [{ roundId: "R01", ruleIds: ["vm-psi-mem-full"] }]);
  assert.equal(one.windowGrade.grade, "RED"); assert.equal(one.timingEligible, false);
  assert.deepEqual(one.hardRuleHistory, paired.noise.hardRuleHistory);
  const doc = { evidence: evidenceOf(input, paired, text), noiseConfigSha256: createHash("sha256").update(text).digest("hex"), ...paired };
  assert.equal(recompute(doc).match, true);
  assert.equal(recompute({ ...doc, noise: { ...doc.noise, hardRuleHistory: [] } }).match, false);
});

test("single grading uses sequential ratios, retains exclusions and fails closed on binding/sample gaps", () => {
  assert.equal(single().timingEligible, true);
  const rs = rounds(); rs.forEach((r, i) => { r.p50Ms = 2 ** i; });
  assert.ok(single(rs).logRatios.every(r => Math.abs(r.d - Math.log(2)) < 1e-12));
  const short = single(rounds().slice(0, 3), true);
  assert.equal(short.logRatios.length, 2); assert.equal(short.windowGrade.grade, "UNGRADED");
  assert.equal(single(rounds().slice(0, 4), true).timingEligible, true);
  for (const modify of [
    (r: ReturnType<typeof rounds>) => { r[1]!.armId = "B"; },
    (r: ReturnType<typeof rounds>) => { r[1]!.burstPhase = "different"; },
    (r: ReturnType<typeof rounds>) => { r[1]!.noise.id = "old"; },
    (r: ReturnType<typeof rounds>) => { delete r[1]!.noise.signals["vm.psi.memFullShare"]; },
    (r: ReturnType<typeof rounds>) => { r[1]!.id = r[0]!.id; },
  ]) { const r = rounds(); modify(r); assert.equal(single(r).timingEligible, false); }
  const soft = rounds(); soft[1]!.noise.signals["vm.psi.ioSomeShare"] = 0.2;
  const result = single(soft);
  assert.equal(result.windowGrade.grade, "AMBER"); assert.equal(result.timingEligible, false);
  assert.equal(result.hardRuleHistory.length, 0); assert.equal(result.logRatios.length, 9, "excluded round is not bridged");
  const base = { contract: "single-q100k" as const, sdP50: 0.1, sdRounds: 8, sdSource: "aa" as const, rounds: 12, excluded: 0, amberRounds: 0, partitioned: true };
  assert.equal(windowGrade(base).grade, "UNGRADED");
  assert.equal(windowGrade({ ...base, hardRuleHistory: [] }).grade, "UNGRADED", "duet statistic cannot admit single timing");
});
