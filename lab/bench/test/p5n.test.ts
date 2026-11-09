// [EXP-P5N] Why: D1 must keep the old fact order byte for byte. Rejected: trusting "same comparator" by reading (the order feeds every world digest).
import { test } from "node:test";
import assert from "node:assert/strict";
import { canonical, worldOf, type WorldRow } from "../lib/w0-world.ts";
import { Rng } from "../lib/rng.ts";
const oldWorldOf = (subject: string, rows: readonly WorldRow[]) => {
  const facts = rows.map((r) => ({
    e: r.entityId,
    a: r.attribute,
    v: r.value.type === "integer" ? Number(r.value.value) : r.value.value,
    tx: r.position,
  }));
  facts.sort((a, b) => Buffer.compare(Buffer.from(canonical(a)), Buffer.from(canonical(b))));
  return { subject, facts };
};
test("D1 world order equals the per-comparison canonical order", () => {
  const rng = new Rng(12345);
  const strings = ["a", "b", "é", "z", "\u{1F600}", "�", "", "10", "9", "ab", "a\u0000b"];
  const rows: WorldRow[] = Array.from({ length: 600 }, (_, i) => {
    const kind = rng.int(3);
    return {
      id: "id" + i,
      entityId: "ent:" + strings[rng.int(strings.length)] + rng.int(40),
      attribute: ["name", "wage", "location", "documents"][rng.int(4)]!,
      value:
        kind === 0
          ? { type: "integer", value: String(rng.int(100000) - 500) }
          : kind === 1
            ? { type: "boolean", value: rng.int(2) === 1 }
            : { type: "string", value: strings[rng.int(strings.length)]! + rng.int(7) },
      position: rng.int(5000),
      validFrom: 0,
    };
  });
  assert.equal(canonical(worldOf("s", rows)), canonical(oldWorldOf("s", rows)));
});
