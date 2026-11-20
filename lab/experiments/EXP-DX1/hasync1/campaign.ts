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
  sites: { a: Site; b: Site },
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
  const checkpoints = new Map<"legacy" | "lean", Checkpoint>();
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
  for (const mode of trials) {
    assert(performance.now() < end, "The campaign reached its 85-minute working deadline");
    const e = new Evidence(store, mode, identity.tag);
    process.stdout.write(
      "@attempt " + JSON.stringify({ nonce: e.nonce, prefix: e.prefix, mode }) + "\n",
    );
    const layout =
      mode === "hasync-seed-lean" || mode.startsWith("hasync-cost") ? "lean" : "legacy";
    const checkpoint = checkpoints.get(layout);
    const profile = { people: subjects, scopes: 1, capacity: "two-host" };
    const result = await drill(e, sites.a, sites.b, profile, () => {}, {
      path: path.join(store, "seed"),
      deadline: end - 28 * 60000,
      credentials,
      ...(checkpoint ? { checkpoint } : {}),
    });
    if (mode.startsWith("hasync-seed")) {
      const cp = result as Checkpoint;
      assert.equal(cp.people, subjects);
      assert.equal(cp.layout, layout);
      assert(cp.facts >= 16000000 && cp.manifest.match(/^[a-f0-9]{64}$/));
      checkpoints.set(layout, cp);
    }
  }
  const measured = performance.now() - now;
  fs.writeFileSync(
    path.join(store, "suite.json"),
    JSON.stringify({
      ...identity,
      measured,
      trials: trials.length,
      subjects,
    }) + "\n",
    { flag: "wx" },
  );
  assert(measured <= suiteMs, "The campaign exceeded its working deadline");
}
