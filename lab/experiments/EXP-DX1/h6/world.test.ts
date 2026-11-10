import assert from "node:assert/strict";
import { test } from "node:test";
import { worldOf as oldWorld } from "./golden-world.ts";
import { worldOf, worldSha256, canonical, sha256 } from "../../../bench/lib/w0-world.ts";
// [DX-H6] Why: canonical ASCII escaping must preserve byte order even across Unicode/surrogate boundaries.
// Rejected: testing only the ASCII production seed.
test("single-key ordering equals H5 over escaped, Unicode, integer and JSON facts", () => {
  const values = [
    "a",
    "é",
    "😀",
    "\ud800",
    "\u0000",
    '"',
    "\\",
    true,
    false,
    1,
    -123,
    { erasedAt: "2026-11-01" },
  ];
  const rows: any[] = Array.from({ length: 1200 }, (_, i) => ({
    id: String(i),
    entityId: values[i % 8] + String(i % 17),
    attribute: values[(i * 3) % 8] + String(i % 23),
    value: { type: "json", value: values[(i * 7) % values.length] },
    position: i + 1,
    validFrom: 0,
  }));
  const before = oldWorld("subject", rows),
    after = worldOf("subject", rows);
  assert.equal(canonical(before), canonical(after));
  assert.equal(worldSha256(after), sha256(canonical(before)));
});
