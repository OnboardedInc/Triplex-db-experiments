// @ts-nocheck -- [DX-T1-13] Why: sealed manifests and runtime report shapes are validated before their flags are rendered. Rejected: unchecked byte, clock or source assumptions; binding diagnostics still run.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync, spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { nightWindow, checkNightWindow } from "./night-window.mjs";
import {
  checkV3Trace,
  assertRequiredPlanCounts,
  poolRows,
} from "../../../bench/lib/verdict-plan.ts";
import { generateTrace } from "../../../bench/lib/trace.ts";
import { collectHostGate, evaluateHostGate } from "../../../trace/host-admission.mjs";
import { records, filesUnder, percentile } from "../../../trace/report.mjs";
import { applyCommitVerdicts, committedRows, reportWindows } from "../../../bench/lib/verdict.ts";
import { verdictMs } from "../../../trace/instrument.mjs";
import { nativeBookendComparison } from "../../../trace/native-settings.mjs";
const read = (f) => JSON.parse(fs.readFileSync(f, "utf8"));
const hash = (b) => createHash("sha256").update(b).digest("hex");
const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
const baseScript = "lab/experiments/EXP-DX1/t1/";
// [DX-T1-13] Why: a night verdict must not inherit an earlier diagnostic's layout, CPU, logger, tracing or warmer overrides.
// Rejected: defaults that silently retain the launching shell's experiment knobs.
export function nightEnvironment(base, root, windowFile) {
  const env = Object.fromEntries(
    Object.entries(base).filter(
      ([key]) =>
        !(
          /^(DX_|TRIPLEX_|DATOMIC_|TX2_)/.test(key) ||
          ["DOCKER_CONTEXT", "NODE_OPTIONS"].includes(key)
        ),
    ),
  );
  return {
    ...env,
    DOCKER_HOST: `unix://${os.homedir()}/.colima/triplex2/docker.sock`,
    DX_STACK_EVIDENCE: root,
    DX_NIGHT_WINDOW: windowFile,
    DX_COMPILER_POLICY: "early",
    DX_STUDY_LEVEL: "summary",
    DX_NS_PROFILE: "v3",
    TRIPLEX_TRACE_LEVEL: "summary",
    TRIPLEX_DATOMIC_FAST_PATHS: "",
    DX_CPUS_TX: "0",
    DX_CPUS_PG: "1",
    DX_CPUS_GW_WRITE: "2",
    DX_CPUS_GW_READ: "4",
    DX_MAIN_CPU: "3",
    DX_CPUS_DRIVER: "3,4,5,6,7",
    DX_WORKER_CPUS: "4,5,6,7",
    DX_TX_OBJECT_CACHE: "1280m",
    DX_QUIET_LOGS: "1",
    DX_ENCRYPT_CHANNEL: "true",
    DX_HARNESS_STORAGE: "volume",
    DX_PUBLICATION_MODE: "worker",
    DX_SERVER_RECORD_TIME: "1",
  };
}
const scalar = (v) =>
  v === null || v === undefined
    ? "?"
    : typeof v === "number"
      ? Number.isInteger(v)
        ? String(v)
        : v.toFixed(3)
      : typeof v === "object"
        ? JSON.stringify(v)
        : String(v);
export const barCell = (b) =>
  !b
    ? "unavailable"
    : `${b.pass === true ? "MET" : b.pass === false ? "MISS" : "UNJUDGED"} ${scalar(b.value)}; n=${b.n ?? "?"}${b.denominatorN !== undefined ? "/" + (b.denominatorN ?? "?") : ""}; CI${b.id.includes("RECOVERY-MS") ? " (qualifying writer ratio)" : ""} ${b.interval90 ? `[${scalar(b.interval90.low)},${scalar(b.interval90.high)}]` : "unavailable"}`;
export function renderNightSummary(night, reference, observations) {
  const complete = observations.filter((o) => o.valid),
    bars = reference.bars;
  const lines = [
    `# NIGHT-${night.date}`,
    "",
    `ACK clock, minimum 500 committed primaries; 90% bootstrap intervals. Plan ${night.planId}, source ${night.source}.`,
    "Historical H is rescored; it is not a same-session control. 26–50 band and P5 remain unjudged when underfilled; no missing result is a pass.",
    "MET/MISS are observed point flags; an unqualified run cannot establish acceptance.",
    "",
  ];
  for (const o of observations)
    lines.push(
      o.valid
        ? `${o.label}: ${o.met} MET / ${o.missed} MISS / ${o.unjudged} UNJUDGED; ${o.qualified ? "run qualified" : "run UNQUALIFIED: " + (o.qualificationReasons ?? []).join("; ")}; oracle ${o.oracle}; summary tracing; swap ${scalar(o.swapGiB)} GiB, non-VM CPU ${scalar(o.macCpuMedian)}%; off ACK p50/p99 ${o.controls.map((c) => `${scalar(c.p50)}/${scalar(c.p99)} (swap ${scalar(c.swapGiB)}, CPU ${scalar(c.macCpuMedian)}%)`).join("; ")} ms.`
        : `${o.label}: INCOMPLETE / UNJUDGED — ${o.reason}`,
    );
  if (!observations.length) lines.push("No completed pairs yet.");
  if (night.issue) lines.push("Night status: " + night.issue);
  lines.push(
    "",
    `| Bar (threshold) | H (historical) | ${observations.map((o) => o.label).join(" | ") || "Tonight"} |`,
    `| --- | --- | ${observations.map(() => "---").join(" | ") || "---"} |`,
  );
  const all = new Map(bars.map((b) => [b.id, b]));
  for (const o of complete) for (const b of o.bars) if (!all.has(b.id)) all.set(b.id, b);
  for (const [id, b] of all)
    lines.push(
      `| ${id.replaceAll("|", "/")} (${b.bar}) | ${barCell(bars.find((x) => x.id === id)).replaceAll("|", "/")} | ${observations.map((o) => (o.valid ? barCell(o.bars.find((x) => x.id === id)) : "UNJUDGED")).join(" | ") || "pending"} |`,
    );
  lines.push(
    "",
    `Gate, arm exits, exact input hashes and per-arm telemetry: ${night.tag}/. Full tables/viewers: each tag's TRACE-REPORT.md and trace.html.`,
    `Optional six/eight comparison: ${night.cpuStatus ?? "not started; two v3 pairs have priority"}.`,
    "",
  );
  return lines.join("\n");
}
// [DX-T1-13] Why: a readable night table is derived only from sealed completed bytes with this night's source, slot, clock and oracle.
// Rejected: a successful shell exit, an old ns-report.json or copying an aggregate PASS into a new run.
async function checkedArm(
  root,
  tag,
  night,
  { loaded = false, off = false, diagnostic = false } = {},
) {
  const dir = path.join(root, tag),
    seal = fs.readFileSync(path.join(dir, "SHA256SUMS"), "utf8");
  const sealed = new Map(
    seal
      .trim()
      .split("\n")
      .map((l) => {
        const m = /^([a-f0-9]{64})  (.+)$/.exec(l);
        if (!m) throw Error("invalid run seal");
        return [m[2], m[1]];
      }),
  );
  const inputs = {};
  for (const name of [
    "trace-run.json",
    "head.txt",
    "source-build-hashes.json",
    "driver/ns-report.json",
    "driver/ns-writes.jsonl",
    "trace-summary.json",
    "trace/SHA256SUMS",
    "night-host-gate.json",
    "driver-container.json",
  ]) {
    const bytes = fs.readFileSync(path.join(dir, name));
    if (!sealed.has(name) || sealed.get(name) !== hash(bytes))
      throw Error("run seal differs: " + name);
    inputs[name] = hash(bytes);
  }
  const m = read(path.join(dir, "trace-run.json")),
    b = read(path.join(dir, "driver/ns-report.json")),
    t = read(path.join(dir, "trace-summary.json"));
  const gate = read(path.join(dir, "night-host-gate.json"));
  if (
    !evaluateHostGate(gate.samplesRaw ?? [], gate.context ?? {}).eligible ||
    gate.samplesRaw[0].at < night.startedAt ||
    gate.samplesRaw.at(-1).at > m.startedAt ||
    m.startedAt - gate.samplesRaw.at(-1).at > 300000
  )
    throw Error("stale or refused night host gate");
  if (
    m.tag !== tag ||
    m.slot !== tag ||
    m.source !== night.source ||
    m.startedAt < night.startedAt ||
    m.startedAt >= night.endAt ||
    b.status !== "DONE" ||
    b.seed?.seededSubjects !== 10000 ||
    b.config.readPath !== "replica" ||
    !b.config.strictRecordClocks ||
    b.config.splitTarget !== "pending" ||
    b.config.zeroReaders !== !loaded ||
    m.level !== (off ? "off" : "summary") ||
    t.source !== night.source ||
    (!off && !t.complete) ||
    fs.readFileSync(path.join(dir, "head.txt"), "utf8").trim() !== night.source
  )
    throw Error("unfinished, stale or foreign arm " + tag);
  if (
    !off &&
    (b.config.profile !== (diagnostic ? "smoke" : "v3") ||
      b.config.matchDurationS !== (diagnostic ? 900 : night.offeredSeconds) ||
      (!diagnostic && b.verdictPlanId !== night.planId) ||
      b.verdictClock !== "ack/1" ||
      b.config.readerLadderOnly)
  )
    throw Error("changed v3 plan " + tag);
  if (!off && b.trace?.digest !== night.traceDigest) throw Error("changed frozen trace");
  if (
    b.correctness?.errors !== 0 ||
    b.correctness?.violations !== 0 ||
    !(b.correctness?.reads > 0) ||
    b.correctness.correct !== b.correctness.reads
  )
    throw Error("incorrect model observations");
  if (
    loaded &&
    (b.oracle?.status !== "PASS" ||
      b.oracle.exitCode !== 0 ||
      b.oracle.mismatchCount !== 0 ||
      !b.oracle.reads ||
      b.oracle.modelCorrectOnSameReads !== b.oracle.reads ||
      b.oracle.oracleVerdict !== "PASS" ||
      b.oracle.receiptConsistency !== "PASS")
  )
    throw Error("loaded oracle incomplete");
  const swaps = [],
    cpus = [];
  const rawSeal = new Map(
    fs
      .readFileSync(path.join(dir, "trace/SHA256SUMS"), "utf8")
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((l) => [l.slice(66), l.slice(0, 64)]),
  );
  for (const f of filesUnder(path.join(dir, "trace/raw")).filter((f) =>
    /system-.*jsonl.gz$/.test(f),
  )) {
    if (rawSeal.get(path.relative(path.join(dir, "trace/raw"), f)) !== hash(fs.readFileSync(f)))
      throw Error("resource bytes differ");
    for await (const r of records(f))
      if (r.process === "system-darwin") {
        if (
          r.run !== tag ||
          r.slot !== tag ||
          r.source !== night.source ||
          r.at < m.startedAt - 1000
        )
          throw Error("foreign host observation");
        const value = /used\s*=\s*([\d.]+)M/.exec(r.swap ?? "");
        if (value) swaps.push(Number(value[1]) / 1024);
        if (Number.isFinite(r.otherCpu)) cpus.push(r.otherCpu);
      }
  }
  if (!swaps.length || !cpus.length) throw Error("missing host context");
  const writes = [];
  for await (const w of records(path.join(dir, "driver/ns-writes.jsonl")))
    if (w.stream === "background" && !w.resend) writes.push(w);
  if (!writes.length || new Set(writes.map((w) => w.seq)).size !== writes.length)
    throw Error("missing or duplicate primary commands");
  return {
    tag,
    report: b,
    writes,
    inputs,
    sourceHashes: fs.readFileSync(path.join(dir, "source-build-hashes.json"), "utf8"),
    swapGiB: percentile(swaps, 0.5),
    macCpuMedian: percentile(cpus, 0.5),
  };
}
export async function summarizePair(root, prefix, night, label) {
  try {
    const arms = [];
    for (const suffix of ["off-before", "zero", "ladder", "off-after"])
      arms.push(
        await checkedArm(root, `${prefix}-${suffix}`, night, {
          loaded: suffix === "ladder",
          off: suffix.startsWith("off-"),
        }),
      );
    if (new Set(arms.map((a) => a.sourceHashes)).size !== 1)
      throw Error("source/build changed across arms");
    const events = generateTrace({ seed: "ns-v2", subjects: 10000, durationS: 7200 });
    for (const arm of arms) {
      const recomputed = structuredClone(arm.report);
      applyCommitVerdicts(recomputed, arm.writes, arm === arms[2] ? arms[1].writes : null, events);
      for (const [p, priority] of Object.entries(recomputed.priorities))
        if (JSON.stringify(priority.bars) !== JSON.stringify(arm.report.priorities[p]?.bars))
          throw Error("bar differs from sealed primary observations: " + arm.tag);
      arm.qualification = recomputed.verdict?.runQualification ?? {
        eligible: false,
        reasons: ["qualification unavailable"],
      };
    }
    const loaded = arms[2],
      bars = Object.values(loaded.report.priorities).flatMap((p) => p.bars ?? []),
      controls = arms
        .filter((a) => a.tag.includes("-off-"))
        .map((a) => ({
          tag: a.tag,
          p50: a.report.priorities.P2.allPrimary?.p50Ms,
          p99: a.report.priorities.P2.allPrimary?.p99Ms,
          swapGiB: a.swapGiB,
          macCpuMedian: a.macCpuMedian,
        }));
    if (controls.some((c) => !Number.isFinite(c.p50) || !Number.isFinite(c.p99)))
      throw Error("missing off ACK control");
    return {
      valid: true,
      label,
      tag: prefix,
      bars,
      met: bars.filter((b) => b.pass === true).length,
      missed: bars.filter((b) => b.pass === false).length,
      unjudged: bars.filter((b) => b.pass !== true && b.pass !== false).length,
      oracle: loaded.report.oracle.status,
      qualified: loaded.qualification.eligible === true,
      qualificationReasons: loaded.qualification.reasons,
      controls,
      swapGiB: loaded.swapGiB,
      macCpuMedian: loaded.macCpuMedian,
      inputs: arms.map((a) => ({ tag: a.tag, hashes: a.inputs })),
    };
  } catch (error) {
    return { valid: false, label, tag: prefix, reason: error.message };
  }
}
export async function summarizeCpuComparison(root, prefix, night) {
  const observations = [];
  let commonSource;
  for (const [i, mode] of ["eight", "six", "eight"].entries()) {
    const tag = `${prefix}-${i + 1}-${mode}`;
    const zero = await checkedArm(root, tag + "-zero", night, { diagnostic: true });
    const loaded = await checkedArm(root, tag + "-ladder", night, {
      loaded: true,
      diagnostic: true,
    });
    if (
      zero.sourceHashes !== loaded.sourceHashes ||
      (commonSource && commonSource !== zero.sourceHashes)
    )
      throw Error("CPU comparison source/build differs");
    commonSource = zero.sourceHashes;
    const config = read(path.join(root, tag + "-ladder", "driver-container.json"))[0];
    if (config.HostConfig.CpusetCpus !== (mode === "six" ? "3,4,5" : "3,4,5,6,7"))
      throw Error("CPU comparison placement differs");
    const bars = Object.values(loaded.report.priorities).flatMap((p) => p.bars ?? []);
    const recomputed = structuredClone(loaded.report);
    applyCommitVerdicts(
      recomputed,
      loaded.writes,
      zero.writes,
      generateTrace({ seed: "ns-v2", subjects: 10000, durationS: 7200 }),
    );
    if (
      JSON.stringify(Object.values(recomputed.priorities).flatMap((p) => p.bars ?? [])) !==
      JSON.stringify(bars)
    )
      throw Error("CPU comparison bars differ from raw primaries");
    const at256 = poolRows(
      committedRows(loaded.writes),
      reportWindows(loaded.report).L256,
      false,
    ).map(verdictMs);
    observations.push({
      label: `${mode} ${i + 1}`,
      tag,
      zero: zero.report.priorities.P2.allPrimary,
      loaded: loaded.report.priorities.P2.allPrimary,
      at256: { count: at256.length, p50Ms: percentile(at256, 0.5), p99Ms: percentile(at256, 0.99) },
      bars,
      oracle: loaded.report.oracle.status,
      swapGiB: loaded.swapGiB,
      macCpuMedian: loaded.macCpuMedian,
      inputs: [
        { tag: zero.tag, hashes: zero.inputs },
        { tag: loaded.tag, hashes: loaded.inputs },
      ],
    });
  }
  return observations;
}
async function main() {
  const plan = checkV3Trace(generateTrace({ seed: "ns-v2", subjects: 10000, durationS: 7200 }));
  assertRequiredPlanCounts(plan);
  const window = nightWindow(),
    args = process.argv.slice(2);
  if (args.includes("--plan")) {
    console.log(
      JSON.stringify(
        {
          ...window,
          localWindow: "19:30–06:45 America/New_York; no arm starts at/after06:15",
          planId: plan.id,
          offeredSeconds: plan.offeredSeconds,
          counts: plan.counts,
          additionalSecondsPerPair: 780,
          order: [
            "passive gate",
            "v3 pair1 + off bookends",
            "v3 pair2 + off bookends",
            "optional eight/six/eight loaded contrast",
          ],
          admissionDiskGiB: 47,
          compiler: "early (0.1)",
          tracing: "summary",
          splitRead: "pending",
          note: "Plan only; no engines, gate or timed run started",
        },
        null,
        2,
      ),
    );
    return;
  }
  if (args.length) throw Error("Usage: night.sh [--plan]");
  checkNightWindow(window, Date.now(), 300);
  if (git("status", "--porcelain", "--untracked-files=no"))
    throw Error("Night requires clean committed tracked source");
  const source = git("rev-parse", "HEAD"),
    tag = `tx2-dxt1-night-${window.date.replaceAll("-", "")}-${new Date().toISOString().slice(11).replace(/[:.Z]/g, "")}`,
    root =
      process.env.DX_STACK_EVIDENCE ??
      path.join(os.homedir(), "Claude/Projects/triplex-db-2/evidence/DX-T1"),
    out = path.join(root, tag);
  fs.mkdirSync(out, { recursive: false });
  const night = {
      ...window,
      tag,
      source,
      startedAt: Date.now(),
      planId: plan.id,
      offeredSeconds: plan.offeredSeconds,
      traceDigest: plan.traceDigest,
    },
    windowFile = path.join(out, "night.json"),
    observations = [];
  fs.writeFileSync(windowFile, JSON.stringify(night, null, 2) + "\n", { flag: "wx" });
  const reference = read(baseScript + "H-REFERENCE.json");
  const summaryName = "NIGHT-" + night.date + ".md",
    repositorySummary = baseScript + summaryName;
  if (fs.existsSync(repositorySummary))
    fs.copyFileSync(
      repositorySummary,
      path.join(out, "previous-" + summaryName),
      fs.constants.COPYFILE_EXCL,
    );
  const update = () => {
    const text = renderNightSummary(night, reference, observations);
    fs.writeFileSync(path.join(out, summaryName), text);
    fs.writeFileSync(repositorySummary, text);
    fs.writeFileSync(
      path.join(out, "progress.json"),
      JSON.stringify({ night, observations }, null, 2) + "\n",
    );
  };
  let child;
  const stop = () => {
    night.issue = "interrupted; in-flight cleanup requested";
    child?.kill("SIGTERM");
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  const timer = setTimeout(
    () => {
      night.issue = "06:45 local: aborting incomplete arm and preserving evidence";
      child?.kill("SIGTERM");
    },
    Math.max(1, night.endAt - Date.now()),
  );
  timer.unref();
  const run = async (command, commandArgs, env, log) => {
    checkNightWindow(night);
    if (git("rev-parse", "HEAD") !== source) throw Error("Night source changed");
    const fd = fs.openSync(path.join(out, log), "wx");
    try {
      return await new Promise((resolve, reject) => {
        child = spawn(command, commandArgs, {
          env: { ...nightEnvironment(process.env, root, windowFile), ...env },
          stdio: ["ignore", fd, fd],
        });
        child.once("error", reject);
        child.once("close", (code, signal) => {
          child = undefined;
          resolve(code ?? (signal ? 143 : 1));
        });
      });
    } finally {
      fs.closeSync(fd);
    }
  };
  try {
    update();
    const gate = await collectHostGate();
    fs.writeFileSync(path.join(out, "host-gate.json"), JSON.stringify(gate, null, 2) + "\n", {
      flag: "wx",
    });
    if (!gate.eligible) throw Error("Night host gate REFUSED: " + gate.issues.join("; "));
    for (let i = 1; i <= 2; i++) {
      if (night.issue) throw Error(night.issue);
      checkNightWindow(night, Date.now(), 300);
      const prefix = tag + "-pair" + i,
        code = await run("bash", [baseScript + "v3.sh", prefix], {}, `pair${i}.log`);
      observations.push(await summarizePair(root, prefix, night, `Pair ${i}`));
      update();
      if (code !== 0 || !observations.at(-1).valid)
        throw Error(`Pair ${i} incomplete (exit ${code}); see pair${i}.log`);
    }
    if (night.endAt - Date.now() >= 140 * 60000 && Date.now() < night.stopStartingAt) {
      const code = await run(
        "node",
        [
          "lab/bin/heavy.mjs",
          "--label",
          "DX-T1-night-cpus",
          "--",
          "bash",
          baseScript + "cold-study.sh",
          "six-loaded",
          tag + "-cpus",
        ],
        { DX_NS_PROFILE: "smoke" },
        "cpu-comparison.log",
      );
      night.cpuStatus = `eight/six/eight loaded diagnostic exit ${code}; ${tag}-cpus-session/ (every bar, host context and oracle retained; no automatic default change)`;
      if (code === 0) {
        const cpu = await summarizeCpuComparison(root, tag + "-cpus", night);
        const zeroComparison = nativeBookendComparison(
          [cpu[0].zero.p50Ms, cpu[2].zero.p50Ms],
          [cpu[1].zero.p50Ms],
        );
        const loadedComparison = nativeBookendComparison(
          [cpu[0].at256.p50Ms, cpu[2].at256.p50Ms],
          [cpu[1].at256.p50Ms],
        );
        fs.writeFileSync(
          path.join(out, "CPU-COMPARISON.json"),
          JSON.stringify({ arms: cpu, zeroComparison, loadedComparison }, null, 2) + "\n",
          { flag: "wx" },
        );
        const lines = [
          "# Eight / six / eight (diagnostic)",
          "",
          "ACK clock; current session only. Sparse bars remain unjudged; eight CPUs stays the default.",
          "",
          `Zero-reader all-primary median comparison: ${JSON.stringify(zeroComparison)}. L256 median comparison: ${JSON.stringify(loadedComparison)} (sparse diagnostic cohort).`,
          "",
          "| arm | zero all-primary p50/p99 ms | loaded all-primary p50/p99 ms | L256 p50/p99 ms (n) | loaded swap GiB / Mac CPU% | oracle |",
          "| --- | --- | --- | --- | --- | --- |",
          ...cpu.map(
            (c) =>
              `| ${c.label} | ${scalar(c.zero.p50Ms)}/${scalar(c.zero.p99Ms)} | ${scalar(c.loaded.p50Ms)}/${scalar(c.loaded.p99Ms)} | ${scalar(c.at256.p50Ms)}/${scalar(c.at256.p99Ms)} (${c.at256.count}) | ${scalar(c.swapGiB)} / ${scalar(c.macCpuMedian)} | ${c.oracle} |`,
          ),
          "",
          "| bar | eight before | six | eight after |",
          "| --- | --- | --- | --- |",
          ...cpu[0].bars.map(
            (b) =>
              `| ${b.id} (${b.bar}) | ${cpu.map((c) => barCell(c.bars.find((v) => v.id === b.id))).join(" | ")} |`,
          ),
          "",
        ];
        fs.writeFileSync(path.join(out, "CPU-COMPARISON.md"), lines.join("\n"), { flag: "wx" });
        night.cpuStatus += "; CPU-COMPARISON.md contains all bars and controls";
      }
    } else night.cpuStatus = "skipped: fewer than 140 minutes remain before06:45";
  } catch (error) {
    night.issue = error.message;
    console.error(error.message);
    process.exitCode = 75;
  } finally {
    clearTimeout(timer);
    update();
    console.log(path.join(out, "NIGHT-" + night.date + ".md"));
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    await main();
  } catch (error) {
    console.error("Night REFUSED: " + error.message);
    process.exitCode = 75;
  }
}
