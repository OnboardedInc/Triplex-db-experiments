import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readFileSync, statfsSync } from "node:fs";
import { promisify } from "node:util";

const run = promisify(execFile);

// [DX-RD1] Why: the local probe only leases and cleans up an isolated volume through the existing slot manager.
// Rejected: reusing a resident or force-removing a previous holder's data.
export async function inLocalSlot<T>(
  slot: string,
  work: (slot: string, logs: () => Promise<string>) => Promise<T>,
  trial = randomBytes(10).toString("hex"),
): Promise<T> {
  assert(process.platform === "darwin" && /^(s1|s2|s3)$/.test(slot));
  const disk = statfsSync(".");
  assert(disk.bavail * disk.bsize >= 5 * 1024 ** 3, "Host disk floor");
  const holder = `DX-RD1-${trial}`;
  const env = { ...process.env, TX2_EXCLUSIVE_VOLUME_ID: trial };
  const ownership = ["--lane", "datomic", "--slot", slot, "--holder", holder, "--exp", "DX-RD1"];
  const engine = (command: string, args: string[]) =>
    run(process.execPath, ["lab/bin/engine.mjs", command, ...ownership, ...args], {
      env,
      maxBuffer: 96 * 1024 ** 2,
    });
  let started = false;
  try {
    const { stdout, stderr } = await engine("up", ["--fresh"]);
    started = true;
    process.stderr.write(stderr);
    const endpoint = /^export DATOMIC_(?:GATEWAY_)?URL='([^']+)'$/m.exec(stdout)?.[1];
    const ownerFile = /^export TRIPLEX_LAB_SLOT_OWNER='([^']+)'$/m.exec(stdout)?.[1];
    assert(endpoint && ownerFile, "Slot manager omitted the Datomic endpoint or owner");
    const checkOwner = () => {
      const owner = JSON.parse(readFileSync(ownerFile, "utf8"));
      assert(
        owner.holder === holder &&
          owner.mode === "exclusive" &&
          owner.slot === slot &&
          owner.container === `tx2-datomic-${slot}` &&
          owner.volume === `tx2-datomic-${slot}-data-${trial}` &&
          owner.endpoint === endpoint,
        "Datomic observation is no longer bound to the acquired private volume",
      );
    };
    checkOwner();
    process.env.DATOMIC_URL = endpoint;
    process.env.DATOMIC_READ_URLS = endpoint;
    process.env.TRIPLEX_DATOMIC_LAYOUT ??= "lean";
    // [DX-RD1] Why: collect native traces from this fresh owned volume before its reservation is released.
    // Rejected: scraping residents or estimating semaphore wait from round-trip time.
    return await work(`datomic-${slot}-${trial}`, async () => {
      checkOwner();
      const log = await engine("logs", ["--tail", "160000"]);
      checkOwner();
      return log.stdout + log.stderr;
    });
  } finally {
    try {
      const stopped = await engine("down", ["--remove-volume"]);
      process.stderr.write(stopped.stderr);
    } catch (error) {
      if (started) throw error;
    }
  }
}
