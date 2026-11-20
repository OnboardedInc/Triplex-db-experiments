import fs from "node:fs";
import path from "node:path";
import { W0 } from "../../../bench/lib/w0-world.ts";
import { seedFacts } from "./model.ts";
import { pageControl } from "./page-control.ts";
export async function run(parent: string, attempt: { scope: string; nonce: string }) {
  for (const n of [1000, 10000]) {
    const dir = path.join(parent, "rung-" + n);
    fs.mkdirSync(dir);
    const r = W0.rung(n),
      worlds: W0.World[] = [],
      b = { tx: r.K + r.L, validTime: W0.POPULATION_VALID_TIME };
    for (const p of W0.population(r)) {
      b.tx += p.commands;
      worlds.push({ subject: p.world.subject, facts: seedFacts(p.world, b) });
    }
    await pageControl(attempt.scope + "-" + n, dir, worlds, b, attempt.nonce);
  }
}
