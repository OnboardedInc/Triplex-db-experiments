import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { CompositionHandle } from "../../../bench/lib/composition.ts";
import { frames, identity, type Frame, type Shape } from "../load1/source.ts";
import { Snapshot } from "../load1/snapshot.ts";
import { ImportFrameTooLarge, importClassFor } from "../load1/import-class.ts";

// [DX-IMP2] Gate for item 4: the load1 snapshot importer never splits a subject, and with the whole-subject import
// bound on its frames are import-class commits whose refusal is reported whole.
const BIG = 8192;
const alone = (shape: Shape, n: number, i: number) => {
  const it = frames(shape, i + 1, BIG, i);
  const f = it.next().value as Frame;
  assert(f && f.first === i && f.end === i + 1 && it.next().done);
  return f.operations;
};

for (const [shape, n] of [["thin", 300], ["seed", 120], ["deep", 24]] as const)
  test(`${shape}: every frame is a run of whole subjects, at every width`, () => {
    const sizes = Array.from({ length: n }, (_, i) => alone(shape, n, i));
    const largest = Math.max(...sizes.map((s) => s.length));
    let frameCount = 0, checked = 0;
    for (const width of [8, 16, 32, 64, 128, 160, 500, 1000, BIG]) {
      let next = 0;
      const run = () => {
        for (const f of frames(shape, n, width)) {
          assert.equal(f.first, next);
          assert(f.end > f.first && f.operations.length <= width);
          assert.deepEqual(f.operations, sizes.slice(f.first, f.end).flat(), "a frame is its subjects, whole, in order");
          next = f.end;
          frameCount++;
        }
      };
      if (width >= largest) {
        run();
        assert.equal(next, n);
      } else {
        // A subject larger than the frame is refused before any part of it is framed.
        assert.throws(run, /complete source subject exceeds/);
        const big = sizes.findIndex((s) => s.length > width);
        // Frames already yielded end at or before it (whole subjects still being packed are not yielded either).
        assert(next <= big, "the oversized subject is in no frame");
      }
      checked++;
    }
    console.log(`DX-IMP2_SNAPSHOT ${shape} subjects=${n} largest=${largest} widths=${checked} frames=${frameCount}`);
  });

test("the write class: import only for snapshot commands, only with the option", () => {
  const snap = { claims: [{ commandId: "load1/abc/0" }], rows: [1] };
  const live = { claims: [{ commandId: "save-1" }], rows: [1] };
  const before = process.env["TX2_IMPORT_WHOLE_SUBJECT"];
  try {
    delete process.env["TX2_IMPORT_WHOLE_SUBJECT"];
    assert.equal(importClassFor(snap), snap, "option off: the request is the same object, no write class");
    process.env["TX2_IMPORT_WHOLE_SUBJECT"] = "1";
    assert.deepEqual(importClassFor(snap), { ...snap, writeClass: "import" });
    assert.equal(importClassFor(live), live);
    assert.equal(importClassFor({ ...snap, writeClass: "live" }).writeClass, "live");
  } finally {
    if (before === undefined) delete process.env["TX2_IMPORT_WHOLE_SUBJECT"];
    else process.env["TX2_IMPORT_WHOLE_SUBJECT"] = before;
  }
});

for (const option of [false, true])
  test(`a frame refused for the import bound writes nothing (option ${option ? "on" : "off"})`, async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dx-imp2-snapshot-"));
    const saved = new Map<string, any>();
    let sends = 0;
    const fake = {
      scopeName: "imp2-scope",
      backend: { name: "datomic" },
      async transactionByCommand(command: string) {
        return { ok: true, value: saved.get(command) };
      },
      async transact(operations: Frame["operations"], meta: ReturnType<typeof identity>) {
        sends++;
        if (operations.length > 40)
          return { ok: false, tag: "StorageError", error: { cause: { code: "ImportCommitTooLarge", maximum: 40000 } } };
        const position = saved.size + 1, instant = 1000 + position, txId = "tx" + position;
        const changes = operations.map((op, i) => ({ ...op, tripleId: "id" + position + "-" + i, recordedAt: instant, assertionTxId: txId }));
        saved.set(meta.commandId, { ...meta, position, instant, txId, changes });
        return { ok: true, value: { position, instant, txId,
          triples: changes.map((o) => ({ ...o, id: o.tripleId, validTo: { _tag: "None" }, txId: { value: txId } })) } };
      },
    } as unknown as CompositionHandle;
    const before = process.env["TX2_IMPORT_WHOLE_SUBJECT"];
    if (option) process.env["TX2_IMPORT_WHOLE_SUBJECT"] = "1"; else delete process.env["TX2_IMPORT_WHOLE_SUBJECT"];
    try {
      const run = await Snapshot.open(fake, "thin", 30, 64, path.join(dir, "cursor.sqlite"));
      try {
        const it = frames("thin", 30, 64);
        const f = it.next().value as Frame;
        assert(f.operations.length > 40);
        const committed = saved.size;
        const error = await run.write(f).then(() => undefined, (e: unknown) => e);
        assert.equal(saved.size, committed, "nothing written");
        assert.equal(run.cursor(), 0, "the checkpoint did not move");
        if (option) {
          assert(error instanceof ImportFrameTooLarge, String(error));
          assert.deepEqual([error.first, error.end, error.facts, error.limitUs], [f.first, f.end, f.operations.length, 40000]);
        } else assert.match(String(error), /Snapshot write StorageError/);
        console.log(`DX-IMP2_SNAPSHOT refusal option=${option} sends=${sends} error=${(error as Error).constructor.name}`);
      } finally {
        run.close();
      }
    } finally {
      if (before === undefined) delete process.env["TX2_IMPORT_WHOLE_SUBJECT"];
      else process.env["TX2_IMPORT_WHOLE_SUBJECT"] = before;
    }
  });
