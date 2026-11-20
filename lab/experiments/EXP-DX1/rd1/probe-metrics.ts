import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);
const WAL_SQL = `select json_build_object('version',current_setting('server_version_num'),
  'syncMethod',current_setting('wal_sync_method'),'walTiming',current_setting('track_wal_io_timing'),
  'wal',(select row_to_json(w) from pg_stat_wal w), 'io',(select json_agg(i) from pg_stat_io i))`;

function kernelThreads(pid: string) {
  assert(/^[1-9][0-9]*$/.test(pid));
  const tasks = `/proc/${pid}/task`;
  return Object.fromEntries(fs.readdirSync(tasks).flatMap(tid => {
    try {
      const dir = `${tasks}/${tid}`, stat = fs.readFileSync(`${dir}/stat`, "utf8");
      const tail = stat.slice(stat.lastIndexOf(")") + 2).split(" ");
      const [runNs, waitNs, slices] = fs.readFileSync(`${dir}/schedstat`, "utf8").trim().split(/\s+/).map(Number);
      assert([runNs, waitNs, slices].every(Number.isSafeInteger));
      return [[tid, { name: fs.readFileSync(`${dir}/comm`, "utf8").trim(), start: tail[19], runNs: runNs!, waitNs: waitNs!, slices: slices! }] as const];
    } catch (error: any) {
      if (error.code === "ENOENT") return [];
      throw error;
    }
  }));
}

export async function physicalSnapshot() {
  if (process.platform !== "linux") return null;
  const tx = process.env.DX_RD1_TX_PID, writer = process.env.DX_RD1_WRITE_PEER_PID;
  assert(tx && writer && tx !== writer && process.env.PGSERVICE, "Set owned Linux role PIDs and PGSERVICE");
  const schedstats = fs.readFileSync("/proc/sys/kernel/sched_schedstats", "utf8").trim();
  const { stdout } = await run("psql", ["-XAt", "-v", "ON_ERROR_STOP=1", "-c", WAL_SQL], { timeout: 5_000 });
  const pg = JSON.parse(stdout);
  assert(Number(pg.version) >= 170000 && pg.walTiming === "on", "Enable PostgreSQL 17 WAL I/O timing in the owned stack");
  return { boot: fs.readFileSync("/proc/sys/kernel/random/boot_id", "utf8").trim(), schedstats,
    tx: kernelThreads(tx), writer: kernelThreads(writer), pressure: fs.readFileSync("/proc/pressure/cpu", "utf8"), pg };
}

export function physicalDelta(before: NonNullable<Awaited<ReturnType<typeof physicalSnapshot>>>, after: NonNullable<Awaited<ReturnType<typeof physicalSnapshot>>>) {
  assert.equal(before.boot, after.boot);
  assert.equal(before.schedstats, after.schedstats);
  assert(before.pg.wal.stats_reset === after.pg.wal.stats_reset && before.pg.syncMethod === after.pg.syncMethod);
  const roles = (a: typeof before.tx, b: typeof before.tx) => Object.entries(a).flatMap(([tid, x]) => {
    const y = b[tid];
    if (!y || y.start !== x.start) return [];
    assert(y.runNs >= x.runNs && y.waitNs >= x.waitNs && y.slices >= x.slices);
    return [{ tid, thread: y.name, cpuMs: (y.runNs-x.runNs)/1e6, runnableWaitMs: (y.waitNs-x.waitNs)/1e6, slices: y.slices-x.slices }];
  });
  const delta = (key: string) => {
    const n = Number(after.pg.wal[key]) - Number(before.pg.wal[key]);
    assert(Number.isFinite(n) && n >= 0);
    return n;
  };
  return { walWriteMs: delta("wal_write_time"), walWrites: delta("wal_write"), walSyncMs: delta("wal_sync_time"),
    tx: roles(before.tx, after.tx), writer: roles(before.writer, after.writer), runnableStatsEnabled: before.schedstats === "1" };
}

export function blockPerf(directory: string, seconds: number) {
  const file = path.join(directory, "perf.csv"), fd = fs.openSync(file, "wx");
  const mask = process.env.DX_RD1_PERF_CORES ?? "0,1,2,4,8";
  assert(/^\d+(,\d+)*$/.test(mask));
  const child = spawn("perf", ["stat", "-a", "-C", mask, "-I", "1000", "-x", ",", "-e",
    "cycles,instructions,cache-misses,context-switches,task-clock", "--", "sleep", String(seconds)], { stdio: ["ignore", "ignore", fd] });
  fs.closeSync(fd);
  return new Promise<{ file: string; exit: number | null; countersDelivered: boolean }>(resolve => {
    child.once("error", () => resolve({ file: "perf.csv", exit: null, countersDelivered: false }));
    child.once("close", code => {
      const bytes = fs.readFileSync(file, "utf8");
      resolve({ file: "perf.csv", exit: code, countersDelivered: code === 0 && !bytes.includes("<not") &&
        ["cycles", "instructions", "cache-misses"].every(event => bytes.split("\n").some(line => line.includes(event) && /\d/.test(line))) });
    });
  });
}
