import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { randomBytes } from "node:crypto";
import { statfsSync } from "node:fs";
import { promisify } from "node:util";

const run = promisify(execFile);

// [DX-RD1] Why: the local probe only leases and cleans up an isolated volume through the existing slot manager.
// Rejected: reusing a resident or force-removing a previous holder's data.
export async function inLocalSlot<T>(slot: string, work: (slot: string) => Promise<T>): Promise<T> {
  assert(process.platform === "darwin" && /^(s1|s2|s3)$/.test(slot));
  const disk = statfsSync(".");
  assert(disk.bavail * disk.bsize >= 5 * 1024 ** 3, "Host disk floor");
  const trial = randomBytes(10).toString("hex");
  const holder = `DX-RD1-${trial}`;
  const env = { ...process.env, TX2_EXCLUSIVE_VOLUME_ID: trial };
  const ownership = ["--lane", "datomic", "--slot", slot, "--holder", holder, "--exp", "DX-RD1"];
  const engine = (command: string, args: string[]) => run(process.execPath, ["lab/bin/engine.mjs", command, ...ownership, ...args], { env });
  let started = false;
  try {
    const { stdout, stderr } = await engine("up", ["--fresh"]);
    started = true;
    process.stderr.write(stderr);
    const endpoint = /^export DATOMIC_URL='([^']+)'$/m.exec(stdout)?.[1];
    assert(endpoint, "Slot manager omitted the Datomic endpoint");
    process.env.DATOMIC_URL = endpoint;
    process.env.DATOMIC_READ_URLS = endpoint;
    return await work(`datomic-${slot}-${trial}`);
  } finally {
    try {
      const stopped = await engine("down", ["--remove-volume"]);
      process.stderr.write(stopped.stderr);
    } catch (error) {
      if (started) throw error;
    }
  }
}
