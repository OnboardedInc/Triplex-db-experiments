import { prepareMemoSelection } from "../../../bench/lib/w0-memo-pool.ts";
import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { memoEntry, selectMemo, saveMemo, loadMemo } from "../../../bench/lib/w0-memo.ts";
import {
  W0,
  V_W0,
  canonical,
  w0Basis,
  worldOf,
  reachableRows,
} from "../../../bench/lib/w0-world.ts";
import { openComposition } from "../../../bench/lib/composition.ts";
import { seedW0 } from "../../../bench/lib/w0-seed.ts";
import { runW0Sweep, subjectList } from "../../../bench/lib/sweep.ts";

// [DX-H8] Why: compare all reused and invalidated bytes to the full kernel across real graph changes.
// Rejected: asserting only cache-hit counts, which cannot establish exactness.
test("stored preview: shared fanout, empty targets, new edges, time/release/missing fallback, full bytes and resume", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dxh8-memo-"));
  const comp = await openComposition("memory", "xtdb", "h8-test");
  try {
    const seeded = await seedW0(comp, 200, path.join(dir, "seed.ndjson"));
    const b0 = { position: seeded.basis.tx, validAt: V_W0 },
      subjects = subjectList(200);
    const rows = (await comp.sweepPage(subjects, b0)).rows;
    const entries: Record<string, any> = {};
    for (const subject of subjects) {
      const world = worldOf(subject, reachableRows([subject], rows));
      const result = W0.sweepSubject(world, W0.R2, w0Basis(b0));
      assert.ok(!("error" in result));
      entries[subject] = memoEntry({ subject, world, ...result }, b0, W0.R2.hash);
    }
    const file = path.join(dir, "memo.json");
    saveMemo(file, { version: 1, scope: "h8-test", releaseHash: W0.R2.hash, basis: b0, entries });
    const memo = loadMemo(file)!;
    const shared = rows.find((r) => r.attribute === "location")!.value.value;
    await comp.transact(
      [
        ...new Map(
          rows
            .filter((r) => r.entityId === shared && r.attribute === "localMinWageCents")
            .map((r) => [r.id, { op: "retract", id: r.id }]),
        ).values(),
        {
          op: "assert",
          entityId: shared,
          attribute: "localMinWageCents",
          value: { type: "integer", value: "5000" },
          validFrom: V_W0,
        },
      ],
      { commandId: "shared" },
    );
    const basis = { position: await comp.currentPosition(), validAt: V_W0 };
    const options = {
      comp,
      memo,
      scope: "h8-test",
      releaseHash: W0.R2.hash,
      previewBasis: b0,
      basis,
      subjects,
    };
    const selected = await selectMemo(options);
    const selector = await prepareMemoSelection({
      ...options,
      file,
      composition: "memory",
      lane: "xtdb",
    });
    try {
      const threaded = await selector.select();
      assert.deepEqual(threaded.affected, selected.affected);
      assert.equal(threaded.largestFanout, selected.largestFanout);
      assert.equal(canonical([...threaded.reused]), canonical([...selected.reused]));
      assert.ok(threaded.workerCpuMs > 0);
    } finally {
      await selector.close();
    }
    assert.ok(selected.largestFanout > 1);
    assert.ok(selected.reused.size > 0);
    for (const s of subjects)
      assert.equal(selected.affected.includes(s), entries[s].closure.includes(shared));
    const current = (await comp.sweepPage(subjects, basis)).rows;
    const expected = new Map(
      subjects.map((subject) => {
        const r = W0.sweepSubject(
          worldOf(subject, reachableRows([subject], current)),
          W0.R2,
          w0Basis(basis),
        );
        assert.ok(!("error" in r));
        return [subject, r];
      }),
    );
    const published: any[] = [];
    const sweepOptions = {
      comp,
      composition: "memory",
      lane: "xtdb" as const,
      scope: "h8-test",
      subjects,
      basis,
      sweepId: "h8",
      cursor: path.join(dir, "cursor"),
      workers: 2,
      pageSize: 256,
      reused: selected.reused,
      onPage: async (records: readonly any[]) => {
        for (const r of records) {
          assert.equal(W0.outputJson(r.output), W0.outputJson(expected.get(r.subject)!.output));
          assert.equal(canonical(r.record), canonical(expected.get(r.subject)!.record));
        }
        published.push(...records);
        await comp.publishOutbox(records.map((r) => r.record));
      },
    };
    assert.equal((await runW0Sweep(sweepOptions)).complete, true);
    assert.equal(published.length, 200);
    assert.equal(
      (
        await runW0Sweep({
          ...sweepOptions,
          onPage: async () => {
            throw Error("replayed");
          },
        })
      ).complete,
      true,
    );
    assert.equal((await selectMemo({ ...options, releaseHash: "wrong" })).reused.size, 0);
    assert.equal(
      (await selectMemo({ ...options, previewBasis: { ...b0, position: b0.position - 1 } })).reused
        .size,
      0,
    );
    assert.equal(
      (await selectMemo({ ...options, basis: { ...basis, validAt: V_W0 + 1 } })).reused.size,
      0,
    );
    const missing = subjects.find((s) => selected.reused.has(s))!;
    delete memo.entries[missing];
    assert.ok((await selectMemo(options)).affected.includes(missing));
    const emptyEntry = memoEntry(
      {
        subject: "root",
        world: { subject: "root", facts: [{ e: "root", a: "next", v: "empty", tx: 1 }] },
        output: {},
        record: {},
      },
      { position: 1, validAt: 0 },
      "release",
    );
    assert.deepEqual(emptyEntry.closure, ["empty", "root"]);
  } finally {
    await comp.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
