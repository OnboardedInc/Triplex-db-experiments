import assert from "node:assert/strict";
import { test } from "node:test";
import { DomainOracle } from "../../../bench/lib/w0-gates.ts";
import { W0 } from "../../../bench/lib/w0-world.ts";
import { wageRangeMember } from "./copy-plan.ts";

test("copied wage ranges match the oracle in both release directions", async () => {
  const oracle = new DomainOracle(new URL("./oracle.py", import.meta.url).pathname);
  const worlds: W0.World[] = [];
  for (const state of [undefined, 1600, 1800])
    for (const local of [undefined, 1700, 1900])
      for (const pay of [undefined, 1500, 1600, 1700, 1800, 1900, 2000]) {
        const subject = W0.placementId(worlds.length),
          doc = subject + "/doc:expiry",
          facts: W0.Fact[] = [];
        const put = (e: string, a: string, v: W0.Fact["v"]) => facts.push({ e, a, v, tx: 1 });
        put(subject, "bgcStatus", "clear");
        put(subject, "location", "loc:a");
        put("loc:a", "jurisdiction", "jur:a");
        put(subject, "documents", doc);
        put(doc, "docType", "ead");
        put(doc, "expiresOn", "2026-10-30");
        if (pay !== undefined) put(subject, "payRateCents", pay);
        if (state !== undefined) put("jur:a", "stateMinWageCents", state);
        if (local !== undefined) put("loc:a", "localMinWageCents", local);
        worlds.push({ subject, facts });
      }
  const selected = worlds.filter(wageRangeMember).map((w) => w.subject);
  assert(selected.length > 0 && selected.length < worlds.length);
  try {
    for (const [index, release] of (["R1", "R2", "R1"] as const).entries()) {
      const expected = JSON.parse(
        await oracle.call("coverage", {
          basis: { tx: index + 1, validTime: W0.POPULATION_VALID_TIME },
          release,
          worlds,
        }),
      ) as { affected: string[] };
      if (index > 0) {
        assert.deepEqual(expected.affected, selected);
        assert.deepEqual(
          worlds.filter((w) => !expected.affected.includes(w.subject)).map((w) => w.subject),
          worlds.filter((w) => !wageRangeMember(w)).map((w) => w.subject),
        );
      }
    }
  } finally {
    await oracle.close();
  }
});
