import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { memoryComposition } from "../../../bench/lib/memory.ts";
import { readDeepWorlds } from "../../../bench/lib/deep-activation.ts";
import { V_W0, W0 } from "../../../bench/lib/w0-world.ts";
import { seedAccounts } from "../act2/rung.ts";
import { keyFor } from "../scale1/tenants.ts";
import { ids } from "../../../bench/lib/world.ts";
import { pageReference } from "./solo-reference.ts";
import { emptyAudit, query } from "./bench-rung.ts";
test("page reference reopens each named deep cut and publishes the intervening native source save", async () => {
  const c = memoryComposition("datomic", "delta-pageref-" + randomUUID()),
    o = emptyAudit(),
    t = { first: 0, index: 0, people: 8, key: keyFor(0) },
    all = Array.from({ length: t.people }, (_, i) => i);
  try {
    const seed = await seedAccounts(c, [t]);
    await query(
      o,
      "source",
      await readDeepWorlds(c, all, { position: seed.position, validAt: V_W0 }, t.key),
    );
    let step = 0;
    const xs = await pageReference(
      c,
      c,
      t,
      all.map(W0.placementId),
      o,
      async () => {
        const ordinal = step++,
          i = ordinal % t.people,
          id = ids.worker(i),
          snap = await c.sweepPage([id], { position: await c.currentPosition(), validAt: V_W0 }),
          rate = snap.rows.find((f) => f.attribute === ":person/custom-weekly-minutes")!;
        const r = await c.transact(
          [
            { op: "retract", id: rate.id },
            {
              op: "assert",
              entityId: id,
              attribute: rate.attribute,
              value: { type: "integer", value: "2999" },
              validFrom: V_W0 - 10,
            },
          ],
          {
            actor: "reference-save",
            commandId: "save-" + ordinal,
            preconditions: [{ _tag: "TripleLive", id: rate.id }],
          },
        );
        assert(r.ok);
        const [w] = await readDeepWorlds(
          c,
          [i],
          { position: r.value.position, validAt: V_W0 },
          t.key,
        );
        return { p: r.value.position, tx: r.value.position, subject: w!.subject, worldAfter: w! };
      },
      true,
    );
    assert.equal(xs.length, 3);
    assert(xs.slice(1).every((r) => r.burst === 55 && r.liveReads >= 16 && r.liveSaves >= 55));
    assert.deepEqual(
      xs.map((x) => x.people),
      [8, 8, 8],
    );
  } finally {
    o.close();
    await c.close();
  }
});
