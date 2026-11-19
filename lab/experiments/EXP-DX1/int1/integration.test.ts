import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { Account, policyId, seedFacts } from "./account.ts";
import { activate, eadRelease } from "./activation.ts";
import { DeepProjectionIndex } from "../../../bench/lib/deep-projection-index.ts";
import { policyWorld } from "../../../bench/lib/deep-activation.ts";
import { memoryComposition } from "../../../bench/lib/memory.ts";
import { W0, V_W0, canonical } from "../../../bench/lib/w0-world.ts";
import { smallPeople } from "../scale1/small-plan.ts";
import { cases } from "./bench-cases.ts";
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "int1-suite-"));
test("certified deep worlds avoid a source pull, dirty worlds use it, and a changed committed prefix refuses restart", async () => {
  const dir = tmp(),
    comp = await memoryComposition("datomic", "deep-projection-" + randomUUID());
  let pulls = 0;
  const original = comp.sweepPage;
  comp.sweepPage = async (...args) => {
    pulls++;
    return original(...args);
  };
  const db = path.join(dir, "index");
  let index = new DeepProjectionIndex(db, "scope-generation", policyWorld);
  try {
    const ack = await comp.transact(seedFacts("deep", 0), { commandId: "seed", actor: "import" });
    assert(ack.ok);
    let cut = { position: ack.value.position, validAt: V_W0 };
    await index.catchUp(comp, cut);
    const [w] = [...(await index.worlds(comp, [0], cut)).values()];
    assert.equal(pulls, 0);
    const actual = await original(["pl:00000000"], cut);
    assert.deepEqual(w, policyWorld(0, actual.rows, cut));
    index.close();
    index = new DeepProjectionIndex(db, "scope-generation", policyWorld);
    const change = await comp.transact(
      [
        {
          op: "assert",
          entityId: "pl:00000000",
          attribute: ":int1/activity",
          value: { type: "string", value: "x" },
          validFrom: V_W0,
        },
      ],
      { commandId: "next", actor: "import" },
    );
    assert(change.ok);
    const newer = { ...cut, position: change.value.position };
    await index.catchUp(comp, newer);
    await index.worlds(comp, [0], cut);
    assert.equal(pulls, 0);
    await index.worlds(comp, [0], newer);
    assert.equal(pulls, 1);
    const foreign = await memoryComposition("datomic", "foreign-" + randomUUID());
    try {
      await assert.rejects(index.catchUp(foreign, newer));
    } finally {
      await foreign.close();
    }
  } finally {
    index.close();
    await comp.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
test("pooled and isolated deep accounts keep identical original intents, roster, oracle decisions and every durable guard", async () => {
  const arm = async (pooled: boolean) => {
    const dir = tmp(),
      handles = [] as Awaited<ReturnType<typeof memoryComposition>>[],
      accounts: Account[] = [];
    try {
      for (let n = 0; n < 2; n++) {
        const c =
          pooled && n ? handles[0]! : await memoryComposition("datomic", "account-" + randomUUID());
        if (!handles.includes(c)) handles.push(c);
        const a = new Account(
          c,
          "deep",
          "bound-" + n,
          n * 4,
          4,
          new DatabaseSync(":memory:"),
          pooled ? accounts[0]?.cursor : undefined,
        );
        accounts.push(a);
        await a.seed([0, 1, 2, 3].map((i) => i + n * 4));
      }
      const out = [];
      for (const a of accounts) {
        await a.update(a.first);
        const values = [];
        for (const r of [W0.R1, eadRelease()]) {
          const write = await a.comp.transact(
            [
              {
                op: "assert",
                entityId: "release-" + a.first,
                attribute: "active",
                value: { type: "string", value: r.hash },
                validFrom: V_W0,
              },
            ],
            { commandId: "release-" + a.first + r.name, actor: "release" },
          );
          assert(write.ok);
          a.head = write.value.position;
          const d = await activate(a, dir, r, a.head, async () => {});
          assert.equal(d.oracle, 4);
          assert.equal(d.guardReadbacks, 4);
          values.push(d.logical);
          a.head = await a.comp.currentPosition();
        }
        out.push([a.first, a.roster(), values]);
      }
      assert.equal(handles.length, pooled ? 1 : 2);
      return out;
    } finally {
      for (const a of accounts) a.db.close();
      for (const h of handles) await h.close();
      fs.rmSync(dir, { recursive: true, force: true });
    }
  };
  assert.deepEqual(await arm(true), await arm(false));
});
test("the physical plan freezes the same 29,000 people in both 100-account placements", () => {
  const sizes = Array.from({ length: 100 }, (_, i) => smallPeople(i));
  assert.equal(
    sizes.reduce((a, b) => a + b),
    29000,
  );
  assert.equal(sizes.filter((n) => n === 2000).length, 10);
  assert.deepEqual(
    cases.map((c) => [c.size, c.scopes]),
    [
      [1000000, 1],
      [4000000, 1],
      [29000, 1],
      [29000, 100],
    ],
  );
});
