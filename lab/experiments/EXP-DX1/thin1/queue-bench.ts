import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const [mode = "--plan", batch, utc, work] = process.argv.slice(2);
const script = fileURLToPath(import.meta.url),
  repo = fileURLToPath(new URL("../../../../", import.meta.url));
const node = process.execPath,
  nodeArgs = ["--no-warnings", "--experimental-transform-types", "--expose-gc"];
const run = (cmd: string, args: string[], seconds = 60) =>
  execFileSync(cmd, args, {
    cwd: repo,
    env: process.env,
    encoding: "utf8",
    timeout: seconds * 1000,
    maxBuffer: 32 << 20,
  }).trim();
const rungs = [1_000_000, 4_000_000];
if (mode === "--plan") {
  console.log(
    JSON.stringify(
      {
        command: "queue-bench.ts --launch BATCH UTC_CUTOFF PREPARED_WORK_DIRECTORY",
        rungs,
        active: "2%",
        mode: "reach-touched",
        stages: [
          "fresh SQL stack",
          "eight-fact seed",
          "2% real reads and writes",
          "pinned activation and outbox",
          "readback and oracle",
          "owned cleanup and checksums",
        ],
        expected:
          "Four times the import disk and roughly four times the active reader payload at 4M. Cold-read latency depends on real storage. The full roster still incurs coverage and publication work.",
      },
      null,
      2,
    ),
  );
  process.exit(0);
}
assert(["--launch", "--run", "--cleanup"].includes(mode));
assert(
  batch && /^[a-z0-9]{1,12}$/.test(batch) && utc && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(utc),
);
assert(work && path.isAbsolute(work) && !/\s/.test(work) && !/\s/.test(script));
assert.equal(process.platform, "linux");
assert.equal(process.getuid?.(), 0);
assert.equal(spawnSync("systemd-detect-virt", { encoding: "utf8" }).stdout.trim(), "none");
const deadline = Date.parse(utc),
  state = path.join(work, "state"),
  day = path.join(state, "evidence", "DX-THIN1", batch);
const queueRoot = "/var/tmp/triplex-bm1",
  lease = path.join(state, "locks", "measure");
const head = run("git", ["rev-parse", "HEAD"]);
assert.equal(fs.realpathSync(repo), fs.realpathSync(path.join(work, "repository")));
process.env.DX_BARE_METAL = "1";
process.env.DX_BARE_METAL_ROOT = state;
process.env.DX_STACK_EVIDENCE = path.join(day, "stacks");
process.env.DOCKER_HOST = "unix:///var/run/docker.sock";
delete process.env.DOCKER_CONTEXT;
delete process.env.DOCKER_TLS_VERIFY;
delete process.env.DOCKER_CERT_PATH;
process.env.DOCKER_CONFIG = path.join(work, "docker-config");
process.env.PATH = path.join(work, "tools", "bin") + ":" + process.env.PATH;
process.env.TRIPLEX_DATOMIC_LAYOUT = "lean";
process.env.DX_NATIVE_GATES = "0";
process.env.DX_TX_MEMORY = "5g";
process.env.DX_TX_HEAP = "3g";
process.env.DX_TX_OBJECT_CACHE = "1280m";
process.env.DX_PG_MEMORY = "2g";
process.env.DX_GW_READ_MEMORY = "3g";
process.env.DX_GW_WRITE_MEMORY = "3g";
process.env.DX_GW_READ_HEAP = "2g";
process.env.DX_GW_WRITE_HEAP = "2g";
for (const key of [
  "DX_IDLE_SENTINEL",
  "DX_IDLE_REFUSAL_PROBE",
  "DX_IDLE_TCP",
  "TRIPLEX_TRACE_COMPONENTS",
  "TX2_ORACLE_BRIDGE",
  "DX_NIGHT_WINDOW",
])
  delete process.env[key];
const unit = "triplex-thin-" + batch,
  prefix = "tx2-dxthin-" + batch;
const owned = path.join(day, "active.json"),
  owner = path.join(lease, "owner.json");
const json = (file: string) => JSON.parse(fs.readFileSync(file, "utf8"));
const write = (file: string, data: unknown) =>
  fs.writeFileSync(file, JSON.stringify(data) + "\n", { flag: "wx", mode: 0o600 });
const status = (value: string) => {
  const tmp = path.join(day, "STATUS.tmp");
  fs.writeFileSync(tmp, new Date().toISOString() + " " + value + "\n");
  fs.renameSync(tmp, path.join(day, "STATUS"));
};
const docker = (...args: string[]) => run("docker", args);
const inventory = (tag: string) =>
  [
    ...docker("ps", "-a", "--format", "{{.Names}}").split("\n"),
    ...docker("network", "ls", "--format", "{{.Name}}").split("\n"),
    ...docker("volume", "ls", "--format", "{{.Name}}").split("\n"),
  ].filter((s) => s.startsWith(tag + "-"));
const checkLease = () => {
  const l = json(owner);
  assert(l.id === "DX-THIN1" && l.unit === unit && l.source === head && l.day === day);
};
function cleanup() {
  if (!fs.existsSync(owned)) return;
  checkLease();
  const a = json(owned);
  assert(
    a.source === head &&
      a.unit === unit &&
      rungs.includes(a.size) &&
      a.tag === prefix + "-" + a.size + "-" + a.nonce &&
      /^[0-9a-f]{12}$/.test(a.nonce),
  );
  const stack = path.join(process.env.DX_STACK_EVIDENCE!, a.tag, "stack.json");
  if (fs.existsSync(stack))
    for (const c of json(stack).containers) {
      if (inventory(a.tag).includes(c.name))
        assert.equal(docker("inspect", "-f", "{{.Id}}", c.name), c.id);
    }
  // [DX-THIN1] Why: an interrupted bootstrap may leave its extraction helper before stack.json exists.
  // Rejected: prefix-wide pruning or starting a new rung with an ambiguous resource pedigree.
  const names = inventory(a.tag);
  const allowed = new Set(
    [
      "pg",
      "tx",
      "gw-w",
      "gw-r",
      "extract",
      "health",
      "net",
      "pg-data",
      "trace-check",
      "selftest",
    ].map((n) => a.tag + "-" + n),
  );
  assert(names.every((n) => allowed.has(n)));
  for (const name of ["extract", "health", "trace-check", "selftest"])
    if (names.includes(a.tag + "-" + name)) docker("rm", "-f", a.tag + "-" + name);
  run("bash", ["lab/experiments/EXP-DX1/stack/down.sh", a.tag, "--volumes"], 120);
  assert.deepEqual(inventory(a.tag), []);
  fs.unlinkSync(owned);
}
function release() {
  if (!fs.existsSync(owner) || json(owner).unit !== unit) return;
  checkLease();
  cleanup();
  fs.unlinkSync(owner);
  fs.rmdirSync(lease);
}
if (mode === "--cleanup") {
  release();
  process.exit(0);
}
assert.equal(run("git", ["status", "--porcelain"]), "");
assert(
  Number.isFinite(deadline) && deadline - Date.now() > 600_000,
  "Reserve at least ten minutes",
);
fs.mkdirSync(queueRoot, { recursive: true });
if (mode === "--launch") {
  assert(!fs.existsSync(day));
  const remaining = Math.floor((deadline - Date.now()) / 1000);
  run("systemd-run", [
    "--no-block",
    "--unit=" + unit,
    "--property=KillMode=control-group",
    "--property=RuntimeMaxSec=" + remaining,
    "--property=TimeoutStopSec=150",
    "--property=ExecStopPost=" +
      [node, ...nodeArgs, script, "--cleanup", batch, utc, work].join(" "),
    "flock",
    "-n",
    path.join(queueRoot, "dx-bm1-day.lock"),
    node,
    ...nodeArgs,
    script,
    "--run",
    batch,
    utc,
    work,
  ]);
  console.log(unit);
  process.exit(0);
}
const comparison = spawnSync(
  "systemctl",
  ["show", "triplex-drv1-wait", "-p", "ActiveState", "--value"],
  { encoding: "utf8" },
);
assert.equal(comparison.status, 0);
assert(["inactive", "failed"].includes(comparison.stdout.trim()));
assert.equal(docker("ps", "-q"), "", "Bench already in use");
assert(!fs.existsSync(lease));
fs.mkdirSync(path.dirname(day), { recursive: true });
fs.mkdirSync(day);
fs.mkdirSync(path.dirname(lease), { recursive: true });
fs.mkdirSync(lease);
write(owner, { id: "DX-THIN1", pid: process.pid, unit, source: head, day });
write(path.join(day, "batch.json"), { source: head, unit, utc, rungs });
try {
  status("building");
  run(
    "pnpm",
    ["--store-dir", path.join(work, "pnpm-store"), "install", "--frozen-lockfile", "--offline"],
    900,
  );
  run(
    path.join(repo, "node_modules/.bin/turbo"),
    [
      "run",
      "build",
      "--cache-dir",
      path.join(work, "build-cache"),
      "--filter=@triplex-build/triplex-datomic",
      "--filter=@triplex-build/w0",
      "--filter=@triplex-build/triplex-qualification",
      "--output-logs=errors-only",
    ],
    900,
  );
  for (const size of rungs) {
    assert(deadline - Date.now() > 600_000, "Insufficient time for another rung");
    const disk = fs.statfsSync(day, { bigint: true });
    assert(disk.bavail * disk.bsize > 5n * 1024n ** 3n);
    assert.equal(docker("ps", "-q"), "");
    const nonce = randomBytes(6).toString("hex"),
      tag = prefix + "-" + size + "-" + nonce;
    assert.deepEqual(inventory(tag), []);
    write(owned, { unit, source: head, size, nonce, tag });
    status("starting " + size);
    try {
      run(
        "bash",
        [
          "lab/experiments/EXP-DX1/stack/up.sh",
          tag,
          "--cpus-tx",
          "0",
          "--cpus-pg",
          "1",
          "--cpus-gw-write",
          "2,3",
          "--cpus-gw-read",
          "4,5",
        ],
        600,
      );
      const file = path.join(process.env.DX_STACK_EVIDENCE!, tag, "stack.json"),
        stack = json(file);
      assert.equal(stack.prefix, tag);
      assert.equal(stack.containers.length, 4);
      process.env.DX_THIN_STACK = file;
      process.env.DATOMIC_URL = stack.writeUrl;
      process.env.DATOMIC_READ_URLS = stack.readUrl;
      status("measuring " + size);
      const dest = path.join(day, "rung-" + size),
        fd = fs.openSync(path.join(day, size + ".log"), "wx");
      let trial;
      try {
        trial = spawnSync(
          node,
          [
            ...nodeArgs,
            path.join(repo, "lab/experiments/EXP-DX1/thin1/trial.ts"),
            "live",
            "touched",
            String(size),
            dest,
          ],
          {
            cwd: repo,
            env: process.env,
            stdio: ["ignore", fd, fd],
            timeout: Math.max(1, deadline - Date.now() - 120000),
          },
        );
      } finally {
        fs.closeSync(fd);
      }
      assert.equal(trial.status, 0, "Trial failed or timed out; inspect rung log");
      const result = json(path.join(dest, "result.json"));
      assert.equal(result.source, head);
      assert.equal(result.slot, tag);
      assert.equal(result.size, size);
      assert.equal(result.active, size / 50);
      assert.equal(result.activation.coverage.count, size);
      const list = fs.readdirSync(dest, { recursive: true, encoding: "utf8" }).sort();
      const sums = fs.openSync(path.join(dest, "SHA256SUMS"), "wx");
      try {
        for (const file of list)
          if (fs.statSync(path.join(dest, file)).isFile()) {
            const h = createHash("sha256");
            for await (const bytes of fs.createReadStream(path.join(dest, file))) h.update(bytes);
            fs.writeSync(sums, h.digest("hex") + "  " + file + "\n");
          }
      } finally {
        fs.closeSync(sums);
      }
    } finally {
      cleanup();
    }
  }
  status("finished");
} catch (error) {
  status("incomplete");
  throw error;
} finally {
  release();
}
