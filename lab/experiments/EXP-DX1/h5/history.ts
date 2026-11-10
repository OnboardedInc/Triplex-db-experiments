import assert from "node:assert/strict";
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { inspect } from "node:util";
import { openComposition } from "../../../bench/lib/composition.ts";
import { openTriples } from "../../../bench/lib/triplex.ts";
import { seedW0 } from "../../../bench/lib/w0-seed.ts";
import { W0, V_W0, canonical, sha256 } from "../../../bench/lib/w0-world.ts";
import { openBulkCounts } from "./bulk-counts.ts";
process.env.TX2_P5_CLOCK_START = String(V_W0);
process.env.TX2_W0_POINT_JOURNAL = "1";
const scope = "dxh5-history-" + randomUUID(),
  comp = await openComposition("reach", "datomic", scope),
  h = await openTriples("datomic", scope),
  bulk = await openBulkCounts(comp);
const out = "runs/DX-H5-vm";
fs.mkdirSync(out, { recursive: true });
const sources = Object.fromEntries(
  [
    "lab/experiments/EXP-DX1/h5/history.ts",
    "lab/experiments/EXP-DX1/h5/bulk-counts.ts",
    "lab/bench/lib/w0-public.ts",
    "lab/bench/lib/w0-journal.ts",
    "packages/datomic/dist/DatomicClient.js",
    "packages/datomic/dist/DatomicStorageAdapter.js",
  ].map((f) => [f, sha256(fs.readFileSync(f))]),
);
const report: any = {
  scope,
  N: 50,
  status: "RUNNING",
  startedAt: new Date().toISOString(),
  sources,
  phases: [],
};
try {
  const seed = await seedW0(comp, 50, out + "/seed.ndjson");
  for (let phase = 0; phase < 2; phase++) {
    const position = await comp.currentPosition(),
      entities = new Set<string>();
    let after = 0;
    while (after < position) {
      const page = await comp.feedPage(after, 1000);
      for (const tx of page.transactions) {
        after = tx.position;
        for (const c of tx.changes) entities.add(c.entityId);
      }
    }
    const ids = [...entities];
    let rows = 0;
    for (let offset = 0; offset < ids.length; offset += 256) {
      const chunk = ids.slice(offset, offset + 256),
        actual = await bulk.histories(chunk, position),
        expected: any[] = [];
      for (let j = 0; j < chunk.length; j += 16)
        expected.push(
          ...(
            await Promise.all(
              chunk.slice(j, j + 16).map((e) => h.run<readonly any[]>(h.storage!.history(e))),
            )
          ).flat(),
        );
      const sorted = (items: readonly any[]) => canonical(items.map((r) => canonical(r)).sort());
      assert.equal(sorted(actual), sorted(expected));
      rows += actual.length;
    }
    const old = await comp.storeCounts(),
      current = await bulk.count();
    assert.deepEqual(current, old);
    report.phases.push({ position, entities: ids.length, rows, counts: current });
    if (phase === 0) {
      const subject = W0.placementId(0),
        p = await comp.sweepPage([subject], { position, validAt: V_W0 });
      const row = p.rows.find((r) => r.entityId === subject && r.attribute === "weeklyMinutes");
      // Use a fresh explicit entity if this fixture subject has no weeklyMinutes; both retirement and future rows stay covered by the seed.
      const r = await comp.transact(
        row
          ? [
              { op: "retract", id: row.id },
              {
                op: "assert",
                entityId: subject,
                attribute: "weeklyMinutes",
                value: { type: "integer", value: "3000" },
                validFrom: V_W0,
              },
            ]
          : [
              {
                op: "assert",
                entityId: "history-witness",
                attribute: "value",
                value: { type: "string", value: "witness" },
                validFrom: V_W0,
              },
            ],
        { commandId: "history-mutation" },
      );
      assert.ok(r.ok);
    }
  }
  for (const [file, hash] of Object.entries(sources))
    assert.equal(sha256(fs.readFileSync(file)), hash);
  report.status = "MATCH";
} catch (error) {
  report.status = "FAIL";
  report.error = inspect(error, { depth: 12 });
  throw error;
} finally {
  report.finishedAt = new Date().toISOString();
  fs.writeFileSync(out + "/history-equivalence.json", JSON.stringify(report, null, 2) + "\n");
  bulk.close();
  await comp.close();
  await h.close();
}
