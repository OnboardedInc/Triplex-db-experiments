import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { Evidence } from "../ha1/common.ts";
import { drill } from "../ha1/run.ts";
import type { Site } from "../ha1/stack.ts";
import type { Checkpoint } from "./seed.ts";
import { benchTrials, seeds, subjects, workingMs } from "./v2/bench-plan.ts";

export async function campaign(
  store: string,
  assignSites: (nonce: string, sourceOnB: boolean) => { a: Site; b: Site },
  identity: { tag: string; sha: string; campaign: string },
) {
  const now = performance.now();
  const end = now + workingMs;
  const credentials = {
    secret: randomBytes(18).toString("hex"),
    admin: randomBytes(18).toString("hex"),
  };
  const seedDir = path.join(store, "seed");
  fs.mkdirSync(seedDir, { mode: 0o700 });
  for (const key of Object.keys(seeds)) fs.mkdirSync(path.join(seedDir, key), { mode: 0o700 });
  const write = (f: string, data: unknown) =>
    fs.writeFileSync(path.join(store, f + ".json"), JSON.stringify(data, null, 2) + "\n", {
      flag: "wx",
    });
  write("campaign", {
    ...identity,
    mode: "hasync-suite",
    shape: "deep",
    trials: benchTrials,
    sizes: benchTrials.map((trial) => trial.people),
  });
  const status: { sequence: number; nonce: string; elapsedMs: number; complete: boolean }[] = [];
  const run = async (sequence: number, checkpoint?: Checkpoint) => {
    assert(performance.now() < end, "Campaign reached its 85-minute working deadline");
    const { mode, people, systems, checkpoint: key } = benchTrials[sequence]!;
    const e = new Evidence(store, mode, identity.tag);
    process.stdout.write(
      "@attempt " + JSON.stringify({ nonce: e.nonce, prefix: e.prefix, mode, sequence }) + "\n",
    );
    const sites = assignSites(e.nonce, key ? seeds[key].sourceOnB : false);
    const start = performance.now();
    let result: unknown;
    let complete = false;
    try {
      result = await drill(
        e,
        sites.a,
        sites.b,
        { people, scopes: systems, capacity: "two-host" },
        () => {},
        key
          ? {
              path: path.join(seedDir, key),
              deadline: end - 26 * 60000,
              credentials,
              ...(checkpoint ? { checkpoint } : {}),
            }
          : undefined,
      );
      complete = true;
      return result;
    } catch (error) {
      // [DX-HASYNC1] Why: retain the first failed cell and finish independent cells following proven cleanup. Rejected: discarding a failed scorecard or continuing after unverified ownership.
      assert(fs.existsSync(path.join(e.dir, "cleanup.json")), "Failed cell still owns resources");
      e.log("campaign-cell-error", {
        sequence,
        name: error instanceof Error ? error.name : String(typeof error),
      });
      return undefined;
    } finally {
      status.push({ sequence, nonce: e.nonce, elapsedMs: performance.now() - start, complete });
    }
  };
  try {
    const checkpoints = new Map<keyof typeof seeds, Checkpoint>();
    const seedOn = async (sourceOnB: boolean) => {
      for (const [i, trial] of benchTrials.entries()) {
        const key = trial.checkpoint;
        if (!key || trial.mode !== seeds[key].mode || seeds[key].sourceOnB !== sourceOnB) continue;
        const value = await run(i);
        if (!value) continue;
        const cp = value as Checkpoint;
        assert.equal(cp.people, trial.people);
        assert.equal(cp.layout, key === "cost" ? "lean" : "legacy");
        assert.equal(Boolean(cp.history), key !== "cost");
        assert.match(cp.manifest, /^[a-f0-9]{64}$/);
        checkpoints.set(key, cp);
      }
    };
    // [DX-HASYNC1] Why: smaller checkpoints fit under the full seed without running timed faults alongside a loader. Rejected: sharing one backup directory across edited rungs.
    for (const preparation of await Promise.allSettled([seedOn(false), seedOn(true)]))
      if (preparation.status === "rejected") throw preparation.reason;
    for (let i = 0; i < benchTrials.length; i++) {
      const trial = benchTrials[i]!;
      const key = trial.checkpoint;
      if (key && trial.mode === seeds[key].mode) continue;
      const checkpoint = key && checkpoints.get(key);
      if (!key || checkpoint) await run(i, checkpoint);
    }
    assert(
      status.length === benchTrials.length && status.every((s) => s.complete),
      "Campaign has failed or skipped cells",
    );
    assert(performance.now() <= end, "Campaign exceeded its working deadline");
  } finally {
    write("suite", {
      ...identity,
      measured: performance.now() - now,
      subjects,
      expected: benchTrials.length,
      status: status.sort((a, b) => a.sequence - b.sequence),
    });
  }
}
