import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { canonicalWorld } from "../../../bench/lib/canonical.ts";
import { openComposition, type Basis } from "../../../bench/lib/composition.ts";
import { IntentLog } from "./intent-log.ts";
import { intent, person, firstValid } from "./population.ts";

// [DX-THIN1] Why: exercise the lazy composition through its registered caller with a real receipt and a split cold read.
// Rejected: using the cache's own observation as expected state or measuring only a pre-opened worker.
export async function checkEntry(
  dir: string,
  stack: { prefix: string; writeUrl: string; readUrl: string },
  source: string,
) {
  const scope = "dxthin-entry-" + randomUUID(),
    writer = await openComposition("reach", "datomic", scope);
  const target = await openComposition("reach-touched", "datomic", scope),
    log = new IntentLog(path.join(dir, "entry-intents.sqlite"), 50, scope);
  try {
    assert.equal(await writer.currentPosition(), 0);
    const seed = log.operations(1),
      s = await writer.transact(seed, { actor: "import", commandId: scope + "-1" });
    assert(s.ok);
    log.record(1, seed, s.value);
    const b = { recordedPosition: 1, validAt: firstValid + 1000 } as Basis;
    const t = performance.now(),
      cold = await target.pull(person(0), b);
    const firstPullMs = performance.now() - t;
    assert.equal(canonicalWorld(cold.triples), canonicalWorld(log.rows(0, 1, b.validAt)));
    const repeat = await target.pull(person(0), b);
    assert.equal(repeat.route, "replica");
    assert.equal(canonicalWorld(repeat.triples), canonicalWorld(log.rows(0, 1, b.validAt)));
    const original = await target.pull(person(1), {
      recordedAt: s.value.instant,
      validAt: b.validAt,
    });
    assert.equal(canonicalWorld(original.triples), canonicalWorld(log.rows(1, 1, b.validAt)));
    let wrote = false;
    const split = await target.pull(person(2), b, async () => {
      const ops = intent(2, true),
        u = await writer.transact(ops, { actor: "import", commandId: scope + "-2" });
      assert(u.ok && u.value.position === 2);
      wrote = true;
      const own = await target.pull(person(2), {
        recordedPosition: 2,
        validAt: b.validAt,
      } as Basis);
      assert.equal(
        own.triples.filter((x) => x.attribute === "bgcStatus" && x.id === u.value.triples[0]!.id)
          .length,
        1,
      );
    });
    assert(wrote);
    assert.equal(canonicalWorld(split.triples), canonicalWorld(log.rows(2, 1, b.validAt)));
    const older = await target.pull(person(2), {
      recordedPosition: 1,
      validAt: firstValid - 1,
    } as Basis);
    assert.equal(older.triples.length, 0);
    const result = {
      scope,
      slot: stack.prefix,
      source,
      firstPullMs,
      firstPinnedRows: cold.triples.length,
      repeatedRoute: repeat.route,
      timePinnedRows: original.triples.length,
      splitRows: split.triples.length,
      ryow: 1,
    };
    fs.writeFileSync(path.join(dir, "entry-check.json"), JSON.stringify(result, null, 2) + "\n", {
      flag: "wx",
    });
    return result;
  } finally {
    log.close();
    await target.close();
    await writer.close();
  }
}
