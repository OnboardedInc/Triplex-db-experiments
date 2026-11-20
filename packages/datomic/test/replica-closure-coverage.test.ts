import { expect, it } from "vitest";
import { packEntity } from "../src/replica/packed.js";
import { pullAt, RecentReads } from "../src/replica/RecentReads.js";
import type { SweepRow } from "../src/sweepRows.js";

const row = (entityId: string, position: number, value: SweepRow["value"], validTo?: number) =>
  ({ id: `${entityId}-${position}`, entityId, position, attribute: ":fixture/value", value, validFrom: 0, validTo });

it("retains exact unaffected closures and declines every closure with an evicted dependency", async () => {
  const stable = row("stable", 1, { type: "integer", value: "9007199254740993" });
  const root = row("root", 1, { type: "ref", value: "child" }, 1_000);
  const old = row("child", 1, { type: "string", value: "old" });
  const fresh = row("child", 2, { type: "string", value: "fresh" });
  const oldPacked = packEntity(1, [old]);
  const global = new RecentReads(2, 0, true), closure = new RecentReads(2, 0, true, "closure");
  const basis = { recordedAt: 100.25, validAt: 999 };
  for (const index of [global, closure]) {
    index.apply({ reset: true, position: 1, recordTime: 100.25, clockEnd: 1, valid: true,
      changes: [["stable", undefined, packEntity(1, [stable])], ["root", undefined, packEntity(1, [root])], ["child", undefined, oldPacked]] });
    index.apply({ reset: false, position: 2, recordTime: 200.25, clockEnd: 2, valid: true,
      changes: [["child", oldPacked, packEntity(2, [fresh])]] });
    expect(index.historyBytes).toBe(0);
  }
  expect(global.resolve(basis)).toBeUndefined();
  expect(closure.resolve(basis)).toBe(1);
  expect(closure.resolve({ recordedAt: 150.25, validAt: 999 })).toBe(1);
  expect(closure.pull("stable", basis)?.rows[0]?.value).toEqual(stable.value);
  expect(closure.pull("root", basis)).toBeUndefined();
  const fallback = await pullAt(closure, "root", basis, async () => ({ rows: [root, old] }));
  expect(fallback.route).toBe("fallback");
  expect(fallback.value.rows.map(r => r.value)).toEqual([root.value, old.value]);
  expect(closure.pull("root", { ...basis, validAt: 1_000 })?.rows).toEqual([]);

  const copied = new RecentReads(2, 0, false, "closure");
  copied.install(structuredClone(closure.image()));
  expect(copied.pull("stable", basis)).toEqual(closure.pull("stable", basis));
  expect(copied.pull("root", basis)).toBeUndefined();
  expect(() => global.install(closure.image())).toThrow(/coverage differs/);
  copied.apply({ reset: false, position: 3, recordTime: 300.25, clockEnd: 4, valid: true, changes: [] });
  expect(copied.resolve({ ...basis, recordedAt: 300.25 })).toBeUndefined();
  copied.apply({ reset: false, position: 4, recordTime: 300.25, clockEnd: 4, valid: true, changes: [] });
  expect(copied.resolve({ ...basis, recordedAt: 300.25 })).toBe(4);
  expect(copied.resolve(basis)).toBeUndefined();
});
