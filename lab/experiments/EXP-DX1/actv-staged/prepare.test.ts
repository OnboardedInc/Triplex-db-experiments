import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { memoryComposition } from "../../../bench/lib/memory.ts";
import { DomainOracle } from "../../../bench/lib/w0-gates.ts";
import { W0, canonical } from "../../../bench/lib/w0-world.ts";
import { Account } from "./account.ts";
import { prepare } from "./prepare.ts";
import { WorldSource, field, seedWorlds } from "./world-source.ts";

test("candidate pages cover complete source membership and rebase on a two-hop change", async () => {
  const store = memoryComposition("datomic", "stg-" + randomUUID()),
    src = new WorldSource(store),
    a = new Account(store, src);
  const oracle = new DomainOracle(),
    v = W0.POPULATION_VALID_TIME;
  try {
    await seedWorlds(store, 65);
    await a.initialize(v);
    await a.open("g1", "R2", v);
    let result = await prepare(a, "g1");
    assert.equal(result.evaluated, 65);
    assert.equal(result.seal.count, 65);
    const old = await src.rows(["jur:j000"], { position: await a.head(), validTime: v });
    await a.save("floor", [
      { op: "retract", id: old[0]!.id },
      field("jur:j000", "stateMinWageCents", 1800),
    ]);
    await a.settle();
    result = await prepare(a, "g1");
    assert.equal(result.evaluated, 65);
    const { seal } = result;
    for (let n = 0; n < 3; n++) {
      const rows = await a.page(seal.root, "g1", n, await a.head());
      const worlds = await src.worlds(
        rows.map((l) => l.subject),
        { position: seal.cut, validTime: v },
      );
      for (const [i, leaf] of rows.entries()) {
        const basis = { tx: seal.cut, validTime: v };
        assert.equal(
          W0.outputJson({ ...leaf.answer, basis }),
          await oracle.call("evaluate", { world: worlds[i], basis, release: "R2" }),
        );
      }
    }
    assert.equal((await prepare(a, "g1")).evaluated, 0);
    await a.cancel("g1");
    await assert.rejects(prepare(a, "g1"), /superseded/);
    await a.open("g2", "R3", v);
    assert.notEqual(canonical((await prepare(a, "g2")).seal.root), canonical(seal.root));
  } finally {
    oracle.close();
    await store.close();
  }
});
