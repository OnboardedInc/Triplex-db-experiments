import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { capacity, scaleHost, startScaleStack } from "../scale1/bench.ts";
import { sourceInventory } from "../scale1/source.ts";
import { preflight } from "./preflight.ts";
import { inputPins, measuredPair } from "./rung.ts";

const script = fileURLToPath(import.meta.url),
  repo = path.resolve(path.dirname(script), "../../../.."),
  GiB = 1024 ** 3;
const get = (p: string) => JSON.parse(fs.readFileSync(p, "utf8"));
const write = (p: string, d: unknown) =>
  fs.writeFileSync(p, JSON.stringify(d, null, 2) + "\n", { flag: "wx" });
const call = (p: string, args: string[]) =>
  execFileSync(p, args, { encoding: "utf8", cwd: repo }).trim();
export function commandPlan(tag: string) {
  assert(/^notify-[a-z0-9-]{3,32}$/.test(tag));
  const dir = path.join(scaleHost.root, tag),
    prefix = "tx2-dxscale1-" + tag;
  return { dir, tag, prefix, preflight: 1000, subjects: 100000, readers: 64, ceiling: 24 * 3600 };
}
async function run() {
  const [op, tag] = process.argv.slice(2),
    p = commandPlan(tag!);
  if (op === "plan") {
    console.log(JSON.stringify(p));
    return;
  }
  scaleHost.physical();
  const source = call("git", ["rev-parse", "HEAD"]),
    file = path.join(p.dir, "attempt.json");
  if (op === "cleanup") {
    const attempt = get(file);
    assert(attempt.source === source && attempt.tag === tag && attempt.slot === p.prefix);
    scaleHost.clean(p.dir, p.prefix);
    write(path.join(p.dir, "terminal.json"), {
      source,
      slot: p.prefix,
      nonce: attempt.nonce,
      service: process.env.SERVICE_RESULT,
      hasResult: fs.existsSync(path.join(p.dir, "deep/result.json")),
    });
    return;
  }
  if (op === "launch") {
    scaleHost.released();
    assert.equal(
      call("git", ["status", "--porcelain", "--untracked-files=no"]),
      "",
      "Source must be the checked out commit",
    );
    assert(Object.values(scaleHost.childrenInventory(p.prefix)).every((group) => !group.length));
    const disks = call("docker", ["info", "--format", "{{.DockerRootDir}}"]);
    const budget = capacity(100000, 1, {
      memory: scaleHost.memory(),
      disk: scaleHost.available(disks),
    });
    // [DX-STG1] Why: sequential arms retain two source seeds but run one client cohort at a time. Rejected: charging the machine for two simultaneous reader pools.
    const requiredDisk = budget.liveDisk + budget.db;
    assert(
      budget.host.disk >= requiredDisk && budget.host.memory >= budget.liveMemory,
      "Two retained seeds and one active cohort must fit",
    );
    const topology = call("lscpu", ["-p=CPU,CORE,SOCKET"])
      .split("\n")
      .filter((x) => x && !x.startsWith("#"))
      .map((x) => x.split(","));
    const cores = new Map(
      topology.map(([cpu, core, socket]) => [Number(cpu), socket + "/" + core]),
    );
    const assigned = Array.from({ length: 12 }, (_, i) => cores.get(i));
    assert(
      assigned.every(Boolean) && new Set(assigned).size === 12,
      "Native placement needs twelve distinct physical cores",
    );
    fs.mkdirSync(p.dir, { mode: 0o700 });
    const nonce = randomUUID(),
      clientBudget = Math.floor(budget.host.memory - budget.sharedReserve - 5 * GiB);
    write(file, {
      tag,
      slot: p.prefix,
      nonce,
      source,
      inputs: inputPins(),
      budget,
      requiredDisk,
      ceiling: p.ceiling,
    });
    const loader = [process.execPath, "--import", "tsx", script];
    assert(![...loader, repo].some((s) => s.includes(" ")));
    call("systemd-run", [
      "--no-block",
      "--unit=triplex-scale1-" + tag,
      "--working-directory=" + repo,
      "--property=KillMode=control-group",
      "--property=RuntimeMaxSec=" + p.ceiling + "s",
      "--property=MemoryMax=" + clientBudget,
      "--property=TimeoutStopSec=600s",
      "--property=ExecStopPost=" + [...loader, "cleanup", tag].join(" "),
      "--setenv=DOCKER_HOST=unix:///var/run/docker.sock",
      "--setenv=PATH=" + process.env.PATH,
      "flock",
      "-n",
      path.join(scaleHost.root, "exclusive.lock"),
      process.execPath,
      "lab/bin/heavy.mjs",
      "--label",
      "DX-STG1-bench",
      "--",
      ...loader,
      "run",
      tag,
    ]);
    console.log(JSON.stringify({ tag, source, nonce, results: p.dir }));
    return;
  }
  assert.equal(op, "run");
  const attempt = get(file);
  assert(attempt.source === source && attempt.tag === tag && attempt.slot === p.prefix);
  assert.deepEqual(attempt.inputs, inputPins());
  write(path.join(p.dir, "source.json"), sourceInventory(repo));
  const { env, engines } = startScaleStack(p.dir, p.prefix, source);
  for (const [role, cpus] of Object.entries({ pg: "1", tx: "0", "gw-w": "2", "gw-r": "4,8" }))
    assert.equal(engines[role].cpus, cpus);
  write(path.join(p.dir, "placement.json"), engines);
  Object.assign(process.env, env, {
    DATOMIC_URL: "http://" + engines["gw-w"].address + ":8080",
    DATOMIC_READ_URLS: "http://" + engines["gw-r"].address + ":8080",
    NOTIFY_NATIVE: "1",
    TRIPLEX_DATOMIC_LAYOUT: "lean",
    TX2_W0_POINT_JOURNAL: "1",
    TX2_W0_RESTORE_INDEXED_JOURNAL: "1",
    TX2_SWEEP_STRICT: "1",
  });
  call("taskset", ["-pc", "3,5,6,7,9,10,11", String(process.pid)]);
  const binding = { source, slot: p.prefix, nonce: attempt.nonce };
  // [DX-STG1] Why: require ACT2's identity gate and a complete 1k notice replay on this allocation before paying for either 100k seed. Rejected: accepting a saved Mac preflight or a launch-only success.
  await preflight(p.dir, binding);
  const large = path.join(p.dir, "deep");
  fs.mkdirSync(large);
  write(path.join(p.dir, "before-deep.json"), scaleHost.snapshot(p.prefix));
  await measuredPair(
    p.subjects,
    large,
    source,
    p.prefix,
    attempt.nonce,
    true,
    20,
    p.readers,
    true,
    true,
  );
  write(path.join(p.dir, "after-deep.json"), scaleHost.snapshot(p.prefix));
}
if (process.argv[1] === script) await run();
