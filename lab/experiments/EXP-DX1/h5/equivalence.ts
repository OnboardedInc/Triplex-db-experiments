import assert from "node:assert/strict";
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { openComposition } from "../../../bench/lib/composition.ts";
import { openTriples } from "../../../bench/lib/triplex.ts";
import { publicSweep, portableSweep } from "../../../bench/lib/w0-public.ts";
import { measureW0Http } from "../../../bench/lib/w0-http.ts";
import { seedW0 } from "../../../bench/lib/w0-seed.ts";
import { subjectList } from "../../../bench/lib/sweep.ts";
import { V_W0, canonical, sha256 } from "../../../bench/lib/w0-world.ts";
// [DX-H5] Why: compare the actual public batch row reader against portable at old/head cuts.
// Rejected: H2's datomicW0Sweep alias, which deliberately still names the portable fallback.
process.env.TX2_P5_CLOCK_START = String(V_W0);
process.env.TX2_W0_POINT_JOURNAL = "1";
const scope = "dxh5-equivalence-" + randomUUID(),
  comp = await openComposition("reach", "datomic", scope),
  h = await openTriples("datomic", scope);
const out = "runs/DX-H5-vm";
fs.mkdirSync(out, { recursive: true });
const report: any = { scope, N: 200, status: "RUNNING", comparisons: [] };
try {
  const seed = await seedW0(comp, 200, out + "/seed.ndjson");
  const mutation = await comp.transact(
    [
      {
        op: "assert",
        entityId: subjectList(200)[0],
        attribute: "answers",
        value: { type: "ref", value: "dxh5-new-answer" },
        validFrom: V_W0,
      },
    ],
    { commandId: "reader-mutation" },
  );
  assert.ok(mutation.ok);
  const selected = await publicSweep("datomic", h),
    portable = portableSweep(h);
  const sorted = (rows: readonly any[]) => canonical(rows.map((r) => canonical(r)).sort());
  for (const position of [seed.basis.tx, await comp.currentPosition()])
    for (let offset = 0; offset < 200; offset += 64) {
      const subjects = subjectList(200).slice(offset, offset + 64),
        basis = { position, validAt: V_W0 };
      const measured = await measureW0Http(() => selected.page(subjects, basis)),
        expected = await portable.page(subjects, basis);
      assert.equal(measured.requests, 1, "actual HTTP request count");
      assert.equal(sorted(measured.value.rows), sorted(expected.rows));
      assert.deepEqual(measured.value.reportedBasis, basis);
      report.comparisons.push({
        position,
        offset,
        subjects: subjects.length,
        rows: measured.value.rows.length,
        requests: measured.requests,
        responseBytes: measured.responseBytes,
        contentSha256: sha256(sorted(expected.rows)),
      });
    }
  report.status = "MATCH";
} catch (e) {
  report.status = "FAIL";
  report.error = String((e as Error).stack);
  throw e;
} finally {
  fs.writeFileSync(out + "/equivalence.json", JSON.stringify(report, null, 2) + "\n");
  await comp.close();
  await h.close();
}
