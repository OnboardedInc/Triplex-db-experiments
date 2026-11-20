import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";
import { W0 } from "../../../bench/lib/w0-world.ts";
import { LookupIndex } from "./lookup.ts";
test("every legal business-day value and the document midnight boundary match a full census", () => {
  const r = W0.rung(50),
    worlds = [...W0.population(r)].map((p) => p.world),
    ids = worlds.map((w) => w.subject);
  const variants = [W0.R1];
  for (const [rule, key, limit] of [
    ["I9S2", "businessDays", 10],
    ["EVSUB", "businessDays", 10],
    ["EVSTAT", "tncBusinessDays", 20],
  ] as const)
    for (let days = 1; days <= limit; days++)
      variants.push(
        W0.compileRelease({
          ...W0.R1.doc,
          rules: W0.R1.doc.rules.map((e) =>
            e.id === rule ? { ...e, params: { [key]: days } } : e,
          ),
        } as W0.ReleaseDoc),
      );
  variants.push(W0.R2);
  for (const validTime of ["2026-11-04T23:59:59.999999Z", "2026-11-05T00:00:00.000000Z"]) {
    const basis = { ...W0.populationBasis(r), validTime },
      pairs = variants.map((_, i) => [0, i]),
      idx = new LookupIndex(ids, worlds, basis);
    const out = JSON.parse(
      execFileSync("python3", ["lab/experiments/EXP-DX1/actv-delta/oracle.py"], {
        input:
          JSON.stringify({ worlds, basis, releases: variants.map((r) => r.doc), pairs }) + "\n",
        encoding: "utf8",
      }),
    );
    for (const [i, rel] of variants.entries())
      assert.deepEqual(
        idx.select(W0.R1, rel, () => {
          throw Error("unexpected world pull");
        }).keys,
        out[i].keys,
      );
  }
});
