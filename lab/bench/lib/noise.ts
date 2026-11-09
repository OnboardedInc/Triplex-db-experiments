/**
 * PAIR-0 noise recorder, calibration spins, hiccup meter, per-round noise summaries and pre-registered exclusion
 * rules (R22 sections 3 and 4; RULINGS Q60c, Q60e).
 *
 * [EXP-M01] Why: R22 found load average and host idle never discriminate here (load 11 to 15 on 12 cores, 1.65%
 * idle), VM steal is always 0 under Virtualization.framework, and docker stats CPU % is not contention evidence.
 * The signals that can say "this round was disturbed" are guest PSI, per-container cgroup counters (throttling,
 * memory events, neighbour CPU), host memory pressure and swap growth, fixed-work calibration before and after
 * every round, and a 1 ms sleep-overshoot hiccup meter (jHiccup) in each driver and in the VM. Rules live in
 * lab/config/noise.json, which is hashed into every PAIR receipt; they are applied to both arms of a round after
 * the round and logged by rule id, never chosen by looking at latency.
 *
 * VM side: one `colima ssh -p triplex2` session for the whole window runs a small read-only Python agent (reads
 * /proc and /sys/fs/cgroup/docker/<id>/, runs the calibration spin and a hiccup process), answering one JSON line
 * per request. Rejected: a `colima ssh` per sample (a colima command every 10 s, each followed by the required
 * `docker context use colima`); `docker exec` into the arms (cannot see neighbours' cgroups); `docker stats`
 * (R22 section 6: not contention evidence, and it costs the daemon a second per call).
 */
import { execFile, spawn, type ChildProcess } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import { Worker } from "node:worker_threads";

// ---------------------------------------------------------------- config

export interface NoiseRule {
  readonly id: string;
  readonly signal: string;
  readonly class: "hard" | "soft" | "record" | "hard-after-partition" | "hard-in-cpuset-regime";
  readonly excludeAbove?: number;
  readonly excludeOutside?: readonly [number, number];
  readonly amberAbove?: number;
  readonly note?: string;
}
export interface SeriesConfig {
  readonly note?: string;
  readonly traceParams: Record<string, number>;
  readonly round: { readonly periodS: number; readonly measuredFromS: number; readonly measuredS: number; readonly settleS: number; readonly calibS: number };
  readonly warmupPeriods: number;
}
export interface NoiseConfig {
  readonly format: string;
  readonly sampling: { readonly cadenceS: number; readonly hostTopEveryS: number };
  readonly rounds: { readonly min: number; readonly default: number; readonly max: number; readonly looks: readonly number[]; readonly lookLevel: number; readonly level: number; readonly boots: number; readonly aaEvery: number; readonly preflightAA: number; readonly bootSeed: number };
  readonly claims: { readonly superiority: number; readonly holdP50: number; readonly holdP99: number };
  readonly p99Floor: { readonly commandsPerArm: number; readonly usableRounds: number };
  readonly aaCheck: { readonly trials: number; readonly boots: number; readonly seed: number };
  readonly series: Record<string, SeriesConfig>;
  readonly calibration: { readonly units: number; readonly hostUnitIterations: number; readonly vmUnitIterations: number; readonly referenceRuns: number };
  readonly hiccup: { readonly sleepMs: number };
  readonly rules: readonly NoiseRule[];
}
export function loadNoiseConfig(file: string): { config: NoiseConfig; sha256: string; bytes: Buffer } {
  const bytes = fs.readFileSync(file);
  const config = JSON.parse(bytes.toString("utf8")) as NoiseConfig;
  if (config.format !== "tx2-noise/1") throw new Error(`${file}: format ${config.format}, expected tx2-noise/1`);
  return { config, sha256: createHash("sha256").update(bytes).digest("hex"), bytes };
}

// ---------------------------------------------------------------- round plan (shared by the coordinator and both drivers)

export interface PlannedRound {
  readonly id: string;
  readonly kind: "aa" | "ab";
  readonly preflight: boolean;
  /** Trace seconds (trace time 0 = the agreed absolute start). */
  readonly periodFromS: number;
  readonly calibPre: readonly [number, number];
  readonly fromS: number;
  readonly toS: number;
  readonly calibPost: readonly [number, number];
}
export interface RoundPlan {
  readonly format: "tx2-round-plan/1";
  readonly mode: "aa" | "ab";
  readonly series: string;
  readonly traceParams: Record<string, number>;
  readonly seed: string;
  readonly readers: number;
  readonly probe: { readonly perS: number; readonly maxInFlight: number; readonly deadlineMs: number };
  readonly warmupS: number;
  readonly durationS: number;
  readonly rounds: readonly PlannedRound[];
  readonly noiseConfigSha256: string;
}
/**
 * Rounds aligned to the series' burst period so every round holds one whole burst at the same offset
 * (R22 section 7: [calib 10 s][settle 2 s][measured 150 s][calib 10 s]); period 0..warmupPeriods-1 is the
 * unmeasured warm-up on the same trace prefix. In "aa" mode every round is A/A; in "ab" mode the first
 * `preflightAA` rounds are flagged pre-flight (graded with the 1.5 safety factor).
 */
export function makeRoundPlan(cfg: NoiseConfig, opts: { mode: "aa" | "ab"; series: string; rounds: number; seed: string; readers?: number; probePerS?: number; roundOverride?: Partial<SeriesConfig["round"]>; traceOverride?: Record<string, number>; warmupPeriods?: number; sha256: string }): RoundPlan {
  const series = cfg.series[opts.series];
  if (!series) throw new Error(`unknown series ${opts.series}; known: ${Object.keys(cfg.series).join(", ")}`);
  const r = { ...series.round, ...(opts.roundOverride ?? {}) };
  if (r.measuredFromS - r.settleS - r.calibS < 0 || r.measuredFromS + r.measuredS + r.calibS > r.periodS) throw new Error(`series ${opts.series}: round layout does not fit its ${r.periodS} s period`);
  const warmupS = (opts.warmupPeriods ?? series.warmupPeriods) * r.periodS;
  const rounds: PlannedRound[] = [];
  for (let k = 0; k < opts.rounds; k++) {
    const p = warmupS + k * r.periodS;
    const from = p + r.measuredFromS;
    rounds.push({
      id: `R${String(k + 1).padStart(2, "0")}`, kind: opts.mode === "aa" ? "aa" : "ab", preflight: opts.mode === "ab" ? false : k < cfg.rounds.preflightAA,
      periodFromS: p, calibPre: [from - r.settleS - r.calibS, from - r.settleS], fromS: from, toS: from + r.measuredS, calibPost: [from + r.measuredS, from + r.measuredS + r.calibS],
    });
  }
  return {
    format: "tx2-round-plan/1", mode: opts.mode, series: opts.series, traceParams: { ...series.traceParams, ...(opts.traceOverride ?? {}) }, seed: opts.seed, readers: opts.readers ?? 0,
    probe: { perS: opts.probePerS ?? 20, maxInFlight: 64, deadlineMs: 30_000 }, warmupS, durationS: warmupS + opts.rounds * r.periodS, rounds, noiseConfigSha256: opts.sha256,
  };
}

// ---------------------------------------------------------------- calibration spin and hiccup meter

export interface Calib { readonly where: "host" | "vm"; readonly at: number; readonly ms: readonly number[]; readonly min: number; readonly p50: number; readonly interference: number }
export function calibOf(where: "host" | "vm", at: number, ms: readonly number[]): Calib {
  const s = [...ms].sort((a, b) => a - b);
  const min = s[0]!, p50 = s[Math.max(0, Math.ceil(0.5 * s.length) - 1)]!;
  return { where, at, ms, min, p50, interference: p50 / min };
}
/** Fixed integer work (xorshift32), `units` timed units of `iterations` steps; about 20 ms per unit here. */
export function hostSpin(units: number, iterations: number): Calib {
  const ms: number[] = [];
  let x = 0x9e3779b9 | 0;
  for (let u = 0; u < units; u++) {
    const t0 = process.hrtime.bigint();
    for (let i = 0; i < iterations; i++) { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; }
    ms.push(Number(process.hrtime.bigint() - t0) / 1e6);
  }
  if (x === 42) ms.push(0); // keeps the loop observable to the JIT
  return calibOf("host", Date.now(), ms.slice(0, units));
}

/**
 * jHiccup-style meter in a worker thread: sleep 1 ms (Atomics.wait), record the overshoot, post the per-second
 * maximum. It measures the OS scheduling the process gets, not the driver's event loop (ELU covers that).
 */
export function startHiccupMeter(sleepMs = 1): { seconds: { t: number; maxMs: number; n: number }[]; stop: () => Promise<void> } {
  const code = `
    const { parentPort, workerData } = require("node:worker_threads");
    const sab = new Int32Array(new SharedArrayBuffer(4));
    const sleepMs = workerData.sleepMs;
    let max = 0, n = 0, last = performance.now();
    for (;;) {
      const t0 = performance.now();
      Atomics.wait(sab, 0, 0, sleepMs);
      const t1 = performance.now();
      const over = t1 - t0 - sleepMs;
      if (over > max) max = over;
      n++;
      if (t1 - last >= 1000) { parentPort.postMessage({ t: performance.timeOrigin + t1, maxMs: max, n }); max = 0; n = 0; last = t1; }
    }`;
  const seconds: { t: number; maxMs: number; n: number }[] = [];
  const worker = new Worker(code, { eval: true, workerData: { sleepMs } });
  worker.on("message", (m) => seconds.push(m));
  worker.on("error", () => {});
  worker.unref();
  return { seconds, stop: async () => { await worker.terminate(); } };
}

// ---------------------------------------------------------------- host sampler (macOS)

export interface HostSample {
  readonly t: number;
  readonly loadAvg1: number | null;
  readonly pressureLevel: number | null;
  readonly swapUsedBytes: number | null;
  readonly pageouts: number | null;
  readonly decompressions: number | null;
  readonly compressorPages: number | null;
  readonly cpuIdlePct?: number | null;
}
const run = (cmd: string, args: string[], timeout = 15_000) =>
  new Promise<string | null>((resolve) => execFile(cmd, args, { timeout, maxBuffer: 8 << 20 }, (e, out) => resolve(e ? null : String(out))));
const unitBytes = (n: number, u: string) => n * ({ K: 1024, M: 1024 ** 2, G: 1024 ** 3 } as Record<string, number>)[u.toUpperCase()]!;
export function parseHost(t: number, sysctl: string | null, vmStat: string | null, top?: string | null): HostSample {
  const lines = (sysctl ?? "").split("\n");
  const load = /\{\s*([\d.]+)/.exec(lines[0] ?? "");
  const level = Number.parseInt(lines[1] ?? "", 10);
  const swap = /used = ([\d.]+)([KMG])/.exec(lines[2] ?? "");
  const field = (name: string) => { const m = new RegExp(`^${name}:\\s+(\\d+)`, "m").exec(vmStat ?? ""); return m ? Number(m[1]) : null; };
  const idle = top ? /([\d.]+)% idle/.exec(top) : null;
  return {
    t, loadAvg1: load ? Number(load[1]) : null, pressureLevel: Number.isFinite(level) ? level : null, swapUsedBytes: swap ? unitBytes(Number(swap[1]), swap[2]!) : null,
    pageouts: field("Pageouts"), decompressions: field("Decompressions"), compressorPages: field("Pages occupied by compressor"),
    ...(top !== undefined ? { cpuIdlePct: idle ? Number(idle[1]) : null } : {}),
  };
}
export async function hostSample(withTop: boolean): Promise<HostSample> {
  const t = Date.now();
  const [sysctl, vmStat, top] = await Promise.all([
    run("sysctl", ["-n", "vm.loadavg", "kern.memorystatus_vm_pressure_level", "vm.swapusage"]),
    run("vm_stat", []),
    withTop ? run("top", ["-l", "1", "-n", "0"], 20_000) : Promise.resolve(undefined),
  ]);
  return parseHost(t, sysctl, vmStat, top === undefined ? undefined : top);
}

// ---------------------------------------------------------------- VM agent over one colima ssh session

/** Read-only VM agent (Python 3, present in the VM; node is not). */
export const VM_AGENT = String.raw`
import glob, json, multiprocessing, os, queue, sys, time
def hiccup(q, parent, sleep_s):
    sec = int(time.time()); mx = 0.0; n = 0
    while os.getppid() == parent:
        t0 = time.perf_counter(); time.sleep(sleep_s); over = (time.perf_counter() - t0 - sleep_s) * 1000.0
        now = int(time.time())
        if now != sec:
            q.put((sec, round(mx, 3), n)); sec = now; mx = 0.0; n = 0
        if over > mx: mx = over
        n += 1
def read(p):
    try:
        with open(p) as f: return f.read()
    except Exception: return None
def kv(text):
    out = {}
    for line in (text or "").splitlines():
        f = line.split()
        if len(f) == 2:
            try: out[f[0]] = int(f[1])
            except ValueError: out[f[0]] = f[1]
    return out
def psi(name):
    out = {}
    for line in (read("/proc/pressure/" + name) or "").splitlines():
        f = line.split()
        for x in f[1:]:
            k, val = x.split("=")
            if k == "total": out[f[0]] = int(val)
            elif k == "avg10": out[f[0] + "Avg10"] = float(val)
    return out
def num(text):
    t = (text or "").strip()
    try: return int(t)
    except ValueError: return t or None
def sample(tag, q):
    cpu = [int(x) for x in (read("/proc/stat") or "cpu 0").splitlines()[0].split()[1:]]
    groups = []
    for d in sorted(glob.glob("/sys/fs/cgroup/docker/*/")):
        cs = kv(read(d + "cpu.stat")); ev = kv(read(d + "memory.events"))
        groups.append({"id": d.rstrip("/").split("/")[-1], "cpuMax": (read(d + "cpu.max") or "").strip(), "cpuWeight": num(read(d + "cpu.weight")),
            "cpuset": (read(d + "cpuset.cpus.effective") or "").strip(), "usageUsec": cs.get("usage_usec"), "nrPeriods": cs.get("nr_periods"),
            "nrThrottled": cs.get("nr_throttled"), "throttledUsec": cs.get("throttled_usec"), "memCurrent": num(read(d + "memory.current")),
            "memMax": num(read(d + "memory.max")), "evMax": ev.get("max"), "evOomKill": ev.get("oom_kill")})
    secs = []
    while True:
        try: secs.append(list(q.get_nowait()))
        except queue.Empty: break
    return {"type": "sample", "tag": tag, "mono": time.monotonic(), "wall": time.time(), "cpu": cpu, "load": (read("/proc/loadavg") or "").split()[:3],
        "psi": {"cpu": psi("cpu"), "memory": psi("memory"), "io": psi("io")}, "cgroups": groups,
        "hiccupSeconds": secs, "hiccupMaxMs": max([x[1] for x in secs] or [0.0]), "hiccupN": sum(x[2] for x in secs)}
def calib(units, iters, tag):
    ms = []
    for _ in range(units):
        s = time.perf_counter(); x = 1
        for i in range(iters): x = (x * 1103515245 + 12345) & 0x7fffffff
        ms.append((time.perf_counter() - s) * 1000.0)
    return {"type": "calib", "tag": tag, "ms": ms, "x": x & 1}
def main():
    ctx = multiprocessing.get_context("fork")
    q = ctx.Queue()
    p = ctx.Process(target=hiccup, args=(q, os.getpid(), float(sys.argv[1]) / 1000.0 if len(sys.argv) > 1 else 0.001), daemon=True); p.start()
    print(json.dumps({"type": "hello", "pid": os.getpid(), "kernel": os.uname().release}), flush=True)
    for line in sys.stdin:
        f = line.split()
        if not f: continue
        if f[0] == "quit": break
        try:
            if f[0] == "sample": out = sample(f[1] if len(f) > 1 else "", q)
            elif f[0] == "calib": out = calib(int(f[1]), int(f[2]), f[3] if len(f) > 3 else "")
            else: out = {"type": "error", "tag": f[-1], "message": "unknown command " + f[0]}
        except Exception as e: out = {"type": "error", "tag": f[-1], "message": str(e)}
        print(json.dumps(out), flush=True)
main()
`;

export interface VmCgroup { id: string; cpuMax: string; cpuWeight: number | string | null; cpuset: string; usageUsec?: number; nrPeriods?: number; nrThrottled?: number; throttledUsec?: number; memCurrent?: number | string | null; memMax?: number | string | null; evMax?: number; evOomKill?: number }
export interface VmSample { type: "sample"; t: number; tag: string; mono: number; wall: number; cpu: number[]; load: string[]; psi: { cpu: Record<string, number>; memory: Record<string, number>; io: Record<string, number> }; cgroups: VmCgroup[]; hiccupMaxMs: number; hiccupN: number; hiccupSeconds?: [number, number, number][] }

export class VmAgent {
  private child: ChildProcess | null = null;
  private buffer = "";
  private waiters = new Map<string, (msg: any) => void>();
  private seq = 0;
  hello: any = null;
  errors: string[] = [];
  private readonly profile: string;
  private readonly sleepMs: number;
  constructor(profile = "triplex2", sleepMs = 1) { this.profile = profile; this.sleepMs = sleepMs; }
  async start(timeoutMs = 30_000): Promise<boolean> {
    const b64 = Buffer.from(VM_AGENT, "utf8").toString("base64");
    const child = spawn("colima", ["ssh", "-p", this.profile, "--", "python3", "-u", "-c", `import base64;exec(base64.b64decode('${b64}').decode())`, String(this.sleepMs)], { stdio: ["pipe", "pipe", "pipe"] });
    this.child = child;
    child.stdout!.setEncoding("utf8");
    child.stdout!.on("data", (chunk: string) => {
      this.buffer += chunk;
      let k;
      while ((k = this.buffer.indexOf("\n")) >= 0) {
        const line = this.buffer.slice(0, k);
        this.buffer = this.buffer.slice(k + 1);
        try {
          const msg = JSON.parse(line);
          if (msg.type === "hello") this.hello = msg;
          const w = this.waiters.get(msg.tag ?? "hello");
          if (w) { this.waiters.delete(msg.tag ?? "hello"); w(msg); }
        } catch { this.errors.push(line.slice(0, 200)); }
      }
    });
    child.stderr!.on("data", (d) => { if (this.errors.length < 50) this.errors.push(String(d).slice(0, 300)); });
    child.on("exit", () => { for (const w of this.waiters.values()) w(null); this.waiters.clear(); this.child = null; });
    const hello = await this.wait("hello", timeoutMs);
    return hello !== null;
  }
  private wait(tag: string, timeoutMs: number): Promise<any> {
    if (tag === "hello" && this.hello) return Promise.resolve(this.hello);
    return new Promise((resolve) => {
      const timer = setTimeout(() => { this.waiters.delete(tag); resolve(null); }, timeoutMs);
      this.waiters.set(tag, (m) => { clearTimeout(timer); resolve(m); });
    });
  }
  private request(line: string, tag: string, timeoutMs: number) {
    if (!this.child?.stdin?.writable) return Promise.resolve(null);
    const p = this.wait(tag, timeoutMs);
    this.child.stdin.write(line + "\n");
    return p;
  }
  async sample(): Promise<VmSample | null> {
    const tag = `s${++this.seq}`;
    const t = Date.now();
    const m = await this.request(`sample ${tag}`, tag, 15_000);
    return m && m.type === "sample" ? { ...m, t } : null;
  }
  async calib(units: number, iterations: number): Promise<Calib | null> {
    const tag = `c${++this.seq}`;
    const t = Date.now();
    const m = await this.request(`calib ${units} ${iterations} ${tag}`, tag, 60_000);
    return m && m.type === "calib" ? calibOf("vm", t, m.ms) : null;
  }
  /** Ends the session, then restores Sam's docker context (lab rule: after any colima command). */
  async stop(): Promise<void> {
    if (this.child?.stdin?.writable) this.child.stdin.write("quit\n");
    const child = this.child;
    if (child) await Promise.race([new Promise((r) => child.on("exit", r)), new Promise((r) => setTimeout(r, 5000))]);
    this.child?.kill("SIGTERM");
    await restoreDockerContext();
  }
}
export const restoreDockerContext = () => run("docker", ["context", "use", "colima"], 20_000);

// ---------------------------------------------------------------- per-round summaries

export interface ArmIdentity { readonly arm: "A" | "B"; readonly containerId: string | null; readonly cpuset: string | null }
export interface DriverRoundClient { readonly eluMean: number | null; readonly eluMax: number | null; readonly hiccupMaxMs: number | null }
export interface RoundNoise {
  readonly id: string;
  readonly window: { readonly fromMs: number; readonly toMs: number };
  readonly signals: Record<string, number | null>;
  readonly arms: Record<string, { cores: number | null; throttledShare: number | null; periods: number | null; oomKillDelta: number | null; memMaxEventsDelta: number | null; restarted: boolean | null; cpuMax: string | null; cpuset: string | null; cpuWeight: number | string | null }>;
  readonly neighbors: { id: string; cores: number; cpuset: string; onArmCpus: boolean }[];
  readonly partitioned: boolean | null;
  readonly calib: { pre: { host: Calib | null; vm: Calib | null }; post: { host: Calib | null; vm: Calib | null } };
  readonly missing: string[];
}

/** "0-1,4" -> {0, 1, 4} */
export function cpuList(text: string | null | undefined): Set<number> {
  const out = new Set<number>();
  for (const part of String(text ?? "").split(",").map((s) => s.trim()).filter(Boolean)) {
    const [a, b] = part.split("-").map(Number);
    for (let c = a!; c <= (b ?? a)!; c++) out.add(c);
  }
  return out;
}
const intersects = (x: Set<number>, y: Set<number>) => [...x].some((c) => y.has(c));

/** The sample at or just before t, else the first after (samples sorted by t). */
function before<T extends { t: number }>(xs: readonly T[], t: number): T | null {
  let best: T | null = null;
  for (const x of xs) { if (x.t <= t) best = x; else break; }
  return best;
}
function after<T extends { t: number }>(xs: readonly T[], t: number): T | null {
  for (const x of xs) if (x.t >= t) return x;
  return null;
}

/**
 * Signals for one round from the samples bracketing its measured window (R22 section 4 table). Deltas use the last
 * sample at or before the window start and the first at or after its end; a missing group is listed in `missing`
 * (rule `signals-missing` then excludes the round: fail closed).
 */
export function summarizeRound(input: {
  id: string;
  window: { fromMs: number; toMs: number };
  host: readonly HostSample[];
  vm: readonly VmSample[];
  arms: readonly ArmIdentity[];
  armsRequired: boolean;
  calib: RoundNoise["calib"];
  clients: readonly (DriverRoundClient | null)[];
}): RoundNoise {
  const { fromMs, toMs } = input.window;
  const missing: string[] = [];
  const signals: Record<string, number | null> = {};
  // host
  const h0 = before(input.host, fromMs), h1 = after(input.host, toMs);
  const inWin = input.host.filter((s) => s.t >= fromMs - 1 && s.t <= toMs + 1);
  if (!h0 || !h1) missing.push("host");
  const levels = [h0, ...inWin, h1].filter(Boolean).map((s) => s!.pressureLevel).filter((x): x is number => x !== null);
  signals["host.pressureLevelMax"] = levels.length ? Math.max(...levels) : null;
  signals["host.pageoutsDelta"] = h0?.pageouts != null && h1?.pageouts != null ? h1.pageouts - h0.pageouts : null;
  signals["host.decompressionsDelta"] = h0?.decompressions != null && h1?.decompressions != null ? h1.decompressions - h0.decompressions : null;
  const loads = inWin.map((s) => s.loadAvg1).filter((x): x is number => x !== null);
  signals["host.loadAvg1"] = loads.length ? loads.reduce((a, b) => a + b, 0) / loads.length : null;
  const idles = input.host.filter((s) => s.t >= fromMs - 30_000 && s.t <= toMs && s.cpuIdlePct != null).map((s) => s.cpuIdlePct!);
  signals["host.cpuIdlePct"] = idles.length ? idles.reduce((a, b) => a + b, 0) / idles.length : null;
  signals["host.swapUsedBytes"] = h1?.swapUsedBytes ?? null;
  // VM
  const v0 = before(input.vm, fromMs), v1 = after(input.vm, toMs);
  const arms: RoundNoise["arms"] = {};
  const neighbors: RoundNoise["neighbors"] = [];
  let partitioned: boolean | null = null;
  if (!v0 || !v1) {
    missing.push("vm");
    for (const k of ["vm.psi.cpuSomeShare", "vm.psi.memFullShare", "vm.psi.ioSomeShare", "vm.stealShare", "vm.loadAvg1"]) signals[k] = null;
  } else {
    const dtUs = (v1.mono - v0.mono) * 1e6;
    const share = (r: "cpu" | "memory" | "io", kind: "some" | "full") => (v1.psi[r]?.[kind] != null && v0.psi[r]?.[kind] != null ? (v1.psi[r]![kind]! - v0.psi[r]![kind]!) / dtUs : null);
    signals["vm.psi.cpuSomeShare"] = share("cpu", "some");
    signals["vm.psi.memFullShare"] = share("memory", "full");
    signals["vm.psi.ioSomeShare"] = share("io", "some");
    const tot = (c: number[]) => c.slice(0, 8).reduce((a, b) => a + b, 0);
    const dTot = tot(v1.cpu) - tot(v0.cpu);
    signals["vm.stealShare"] = dTot > 0 ? ((v1.cpu[7] ?? 0) - (v0.cpu[7] ?? 0)) / dTot : null;
    const vmLoads = input.vm.filter((s) => s.t >= fromMs && s.t <= toMs).map((s) => Number(s.load[0])).filter(Number.isFinite);
    signals["vm.loadAvg1"] = vmLoads.length ? vmLoads.reduce((a, b) => a + b, 0) / vmLoads.length : null;
    const byId0 = new Map(v0.cgroups.map((g) => [g.id, g]));
    const byId1 = new Map(v1.cgroups.map((g) => [g.id, g]));
    const armIds = new Set(input.arms.map((a) => a.containerId).filter(Boolean) as string[]);
    const armCpus = input.arms.map((a) => cpuList(byId1.get(a.containerId ?? "")?.cpuset ?? a.cpuset));
    for (const a of input.arms) {
      const g0 = a.containerId ? byId0.get(a.containerId) : undefined, g1 = a.containerId ? byId1.get(a.containerId) : undefined;
      if (!g0 || !g1) {
        if (input.armsRequired) missing.push(`arm ${a.arm} cgroup`);
        arms[a.arm] = { cores: null, throttledShare: null, periods: null, oomKillDelta: null, memMaxEventsDelta: null, restarted: g0 && !g1 ? true : null, cpuMax: g1?.cpuMax ?? null, cpuset: g1?.cpuset ?? null, cpuWeight: g1?.cpuWeight ?? null };
        continue;
      }
      const restarted = (g1.usageUsec ?? 0) < (g0.usageUsec ?? 0);
      const periods = (g1.nrPeriods ?? 0) - (g0.nrPeriods ?? 0);
      arms[a.arm] = {
        cores: restarted ? null : ((g1.usageUsec ?? 0) - (g0.usageUsec ?? 0)) / dtUs, periods,
        throttledShare: periods > 0 ? ((g1.nrThrottled ?? 0) - (g0.nrThrottled ?? 0)) / periods : 0,
        oomKillDelta: (g1.evOomKill ?? 0) - (g0.evOomKill ?? 0), memMaxEventsDelta: (g1.evMax ?? 0) - (g0.evMax ?? 0), restarted,
        cpuMax: g1.cpuMax, cpuset: g1.cpuset, cpuWeight: g1.cpuWeight,
      };
    }
    let onArm = false;
    for (const g1 of v1.cgroups) {
      if (armIds.has(g1.id)) continue;
      const g0 = byId0.get(g1.id);
      const cores = g0 && (g1.usageUsec ?? 0) >= (g0.usageUsec ?? 0) ? ((g1.usageUsec ?? 0) - (g0.usageUsec ?? 0)) / dtUs : 0;
      const on = armCpus.some((set) => set.size > 0 && intersects(cpuList(g1.cpuset), set));
      onArm ||= on;
      neighbors.push({ id: g1.id.slice(0, 12), cores, cpuset: g1.cpuset, onArmCpus: on });
    }
    partitioned = armIds.size > 0 && armCpus.every((s) => s.size > 0) && !onArm && !intersects(armCpus[0] ?? new Set(), armCpus[1] ?? new Set());
    const list = Object.values(arms);
    signals["arms.throttledShareMax"] = list.some((a) => a.throttledShare !== null) ? Math.max(...list.map((a) => a.throttledShare ?? 0)) : null;
    signals["arms.oomKillDelta"] = list.length ? list.reduce((s, a) => s + (a.oomKillDelta ?? 0), 0) : null;
    signals["arms.memMaxEventsDelta"] = list.length ? Math.max(...list.map((a) => a.memMaxEventsDelta ?? 0)) : null;
    signals["arms.restarts"] = list.length ? list.filter((a) => a.restarted).length : null;
    const onArmCores = neighbors.filter((n) => n.onArmCpus).map((n) => n.cores);
    signals["neighbors.maxCoresOnArmCpus"] = onArmCores.length ? Math.max(...onArmCores) : 0;
    signals["neighbors.totalCores"] = neighbors.reduce((s, n) => s + n.cores, 0);
  }
  // calibration
  const { pre, post } = input.calib;
  if (!pre.host || !post.host) missing.push("host calibration");
  if (!pre.vm || !post.vm) missing.push("vm calibration");
  signals["calib.hostDrift"] = pre.host && post.host ? post.host.min / pre.host.min : null;
  signals["calib.vmDrift"] = pre.vm && post.vm ? post.vm.min / pre.vm.min : null;
  const spins = [pre.host, pre.vm, post.host, post.vm].filter(Boolean) as Calib[];
  signals["calib.interferenceMax"] = spins.length ? Math.max(...spins.map((c) => c.interference)) : null;
  // hiccups: the VM agent reports per-second maxima stamped with VM wall time; each sample maps them onto host
  // time (offset = host request time - VM wall time, error about half the ssh round trip). Drivers report per round.
  const vmHiccups: number[] = [];
  for (const s of input.vm) {
    if (!s.hiccupSeconds) continue;
    const offsetMs = s.t - s.wall * 1000;
    for (const [sec, maxMs] of s.hiccupSeconds) { const at = sec * 1000 + offsetMs; if (at >= fromMs - 1000 && at < toMs) vmHiccups.push(maxMs); }
  }
  const clientHiccups = input.clients.map((c) => c?.hiccupMaxMs ?? null);
  signals["hiccup.vmMaxMs"] = vmHiccups.length ? Math.max(...vmHiccups) : null;
  signals["hiccup.driverMaxMs"] = clientHiccups.some((x) => x !== null) ? Math.max(...clientHiccups.filter((x): x is number => x !== null)) : null;
  if (input.vm.length && !vmHiccups.length) missing.push("vm hiccup seconds");
  if (input.clients.some((c) => !c)) missing.push("driver round client stats");
  const hic = [...vmHiccups, ...clientHiccups].filter((x): x is number => x !== null && Number.isFinite(x));
  signals["hiccup.maxMs"] = hic.length ? Math.max(...hic) : null;
  const elus = input.clients.map((c) => c?.eluMean ?? null).filter((x): x is number => x !== null);
  signals["client.eluMax"] = elus.length ? Math.max(...elus) : null;
  signals["signals.missing"] = missing.length;
  return { id: input.id, window: input.window, signals, arms, neighbors, partitioned, calib: input.calib, missing };
}

export interface RuleResult { readonly excluded: string[]; readonly amber: string[]; readonly notApplied: { id: string; why: string; value: number | null }[]; readonly values: Record<string, number | null> }
/**
 * Applies the pre-registered rules to one round. `hard-after-partition` rules apply only when the VM is
 * partitioned for the round (R22 section 4: "hard after partition"); otherwise they are recorded in notApplied.
 * `hard-in-cpuset-regime` rules apply only when both arms run in the cpuset regime. A null value never excludes
 * by itself: missing signals are caught by `signals-missing`.
 */
export function applyRules(noise: RoundNoise, rules: readonly NoiseRule[], ctx: { regime: "cpuset" | "quota" | "none" }): RuleResult {
  const excluded: string[] = [], amber: string[] = [], notApplied: RuleResult["notApplied"] = [];
  const values: Record<string, number | null> = {};
  for (const rule of rules) {
    const v = noise.signals[rule.signal] ?? null;
    values[rule.id] = v;
    if (rule.class === "record" || v === null) continue;
    if (rule.class === "hard-after-partition" && noise.partitioned !== true) { notApplied.push({ id: rule.id, why: "VM not partitioned for this round", value: v }); continue; }
    if (rule.class === "hard-in-cpuset-regime" && ctx.regime !== "cpuset") { notApplied.push({ id: rule.id, why: `arms in the ${ctx.regime} regime`, value: v }); continue; }
    const out = (rule.excludeAbove !== undefined && v > rule.excludeAbove) || (rule.excludeOutside !== undefined && (v < rule.excludeOutside[0] || v > rule.excludeOutside[1]));
    if (out) excluded.push(rule.id);
    else if (rule.amberAbove !== undefined && v > rule.amberAbove) amber.push(rule.id);
  }
  return { excluded, amber, notApplied, values };
}

/** Applied hard failures survive exclusions; soft exclusions do not become hard failures. */
export function hardRuleFailures(roundId: string, result: RuleResult, rules: readonly NoiseRule[]) {
  const ruleIds = result.excluded.filter(id => rules.some(rule => rule.id === id && rule.class.startsWith("hard")));
  return ruleIds.length ? [{ roundId, ruleIds }] : [];
}
