import assert from "node:assert/strict";
import test from "node:test";
import { W0 } from "../../../bench/lib/w0-world.ts";
import { emptyAudit, event, query } from "./bench-rung.ts";
import { epoch } from "./model.ts";
test("sparse Python publication replay matches dense evaluation across saves, releases, time and reverse reads", async () => {
  const r = W0.rung(50),
    worlds = [...W0.population(r)].map((p) => p.world),
    ids = worlds.map((w) => w.subject),
    b = W0.populationBasis(r),
    o = emptyAudit();
  try {
    await query(o, "source", worlds);
    await event(o, { seq: 0, doc: W0.R1.doc, basis: b });
    let rel = W0.R1;
    for (let n = 1; n < 24; n++) {
      const release = n % 5 === 0;
      if (release) rel = rel === W0.R1 ? W0.R2 : W0.R1;
      const s = ids[(n * 3) % ids.length]!,
        basis = { tx: b.tx + n, validTime: n < 12 ? b.validTime : "2026-11-05T00:00:00.000000Z" };
      await event(o, {
        seq: n,
        basis,
        doc: rel.doc,
        ...(release
          ? {}
          : { subject: s, edits: [{ e: s, a: "weeklyMinutes", from: epoch, values: [n * 123] }] }),
      });
    }
    for (const seq of [23, 8, 9, 10, 12, 19, 23, 0, 23]) {
      const input = { seq, subjects: ids };
      assert.equal(await o.call("read", input), await o.call("read-dense", input));
    }
  } finally {
    o.close();
  }
});
