import { choose } from "./selection.ts";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import {
  createReadStream,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  statfsSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { basename, join, resolve } from "node:path";

import { deepPopulation } from "../../../bench/lib/deep-world.ts";
const [action, where, source] = process.argv.slice(2);
assert(where && source && /^[0-9a-f]{40}$/.test(source));
const root = realpathSync(where),
  tag = basename(root);
assert(/^import-[a-z0-9-]{3,48}$/.test(tag) && root === "/var/tmp/triplex-import1/" + tag);
assert(process.platform === "linux" && process.getuid?.() === 0);
const repo = join(root, "build", "repository"),
  bench = "lab/experiments/EXP-DX1/import1/",
  active = join(root, "active.json");
process.chdir(repo);
const call = (p: string, a: string[], time = 30000) =>
  execFileSync(p, a, { encoding: "utf8", timeout: time }).trim();
const git = (...a: string[]) => call("git", a);
assert.equal(git("rev-parse", "HEAD"), source);
Object.assign(process.env, {
  DX_BARE_METAL: "1",
  DX_BARE_METAL_ROOT: join(root, "native"),
  DOCKER_HOST: "unix:///var/run/docker.sock",
  DX_STACK_EVIDENCE: join(root, "stacks"),
  DX_STACK_WAIT_FOR_TRANSACTOR: "1",
  TRIPLEX_DATOMIC_LAYOUT: "lean",
  TX2_W0_POINT_JOURNAL: "1",
  TX2_W0_RESTORE_INDEXED_JOURNAL: "1",
  TX2_SWEEP_STRICT: "1",
  DX_PG_MEMORY: "6g",
  DX_TX_MEMORY: "10g",
  DX_TX_HEAP: "7g",
});
for (const k of ["DOCKER_CONTEXT", "DOCKER_TLS", "DOCKER_CERT_PATH", "DOCKER_TLS_VERIFY"])
  delete process.env[k];
for (const k of ["TX_JFR", "GW_JFR", "GATEWAY", "NATIVE_LOGS", "POSTGRES"])
  process.env["TRIPLEX_TRACE_" + k] = "0";
const stack = "lab/experiments/EXP-DX1/stack/",
  docker = (...a: string[]) => call("docker", a);
const get = (f: string) => JSON.parse(readFileSync(f, "utf8")),
  put = (f: string, x: unknown) =>
    writeFileSync(f, JSON.stringify(x, null, 2) + "\n", { flag: "wx" });
const available = (path: string) => {
  const s = statfsSync(path);
  return s.bavail * s.bsize;
};
const run = (args: string[]) =>
  execFileSync(
    "taskset",
    ["-c", "3,5,6,7,9,10,11", process.execPath, "--experimental-strip-types", ...args],
    { stdio: "inherit" },
  );
async function hash(file: string) {
  const h = createHash("sha256");
  for await (const b of createReadStream(file)) h.update(b);
  return h.digest("hex");
}
async function inventory(directory: string) {
  const rows: Record<string, string> = {};
  for (const f of readdirSync(directory, { recursive: true, withFileTypes: true })) {
    if (!f.isFile()) continue;
    const p = join(f.parentPath, f.name);
    rows[p.slice(directory.length + 1)] = await hash(p);
  }
  return rows;
}
function clean() {
  if (!existsSync(active)) return;
  const a = get(active);
  assert(
    a.source === source &&
      a.tag === tag &&
      a.prefix === "tx2-dximport-" + a.nonce &&
      /^[a-f0-9]{20}$/.test(a.nonce),
  );
  call("bash", [stack + "down.sh", a.prefix, "--volumes"], 180000);
  assert.equal(call("bash", [stack + "up.sh", a.prefix, "--inventory"]), "");
  unlinkSync(active);
}
if (action === "--cleanup") {
  clean();
} else {
  assert.equal(action, "--execute");
  assert.equal(spawnSync("systemd-detect-virt", { encoding: "utf8" }).stdout.trim(), "none");
  assert.equal(git("status", "--porcelain", "--untracked-files=no"), "");
  assert.equal(docker("ps", "-q"), "");
  const physical = call("lscpu", ["-p=CPU,CORE,SOCKET"])
    .split("\n")
    .filter((s) => !s.startsWith("#"))
    .map((s) => s.split(","));
  assert.equal(
    new Set(
      Array.from({ length: 12 }, (_, i) =>
        physical
          .find((c) => Number(c[0]) === i)
          ?.slice(1)
          .join(":"),
      ),
    ).size,
    12,
  );
  assert(physical.some((c) => Number(c[0]) === 11));
  const machine = await hash("/etc/machine-id"),
    dockerRoot = docker("info", "--format", "{{.DockerRootDir}}");
  const tracked = git(
    "ls-files",
    "lab/bench/lib",
    "lab/experiments/EXP-DX1/import1",
    "lab/oracles/replay",
    "lab/experiments/EXP-DX1/stack",
    "lab/experiments/EXP-DX1/t1/bare-metal.sh",
    "pnpm-lock.yaml",
    "packages/datomic/src",
    "packages/datomic/gateway",
  ).split("\n");
  const pins: Record<string, string> = {};
  for (const f of tracked) pins[f] = await hash(f);
  for (const pkg of ["core", "datomic", "qualification", "w0"]) {
    const d = "packages/" + pkg + "/dist";
    for (const [f, h] of Object.entries(await inventory(d)))
      if (f.endsWith(".js")) pins[d + "/" + f] = h;
  }
  put(join(root, "sources.json"), pins);
  const build = await hash(join(root, "sources.json")),
    stages: any[] = [];
  let bytesPerFact = 0,
    chosen = 1;
  const candidates: any[] = [];
  for (const stage of ["proof", "screen0", "screen1", "screen2", "screen3", "deep", "thin"]) {
    const dir = join(root, stage);
    mkdirSync(dir);
    const nonce = randomUUID().replaceAll("-", "").slice(0, 20),
      prefix = "tx2-dximport-" + nonce;
    const sizable = stage === "deep" || stage === "thin",
      planned =
        stage === "thin" ? 36000000 : stage === "deep" ? deepPopulation(100000).facts : 1000000;
    const footprint = planned + 2 * 10 * 1604464;
    const required = Math.max(12 * 1024 ** 3, Math.ceil(footprint * bytesPerFact * 1.45));
    const free = available(dockerRoot),
      scratch = available(root);
    put(join(dir, "capacity.json"), { planned, footprint, bytesPerFact, required, free, scratch });
    if (stage !== "proof" && (free < required || scratch < 12 * 1024 ** 3)) {
      stages.push({ stage, status: "capacity-refused", required, free, scratch });
      continue;
    }
    assert(free >= 12 * 1024 ** 3 && scratch >= 8 * 1024 ** 3 && docker("ps", "-q") === "");
    const attempt = { source, build, tag, nonce, prefix, machine, stage };
    put(active + ".tmp", attempt);
    renameSync(active + ".tmp", active);
    let reading: any;
    try {
      call(
        "bash",
        [
          stack + "up.sh",
          prefix,
          "--cpus-tx",
          "0",
          "--cpus-pg",
          "1",
          "--cpus-gw-write",
          "2",
          "--cpus-gw-read",
          "4,8",
          "--tx-memory",
          "10g",
          "--pg-memory",
          "6g",
          "--gw-memory",
          "8g",
          "--gw-java-opts",
          "-Xms512m -Xmx5g",
          "--tx-java-opts",
          "-Xms1g -Xmx7g",
        ],
        600000,
      );
      const stackFile = join(process.env.DX_STACK_EVIDENCE!, prefix, "stack.json"),
        st = get(stackFile);
      assert(
        st.prefix === prefix &&
          st.durability.fsync === "on" &&
          st.durability.synchronous_commit === "on" &&
          st.durability.full_page_writes === "on",
      );
      const containers = Object.fromEntries(
        ["pg", "tx", "gw-w", "gw-r"].map((role) => [
          role,
          docker("inspect", "--format", "{{.Id}} {{.Image}}", prefix + "-" + role),
        ]),
      );
      const binding = join(dir, "attempt.json");
      put(binding, { ...attempt, stackHash: await hash(stackFile), containers, stackFile });
      Object.assign(process.env, {
        DX_IMPORT_BENCH_STAGE: binding,
        DATOMIC_URL: st.writeUrl,
        DATOMIC_READ_URLS: st.readUrl,
      });
      const pgSize = () =>
        Number(
          docker("exec", prefix + "-pg", "du", "-sk", "/var/lib/postgresql/data").split(/\s/)[0],
        ) * 1024;
      const startBytes = pgSize();
      if (stage === "proof") {
        run([bench + "proof.ts", "--native-proof", join(dir, "oracle")]);
        run([bench + "edges.ts", join(dir, "edges")]);
        run([bench + "price.ts", join(dir, "price"), "10000"]);
        run([bench + "behind.ts", join(dir, "behind.json")]);
        run([bench + "fair.ts", join(dir, "fair")]);
        const sizing = [];
        for (const profile of ["deep", "thin"]) {
          const path = join(dir, "sample-" + profile),
            before = pgSize();
          run([bench + "calibrate.ts", path, profile]);
          const cal = get(join(path, "calibration.json")),
            after = pgSize();
          assert(cal.facts >= 900000 && cal.groups === cal.source.groups && after >= before);
          bytesPerFact = Math.max(bytesPerFact, (after - before) / cal.facts);
          sizing.push({ profile, before, after, ...cal });
        }
        reading = {
          sizing,
          driverCpus: "3,5,6,7,9,10,11",
          oracle: await hash(join(dir, "oracle/history.readback.json")),
          snapshot: await hash(join(dir, "oracle/snapshot.readback.json")),
          price: get(join(dir, "price/price.json")),
          edges: get(join(dir, "edges/edges.json")),
        };
      } else {
        const n = Number(stage.slice(-1));
        const mode = sizable ? stage : "screen";
        const choice = sizable
          ? candidates.length === 4
            ? choose(candidates)
            : { index: 1, selection: "exploratory-incomplete-screen", observedMaxHoldMs: null }
          : undefined;
        if (choice) chosen = choice.index;
        run([bench + "campaign.ts", mode, join(dir, "traffic"), String(sizable ? chosen : n), "0"]);
        const summary = get(join(dir, "traffic/comparison.json"));
        assert(
          summary.binding === (await hash(binding)) &&
            summary.mode === mode &&
            summary.rows.length === 1,
        );
        const r = summary.rows[0];
        assert.equal(r.scopes.length, 10);
        assert.equal(r.complete, true);
        assert.equal(r.groups, stage === "thin" ? 4500000 : stage === "deep" ? 100000 : 125000);
        assert.equal(r.facts, planned);
        const endBytes = pgSize();
        const actual = r.facts + 2 * 10 * 1604464;
        bytesPerFact = Math.max(bytesPerFact, (endBytes - startBytes) / actual);
        if (!sizable) candidates.push(r);
        reading = {
          ...summary,
          chosen: sizable ? chosen : n,
          selection: choice?.selection ?? "screen",
          observedHoldMs: choice?.observedMaxHoldMs ?? r.maxService,
          startBytes,
          endBytes,
        };
      }
      assert.equal(await hash(stackFile), get(binding).stackHash);
      for (const [role, original] of Object.entries(containers))
        assert.equal(
          docker("inspect", "--format", "{{.Id}} {{.Image}}", prefix + "-" + role),
          original,
        );
    } finally {
      clean();
    }
    const raw = await inventory(dir);
    put(join(dir, "files.json"), raw);
    stages.push({
      stage,
      nonce,
      prefix,
      source,
      build,
      reading,
      manifest: await hash(join(dir, "files.json")),
      cleanup: true,
    });
  }
  for (const [f, d] of Object.entries(pins)) assert.equal(await hash(f), d);
  assert.equal(docker("ps", "-q"), "");
  put(join(root, "terminal.json"), { tag, source, build, machine, stages, cleanup: true });
}
