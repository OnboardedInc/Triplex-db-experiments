import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { openComposition, type Basis, type PulledTriple } from "../../../bench/lib/composition.ts";
import { ids, SEED_VALID_FROM } from "../../../bench/lib/world.ts";
import { openNative } from "./native.ts";
import { ImportLane, ImportRun, pace } from "./lane.ts";
import { snapshot, bytes } from "./source.ts";
import { verifySnapshot, touchedWitness } from "./verify.ts";
const root = process.argv[2]!,
  id = randomUUID();
mkdirSync(root);
const lane = new ImportLane(0.75),
  p = pace(32, 0.75),
  traces: any[] = [],
  overlaps: {
    scope: string;
    birth: string;
    retired: string;
    id: string;
    first: number;
    final: number;
  }[] = [];
const sessions = await Promise.all(
  ["left", "right"].map(async (label) => {
    const name = "import-live-" + id + "-" + label,
      t = await openNative(name, "snapshot"),
      reader = await openComposition("reach-touched", "datomic", name);
    const source = snapshot(label === "left" ? "thin" : "deep", 48, "joint/", id + label),
      r = await ImportRun.open(t, source, p, join(root, label + ".sqlite"), lane);
    const before = await t.currentPosition(),
      entity = "joint/" + ids.placement(0);
    const pull = (cut: number) =>
      reader.pull(entity, { recordedPosition: cut, validAt: SEED_VALID_FROM } as Basis);
    assert.equal((await pull(before)).triples.length, 0);
    return { name, t, reader, r, source, before, pull, entity, label };
  }),
);
try {
  await Promise.all(
    sessions.map(async (s) => {
      const put = async (ops: any[], phase: string) => {
        const commandId = id + "/" + s.label + "/" + phase;
        const ack = await lane.live(() => s.t.write(ops, { commandId, actor: "interactive" }));
        const r = await s.t.transactionByCommand(commandId);
        assert(
          r.ok && r.value && r.value.commandId === commandId && r.value.actor === "interactive",
        );
        assert.equal(r.value.txId, ack.txId);
        assert.equal(r.value.position, ack.position);
        assert.equal(r.value.changes.length, 1);
        return r.value;
      };
      let edit: { id: string; txId: string; position: number; first: number } | undefined;
      while (true) {
        const start = performance.now(),
          e = await s.r.step();
        if (!e) break;
        traces.push({
          label: s.label,
          first: e.first,
          end: e.end,
          at: performance.now(),
          ms: performance.now() - start,
          txId: e.txId,
        });
        if (!e.first) {
          await touchedWitness(s.reader, s.source, 0, e.position, true);
          assert.equal((await s.pull(s.before)).triples.length, 0);
          // [DX-ACT1] Why: a real editor can save the same incoming subject before later bulk frames arrive. Rejected: exercising the editor only after both imports finish (no overlapping work).
          assert(e.end < s.source.header.groups);
          const birth = await put(
            [
              {
                op: "assert",
                entityId: s.entity,
                attribute: ":live",
                value: { type: "string", value: s.label },
                validFrom: 0,
              },
            ],
            "edit",
          );
          const c = birth.changes[0]!;
          assert.deepEqual(
            [c.op, c.entityId, c.attribute, c.value, c.validFrom],
            ["assert", s.entity, ":live", { type: "string", value: s.label }, 0],
          );
          assert(birth.position > e.position);
          edit = { id: c.tripleId, txId: birth.txId, position: birth.position, first: e.position };
        }
      }
      assert(edit);
      const row = (x: PulledTriple) =>
        bytes([
          x.id,
          x.entityId,
          x.attribute,
          x.value,
          x.validFrom ?? null,
          x.validTo?.value ?? null,
          x.recordedAt ?? null,
          x.txId?.value ?? null,
        ]);
      const original = (await s.pull(edit.first)).triples.map(row).sort();
      const cut = await s.t.currentPosition();
      assert(cut > edit.position);
      for (const position of [edit.position, cut]) {
        const mixed = (await s.pull(position)).triples;
        assert.deepEqual(
          mixed
            .filter((x) => x.id !== edit!.id)
            .map(row)
            .sort(),
          original,
        );
        const overlay: PulledTriple[] = mixed.filter((x) => x.id === edit!.id);
        assert.equal(overlay.length, 1);
        assert.deepEqual(
          [overlay[0]!.entityId, overlay[0]!.attribute, overlay[0]!.value],
          [s.entity, ":live", { type: "string", value: s.label }],
        );
      }
      const retired = await put([{ op: "retract", id: edit.id }], "retire");
      const c = retired.changes[0]!;
      assert.deepEqual(
        [c.op, c.tripleId, c.assertionTxId, c.retractionTxId],
        ["retract", edit.id, edit.txId, retired.txId],
      );
      assert.deepEqual((await s.pull(retired.position)).triples.map(row).sort(), original);
      assert.equal((await s.pull(cut)).triples.length, original.length + 1);
      await verifySnapshot(s.r);
      overlaps.push({
        scope: s.name,
        birth: edit.txId,
        retired: retired.txId,
        id: edit.id,
        first: edit.first,
        final: cut,
      });
    }),
  );
  assert(sessions.every((s) => traces.filter((v) => v.label === s.label).at(-1).end === 48));
  assert(
    sessions.every(
      (s) =>
        traces.findIndex((v) => v.label === s.label) <
        traces.findLastIndex((v) => v.label !== s.label),
    ),
  );
  writeFileSync(
    join(root, "fair.json"),
    bytes({ id, scopes: sessions.map((s) => s.name), traces, overlaps }),
    { flag: "wx" },
  );
} finally {
  for (const s of sessions) {
    s.r.close();
    await s.reader.close();
    await s.t.close();
  }
}
