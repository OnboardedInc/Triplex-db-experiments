import assert from "node:assert/strict";
import test from "node:test";
import { DomainOracle } from "../../../bench/lib/w0-gates.ts";
import { W0, factValue } from "../../../bench/lib/w0-world.ts";
import { snapshot } from "./source.ts";
test("all five wide-account widths are valid W0 applicant worlds", async () => {
  const input = snapshot("thin", 5, "", "test"),
    oracle = new DomainOracle();
  try {
    for (let i = 0; i < 5; i++) {
      const group = input.group(i);
      assert(group.ops.every((o) => o.op === "assert"));
      assert.equal(group.ops.length, 6 + i);
      const world = {
          subject: group.ops[0]!.entityId,
          facts: group.ops.map((o) => ({
            e: o.entityId,
            a: o.attribute,
            v: factValue(o.value),
            tx: 1,
          })),
        },
        basis = { tx: 1, validTime: W0.POPULATION_VALID_TIME };
      const r = W0.sweepSubject(world, W0.R1, basis);
      assert.ok(!("error" in r));
      assert.equal(r.json, await oracle.call("evaluate", { world, basis, release: "R1" }));
    }
  } finally {
    oracle.close();
  }
});
