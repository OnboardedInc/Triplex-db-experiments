import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  closeSync,
  chmodSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  realpathSync,
  renameSync,
  statfsSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import {
  workerTrials,
  workerFinding,
  liveBaselineMs,
  checkSweep,
  checkTraffic,
  programInputs,
  requestPath,
  sha,
} from "./bench-proof.ts";

const mode = process.argv[2] ?? "--plan";
const args = process.argv.slice(3),
  option = (key: string, def: string) => (args.includes(key) ? args[args.indexOf(key) + 1]! : def);
if (args.length % 2 || args.some((v, i) => i % 2 === 0 && !["--workers", "--hours"].includes(v)))
  throw Error("Use --workers 1,2,3,4,5 and optionally --hours N");
const trials = workerTrials(option("--workers", "2")),
  hours = Number(option("--hours", "3"));
if (!Number.isFinite(hours) || hours <= 0) throw Error("A positive bench budget is required");
const root = "/var/tmp/triplex-bm1",
  retained = join(root, "queue-20261118r/scale");
const previous = join(retained, "state/evidence/DX-T1/tx2-dxt1-bm1-20261118d-activation");
const rootCommand =
  "node --experimental-strip-types lab/experiments/EXP-DX1/act1/bench.ts --execute";
if (mode === "--plan") {
  console.log(rootCommand);
  console.log(
    "Default budget is three hours on the prepared 12-core BM1 server. Each fresh retained-seed clone runs the oracle restart schedules first, then 100,000 subjects with 256 live readers and the frozen writer trace.",
  );
  console.log(
    "Run the EAD full/selector pair, standard guard-fact, fourth-arm page coverage and a fresh incorrect historical control. --workers 1,2,3,4,5 repeats the page arm on fresh clones. --hours 6 budgets the longer ladder.",
  );
  console.log(
    JSON.stringify({
      hours,
      trials,
      liveBaselineMs,
      liveReaderCpus: [3, 5],
      evaluatorCpus: [7, 8, 9, 10, 11],
    }),
  );
} else {
  assert.equal(mode, "--execute");
  assert.equal(process.platform, "linux");
  assert.equal(process.getuid?.(), 0);
  assert.equal(spawnSync("systemd-detect-virt", { encoding: "utf8" }).stdout.trim(), "none");
  assert.ok(
    existsSync(join(previous, "activation-attempt.json")),
    "BM1 retained seed provenance required",
  );
  const repo = process.cwd(),
    bm = resolve("lab/experiments/EXP-DX1/bm1/queue-day.sh");
  assert.ok(!/\s/.test(repo), "BM1 systemd stop hook needs the prepared checkout path");
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    DOCKER_HOST: "unix:///var/run/docker.sock",
    DX_BARE_METAL: "1",
    COREPACK_HOME: join(retained, "corepack"),
    PATH: join(retained, "tools/bin") + ":" + process.env.PATH,
    TURBO_TELEMETRY_DISABLED: "1",
  };
  for (const name of [
    "DOCKER_CONTEXT",
    "DOCKER_TLS",
    "DOCKER_TLS_VERIFY",
    "DOCKER_CERT_PATH",
    "DX_IDLE_SENTINEL",
    "DX_IDLE_REFUSAL_PROBE",
    "DX_NIGHT_WINDOW",
    "DX_IDLE_TCP",
  ])
    delete env[name];
  const command = (bin: string, args: string[], timeout = 30000, inherit = false) => {
    const p = spawnSync(bin, args, {
      encoding: "utf8",
      env,
      timeout,
      stdio: inherit ? "inherit" : "pipe",
    });
    if (p.error || p.status !== 0)
      throw Error(bin + " failed: " + (p.error?.message ?? p.stderr ?? p.status));
    return p.stdout?.trim() ?? "";
  };
  const source = command("git", ["rev-parse", "HEAD"]);
  assert.equal(command("git", ["status", "--porcelain", "--untracked-files=no"]), "");
  assert.ok(
    statfsSync(root).bavail * statfsSync(root).bsize >= 28 * 1024 ** 3,
    "Insufficient scratch space",
  );
  const batchOwner = process.env.DX_BM1_GUARDED_BATCH;
  const parentUnit = "triplex-bm1-" + batchOwner + "-guarded.service";
  const lockPath = join(root, "dx-bm1-day.lock");
  const lock = batchOwner ? undefined : openSync(lockPath, "a");
  // [DX-ACT1] Why: flock operates on the inherited open file description, so this process retains BM1's exclusion until cleanup. Rejected: an independently named lock or commandeering another queue's containers.
  if (batchOwner) {
    // [DX-BM1] Why: the parent queue already owns this flock through handover. Bind the child to that live unit and its open lock.
    // Rejected: acquiring the same lock twice or letting an arbitrary environment variable bypass exclusion.
    assert.match(batchOwner, /^[a-z0-9]{1,12}$/);
    assert.ok(readFileSync("/proc/self/cgroup", "utf8").trimEnd().endsWith("/" + parentUnit));
    const pid = command("systemctl", ["show", "triplex-bm1-" + batchOwner + "-queue", "-p", "MainPID", "--value"]);
    assert.match(pid, /^[1-9]\d*$/);
    assert.equal(realpathSync("/proc/" + pid + "/fd/9"), lockPath);
    assert.equal(readFileSync(join(root, "day-" + batchOwner, "active-item"), "utf8").trim(), "guarded");
    assert.equal(spawnSync("flock", ["-n", lockPath, "true"]).status, 1);
  } else {
    assert.equal(spawnSync("flock", ["-n", "3"], { stdio: ["ignore", "ignore", "inherit", lock!] }).status, 0, "BM1 day queue busy");
  }
  const runId = "act1-" + randomBytes(6).toString("hex");
  const output = batchOwner ? join(root, "day-" + batchOwner, "guarded") : join(root, runId);
  const deadline = Date.now() + hours * 3600000;
  const stamp = (n: number) => new Date(n).toISOString().replace(/\.\d{3}Z$/, "Z");
  const writable = (path: string, data: unknown) =>
    writeFileSync(path, JSON.stringify(data, null, 2) + "\n", { flag: "wx" });
  let interrupted = false;
  for (const signal of ["SIGINT", "SIGTERM"] as const)
    process.once(signal, () => {
      interrupted = true;
    });
  const results: ReturnType<typeof checkSweep>[] = [];
  try {
    assert.equal(command("docker", ["ps", "-q"]), "", "Dedicated bench is occupied");
    const scheduled = command("systemctl", [
      "show",
      "triplex-drv1-wait",
      "-p",
      "ActiveState",
      "--value",
    ]);
    assert.ok(["inactive", "failed"].includes(scheduled), "Driver queue is active");
    const topology = command("lscpu", ["-p=CPU,CORE,SOCKET"])
      .split("\n")
      .filter((l) => !l.startsWith("#"))
      .map((l) => l.split(","));
    assert.equal(
      new Set(
        Array.from({ length: 12 }, (_, i) => {
          const cpu = topology.find((r) => Number(r[0]) === i);
          assert.ok(cpu);
          return cpu.slice(1).join(",");
        }),
      ).size,
      12,
      "CPU plan requires twelve physical cores",
    );
    mkdirSync(output);
    mkdirSync("runs/act1-requests", { recursive: true });
    if (!existsSync("node_modules/.bin/turbo"))
      command(
        "pnpm",
        ["--store-dir", join(retained, "pnpm-store"), "install", "--offline", "--frozen-lockfile"],
        420000,
        true,
      );
    command(
      process.execPath,
      [
        "lab/bin/heavy.mjs",
        "--label",
        "DX-ACT1-bench-build",
        "--",
        "node_modules/.bin/turbo",
        "run",
        "build",
        "--filter=@triplex-build/triplex-datomic",
        "--filter=@triplex-build/triplex-host",
        "--filter=@triplex-build/triplex-qualification",
        "--filter=@triplex-build/w0",
      ],
      600000,
      true,
    );
    for (const [ordinal, { arm, workers }] of trials.entries()) {
      const batch = "act" + randomBytes(5).toString("hex").slice(0, 9),
        item = "activation-a";
      const slot = "tx2-dxt1-bm1-" + batch + "-" + item,
        unit = "triplex-bm1-" + batch + "-" + item;
      const day = join(root, "day-" + batch),
        state = join(day, "checkout/state"),
        logs = join(day, "logs");
      const evidence = join(state, "evidence/DX-T1"),
        out = join(evidence, slot);
      const seconds = Math.floor(
        (deadline - Date.now() - 20 * 60000) / (1000 * (trials.length - ordinal)),
      );
      if (interrupted || seconds < 300) throw Error("Bench budget exhausted before " + arm);
      const stop = stamp(Date.now() + seconds * 1000),
        request = { slot, source, arm, workers, inputs: programInputs() };
      mkdirSync(day);
      mkdirSync(logs);
      mkdirSync(join(state, "locks"), { recursive: true });
      mkdirSync(evidence, { recursive: true });
      writable(requestPath(slot), request);
      writable(join(output, arm + "-w" + workers + "-request.json"), request);
      assert.equal(command("docker", ["ps", "-q"]), "", "Another stack entered the bench");
      const options = {
        PATH: env.PATH!,
        DOCKER_HOST: env.DOCKER_HOST!,
        DX_BARE_METAL: "1",
        DX_BARE_METAL_ROOT: state,
        DX_IDLE_SENTINEL: "0",
        DX_STACK_EVIDENCE: evidence,
        DX_ACTIVATION_RETAINED_RUN: previous,
        DX_P5_LIVE_READERS: "256",
        DX_ACTIVATION_POST_CAPTURE: "1",
        DX_ACTIVATION_VERIFY_PAGES: "4",
        DX_ACTIVATION_STOP_AT: stop,
        DX_ACTIVATION_GW_READ_CPUS: "4",
        DX_ACTIVATION_CPUS: "3,5,6,7,8,9,10,11",
        DX_COMPILER_POLICY: "early",
      };
      command("systemd-run", [
        "--unit=" + unit,
        "--working-directory=" + repo,
        "--property=KillMode=control-group",
        ...(batchOwner ? ["--property=BindsTo=" + parentUnit, "--property=After=" + parentUnit] : []),
        "--property=RuntimeMaxSec=" + seconds + "s",
        "--property=TimeoutStopSec=150s",
        "--property=ExecStopPost=/bin/bash " + bm + " --cleanup " + batch + " " + stop + " " + item,
        ...Object.entries(options).map(([k, v]) => "--setenv=" + k + "=" + v),
        "/bin/bash",
        resolve("lab/experiments/EXP-DX1/t1/activation.sh"),
        "--execute",
        slot,
        "100000",
        "retained",
        "live",
      ]);
      console.log(arm + " " + out);
      if (batchOwner) {
        const statusFile = join(root, ".STATUS-" + slot);
        const next = trials[ordinal + 1]?.arm ?? "pair";
        writeFileSync(statusFile, "item=" + arm + " state=running since=" + stamp(Date.now()) + " next=" + next + "\n", {flag: "wx"});
        chmodSync(statusFile, 0o644);
        renameSync(statusFile, join(root, "STATUS"));
      }
      try {
        while (!existsSync(join(out, "act1-sweep.json"))) {
          if (interrupted || Date.now() >= Date.parse(stop))
            throw Error("Incomplete " + arm + " at cutoff");
          if (
            ["failed", "inactive"].includes(
              command("systemctl", ["show", unit, "-p", "ActiveState", "--value"]),
            ) &&
            !existsSync(join(out, "act1-sweep.json"))
          )
            throw Error(arm + " exited before guarded readback");
          await delay(2500);
        }
        const result = checkSweep(out, request);
        const trafficSha256 = await checkTraffic(out);
        const baseline = results.find((r) => r.arm === "narrow-full");
        if (baseline) {
          assert.equal(result.trace, baseline.trace);
          assert.equal(result.roster, baseline.roster);
          assert.equal(result.scope, baseline.scope);
          assert.equal(result.r1, baseline.r1);
          assert.equal(result.cut, baseline.cut);
          if (arm === "narrow-selector") {
            assert.equal(result.release, baseline.release);
            assert.equal(result.comparedSha256, baseline.comparedSha256);
          }
        }
        const standard = results.find((r) => r.arm === "standard-full");
        if (standard && arm.startsWith("standard-")) {
          assert.equal(result.release, standard.release);
          assert.equal(result.expectedSha256, standard.comparedSha256);
        }
        const verified = {
          ...result,
          rawDirectory: out,
          trafficSha256,
          rawSha256: sha(readFileSync(join(out, "act1-sweep.json"))),
        };
        writable(join(output, arm + "-w" + workers + ".json"), verified);
        if (batchOwner && !existsSync(join(output, arm + ".json"))) writable(join(output, arm + ".json"), verified);
        writable(join(out, "act1-verified.json"), verified);
        results.push(result);
      } catch (error) {
        writable(join(output, arm + "-failure.json"), { arm, slot, source, error: String(error) });
        console.error(arm, String(error));
      } finally {
        // [DX-ACT1] Why: release each verified clone at the requested P5 readback, before BM1's separate whole-history audit. Rejected: reusing its unaudited prefix as a full BM1 verdict.
        command("systemctl", ["stop", unit], 180000);
        assert.equal(readFileSync(join(logs, item + "-cleanup/result"), "utf8").trim(), "clean");
        assert.equal(
          command("bash", ["lab/experiments/EXP-DX1/stack/up.sh", slot, "--inventory"]),
          "",
        );
      }
    }
    assert.equal(results.length, trials.length, "Incomplete guarded activation series");
    writable(join(output, "comparison.json"), batchOwner ? results : { results, workerFinding: workerFinding(results) });
    if (batchOwner) writable(join(output, "worker-finding.json"), { workerFinding: workerFinding(results) });
    console.log(JSON.stringify({ output, results }, null, 2));
  } finally {
    if (lock !== undefined) closeSync(lock);
  }
}
