import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { Evidence, type Mode } from "../ha1/common.ts";
import { drill } from "../ha1/run.ts";
import type { Site } from "../ha1/stack.ts";
import { faultModes } from "./faults.ts";
import type { Checkpoint } from "./seed.ts";

export const trials = [
  "hasync-seed-legacy",
  "hasync-seed-lean",
  ...faultModes,
  "hasync-cost-plain",
  "hasync-cost-group",
  "hasync-move",
] as const satisfies readonly Mode[];
export const subjects = 100000;
const suiteMs = 85 * 60000;

export async function campaign(
  store: string,
  assignSites: (nonce: string, sourceOnB: boolean) => { a: Site; b: Site },
  identity: {
    tag: string;
    sha: string;
    campaign: string;
  },
) {
  const now = performance.now();
  const end = now + suiteMs;
  const credentials = {
    secret: randomBytes(18).toString("hex"),
    admin: randomBytes(18).toString("hex"),
  };
  fs.mkdirSync(path.join(store, "seed"), { mode: 0o700 });
  fs.writeFileSync(
    path.join(store, "campaign.json"),
    JSON.stringify({
      ...identity,
      mode: "hasync-suite",
      sizes: trials.map(() => subjects),
      shape: "deep",
      trials,
    }) + "\n",
    { flag: "wx" },
  );
  const run = async (mode: (typeof trials)[number], checkpoint?: Checkpoint) => {
    assert(performance.now() < end, "The campaign reached its 85-minute working deadline");
    const e = new Evidence(store, mode, identity.tag);
    process.stdout.write(
      "@attempt " + JSON.stringify({ nonce: e.nonce, prefix: e.prefix, mode }) + "\n",
    );
    const layout =
      mode === "hasync-seed-lean" || mode.startsWith("hasync-cost") ? "lean" : "legacy";
    const sites = assignSites(e.nonce, layout === "lean");
    const profile = { people: subjects, scopes: 1, capacity: "two-host" };
    const result = await drill(e, sites.a, sites.b, profile, () => {}, {
      path: path.join(store, "seed"),
      deadline: end - 28 * 60000,
      credentials,
      ...(checkpoint ? { checkpoint } : {}),
    });
    return result;
  };
  // [DX-HASYNC1] Why: the measured serial cost of two full populations can exhaust the bench allocation. Rejected: budgeting two cold imports at twice the known loader rate.
  const seeds = await Promise.allSettled([run("hasync-seed-legacy"), run("hasync-seed-lean")]);
  const checkpoints = seeds.map((seed, index) => {
    if (seed.status === "rejected") throw seed.reason;
    const cp = seed.value as Checkpoint;
    assert.equal(cp.people, subjects);
    assert.equal(cp.layout, index === 0 ? "legacy" : "lean");
    assert(cp.facts >= 16000000 && cp.manifest.match(/^[a-f0-9]{64}$/));
    return cp;
  });
  const timings: { mode: string; measuredMs: number; targetMs: number }[] = [];
  for (const mode of trials.slice(2)) {
    const result = await run(mode, checkpoints[mode.startsWith("hasync-cost") ? 1 : 0]);
    if (mode.startsWith("hasync-cost")) continue;
    const moving = mode === "hasync-move";
    const observation = result as { firstWritePauseMs?: number; firstNewMs?: number };
    const measuredMs = moving ? observation.firstWritePauseMs : observation.firstNewMs;
    assert(typeof measuredMs === "number" && Number.isFinite(measuredMs) && measuredMs > 0);
    timings.push({ mode, measuredMs, targetMs: moving ? 30000 : 60000 });
  }
  const measured = performance.now() - now;
  fs.writeFileSync(
    path.join(store, "suite.json"),
    JSON.stringify({
      ...identity,
      measured,
      trials: trials.length,
      subjects,
      timings,
    }) + "\n",
    { flag: "wx" },
  );
  assert(measured <= suiteMs, "The campaign exceeded its working deadline");
}
