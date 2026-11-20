import assert from "node:assert/strict";
import test from "node:test";
import { memoryComposition } from "../../../bench/lib/memory.ts";
import { V_W0 } from "../../../bench/lib/w0-world.ts";
import { SEED_VALID_FROM } from "../../../bench/lib/world.ts";
import { keyFor, tenantRows } from "../scale1/tenants.ts";
import { scopedDeepPolicy } from "./solo-policy.ts";
import { compareWorlds, DeepInputs } from "./deep-inputs.ts";
import { seedFacts } from "./model.ts";
import { iso } from "./v3.ts";

test("independent fixture replay detects a rule input removed from both publisher projections", async () => {
  const c = memoryComposition("datomic", "independent-source-inputs"),
    account = { index: 0, key: keyFor(0), first: 0, people: 1000 },
    index = 417,
    ops = tenantRows(account, index).map(({ e, a, v }) => ({
      op: "assert",
      entityId: e,
      attribute: a,
      value: v,
      validFrom: SEED_VALID_FROM,
    })),
    observed = await c.transact(ops, { actor: "seed", commandId: "seed" });
  try {
    assert(observed.ok);
    const inputs = new DeepInputs();
    inputs.ingestSeed(ops, observed.value);
    const { read, catalog } = await scopedDeepPolicy(c, observed.value.position),
      p = catalog.position,
      expected = inputs.world(index, p, V_W0, p),
      [raw] = await read(c, [index], { position: p, validAt: V_W0 }, account.key);
    assert(raw);
    const subject = {
      subject: raw.subject,
      facts: seedFacts(raw, { tx: p, validTime: iso(V_W0) }),
    };
    compareWorlds([subject], [expected]);
    const corrupt = { ...subject, facts: subject.facts.filter((f) => f.a !== "weeklyMinutes") };
    assert.throws(() => compareWorlds([corrupt], [expected]), /differs from commanded inputs/);
    const wrongOrdinal = {
      ...subject,
      facts: subject.facts.map((f) => (f.a === "weeklyMinutes" ? { ...f, tx: p } : f)),
    };
    assert.throws(() => compareWorlds([wrongOrdinal], [expected]), /differs from commanded inputs/);
  } finally {
    await c.close();
  }
});
