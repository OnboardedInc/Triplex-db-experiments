import { inspect } from "node:util";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { openTriples } from "../../../bench/lib/triplex.ts";
import { openComposition } from "../../../bench/lib/composition.ts";
import { seedW0 } from "../../../bench/lib/w0-seed.ts";
import { DatomicClient } from "../../../../packages/datomic/dist/index.js";
import { publicSweep, rootAttributeRows, portableSweep } from "../../../bench/lib/w0-public.ts";
import { subjectList } from "../../../bench/lib/sweep.ts";
import { V_W0, canonical, worldOf } from "../../../bench/lib/w0-world.ts";

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
    process.env.TX2_W0_POINT_JOURNAL = "1";
    const scope = "dxh2-reader-" + randomUUID(),
      comp = await openComposition("reach", "datomic", scope);
    const h = await openTriples("datomic", scope);
    const originalRequest = DatomicClient.prototype.request;
    let pageHttp = 0;
    // [DX-B5-L5] Why: exercise the real H2 world and count actual reach requests, including retries.
    // Rejected: comparing the portable-only helper with itself or trusting roundTrips metadata.
    DatomicClient.prototype.request = function <T>(
      ...args: Parameters<DatomicClient["request"]>
    ): Promise<T> {
      if (args[1].endsWith("/reach") || args[1].endsWith("/reach-many")) pageHttp++;
      return originalRequest.apply(this, args) as Promise<T>;
    };
    const dir = fs.mkdtempSync(path.join(process.env.DXH2_TEST_DIR ?? os.tmpdir(), "dxh2-reader-"));
    try {
      console.error("[DX-H2 reader] seed and full counts", { scope, dir });
      fs.writeFileSync(path.join(dir, "binding.json"), JSON.stringify({ scope, N: 200 }));
      const seed = await seedW0(comp, 200, path.join(dir, "seed.ndjson"));
      console.error("[DX-H2 reader] seed complete; checking all pages at two cuts");
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
      const selected = await publicSweep("datomic", h),
        portable = portableSweep(h);
      const sort = (rows: readonly any[]) => canonical(rows.map((r) => canonical(r)).sort());
      for (const position of [seed.basis.tx, await comp.currentPosition()]) {
        for (let offset = 0; offset < 200; offset += 64) {
          const subjects = subjectList(200).slice(offset, offset + 64),
            b = { position, validAt: V_W0 };
          pageHttp = 0;
          const a = await selected.page(subjects, b);
          assert.equal(pageHttp, 1);
          assert.equal(a.roundTrips, 1);
          const e = await portable.page(subjects, b);
          assert.equal(sort(a.rows), sort(e.rows));
          assert.deepEqual(a.reportedBasis, b);
        }
      }
    } catch (e) {
      console.error(inspect(e, { depth: 12, customInspect: false, showHidden: true }));
      throw e;
    } finally {
      DatomicClient.prototype.request = originalRequest;
      await comp.close();
      await h.close();
      // Seed is small test evidence, retained by the caller's run log if the gate fails.
    }
  },
);

test(
  "point-read W0 journal equals public Triples.transactions on every 50-subject seed page",
  { skip: !process.env.DATOMIC_URL },
  async () => {
    process.env.TX2_W0_POINT_JOURNAL = "1";
    const scope = "dxh2-journal-" + randomUUID(),
      comp = await openComposition("reach", "datomic", scope);
    const h = await openTriples("datomic", scope);
    const dir = fs.mkdtempSync(
      path.join(process.env.DXH2_TEST_DIR ?? os.tmpdir(), "dxh2-journal-"),
    );
    try {
      const seed = await seedW0(comp, 50, path.join(dir, "seed.ndjson"));
      const root = subjectList(50)[0],
        oldBasis = { position: seed.basis.tx, validAt: V_W0 };
      const prior = (await comp.sweepPage([root], oldBasis)).rows.find(
        (r) => r.entityId === root && r.attribute === "weeklyMinutes",
      )!;
      const changed = await comp.transact(
        [
          { op: "retract", id: prior.id },
          {
            op: "assert",
            entityId: root,
            attribute: "weeklyMinutes",
            value: { type: "integer", value: String(Number(prior.value.value) + 1) },
            validFrom: V_W0,
          },
        ],
        { commandId: "root-attribute-witness" },
      );
      assert.equal(changed.ok, true);
      const attrs = ["weeklyMinutes", "bgcStatus", "everifySubmitResult"];
      for (const position of [seed.basis.tx, await comp.currentPosition()])
        for (const subject of subjectList(50).slice(0, 10)) {
          const basis = { position, validAt: V_W0 };
          const expected = (await comp.sweepPage([subject], basis)).rows.filter(
            (r) => r.entityId === subject && attrs.includes(r.attribute),
          );
          const actual = await comp.w0Attributes!(subject, attrs, basis);
          const sorted = (rows: readonly any[]) =>
            canonical(rows.map((r: any) => canonical(r)).sort());
          assert.equal(sorted(actual), sorted(expected));
        }
      for (const id of [
        "p5:seed:1",
        "p5:seed:" + Math.floor(seed.basis.tx / 2),
        "p5:seed:" + seed.basis.tx,
        "missing-command",
      ]) {
        const actual = await comp.transactionByCommand(id);
        assert.equal(actual.ok, true);
        const expected = await h.run(h.triples.transactionByCommand(id));
        assert.equal(canonical(actual.ok ? actual.value : null), canonical(expected));
      }
      for (let after = 0; after < seed.basis.tx; ) {
        const point = await comp.feedPage(after, 1000);
        const legacy: any = await h.run(h.triples.transactions({ after, limit: 1000 }));
        assert.equal(canonical(point), canonical(legacy));
        after = point.transactions.at(-1).position;
      }
    } catch (e) {
      console.error(inspect(e, { depth: 12, customInspect: false }));
      throw e;
    } finally {
      await comp.close();
      await h.close();
    }
  },
);

test("root scalar preconditions refuse malformed source heads and unavailable positions", async () => {
  for (const head of [NaN, -1, 1.5, 4]) {
    const handle: any = {
      run: async (x: unknown) => x,
      storage: { currentCommitPosition: () => head, query: () => [] },
    };
    await assert.rejects(
      rootAttributeRows(handle, "s", ["weeklyMinutes"], { position: 5, validAt: V_W0 }),
    );
  }
});
