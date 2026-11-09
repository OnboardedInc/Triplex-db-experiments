import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { openTriples } from "../lib/triplex.ts";
import { openComposition } from "../lib/composition.ts";
import { seedW0 } from "../lib/w0-seed.ts";
import { datomicW0Sweep } from "../lib/w0-datomic-reader.ts";
import { portableSweep } from "../lib/w0-public.ts";
import { subjectList } from "../lib/sweep.ts";
import { V_W0, canonical, worldOf } from "../lib/w0-world.ts";

test("recorded row position is content, not an eligibility marker", () => {
  const row = {
    id: "a",
    entityId: "s",
    attribute: "weeklyMinutes",
    value: { type: "integer", value: "2400" },
    validFrom: 0,
    position: 1,
  };
  assert.notEqual(
    canonical(worldOf("s", [row])),
    canonical(worldOf("s", [{ ...row, position: 2 }])),
  );
});

test(
  "Datomic W0 reader equals portable on every 200-subject page at past and head positions",
  { skip: !process.env.DATOMIC_URL },
  async () => {
    const scope = "dxh2-reader-" + randomUUID(),
      comp = await openComposition("reach", "datomic", scope);
    const h = await openTriples("datomic", scope);
    const dir = fs.mkdtempSync(path.join(process.env.DXH2_TEST_DIR ?? os.tmpdir(), "dxh2-reader-"));
    try {
      const seed = await seedW0(comp, 200, path.join(dir, "seed.ndjson"));
      const mutation = await comp.transact(
        [
          {
            op: "assert",
            entityId: subjectList(200)[0],
            attribute: "answers",
            value: { type: "ref", value: "dxh2-new-answer" },
            validFrom: V_W0,
          },
        ],
        { commandId: "reader-mutation" },
      );
      assert.equal(mutation.ok, true);
      const selected = datomicW0Sweep(h),
        portable = portableSweep(h);
      const sort = (rows: readonly any[]) => canonical(rows.map((r) => canonical(r)).sort());
      for (const position of [seed.basis.tx, await comp.currentPosition()]) {
        for (let offset = 0; offset < 200; offset += 64) {
          const subjects = subjectList(200).slice(offset, offset + 64),
            b = { position, validAt: V_W0 };
          const a = await selected.page(subjects, b),
            e = await portable.page(subjects, b);
          assert.equal(sort(a.rows), sort(e.rows));
          assert.deepEqual(a.reportedBasis, b);
        }
      }
    } finally {
      await comp.close();
      await h.close();
      // Seed is small test evidence, retained by the caller's run log if the gate fails.
    }
  },
);
