import assert from "node:assert/strict";
import { test } from "node:test";
import { Option } from "effect";
import { canonicalRow, canonicalWorld } from "../../../bench/lib/canonical.ts";
// [DX-R3-P7] Why: removing outer string escaping must preserve every typed member and row boundary.
// Rejected: checking only counts (would miss quote/control-character and signed-zero corruption).
test("typed world container preserves the legacy container's complete decoded members", () => {
  const rows = ["", "\0", "\n", '\"],[', "😀"].map((text, i) => ({
    id: text,
    entityId: "root",
    attribute: ":value",
    recordedAt: i,
    validFrom: -0,
    validTo: Option.some(i),
    value: { type: "json", value: [text, { negative: -0, positive: 0 }] },
  }));
  const legacy = JSON.stringify(rows.map(canonicalRow).sort());
  assert.deepEqual(
    JSON.parse(canonicalWorld(rows)),
    JSON.parse(legacy).map((member: string) => JSON.parse(member)),
  );
  assert.equal(JSON.parse(canonicalWorld(rows)).length, rows.length);
});
