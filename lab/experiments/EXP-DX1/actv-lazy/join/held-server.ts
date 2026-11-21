import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { launchProfile, type CreditMode } from "../../jvm1/launch.mjs";
import { readScaleJvms, scaleHost, startScaleStack } from "../../scale1/bench.ts";
import { hex, readScaleSeal } from "../../v01/adopt.ts";
import { jsonFile } from "../../v01/adopted.ts";
import { stackOptions } from "../../v01/profile.ts";
import { cleanSource, verifyBuild } from "../../v01/source.ts";
import { runHeld } from "./held-campaign.ts";

const [source, image, imagePin, transferPin, templateDir, preparedDir, walDir, output, fair, rolling, width, credits] =
  process.argv.slice(2);
assert(process.platform === "linux" && process.env.DX_BARE_METAL === "1" && output);
assert(source && image && imagePin && transferPin && templateDir && preparedDir && walDir);
if (fair) {
  assert.equal(fair, "--fair-import");
  assert.match(rolling ?? "", /^rolling(?:6|8|12|16)$/);
  assert.match(width ?? "", /^(?:[89]|[1-5][0-9]|6[0-4])$/);
  assert.match(credits ?? "", /^[1-5]$/);
  assert.equal(process.argv.length, 14);
}
const lock = fs.statSync("/var/tmp/triplex-bm1/dx-bm1-day.lock");
const queue = fs.statSync("/proc/self/fd/9");
assert.deepEqual([queue.ino, queue.dev], [lock.ino, lock.dev]);
const locks = fs.readFileSync("/proc/locks", "utf8");
assert(
  locks
    .split("\n")
    .some(
      (line) =>
        line.includes("FLOCK") &&
        line.includes("WRITE") &&
        line.endsWith(":" + lock.ino + " 0 EOF"),
    ),
  "The bare-metal campaign must own the native queue lock",
);
scaleHost.physical();
verifyBuild(cleanSource(source), process.env.DX_V01_BUILD_RECEIPT);
const out = path.resolve(output),
  template = fs.realpathSync(templateDir),
  prepared = fs.realpathSync(preparedDir),
  wal = fs.realpathSync(walDir),
  seed = readScaleSeal(
    path.join(fs.realpathSync(image), "image.json"),
    imagePin,
    false,
    transferPin,
  );
const slot = "tx2-dxscale1-publish-" + randomUUID().slice(0, 12).replace("-", ""),
  attempt = randomUUID();
const policy = launchProfile("server", {
  jvm: "j21-g1", txJvm: "j25-zgc", ...(fair ? { writeJvm: "j25-zgc" as const } : {}),
});

function control(dir: string) {
  assert.equal(fs.readFileSync(path.join(dir, "PG_VERSION"), "utf8").trim(), "17");
  for (const marker of ["postmaster.pid", "backup_label", "standby.signal", "recovery.signal"])
    assert(!fs.existsSync(path.join(dir, marker)));
  return hex(fs.readFileSync(path.join(dir, "global/pg_control")));
}

fs.mkdirSync(out);
jsonFile(path.join(out, "attempt.json"), { source, slot, attempt, tag: path.basename(out) });
const dirs = [template, prepared, wal, out];
for (const a of dirs)
  for (const b of dirs) {
    if (a === b) continue;
    assert(!a.startsWith(b + "/"), "Template, prepared data, WAL and evidence must be disjoint");
  }
assert.equal(new Set(dirs).size, dirs.length);
for (const dir of [template, prepared, wal]) assert(!/[,\r\n"]/.test(dir));
assert.notEqual(fs.statSync(wal).dev, fs.statSync(prepared).dev);
assert(fs.lstatSync(path.join(template, "pg_wal")).isDirectory());
assert.equal(fs.readlinkSync(path.join(prepared, "pg_wal")), "/wal");
const before = control(template);
assert.equal(control(prepared), before, "The PostgreSQL copy does not match the stopped template");
for (const dir of [template, prepared])
  assert.deepEqual(fs.readdirSync(path.join(dir, "pg_tblspc")), []);
const linkScan = (dir: string, ...expr: string[]) =>
  execFileSync("find", [dir, "-xdev", ...expr, "-print", "-quit"], {
    encoding: "utf8",
    timeout: 45_000,
  }).trim();
assert.equal(linkScan(prepared, "-type", "l", "!", "-path", path.join(prepared, "pg_wal")), "");
for (const dir of [prepared, wal]) {
  // [DX-ACT1] Why: the copy may share filesystem blocks but its files must have independent write identities.
  // Rejected: a hard-linked copy that mutates the stopped template when PostgreSQL opens it.
  assert.equal(linkScan(dir, "-type", "f", "-links", "+1"), "");
}
assert.equal(linkScan(wal, "-type", "l"), "");
const original = fs.statSync(template);
const copy = fs.statSync(prepared);
assert(original.dev !== copy.dev || original.ino !== copy.ino);
assert(Object.values(scaleHost.childrenInventory(slot)).every((owned) => !owned.length));
const docker = (...args: string[]) =>
  execFileSync("docker", args, { encoding: "utf8", timeout: 30_000 }).trim();
assert.equal(docker("ps", "-q"), "", "The bare-metal queue requires the previous stack to stop");
// [DX-ACT1] Why: confirm the prepared WAL bytes before a PostgreSQL boot can change them.
// Rejected: mounting a replacement WAL directory that happens to be on a separate device.
execFileSync("diff", ["-qr", path.join(template, "pg_wal"), wal], { timeout: 240_000 });
execFileSync(
  "docker",
  [
    "run",
    "--rm",
    "--network",
    "none",
    "--read-only",
    "--mount",
    "type=bind,source=" + template + ",target=/template,readonly",
    "--entrypoint",
    "pg_controldata",
    "postgres:17-alpine",
    "/template",
  ],
  { env: { ...process.env, LC_ALL: "C" }, encoding: "utf8", timeout: 30_000 },
)
  .split("\n")
  .some((line) => /^Database cluster state:\s+shut down$/.test(line)) ||
  assert.fail("The original PostgreSQL template is not cleanly stopped");
jsonFile(path.join(out, "physical-input.json"), {
  before,
  imagePin,
  transferPin,
  source,
  slot,
  attempt,
  preparedOnSeparateWal: true,
  at: Date.now(),
});

process.once("SIGTERM", () => {
  process.stderr.write("Prepared-copy campaign reached its deadline\n");
  scaleHost.clean(out, slot);
  process.exit(124);
});
try {
  const { engines } = startScaleStack(out, slot, source, false, stackOptions("per-person-ordered", attempt), {
    policy,
    prepared: { data: prepared, wal },
  });
  const pg = engines.pg!.id;
  const mounts = JSON.parse(docker("inspect", "--format", "{{json .Mounts}}", pg)) as {
    Destination: string;
    Source: string;
    RW: boolean;
  }[];
  const pgMount = (destination: string) => mounts.find((m) => m.Destination === destination);
  assert.deepEqual(
    [
      pgMount("/var/lib/postgresql/data")?.Source,
      pgMount("/var/lib/postgresql/data")?.RW,
      pgMount("/wal")?.Source,
      pgMount("/wal")?.RW,
    ],
    [prepared, true, wal, true],
  );
  assert(mounts.every((m) => m.Source !== template));
  assert.equal(
    docker(
      "exec",
      pg,
      "psql",
      "-XAtq",
      "-U",
      "postgres",
      "-d",
      "datomic",
      "-c",
      "SHOW synchronous_commit; SHOW fsync; SHOW full_page_writes",
    ),
    "on\non\non",
  );
  const java = readScaleJvms(path.join(out, "serving-jvm"), engines, policy);
  const write = `http://${engines["gw-w"]!.address}:8080`;
  const read = `http://${engines["gw-r"]!.address}:8080`;
  const health = async (url: string) =>
    (await (
      await fetch(new URL("/health", url), { signal: AbortSignal.timeout(2000) })
    ).json()) as { gatewaySourceHash: string };
  const [left, right] = await Promise.all([health(write), health(read)]);
  assert.match(left.gatewaySourceHash, /^[a-f0-9]{64}$/);
  assert.equal(left.gatewaySourceHash, right.gatewaySourceHash);
  process.env.DATOMIC_URL = write;
  process.env.DATOMIC_READ_URLS = read;
  const peer = { write, read, java, slot, attempt, gatewaySource: left.gatewaySourceHash };
  if (fair) {
    const { runFair } = await import("../../load1/fair-campaign.ts");
    await runFair(out, source, peer, seed, rolling as CreditMode, Number(width), Number(credits));
  } else await runHeld(out, source, peer, seed);
  assert.deepEqual(
    [fs.statSync(template).dev, fs.statSync(template).ino, control(template)],
    [original.dev, original.ino, before],
  );
} finally {
  scaleHost.clean(out, slot);
}
