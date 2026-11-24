import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { once } from "node:events";
import fs from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { hash, runFile } from "../ha1/common.ts";
import { Satellite } from "../ha1/satellite.ts";
import type { Site } from "../ha1/stack.ts";
import { readScaleSeal } from "../v01/adopt.ts";
import { cleanSource, datomicImage, pgImage, serverImages, verifyBuild } from "../v01/source.ts";
import { sundayCase, sundayCases } from "./sunday-case.ts";
import { absolute, readConfig } from "./sunday-config.ts";
import { echo, roundTrips } from "./sunday-link.ts";
import { seedFiles } from "./sunday-seed.ts";
import { wait } from "./supervisor.ts";

const minute = 60000;
const lockDirectory = "/var/tmp/triplex-bm1";
const dock = ["--host", "unix:///var/run/docker.sock"];
const docker = (args: string[], timeout = 4500) =>
  command("docker", [...dock, ...args], timeout, args[0] === "logs");
const command = async (file: string, args: string[], timeout = 5000, combined = false) => {
  const output = await runFile(file, args, { timeout, maxBuffer: 16 * 1024 ** 2 });
  return (output.stdout + (combined ? output.stderr : "")).trim();
};
const ip = (...args: string[]) => command("ip", args);
const quote = (v: string) => "'" + v.replaceAll("'", "'\\''") + "'";
const write = (p: string, data: unknown) =>
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + "\n", { flag: "wx", mode: 0o600 });
const read = (p: string) => fs.readFileSync(p, "utf8");
const json = (p: string) => JSON.parse(read(p));
const [requestedRole, file, ...extra] = process.argv.slice(2);
assert(
  (requestedRole === "a" || requestedRole === "b") && absolute(file) && !extra.length,
  "Usage: sunday.ts a|b PRIVATE_CONFIG",
);
const role: "a" | "b" = requestedRole;
assert(
  process.platform === "linux" && process.arch === "x64" && process.getuid?.() === 0,
  "Sunday driver requires a dedicated Linux x86-64 host and sudo",
);
assert.equal(
  process.env["HA1_SUNDAY_FLOCK"],
  "1",
  "Launch with the documented physical queue lock",
);
assert.equal(
  fs.statSync(lockDirectory + "/dx-bm1-day.lock").ino,
  fs.statSync("/proc/self/fd/9").ino,
);
const raw = read(file);
const c = readConfig(raw);
const cfg = hash(raw);
const machine = hash(read("/etc/machine-id"));
const hostRun = path.join(c.root, c.tag);
const owner = path.join(lockDirectory, "dx-p9-sunday.active");
const tun = "tun" + c.tunnel;
const local = c[role];
const other = c[role === "a" ? "b" : "a"];
// [DX-HASYNC2] Why: the shortened run fits 150 minutes. Server B starts no case that cannot finish by 136 minutes and
// server A waits for B's release until 146 minutes; both launch under a 150-minute outer limit.
const stopAt = performance.now() + (role === "a" ? 146 : 136) * minute;
const labPaths = ["lab/experiments/EXP-DX1/hasync1/", "lab/experiments/EXP-DX1/ha1/"];
const seed = { sha256: c.seedSha256, cluster: c.cluster };
process.umask(0o077);
const origin = readScaleSeal(
  path.join(local.seedDirectory, "origin", c.seedOriginTag, "image.json"),
  c.seedOriginSha256,
  false,
  c.seedOriginTransferSha256,
);
assert.equal(origin.scope.name, c.scope);

async function checkLocal() {
  assert(absolute(process.cwd()));
  cleanSource(c.lab ?? c.commit);
  verifyBuild(c.commit, c.buildReceipt);
  if (c.lab) {
    // [DX-HASYNC2] Why: keep the staged images and package build of `commit` and allow only lab TypeScript to differ.
    // Rejected: a clean rebuild, whose image IDs would not match between the two servers.
    const git = (...args: string[]) => execFileSync("git", args, { encoding: "utf8" }).trim();
    git("merge-base", "--is-ancestor", c.commit, c.lab);
    const changed = git("diff", "--name-only", c.commit, c.lab).split("\n").filter(Boolean);
    assert(changed.length > 0);
    for (const file of changed)
      assert(
        labPaths.some((prefix) => file.startsWith(prefix)) && /\.(ts|md)$/.test(file),
        "Launch commit changes more than lab TypeScript: " + file,
      );
  }
  const limits = read("/proc/self/status").match(/^Cpus_allowed_list:\s*(\S+)$/m)?.[1];
  assert(limits === "0-11", "The server profile needs cores 0 through 11");
  assert.equal(await docker(["ps", "-q"]), "", "Another campaign is running");
  const [free] = (
    await command("df", [
      "--output=avail",
      "-B1",
      await docker(["info", "--format", "{{.DockerRootDir}}"]),
    ])
  )
    .split("\n")
    .slice(1)
    .map(Number);
  assert(
    free! > 340 * 1024 ** 3,
    "Need 340 GiB free on the Docker data filesystem beyond the staged copy",
  );
  const manifest = path.join(local.seedDirectory, "SHA256SUMS");
  return {
    protocol: 1,
    role,
    tag: c.tag,
    cfg,
    source: c.commit,
    lab: c.lab ?? null,
    direct: c.direct ?? null,
    seed,
    machine,
    repo: process.cwd(),
    pid: process.pid,
    files: seedFiles(read(manifest), c.seedSha256),
    images: serverImages(),
    facts: c.facts,
    origin: c.seedOriginSha256,
    transfer: c.seedOriginTransferSha256,
    started: new Date().toISOString(),
  };
}
type Ready = Awaited<ReturnType<typeof checkLocal>>;

const ssh = [
  "-p",
  "22",
  "-T",
  "-o",
  "BatchMode=yes",
  "-o",
  "IdentitiesOnly=yes",
  "-o",
  "ConnectTimeout=5",
  "-o",
  "StrictHostKeyChecking=yes",
  "-o",
  "ForwardAgent=no",
  "-F",
  "/dev/null",
  "-o",
  "ServerAliveInterval=3",
  "-o",
  "ServerAliveCountMax=3",
  "-o",
  "UserKnownHostsFile=" + c.ssh.knownHosts,
  "-o",
  "GlobalKnownHostsFile=/dev/null",
  "-i",
  c.ssh.identityFile,
];
const target = c.ssh.user + "@" + c.ssh.target;

async function configureTunnel(work: () => Promise<void>) {
  await ip(
    "tuntap",
    "add",
    "dev",
    tun,
    "mode",
    "tun",
    ...(role === "a" ? ["user", c.ssh.user] : []),
  );
  try {
    await ip("link", "set", "dev", tun, "mtu", "1400", "up");
    await ip("address", "add", local.address + "/32", "peer", other.address + "/32", "dev", tun);
    assert.equal(JSON.parse(await ip("-json", "route", "get", other.address))[0].dev, tun);
    await work();
  } finally {
    await ip("tuntap", "del", "dev", tun, "mode", "tun");
  }
}

async function serverA(proof: Ready) {
  const close = await echo(c.a.address);
  const closeDirect = c.direct ? await echo(c.direct.a) : async () => {};
  try {
    write(path.join(hostRun, "ready.json"), proof);
    console.log("Server A is ready for server B.");
    await wait("Server B cleanup handoff", Math.max(0, stopAt - performance.now()), async () => {
      const file = path.join(hostRun, "release.json");
      if (!fs.existsSync(file)) return undefined;
      const release = json(file);
      assert.equal(release.cfg, cfg);
      assert.equal(release.a, machine);
      assert.equal(release.aPid, process.pid);
      assert.match(release.b, /^[0-9a-f]{64}$/);
      assert.notEqual(release.b, machine);
      await noOwnedContainers();
      return true;
    });
  } finally {
    await closeDirect();
    await close();
  }
}

async function noOwnedContainers() {
  assert.equal(
    await docker(["ps", "-aq", "--filter", "label=tx2.holder=DX-HASYNC1"]),
    "",
    "An experiment still owns containers. Keep the persistent guard and investigate by attempt ID.",
  );
}
async function serverB(proof: Ready) {
  const ctrl = path.join(hostRun, "ssh");
  assert(ctrl.length < 95, "Use a short server output root for the SSH control socket");
  const remote = (args: string[], timeout = 7000, combined = false) =>
    command(
      "ssh",
      [...ssh, "-S", ctrl, target, "sudo -n " + args.map(quote).join(" ")],
      timeout,
      combined,
    );
  const readyFile = path.join(hostRun, "ready.json");
  const a = await wait("Server A with the same commit and seed manifest", 240000, async () => {
    const result = await remote(["cat", readyFile]).catch(() => "");
    return result ? (JSON.parse(result) as Ready) : undefined;
  });
  assert.deepEqual(
    [
      a.protocol,
      a.role,
      a.tag,
      a.cfg,
      a.source,
      a.lab,
      a.direct,
      a.seed,
      a.files,
      a.facts,
      a.origin,
      a.transfer,
      a.images,
    ],
    [
      1,
      "a",
      c.tag,
      cfg,
      c.commit,
      c.lab ?? null,
      c.direct ?? null,
      seed,
      proof.files,
      proof.facts,
      proof.origin,
      proof.transfer,
      proof.images,
    ],
  );
  assert(absolute(a.repo) && Number.isSafeInteger(a.pid) && a.pid > 1 && a.machine !== machine);
  assert.equal(await remote(["kill", "-0", String(a.pid)]), "");
  const age = Date.now() - Date.parse(a.started);
  assert(
    age >= -120000 && age <= 600000,
    "Stale ready record or clocks differ by more than two minutes",
  );
  write(path.join(hostRun, "pair.json"), { a, b: proof, launch: "server" });

  // [DX-HASYNC1] Why: one private IP path serves WAL, JDBC, Datomic peer callbacks and HTTP via port 22. Rejected: a single PostgreSQL port forward that leaves broker callbacks unreachable.
  const link = spawn(
    "ssh",
    [
      ...ssh,
      "-M",
      "-N",
      "-S",
      ctrl,
      "-o",
      "ExitOnForwardFailure=yes",
      "-o",
      "Tunnel=point-to-point",
      "-w",
      c.tunnel + ":" + c.tunnel,
      target,
    ],
    { stdio: ["ignore", "ignore", "inherit"] },
  );
  let linkDead = false;
  const ended = once(link, "exit").finally(() => {
    linkDead = true;
  });
  void ended.catch(() => {});
  const report: unknown[] = [];
  let failures = 0;
  try {
    await wait("Authenticated SSH tunnel", 20000, async () => {
      assert(!linkDead, "SSH tunnel exited");
      const ok = await command("ssh", [...ssh, "-S", ctrl, "-O", "check", target], 5000).then(
        () => true,
        () => false,
      );
      return ok ? true : undefined;
    });
    const loopback = await echo("127.0.0.1");
    try {
      const local = await roundTrips("127.0.0.1");
      const overlay = await roundTrips(c.a.address);
      // [DX-HASYNC2] Why: measure the path the WAL will use; an unreachable direct address fails here, before any case.
      const direct = c.direct ? await roundTrips(c.direct.a) : null;
      write(path.join(hostRun, "link.json"), {
        cfg,
        seed,
        local,
        overlay,
        direct,
        p50ExtraMs: overlay.p50Ms - local.p50Ms,
        p95ExtraMs: overlay.p95Ms - local.p95Ms,
      });
    } finally {
      await loopback();
    }
    // [DX-HA2] Why: a short server run can measure one case under the recovery options (for example only b-235) without
    // paying for the others. Unset, every case runs as before. Rejected: editing the case list per run.
    const selected = process.env["TX2_HA2_CASES"]?.split(",").filter(Boolean);
    if (selected) {
      assert(selected.length && selected.every((n) => sundayCases.some((x) => x.name === n)), "TX2_HA2_CASES names unknown cases");
      console.log("Cases selected by TX2_HA2_CASES: " + selected.join(", ") + ".");
    }
    for (const cell of sundayCases) {
      if (selected && !selected.includes(cell.name)) {
        report.push({ cell: cell.name, skipped: "not selected by TX2_HA2_CASES" });
        continue;
      }
      if (performance.now() + cell.budget * minute > stopAt) {
        report.push({ cell: cell.name, skipped: "remaining budget" });
        if (!cell.optional) failures++;
        continue;
      }
      assert(!linkDead, "SSH tunnel lost before the next case");
      console.log("Starting " + cell.name + " on the paired servers.");
      const out = path.join(hostRun, cell.name);
      try {
        const result = await sundayCase(
          out,
          c.tag,
          cell,
          {
            primary: { ...seed, directory: c.a.seedDirectory },
            standby: { ...seed, directory: c.b.seedDirectory },
            scope: origin.key,
            origin,
          },
          (e) => {
            const images = [proof.images[pgImage]!, proof.images[datomicImage]!];
            const allowed = new Satellite(
              e.nonce,
              e.prefix,
              a.repo,
              images,
              c.a.seedDirectory,
              false,
              c.a.seedDirectory,
            );
            const remoteDocker = (args: string[], timeout?: number) =>
              allowed.call(args, (checked) =>
                remote(["docker", ...dock, ...checked], timeout ?? 7000, checked[0] === "logs"),
              );
            const siteA: Site = {
              key: "server A",
              repo: a.repo,
              datomicId: images[1]!,
              postgresImage: images[0]!,
              privateAddress: c.a.address,
              ...(c.direct ? { replicationAddress: c.direct.a } : {}),
              docker: (args, opts) => remoteDocker(args, opts?.timeout),
            };
            const siteB: Site = {
              key: "server B",
              repo: proof.repo,
              datomicId: images[1]!,
              postgresImage: images[0]!,
              privateAddress: c.b.address,
              ...(c.direct ? { replicationAddress: c.direct.b } : {}),
              docker: (args, opts) => docker(args, opts?.timeout),
            };
            return { a: siteA, b: siteB };
          },
        );
        report.push({ cell: cell.name, ...result });
      } catch (error) {
        failures++;
        // [DX-HASYNC1] Why: keep first discrepant bytes and continue only after verified cleanup. Rejected: retrying until a measurement looks good.
        report.push({ cell: cell.name, error: error instanceof Error ? error.name : typeof error });
        const dirs = fs.existsSync(out) ? fs.readdirSync(out) : [];
        if (!(dirs.length === 1 && fs.existsSync(path.join(out, dirs[0]!, "cleanup.json")))) break;
      }
    }
  } finally {
    write(path.join(hostRun, "measurements.json"), { cfg, source: c.commit, seed, report });
    try {
      await noOwnedContainers();
      assert.equal(
        await remote(["docker", ...dock, "ps", "-aq", "--filter", "label=tx2.holder=DX-HASYNC1"]),
        "",
      );
      const release = { cfg, a: a.machine, b: machine, aPid: a.pid, at: new Date().toISOString() };
      await remote([
        "sh",
        "-ceu",
        'set -C; umask 077; printf "%s\\n" "$1" > "$2"',
        "release",
        JSON.stringify(release),
        path.join(hostRun, "release.json"),
      ]);
    } finally {
      link.kill("SIGTERM");
      await ended;
    }
  }
  assert(
    report.length === sundayCases.length && failures === 0,
    "A required case failed or was left unrun",
  );
}

async function bundle() {
  const archive = hostRun + "-" + role + ".tar.gz";
  const writer = fs.createWriteStream(archive, { flags: "wx", mode: 0o600 });
  const tar = spawn("tar", ["-czf", "-", "-C", c.root, c.tag], {
    stdio: ["ignore", "pipe", "inherit"],
  });
  const [[exit]] = await Promise.all([once(tar, "exit"), pipeline(tar.stdout, writer)]);
  assert.equal(exit, 0);
  const digest = (await command("sha256sum", [archive], 7 * minute)).split(" ")[0]!;
  fs.writeFileSync(archive + ".sha256", digest + "  " + path.basename(archive) + "\n", {
    flag: "wx",
    mode: 0o600,
  });
  console.log("Compressed evidence sealed for server " + role.toUpperCase() + ".");
}

fs.mkdirSync(c.root, { recursive: true, mode: 0o700 });
fs.mkdirSync(hostRun, { mode: 0o700 });
fs.mkdirSync(owner, { mode: 0o700 });
let clean = false;
try {
  write(path.join(owner, "owner.json"), { role, tag: c.tag, cfg, machine, pid: process.pid });
  const proof = await checkLocal();
  await command("taskset", ["-pc", "9-11", String(process.pid)]);
  write(path.join(hostRun, "host.json"), proof);
  await configureTunnel(() => (role === "a" ? serverA(proof) : serverB(proof)));
  clean = true;
} catch (error) {
  write(path.join(hostRun, "driver-failure.json"), {
    cfg,
    role,
    error: error instanceof Error ? error.name : typeof error,
  });
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  await bundle();
  if (clean) {
    await noOwnedContainers();
    fs.rmSync(owner, { recursive: true });
    fs.rmSync(hostRun, { recursive: true });
  }
}
