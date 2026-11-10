import assert from "node:assert/strict";
import { test } from "node:test";
import { decodeSweepRows as candidate } from "./decoder-candidate.ts";
import { decodeSweepRows as baseline } from "../../../../packages/datomic/dist/index.js";
// [DX-H6] Why: the common-layout branch must preserve the full validator's acceptance on every column, including unused metadata.
// Rejected: validating only the favorable recording rows.
const basis = { recordedPosition: 1, validAt: 5 };
const wire = () =>
  ({
    position: 1,
    t: "100",
    reset: false,
    entities: [
      [
        "s",
        1,
        [
          [
            "0000000000000001",
            "r",
            "s",
            "a",
            "string",
            "v",
            null,
            null,
            null,
            null,
            10,
            0,
            null,
            "actor",
            null,
            1,
            "tx",
          ],
        ],
      ],
      ["v", 0, []],
    ],
    closures: [["s", ["s", "v"]]],
  }) as any;
const outcome = (read: any, w: any) => {
  try {
    return { ok: true, value: read(w, ["s"], basis) };
  } catch {
    return { ok: false };
  }
};
test("common-layout candidate matches original validation for every column mutation", () => {
  for (let i = 0; i < 17; i++)
    for (const v of [
      null,
      0,
      1,
      -0,
      "-0",
      "bad",
      "0000000000000001",
      true,
      {},
      [],
      1.5,
      Number.MAX_SAFE_INTEGER + 1,
    ]) {
      const w = wire();
      w.entities[0][2][0][i] = v;
      assert.deepEqual(outcome(candidate, w), outcome(baseline, w), `column ${i}: ${String(v)}`);
    }
  assert.deepEqual(outcome(candidate, wire()), outcome(baseline, wire()));
});
