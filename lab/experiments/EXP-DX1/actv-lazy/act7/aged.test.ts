// [DX-ACT7] Unit checks of the EDN reader and the aged replay rules (no database). The full cross-check against AGE1's
// own `expected-adopted` runs in the miniature (act7/miniature.sh: every adopted subject, every field).
import assert from "node:assert/strict";
import { test } from "node:test";
import { readEdn, get } from "./edn.ts";
import { agedFields, lastSave, rosterOf, standardWidth, type AgedReplay } from "./aged.ts";

test("EDN: the shapes pr-str writes for AGE1's ledgers", () => {
  const v = readEdn('{:probes {5 {:owner 30, :width 2, :fields {0 1, 1 3}, :prior nil}}, :observed 400, ' +
    ':seal {:name "s2-x\\"y"}, :origin-clock 1.7E12, :xs [1 2 #{3}], :t #inst "2026-01-01", #_ :gone :ok true}');
  const probes = get(v, ":probes") as Map<unknown, unknown>;
  assert.equal((get(probes.get(5) as never, ":fields") as Map<number, number>).get(1), 3);
  assert.equal(get(probes.get(5) as never, ":owner"), 30);
  assert.equal(get(v, ":observed"), 400);
  assert.equal(get(get(v, ":seal"), ":name"), 's2-x"y');
  assert.equal(get(v, ":origin-clock"), 1.7e12);
  assert.equal(get(v, ":t"), "2026-01-01");
  assert.equal(get(v, ":ok"), true);
  assert.equal(get(v, ":gone"), undefined);
  assert.throws(() => readEdn("{:a 9007199254740993}"));
});

test("aged replay: roster, last save, probes and earlier fields", () => {
  const r: AgedReplay = { seedHead: 100, active: 30, people: 8, tapeSaves: 95,
    probes: new Map([[7, { owner: 30, width: 2, fields: new Map() }], [8, { owner: 30, width: 1, fields: new Map([[1, 7]]) }]]) };
  assert.deepEqual(rosterOf(r, 0), { account: 0, local: 0 });
  assert.deepEqual(rosterOf(r, 13), { account: 3, local: 2 });
  assert.deepEqual(rosterOf(r, 30), { account: 0, local: 6 });
  assert.deepEqual(rosterOf(r, 45), { account: 5, local: 7 });
  // Slot 7's saves are 7, 37, 67 (and 97 is past the tape); 7 is a probe, so 67 is the last.
  assert.equal(lastSave(r, 7), 67);
  // Slot 8: 8 (probe), 38, 68; the last regular one.
  assert.equal(lastSave(r, 8), 68);
  // The probe subject's last save is probe 8 (width 1); its field 1 comes from probe 7, its field 2 is the seed's.
  assert.equal(lastSave(r, 30), 8);
  const p = agedFields(r, 30)!;
  assert.deepEqual([p[0]!.n, p[1]!.n, p[2]], [8, 7, undefined]);
  assert.equal(p[0]!.position, 109);
  assert.equal(p[0]!.id, "B" + String(8 * 16).padStart(25, "0"));
  // A regular subject's field beyond its last save's width comes from the latest earlier save that wrote it.
  const k = 4, n = lastSave(r, k)!;
  const f = agedFields(r, k)!;
  for (const j of [0, 1, 2]) {
    if (j < standardWidth(r, n)) assert.equal(f[j]!.n, n);
    else if (f[j]) assert(f[j]!.n < n && (n - f[j]!.n) % r.active === 0 && j < standardWidth(r, f[j]!.n));
  }
  // An idle subject is never touched.
  assert.equal(agedFields(r, 45), undefined);
});
