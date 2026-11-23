import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { hash, root } from "../ha1/common.ts";
import { replicationRole } from "../ha1/one-backup.ts";
import type { Stack } from "../ha1/stack.ts";
import { coldCopy, coldMount, seedFiles } from "./sunday-seed.ts";
import { lsn, wait } from "./supervisor.ts";

export async function checkStoppedPair(s: Stack) {
  assert(process.platform === "darwin" && s.a === s.b);
  fs.mkdirSync(path.join(root, "runs"), { recursive: true });
  const directory = fs.mkdtempSync(path.join(root, "runs", "dx-hasync1-cold-"));
  const data = path.join(directory, "PGDATA");
  const sql = (role: "pg" | "target", q: string) => s.sql(role, q);
  const values = "select string_agg(value, '|' order by id) from copy_witness";
  const sample = [s.e.nonce + "-before", s.e.nonce + "-after", s.e.nonce + "-protected"];
  const ready = (role: "pg" | "target", standby: boolean) =>
    wait("toy SQL storage", 30000, async () =>
      (await sql(role, "select pg_is_in_recovery()").catch(() => "")) === (standby ? "t" : "f")
        ? true
        : undefined,
    );
  try {
    await s.postgres("pg", s.a);
    await replicationRole(s);
    await sql("pg", "create table copy_witness(id bigint primary key, value text not null)");
    const cluster = await sql("pg", "select system_identifier from pg_control_system()");
    const initial = (await s.view("pg")).Id;
    await s.a.docker(["stop", "--time", "8", initial]);
    assert.equal((await s.view("pg")).State.ExitCode, 0);
    fs.mkdirSync(data);
    await s.a.docker(["cp", initial + ":/var/lib/postgresql/data/.", data]);
    const files = fs.readdirSync(data, { recursive: true, withFileTypes: true });
    assert(files.every((entry) => entry.isFile() || entry.isDirectory()));
    const manifest = files
      .filter((entry) => entry.isFile())
      .map((entry) => path.relative(data, path.join(entry.parentPath, entry.name)))
      .sort()
      .map((name) => hash(fs.readFileSync(path.join(data, name))) + "  ./" + name + "\n")
      .join("");
    const sha256 = hash(manifest);
    assert(seedFiles(manifest, sha256) > 3);
    fs.writeFileSync(path.join(directory, "SHA256SUMS"), manifest, { flag: "wx" });
    await s.remove("pg");
    // [DX-HASYNC1] Why: exercise the server's actual stopped-image boot and timeline follow with two owned storage containers.
    // Rejected: treating a successful initial base backup as evidence for rebuilding from the original cold epoch.
    const cloned: string[] = [];
    const boot = async (role: "pg" | "target", upstream?: "pg" | "target") => {
      const app = role === "target" ? "sync_b" : "sync_a";
      const conn = upstream
        ? "host=" +
          s.name(upstream) +
          " port=5432 user=ha1stream password=" +
          s.secret +
          " application_name=" +
          app
        : "";
      await s.start(role, s.a, coldMount({ directory, sha256, cluster }, "", conn), "/bin/sh", [
        "-ceu",
        coldCopy + 'exec docker-entrypoint.sh postgres "$@"',
        "cold-toy",
        "-c",
        "wal_keep_size=32MB",
      ]);
      await ready(role, Boolean(upstream));
      const view = await s.view(role);
      assert(
        view.Mounts.some(
          (m: { Source: string; Destination: string; RW: boolean }) =>
            m.Source === directory && m.Destination === "/cold" && !m.RW,
        ),
      );
      const logs = await s.a.docker(["logs", "--tail", "35", view.Id]);
      assert(logs.split("\n").includes("verified-cold-copy " + sha256));
      assert.equal(await sql(role, "select system_identifier from pg_control_system()"), cluster);
      cloned.push(view.Id);
    };
    const protect = async (role: "pg" | "target", app: string) => {
      await sql(role, "alter system set synchronous_standby_names='FIRST 1 (" + app + ")'");
      assert.equal(await sql(role, "select pg_reload_conf()"), "t");
      await wait("toy synchronous replica", 25000, async () =>
        (await sql(
          role,
          "select sync_state from pg_stat_replication where application_name='" +
            app +
            "' and state='streaming'",
        )) === "sync"
          ? true
          : undefined,
      );
    };
    await boot("pg");
    await boot("target", "pg");
    await protect("pg", "sync_b");
    const settings = "select current_setting('synchronous_commit'), current_setting('fsync')";
    assert.equal(await sql("pg", settings), "on|on");
    await sql("pg", "insert into copy_witness values (1,'" + sample[0] + "')");
    const before = await s.kill("pg");
    assert.equal(await sql("target", "select pg_promote(wait=>true)"), "t");
    assert.equal(await sql("target", values), sample[0]);
    assert.equal(await sql("target", settings), "on|on");
    const newTimeline = await sql(
      "target",
      "select left(pg_walfile_name(pg_current_wal_insert_lsn()),8)",
    );
    assert.notEqual(newTimeline, "00000001");
    await sql("target", "insert into copy_witness values (2,'" + sample[1] + "')");
    await s.remove("pg");
    await boot("pg", "target");
    await protect("target", "sync_a");
    await sql("target", "insert into copy_witness values (3,'" + sample[2] + "')");
    const cut = await sql("target", "select pg_current_wal_flush_lsn()");
    const replay = await wait("toy replay on rebuilt standby", 15000, async () => {
      const at = await sql("pg", "select pg_last_wal_replay_lsn()");
      return at && lsn(at) >= lsn(cut) ? at : undefined;
    });
    const observed = await sql("pg", values);
    assert.equal(observed, sample.join("|"));
    assert.equal(new Set([initial, ...cloned]).size, 4);
    return {
      timing: "diagnostic",
      cluster,
      sha256,
      before,
      cloned,
      newTimeline,
      cut,
      replay,
      expected: sample,
      observed,
    };
  } finally {
    fs.rmSync(directory, { recursive: true });
  }
}
