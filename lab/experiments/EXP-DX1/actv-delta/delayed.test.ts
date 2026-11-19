import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { open } from "../act1/check.ts";
import { DomainOracle } from "../../../bench/lib/w0-gates.ts";
import { W0 } from "../../../bench/lib/w0-world.ts";
import { Account } from "./account.ts";
import { Objects } from "./store.ts";
import { save } from "./save.ts";
const early = "2026-11-04T11:59:59.999998Z",
  beforeNoon = "2026-11-04T11:59:59.999999Z",
  noon = W0.POPULATION_VALID_TIME;
for (const name of [
  "held pay change",
  "first item after empty evaluation",
  "equal transaction with earlier valid time",
]) {
  test("account record / " + name, async () => {
    const c = await open("act1-" + randomUUID()),
      a = new Account(new Objects(c, "held"), "literal"),
      o = new DomainOracle(),
      s = "pl:x",
      rate = name.startsWith("first") ? 1650 : 1600;
    const f = (e: string, a: string, v: W0.Fact["v"], tx = 1): W0.Fact => ({ e, a, v, tx });
    const fixed = [
      f(s, "location", "loc:l"),
      f("loc:l", "jurisdiction", "jur:j"),
      f("jur:j", "stateMinWageCents", 1650),
      f(s, "bgcStatus", "clear"),
      f(s, "everifyStatus", "authorized"),
    ];
    try {
      await a.bootstrap([s], [{ subject: s, facts: [...fixed, f(s, "payRateCents", rate, 10)] }], {
        tx: 10,
        validTime: early,
      });
      const read15 = await save(
        a,
        "fact15",
        [{ e: s, a: "payRateCents", values: [1500], from: beforeNoon }],
        { originTx: 15 },
      );
      const held15 = await a.readAt(s, read15.position, noon);
      await save(a, "fact19", [{ e: s, a: "payRateCents", values: [rate], from: noon }], {
        originTx: 19,
      });
      const at20 = await a.seal("clock20", W0.R1, { valid: noon }),
        live = await a.readAt(s, at20.position),
        held = name.startsWith("equal") ? await a.readAt(s, at20.position, beforeNoon) : held15;
      assert.deepEqual(held.output.basis, {
        tx: name.startsWith("equal") ? 20 : 15,
        validTime: name.startsWith("equal") ? beforeNoon : noon,
      });
      assert.equal(
        W0.outputJson(held.output),
        await o.call("evaluate", {
          basis: held.output.basis,
          world: { subject: s, facts: [...fixed, f(s, "payRateCents", 1500, 15)] },
          release: "R1",
        }),
      );
      assert.deepEqual(live.output.basis, { tx: 20, validTime: noon });
      assert.equal(
        W0.outputJson(live.output),
        await o.call("evaluate", {
          basis: live.output.basis,
          world: { subject: s, facts: [...fixed, f(s, "payRateCents", rate, 19)] },
          release: "R1",
        }),
      );
      await assert.rejects(a.admit("delayed", held), /stale live result/);
      assert.equal(await c.currentPosition(), at20.position);
      const settled = await a.readAt(s, at20.position);
      assert.deepEqual(
        settled.state.pending.map((d) => [d.rule, d.seq]),
        rate === 1650 ? [] : [["MINWAGE", 1n]],
      );
      assert.deepEqual(settled.state.subjects, [
        { subject: s, basis: { tx: 20n, validTime: noon } },
      ]);
    } finally {
      o.close();
      await c.close();
    }
  });
}
