// [DX-HASYNC2] Mac correctness gate for the pair repair, with two PostgreSQL 17 containers in the lab VM.
// It runs SyncPair's own Sunday set-up through open() against a small never-vacuumed seed and stops it where the first
// transactor would start, then checks: synchronous mode with zero lag before any writer; no acknowledged insert lost when the
// primary is killed and the standby promoted; the policy B rebuild from the cold seed with its transfer record; and the new
// catch-up message for a standby that cannot catch up. Times are diagnostic. Usage (one ordinary heavy token):
//   DOCKER_HOST=unix://$HOME/.colima/triplex2/docker.sock node lab/bin/heavy.mjs --label hasync2-gate -- \
//     node --import tsx lab/experiments/EXP-DX1/hasync1/repair-gate.ts OUTPUT_JSON
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { root } from "../ha1/common.ts";
import type { Site, Stack } from "../ha1/stack.ts";
import { pgImage } from "../v01/source.ts";
import { catchUp } from "./catch-up.ts";
import { SyncPair } from "./pair.ts";
import { seedFiles } from "./sunday-seed.ts";
import { wait } from "./supervisor.ts";

assert(process.platform === "darwin" && process.env["DOCKER_HOST"]?.includes("triplex2"), "Run on the Mac lab VM");
const [output] = process.argv.slice(2);
assert(output && path.isAbsolute(output) && !fs.existsSync(output), "Usage: repair-gate.ts NEW_OUTPUT_JSON");
const run = (args: string[], timeout = 120000, combined = false) =>
  new Promise<string>((resolve, reject) =>
    execFile("docker", args, { timeout, maxBuffer: 64 * 1024 ** 2 }, (error, stdout, stderr) =>
      error ? reject(Object.assign(error, { stdout, stderr })) : resolve((stdout + (combined ? stderr : "")).trim()),
    ),
  );
const nonce = randomUUID();
const prefix = "tx2-hasync2-" + nonce.slice(0, 8);
const label = "ha1.attempt=" + nonce;
const events: unknown[] = [];
const log = (type: string, data: unknown) => events.push({ ms: performance.now(), type, data });
const site: Site = {
  key: "mac",
  repo: root,
  datomicId: "unused",
  postgresImage: pgImage,
  docker: (args, opts) => run(args, opts?.timeout ?? 120000, args[0] === "logs"),
};
type Member = { site: Site; id: string; image: string; role: string; volumes: string[] };
const members = new Map<string, Member>();
const name = (role: string) => prefix + "-" + role;
const network = prefix;
// Only what SyncPair's Sunday set-up, promotion and replacement use from Stack.
const stack = {
  e: { prefix, nonce, log, write: log, source: {} },
  a: site,
  b: site,
  holder: "DX-HASYNC2",
  secret: randomBytes(18).toString("hex"),
  admin: randomBytes(18).toString("hex"),
  members,
  sharedVolumes: new Set<string>(),
  name,
  storageHost: (role: string) => name(role),
  async view(role: string) {
    return JSON.parse(await run(["inspect", "--type", "container", members.get(role)!.id]))[0];
  },
  async remove(role: string) {
    await run(["rm", "-fv", members.get(role)!.id]);
    members.delete(role);
  },
  async start(role: string, s: Site, args: string[], entry: string, argv: string[]) {
    assert(!members.has(role));
    if (role === "active") throw new Error("gate-stop-before-transactor");
    const id = await run([
      "create",
      "--pull",
      "never",
      "--name",
      name(role),
      "--label",
      label,
      "--network",
      network,
      "--cpus",
      "1",
      "--memory",
      "3g",
      ...args.filter((a, i) => !(a === "-p" || args[i - 1] === "-p")),
      "--entrypoint",
      entry,
      pgImage,
      ...argv,
    ]);
    await run(["start", id]);
    const volumes = args
      .filter((a) => a.startsWith("type=volume,"))
      .map((a) => /source=([^,]+)/.exec(a)![1]!);
    members.set(role, { site: s, id, image: pgImage, role, volumes });
    log("role", { role, id });
  },
};
const s = stack as unknown as Stack;

fs.mkdirSync(path.join(root, "runs"), { recursive: true });
const seedDir = fs.mkdtempSync(path.join(root, "runs", "dx-hasync2-seed-"));
const result: Record<string, unknown> = { timing: "diagnostic", nonce, image: pgImage };
const psql = (id: string, q: string, db = "postgres") =>
  run(["exec", id, "psql", "-XAtq", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", db, "-c", q]);
try {
  await run(["network", "create", "--label", label, network]);
  // 1. A cleanly stopped, never-vacuumed seed with a Datomic-shaped table, written to a host directory like the servers' seed.
  const loader = await run([
    "run", "-d", "--name", name("seed"), "--label", label, "--network", network, "-e", "POSTGRES_PASSWORD=" + stack.admin,
    pgImage, "-c", "autovacuum=off",
  ]);
  await wait("seed loader", 90000, async () =>
    (await run(["logs", loader], 10000, true)).includes("PostgreSQL init process complete") &&
    (await psql(loader, "select 1").catch(() => "")) === "1"
      ? true
      : undefined,
  );
  await psql(loader, "create role datomic login password 'unused'");
  await psql(loader, "create database datomic owner datomic");
  await psql(
    loader,
    "create table datomic_kvs(id text primary key, rev integer, map text, val bytea); create table copy_witness(id bigint primary key, value text not null);" +
      "insert into datomic_kvs select md5(g::text), null, null, decode(repeat(md5(g::text),8),'hex') from generate_series(1,600000) g",
    "datomic",
  );
  await run(["stop", "--time", "30", loader]);
  const data = path.join(seedDir, "PGDATA");
  fs.mkdirSync(data);
  await run(["cp", loader + ":/var/lib/postgresql/data/.", data], 600000);
  await run(["rm", "-fv", loader]);
  const manifest = await run(
    [
      "run", "--rm", "--network", "none", "--mount", "type=bind,source=" + seedDir + ",target=/cold,readonly",
      "--entrypoint", "sh", pgImage, "-ceu", 'cd /cold/PGDATA; find . -type f | LC_ALL=C sort | while IFS= read -r f; do sha256sum "$f"; done',
    ],
    600000,
  );
  const raw = manifest + "\n";
  const { createHash } = await import("node:crypto");
  const sha256 = createHash("sha256").update(raw).digest("hex");
  const files = seedFiles(raw, sha256);
  fs.writeFileSync(path.join(seedDir, "SHA256SUMS"), raw, { flag: "wx" });
  const cluster = (
    await run([
      "run", "--rm", "--network", "none", "--mount", "type=bind,source=" + seedDir + ",target=/cold,readonly",
      "--entrypoint", "sh", pgImage, "-ceu", "LC_ALL=C pg_controldata /cold/PGDATA | awk -F ': *' '$1==\"Database system identifier\" {print $2}'",
    ])
  ).trim();
  const cold = { directory: seedDir, sha256, cluster };
  result["seed"] = { files, sha256, cluster };

  // 2. SyncPair's own Sunday open(): both cold copies at once, standby attached and synchronous before any transactor.
  const pair = new SyncPair(s, undefined, undefined, { primary: cold, standby: cold, scope: "gate" });
  const opened = await pair.open().then(
    () => assert.fail("open() must stop at the transactor in this gate"),
    (error: Error) => error,
  );
  assert.equal(opened.message, "gate-stop-before-transactor", opened.message);
  const pg = members.get("pg")!.id;
  const target = members.get("target")!.id;
  const stages = pair.transitions.map((t) => t.stage);
  assert.deepEqual(
    stages.filter((x) => ["cold-copy", "standby-caught-up", "standby-synchronous"].includes(x)),
    ["cold-copy", "cold-copy", "standby-caught-up", "standby-synchronous"],
  );
  const sync = await psql(pg, "select sync_state, state from pg_stat_replication where application_name='sync_b'");
  assert.equal(sync, "sync|streaming");
  const zero = await pair.zeroLag("pg", "target", "sync_b");
  const setupWal = pair.walSamples;
  result["order"] = {
    stages,
    initialStandby: pair.initialStandby,
    zeroLagBeforeFirstWrite: zero,
    walSamples: setupWal,
    events: events.filter((x) => ["cold-copy", "standby-caught-up", "standby-synchronous", "wal-source"].includes((x as { type: string }).type)),
  };

  // 3. Acknowledged inserts under synchronous commit, primary killed mid-stream, standby promoted: none may be missing.
  const acked: number[] = [];
  let stop = false;
  const writer = (async () => {
    for (let i = 1; !stop; i++) {
      const ok = await psql(pg, "insert into copy_witness values (" + i + ", 'w" + i + "') returning id", "datomic").catch(() => "");
      if (ok === String(i)) acked.push(i);
      else break;
    }
  })();
  await wait("acknowledged writes before the kill", 60000, async () => (acked.length >= 40 ? true : undefined));
  await run(["kill", "--signal", "KILL", pg]);
  stop = true;
  await writer;
  const prefixReplay = await pair.candidate();
  const timeline = await pair.promote();
  const present = (await psql(target, "select coalesce(string_agg(id::text, ',' order by id),'') from copy_witness", "datomic"))
    .split(",")
    .filter(Boolean)
    .map(Number);
  const missing = acked.filter((id) => !present.includes(id));
  assert.equal(missing.length, 0, "Acknowledged inserts missing after promotion: " + missing.join(","));
  result["killAndPromote"] = { acknowledged: acked.length, present: present.length, missing, prefixReplay, timeline };

  // 4. Policy B rebuild: a new standby from the cold seed catches up the promoted timeline and is synchronous again.
  const rebuild = await pair.startReplacement();
  const after = await psql(target, "select sync_state from pg_stat_replication where application_name='sync_a'");
  assert.equal(after, "sync");
  await psql(target, "insert into copy_witness values (100000, 'protected-after-rebuild')", "datomic");
  const cut = await psql(target, "select pg_current_wal_flush_lsn()");
  const replica = members.get("pg")!.id;
  await wait("rebuilt standby replays the protected insert", 15000, async () =>
    (await psql(replica, "select count(*) from copy_witness where id=100000", "datomic")) === "1" ? true : undefined,
  );
  result["rebuild"] = { ...rebuild, cut, steps: pair.transitions.map((t) => t.stage) };
  assert(rebuild.phases && rebuild.transfer, "Rebuild must record its copy phases and transfer");

  // 5. A standby that cannot catch up fails with the lag and both rates in the message.
  await psql(replica, "select pg_wal_replay_pause()");
  await psql(target, "alter system set synchronous_standby_names=''");
  await psql(target, "select pg_reload_conf()");
  const load = psql(
    target,
    "insert into datomic_kvs select 'lag-'||g, null, null, decode(repeat(md5(g::text),8),'hex') from generate_series(1,300000) g",
    "datomic",
  );
  await new Promise((r) => setTimeout(r, 1500));
  const failure = await catchUp(
    "gate lagging standby",
    () => psql(target, "select pg_current_wal_flush_lsn()"),
    () => psql(replica, "select pg_last_wal_replay_lsn()"),
    { graceMs: 5000, capMs: 30000 },
  ).then(
    () => assert.fail("A paused standby must not be reported as caught up"),
    (error: Error) => error.message,
  );
  await load;
  assert.match(failure, /^gate lagging standby: .* The standby is [\d.]+ MB behind after \d+ s \(it started [\d.]+ MB behind\); it applied [\d.]+ MB\/s while the primary wrote [\d.]+ MB\/s$/);
  result["laggingStandby"] = { message: failure };
  result["passed"] = true;
} catch (error) {
  result["passed"] = false;
  result["error"] = error instanceof Error ? error.message : String(error);
  process.exitCode = 1;
} finally {
  result["events"] = events.length;
  fs.writeFileSync(output, JSON.stringify(result, null, 2) + "\n", { flag: "wx" });
  for (const m of members.values()) await run(["rm", "-fv", m.id]).catch(() => {});
  await run(["rm", "-fv", name("seed")]).catch(() => {});
  for (const v of stack.sharedVolumes) await run(["volume", "rm", v]).catch(() => {});
  await run(["network", "rm", network]).catch(() => {});
  fs.rmSync(seedDir, { recursive: true, force: true });
  console.log(JSON.stringify({ passed: result["passed"], error: result["error"] ?? null }));
}
