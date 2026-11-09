import assert from "node:assert/strict";
import { test } from "node:test";
import { Replay, canonical, oracleInputBytes } from "./lib/di01-harness.ts";
import { V_W0, visibleRows, reachableRows, worldOf } from "./lib/w0-world.ts";
test("expected-world cache preserves old cuts, shared-hop changes and unlinked owned records", () => {
  const r = new Replay();
  r.add(
    [
      ["pl:a", "location", "loc:a"],
      ["loc:a", "jurisdiction", "jur:a"],
      ["jur:a", "stateMinWageCents", 1700],
    ],
    V_W0,
  );
  const first = canonical(r.world("pl:a", 1, V_W0));
  assert.equal(canonical(r.world("pl:a", 1, V_W0)), first);
  assert(r.cacheStats.hits > 0);
  r.add([["jur:a", "stateMinWageCents", 1800]], V_W0);
  assert.equal(canonical(r.world("pl:a", 1, V_W0)), first);
  assert.equal(r.world("pl:a", 2, V_W0).facts.find((f) => f.a === "stateMinWageCents")?.v, 1800);
  r.add(
    [
      ["loc:a", "jurisdiction", "jur:b"],
      ["jur:b", "stateMinWageCents", 2000],
    ],
    V_W0,
  );
  assert.equal(canonical(r.world("pl:a", 1, V_W0)), first);
  const third = r.world("pl:a", 3, V_W0);
  assert.equal(third.facts.find((f) => f.a === "stateMinWageCents")?.e, "jur:b");
  assert.equal(third.facts.find((f) => f.a === "stateMinWageCents")?.v, 2000);
  r.add([["pl:a/doc:1", "docType", "ead"]], V_W0);
  assert.equal(canonical(r.world("pl:a", 4, V_W0)), canonical(third));
  r.add([["pl:a", "documents", "pl:a/doc:1"]], V_W0);
  assert(r.world("pl:a", 5, V_W0).facts.some((f) => f.e === "pl:a/doc:1"));
  assert.equal(canonical(r.world("pl:a", 1, V_W0)), first);
  assert.equal(r.world("pl:a", 1, V_W0 - 1).facts.length, 0);
  for (const p of [1, 2, 3, 4, 5, 1, 5]) {
    const reference = worldOf(
      "pl:a",
      reachableRows(["pl:a"], visibleRows(r.rows, { position: p, validAt: V_W0 })),
    );
    const world = r.world("pl:a", p, V_W0);
    assert.equal(canonical(world), canonical(reference));
    assert(
      Object.isFrozen(world) && Object.isFrozen(world.facts) && world.facts.every(Object.isFrozen),
    );
    const input = {
      basis: { tx: p, validTime: "2026-11-04T12:00:00.000000Z" },
      release: "R1",
      worlds: [world],
      writes: [["pl:a", "location"]],
    };
    assert.equal(oracleInputBytes(input), canonical(input));
  }
});

test("oracle encoding does not memoize mutable caller worlds", () => {
  const world = { subject: "pl:a", facts: [] as any[] },
    input = {
      basis: { tx: 1, validTime: "2026-11-04T12:00:00.000000Z" },
      release: "R1",
      worlds: [world],
      writes: [],
    };
  const first = oracleInputBytes(input);
  world.facts.push({ e: "pl:a", a: "startDate", v: "2026-11-02", tx: 1 });
  assert.notEqual(oracleInputBytes(input), first);
  assert.equal(oracleInputBytes(input), canonical(input));
});
