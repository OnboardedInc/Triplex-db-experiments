import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { openComposition } from "../../../bench/lib/composition.ts";
import { W0 } from "../../../bench/lib/w0-world.ts";
import { publishChanged } from "../../../bench/lib/w0-replica.ts";
import { readOutboxAt } from "../../../bench/lib/w0-outbox-state.ts";
import { pageRoots } from "../../../bench/lib/w0-page-outbox.ts";
import { pageWireState } from "../../../bench/lib/w0-page-check.ts";
import { emptyAudit, event, query } from "./bench-rung.ts";
import { hash } from "./store.ts";
import { evaluate } from "./model.ts";
export async function pageControl(
  scope: string,
  dir: string,
  worlds: W0.World[],
  b: W0.Basis,
  nonce: string,
) {
  const c = await openComposition("reach", "datomic", scope + "-pages"),
    o = emptyAudit(),
    results = [];
  try {
    for (let i = 0; i < worlds.length; i += 96) await query(o, "source", worlds.slice(i, i + 96));
    for (const [n, rel] of [W0.R1, W0.R2, W0.R3].entries()) {
      const at = performance.now(),
        basis = { ...b, tx: b.tx + n },
        records = worlds.map((w) => W0.recordOf(evaluate(w, rel, basis)));
      const r = await publishChanged(c, records, {
          layout: "page-cut",
          frameSize: 64,
          roster: {
            subjects: worlds.map((w) => w.subject),
            release: rel.hash,
            basis: records[0]!.basis,
          },
        }),
        position = await c.currentPosition(),
        finishedMs = performance.now() - at;
      await event(o, { seq: n, basis, doc: rel.doc });
      const digests: string[] = [];
      for (let i = 0; i < worlds.length; i += 128) {
        const ids = worlds.slice(i, i + 128).map((w) => w.subject),
          [raw, expected] = await Promise.all([
            readOutboxAt(c, pageRoots(ids), position),
            query(o, "read", { seq: n, subjects: ids }),
          ]);
        for (const [j, id] of ids.entries()) {
          const observed = hash(pageWireState(raw.rows, id));
          assert.equal(observed, expected[j].state, "page control " + id);
          digests.push(observed);
        }
      }
      results.push({
        release: rel.hash,
        n: worlds.length,
        position,
        finishedMs,
        verifiedMs: performance.now() - at,
        receipts: r.responses.length,
        allStates: hash(digests),
      });
    }
    fs.writeFileSync(
      path.join(dir, "page-control.json"),
      JSON.stringify({ nonce, scope: c.scopeName, results }) + "\n",
      { flag: "wx" },
    );
  } finally {
    o.close();
    await c.close();
  }
}
