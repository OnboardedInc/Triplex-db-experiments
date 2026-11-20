import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { pipeline } from "node:stream/promises";
import { Transform, type Readable, type Writable } from "node:stream";
import { setTimeout as sleep } from "node:timers/promises";
import type { DeepIdentity } from "../../../bench/lib/deep-profile.ts";
import { requireIdentity } from "../../../bench/lib/deep-profile.ts";
import { tenantFacts, tenantAccounts, tenantSeedPin, tenantScope } from "./tenants.ts";
type Seal = {
  identity: DeepIdentity;
  scope: string;
  seed: { facts: number; people: number; position: number; sha256: string };
  runTag: string;
  bytes: number;
  dumpSha256: string;
};
const docker = (args: string[]) =>
  execFileSync("docker", args, { encoding: "utf8", timeout: 180000 }).trim();
const ended = (child: ReturnType<typeof spawn>) =>
  new Promise<void>((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (c, s) =>
      c === 0 ? resolve() : reject(Error("PostgreSQL archive command failed " + c + "/" + s)),
    );
  });
async function archiveStream(child: ReturnType<typeof spawn>, input: Readable, output: Writable) {
  let latest = Date.now();
  const h = createHash("sha256");
  const progress = new Transform({
    transform(chunk, enc, cb) {
      latest = Date.now();
      h.update(chunk);
      cb(null, chunk);
    },
  });
  const timer = setInterval(() => {
    if (Date.now() - latest > 15 * 60000) child.kill("SIGKILL");
  }, 30000);
  try {
    await Promise.all([ended(child), pipeline(input, progress, output)]);
    return h.digest("hex");
  } finally {
    clearInterval(timer);
  }
}
export function checkImage(s: Seal, dest: DeepIdentity) {
  requireIdentity(dest);
  requireIdentity(s.identity);
  const origin = s.identity.tenant;
  const target = dest.tenant;
  const campaign = Boolean(origin?.campaign);
  assert(
    origin?.topology === "pooled" &&
      ((origin.study === "million" && s.identity.arm === "zero") ||
        (origin.study === "interference" && s.identity.arm === (campaign ? "zero" : "seed"))),
  );
  // [DX-THIN1] Why: all tapes start from the same sealed population and original assertion identities.
  // Rejected: accepting an unrelated namespaced field-study seed because its aggregate fact count matches.
  if (campaign) {
    assert(origin.campaign === "frozen" && target?.campaign && s.identity.arm === "zero");
    assert.deepEqual([origin.study, origin.topology, origin.physical], [target.study, target.topology, target.physical]);
  } else assert.deepEqual(target, origin);
  assert(
    dest.source === s.identity.source &&
    s.scope === tenantScope(origin, s.identity.nonce),
  );
  assert.equal(s.runTag, "deep-" + s.identity.nonce + "-s0");
  assert.equal(s.seed.people, dest.people);
  assert(
    s.seed.facts === tenantFacts(tenantAccounts(dest.tenant!)) &&
      s.seed.sha256 === tenantSeedPin(dest.tenant!) &&
      Number.isSafeInteger(s.seed.position) &&
      s.seed.position > 0,
  );
  assert(s.bytes > 0 && /^[0-9a-f]{64}$/.test(s.dumpSha256));
}
// [DX-SCALE1] Why: a fresh, repeatable PostgreSQL snapshot at the zero arm's seed barrier supplies all three million-person arms. Rejected: seeding the large scope three times or restoring a database that already includes timed writes.
export async function sealSeed(
  dir: string,
  prefix: string,
  source: { identity: DeepIdentity; scope: string; seed: Seal["seed"] },
  pgId: string,
) {
  assert(
    prefix === source.identity.slot && (source.identity.tenant?.campaign ||
      path.basename(dir) === prefix.slice("tx2-dxscale1-".length)),
  );
  assert.equal(docker(["inspect", "--format", "{{.Name}}", pgId]), "/" + prefix + "-pg");
  const temp = path.join(dir, "seed.pgdump.partial"),
    file = path.join(dir, "seed.pgdump");
  assert(!fs.existsSync(file));
  const g = spawn(
    "docker",
    ["exec", pgId, "pg_dump", "-U", "postgres", "-Fc", "-Z1", "-d", "datomic"],
    { stdio: ["ignore", "pipe", "inherit"] },
  );
  const dumpSha256 = await archiveStream(
    g,
    g.stdout,
    fs.createWriteStream(temp, { flags: "wx", flush: true }),
  );
  const bytes = fs.statSync(temp).size;
  const proof = { ...source, bytes, dumpSha256, runTag: "deep-" + source.identity.nonce + "-s0" };
  checkImage(proof, source.identity);
  const initial = execFileSync("head", ["-c", "5", temp], { encoding: "utf8" });
  assert.equal(initial, "PGDMP");
  fs.renameSync(temp, file);
  fs.writeFileSync(path.join(dir, "seed-image.json"), JSON.stringify(proof), { flag: "wx" });
  return proof;
}
export async function restoreSeed(
  dir: string,
  target: string,
  id: DeepIdentity,
  engines: Record<string, { id: string; address: string }>,
  campaignSeed?: string,
) {
  assert(
    campaignSeed ? Boolean(id.tenant?.campaign) && /^tx2-dxscale1-int1-/.test(id.slot) :
      id.slot === "tx2-dxscale1-" + path.basename(dir) && ["reader", "activation"].includes(id.arm),
  );
  const parent = path.dirname(dir),
    source = campaignSeed ?? path.join(parent, target);
  if (campaignSeed) {
    assert(fs.realpathSync(source) === source && path.dirname(source) === path.join(parent, "seeds"));
    assert(path.basename(source) === String(id.people / 10));
  } else assert(path.dirname(source) === parent && source !== dir);
  const proof: Seal = JSON.parse(fs.readFileSync(path.join(source, "seed-image.json"), "utf8"));
  checkImage(proof, id);
  assert(proof.identity.nonce !== id.nonce &&
    (campaignSeed ? proof.identity.slot !== id.slot : proof.identity.slot === "tx2-dxscale1-" + target));
  const file = path.join(source, "seed.pgdump");
  assert(fs.statSync(file).size === proof.bytes);
  for (const role of ["pg", "tx", "gw-w", "gw-r"])
    assert.equal(
      docker(["inspect", "--format", "{{.Name}}", engines[role]!.id]),
      "/" + id.slot + "-" + role,
    );
  for (const role of ["gw-r", "gw-w", "tx"]) docker(["stop", "--time", "20", engines[role]!.id]);
  const g = spawn(
    "docker",
    [
      "exec",
      "-i",
      engines.pg!.id,
      "pg_restore",
      "--exit-on-error",
      "--single-transaction",
      "--if-exists",
      "--clean",
      "-U",
      "postgres",
      "-d",
      "datomic",
    ],
    { stdio: ["pipe", "ignore", "inherit"] },
  );
  assert.equal(await archiveStream(g, fs.createReadStream(file), g.stdin), proof.dumpSha256);
  for (const role of ["tx", "gw-w", "gw-r"]) {
    docker(["start", engines[role]!.id]);
    engines[role]!.address = docker([
      "inspect",
      "--format",
      "{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}",
      engines[role]!.id,
    ]);
  }
  for (const role of ["gw-w", "gw-r"]) {
    const until = Date.now() + 180000,
      url = "http://" + engines[role]!.address + ":8080/health";
    while (true) {
      try {
        if ((await fetch(url, { signal: AbortSignal.timeout(2000) })).ok) break;
      } catch {}
      assert(Date.now() < until, "Restored gateway failed to open");
      await sleep(500);
    }
  }
  fs.writeFileSync(
    path.join(dir, "restored-seed.json"),
    JSON.stringify({ identity: id, origin: proof }),
    { flag: "wx" },
  );
  return proof;
}
