import test from "node:test";
import assert from "node:assert/strict";
import { Option } from "effect";
import { FullRowModel } from "../lib/full-row-model.ts";
import { canonicalRow } from "../lib/canonical.ts";
import { Digest } from "../lib/rng.ts";
import { ids } from "../lib/world.ts";

// [DX-T1-2] Why: compare both representations with independently enumerated visible canonical rows, including expiry and retraction.
// Rejected: test only matching object shapes or compare two modes without a semantic reference.
test("compact oracle versions preserve all row fields, temporal cuts, references and stamps", () => {
  const legacy = new FullRowModel(false),
    compact = new FullRowModel(true);
  const root = ids.placement(0),
    child = "shared",
    rows: any[] = [];
  const append = (position: number, instant: number, ops: any[]) => {
    const triples = ops
      .filter((o) => o.op === "assert")
      .map((o, i) => ({
        id: `a-${position}-${i}`,
        entityId: o.entityId,
        attribute: o.attribute,
        value: o.value,
        validFrom: o.validFrom ?? instant,
        validTo: o.validTo === undefined ? Option.none() : Option.some(o.validTo),
        createdBy: Option.some(o.createdBy ?? "actor"),
      }));
    const receipt: any = { position, instant, txId: `tx-${position}`, triples };
    legacy.add(ops, receipt, "actor");
    compact.add(ops, receipt, "actor");
    for (const o of ops) {
      if (o.op === "retract") {
        rows.find((r) => r.row.id === o.id)!.until = instant;
        continue;
      }
      const t = triples.find((t) => t.entityId === o.entityId && t.attribute === o.attribute)!;
      rows.push({
        from: instant,
        until: Infinity,
        row: {
          id: t.id,
          entityId: o.entityId,
          attribute: o.attribute,
          value: o.value,
          recordedAt: instant,
          validFrom: o.validFrom ?? instant,
          validTo: o.validTo === undefined ? Option.none() : Option.some(o.validTo),
          createdBy: Option.some(o.createdBy ?? "actor"),
          entityType: o.entityType ? Option.some(o.entityType) : Option.none(),
          schemaVersion: Option.some(1),
          txId: Option.some(receipt.txId),
          retractedAt: Option.none(),
          retractTxId: Option.none(),
        },
      });
    }
  };
  append(1, 100, [
    {
      op: "assert",
      entityId: root,
      attribute: ":placement/stamp",
      value: { type: "number", value: 1 },
      validFrom: 0,
    },
    {
      op: "assert",
      entityId: root,
      attribute: ":placement/ref",
      value: { type: "ref", value: child },
      validFrom: 0,
    },
    {
      op: "assert",
      entityId: child,
      attribute: ":shared/value",
      value: { type: "string", value: "payload" },
      validFrom: 50,
      validTo: 180,
      entityType: "Shared",
      createdBy: "source",
    },
  ]);
  append(2, 200, [
    { op: "retract", id: "a-1-0" },
    {
      op: "assert",
      entityId: root,
      attribute: ":placement/stamp",
      value: { type: "number", value: 2 },
      validFrom: 150,
    },
    {
      op: "assert",
      entityId: child,
      attribute: ":shared/back",
      value: { type: "ref", value: root },
      validFrom: 0,
    },
  ]);
  for (const recordedAt of [0, 100, 150, 199, 200, 250])
    for (const validAt of [0, 49, 50, 149, 150, 179, 180, 300]) {
      const visible = rows.filter(
        (r) =>
          r.from <= recordedAt &&
          recordedAt < r.until &&
          r.row.validFrom <= validAt &&
          (!Option.isSome(r.row.validTo) || validAt < r.row.validTo.value),
      );
      const reachable = new Set([root]);
      let changed = true;
      while (changed) {
        changed = false;
        for (const r of visible)
          if (
            reachable.has(r.row.entityId) &&
            r.row.value.type === "ref" &&
            !reachable.has(r.row.value.value)
          ) {
            reachable.add(r.row.value.value);
            changed = true;
          }
      }
      const selected = visible.filter((r) => reachable.has(r.row.entityId)),
        d = new Digest();
      for (const r of selected) d.add(canonicalRow(r.row));
      const expected = {
        digest: d.hex(),
        facts: selected.length,
        stamp: Math.max(
          -1,
          ...selected
            .filter((r) => r.row.attribute === ":placement/stamp")
            .map((r) => r.row.value.value),
        ),
      };
      assert.deepEqual(legacy.summary(0, recordedAt, validAt), expected);
      assert.deepEqual(compact.summary(0, recordedAt, validAt), expected);
    }
  assert.deepEqual(compact.boundaries(0), legacy.boundaries(0));
  for (const m of [compact, legacy])
    assert.throws(() => m.add([], { position: 2, instant: 300, triples: [] } as any), /Duplicate/);
});
