import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { open } from "../act1/check.ts";
import { W0 } from "../../../bench/lib/w0-world.ts";
import { Account } from "./account.ts";
import { Objects } from "./store.ts";
import type { Body } from "./model.ts";
test("an unavailable protected index checks every person before ACK and rejects an invalid last member", async () => {
  const c = await open("act1-" + randomUUID()),
    db = new Objects(c, "test"),
    a = new Account(db, "unindexed"),
    ids = ["pl:a", "pl:z"],
    rel = W0.compileRelease({
      ...W0.R1.doc,
      rules: W0.R1.doc.rules.map((e) =>
        e.id === "EVSUB" ? { ...e, params: { businessDays: 10 } } : e,
      ),
    } as W0.ReleaseDoc);
  try {
    await a.bootstrap(
      ids,
      ids.map((s) => ({ subject: s, facts: [{ e: s, a: "startDate", v: "2026-11-01", tx: 1 }] })),
      { tx: 1, validTime: W0.POPULATION_VALID_TIME },
    );
    const ok = await a.seal("protected", rel),
      e = await db.get<{ shape: string; fullCheck: { people: number; digest: string } }>(
        "event:1",
        ok.position,
      );
    assert.equal(e.value.shape, "full");
    assert.equal(e.value.fullCheck.people, 2);
    assert.match(e.value.fullCheck.digest, /^[a-f0-9]{64}$/);
    const k = "point:" + ids[1],
      p = await db.get<Body>(k, ok.position);
    await db.commit("damaged-source", [
      { key: k, prior: p, value: { ...p.value, seed: [...p.value.seed, p.value.seed[0]] } },
    ]);
    // [DX-ACT2] Why: the failure must be in the pinned prefix. Rejected: corrupting an unrelated later cut (historical data remains correct).
    const h = await a.head(await c.currentPosition());
    await db.commit("source-version", [
      {
        key: "head",
        prior: h,
        value: { ...h.value, frontier: h.value.frontier + 1, certified: h.value.certified + 1 },
      },
    ]);
    const before = await c.currentPosition();
    await assert.rejects(a.seal("bad", W0.R1), /W0.E_CARDINALITY/);
    const end = await c.currentPosition();
    assert.deepEqual(await a.head(end), await a.head(before));
    assert.equal((await db.many(["fence", "event:2"], end)).size, 0);
  } finally {
    await c.close();
  }
});
