import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { Evidence } from "../ha1/common.ts";
import { drill } from "../ha1/run.ts";
import type { Site } from "../ha1/stack.ts";
import { readSeed, seedDirectory } from "./seed.ts";
import { people, type Identity } from "./score.ts";
import { priorityModes } from "./verify.ts";

export const priorityBudgetMs = 26 * 60000;

export async function runPriority9(
  store: string,
  assignSites: (nonce: string) => { a: Site; b: Site },
  identity: Identity,
  campaign: string,
) {
  const deadline = performance.now() + priorityBudgetMs;
  const directory = seedDirectory(path.dirname(store), identity.age);
  const { seed, raw, credentials } = readSeed(
    directory,
    identity.seedSha256,
    identity.age,
    identity.sha,
  );
  fs.writeFileSync(path.join(store, "p9-seed.json"), raw, { flag: "wx" });
  fs.writeFileSync(
    path.join(store, "campaign.json"),
    JSON.stringify({
      tag: identity.tag,
      sha: identity.sha,
      mode: "hasync-p9",
      campaign,
      shape: "deep",
      sizes: [people, people],
      layout: identity.layout,
      p9: identity,
    }),
    { flag: "wx" },
  );
  // [DX-HASYNC1] Why: the planned move remains observable even if Policy B needs a long replacement. Rejected: putting the potentially slow rebuild ahead of both checks.
  let failed = false;
  for (const sequence of [1, 0]) {
    assert(performance.now() < deadline, "Priority 9 reached its collection deadline");
    const mode = priorityModes[sequence]!;
    const e = new Evidence(store, mode, identity.tag);
    process.stdout.write(
      "@attempt " + JSON.stringify({ nonce: e.nonce, prefix: e.prefix, mode, sequence }) + "\n",
    );
    const { a, b } = assignSites(e.nonce);
    try {
      await drill(
        e,
        a,
        b,
        { people, scopes: 1, capacity: identity.layout, pooled: true },
        () => {},
        {
          path: directory,
          checkpoint: seed.checkpoint,
          credentials,
          deadline,
        },
      );
    } catch (cause) {
      assert(fs.existsSync(path.join(e.dir, "cleanup.json")), "Trial still owns resources");
      e.log("priority-cell-error", {
        sequence,
        error: cause instanceof Error ? cause.name : typeof cause,
      });
      failed = true;
    }
  }
  assert(!failed, "A priority 9 correctness drill failed");
}
