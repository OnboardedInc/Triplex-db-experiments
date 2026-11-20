import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { Evidence } from "../ha1/common.ts";
import { drill } from "../ha1/run.ts";
import type { Site } from "../ha1/stack.ts";
import type { Checkpoint } from "./seed.ts";
import { benchTrials, subjects, workingMs } from "./v2/bench-plan.ts";

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
    const { mode, people, systems } = benchTrials[sequence]!;
    const e = new Evidence(store, mode, identity.tag);
    process.stdout.write(
      "@attempt " + JSON.stringify({ nonce: e.nonce, prefix: e.prefix, mode, sequence }) + "\n",
    );
    const cost = mode.startsWith("hasync-cost"),
      seed = mode.startsWith("hasync-seed");
    const sites = assignSites(e.nonce, cost || mode === "hasync-seed-lean");
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
        checkpoint || seed
          ? {
              path: seedDir,
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
    const cells = await Promise.allSettled([run(0), run(1)]);
    for (const c of cells) if (c.status === "rejected") throw c.reason;
    const checkpoints = cells.map((c, i) => {
      assert(c.status === "fulfilled");
      if (!c.value) return undefined;
      const cp = c.value as Checkpoint;
      assert.equal(cp.people, benchTrials[i]!.people);
      assert.equal(cp.layout, i === 0 ? "legacy" : "lean");
      assert.equal(Boolean(cp.history), i === 0);
      assert.match(cp.manifest, /^[a-f0-9]{64}$/);
      return cp;
    });
    for (let i = 2; i < benchTrials.length; i++) {
      const trial = benchTrials[i]!;
      const required =
        trial.people === subjects ? 0 : trial.mode.startsWith("hasync-cost") ? 1 : null;
      const checkpoint = required === null ? undefined : checkpoints[required];
      if (required === null || checkpoint) await run(i, checkpoint);
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
