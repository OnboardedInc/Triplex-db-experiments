import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { Evidence } from "../ha1/common.ts";
import { drill } from "../ha1/run.ts";
import type { Site } from "../ha1/stack.ts";
import type { Checkpoint } from "./seed.ts";
import { benchTrials, cellBudgetMs, seeds, subjects, workingMs } from "./v2/bench-plan.ts";

export async function campaign(
  store: string,
  assignSites: (nonce: string, sourceOnB: boolean) => { a: Site; b: Site },
  identity: { tag: string; sha: string; campaign: string },
  budget: number,
) {
  assert(Number.isSafeInteger(budget) && budget > 0 && budget <= workingMs);
  const now = performance.now();
  const end = now + budget;
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
    mode: "hasync-scale",
    shape: "deep",
    layout: "two-host",
    budget,
    trials: benchTrials,
    sizes: benchTrials.map((trial) => trial.people),
  });
  const status: { sequence: number; nonce: string; elapsedMs: number; complete: boolean }[] = [];
  const run = async (sequence: number, checkpoint?: Checkpoint) => {
    assert(performance.now() < end, "Optional campaign reached its working deadline");
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
              deadline: end - 4 * 60000,
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
  let stopped: "budget" | "failed" | null = null;
  try {
    const checkpoints = new Map<keyof typeof seeds, Checkpoint>();
    for (let i = 0; i < benchTrials.length; i++) {
      const trial = benchTrials[i]!;
      // [DX-HASYNC1] Why: finish a verified prefix within the remaining window. Rejected: starting a seed or fault that has insufficient time for capture and cleanup.
      if (performance.now() + cellBudgetMs(trial) >= end) {
        stopped = "budget";
        break;
      }
      const key = trial.checkpoint;
      const checkpoint = key && checkpoints.get(key);
      const seed = key && trial.mode === seeds[key].mode;
      assert(!key || seed || checkpoint);
      const value = await run(i, checkpoint);
      if (!value) {
        stopped = "failed";
        break;
      }
      if (seed) {
        const cp = value as Checkpoint;
        assert.equal(cp.people, trial.people);
        assert.equal(cp.layout, "legacy");
        assert(cp.history);
        assert.match(cp.manifest, /^[a-f0-9]{64}$/);
        checkpoints.set(key, cp);
      }
    }
    assert.notEqual(stopped, "failed", "Optional campaign retained its first failed cell");
    assert(performance.now() <= end, "Campaign exceeded its working deadline");
  } finally {
    write("suite", {
      ...identity,
      measured: performance.now() - now,
      subjects,
      expected: benchTrials.length,
      stopped,
      status: status.sort((a, b) => a.sequence - b.sequence),
    });
  }
}
