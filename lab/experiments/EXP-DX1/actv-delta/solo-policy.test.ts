import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { memoryComposition } from "../../../bench/lib/memory.ts";
import { V_W0, W0 } from "../../../bench/lib/w0-world.ts";
import { SEED_VALID_FROM } from "../../../bench/lib/world.ts";
import { keyFor, tenantRows } from "../scale1/tenants.ts";
import { evaluate } from "./model.ts";
import { scopedDeepPolicy } from "./solo-policy.ts";
import { iso } from "./v3.ts";

test("both deep release transitions change decisions using the source facts", async () => {
  const c = memoryComposition("datomic", "deep-policy-" + randomUUID()),
    account = { first: 0, index: 0, people: 2000, key: keyFor(0) },
    ids = [17, 417, 418, 717, 1417];
  try {
    const source = await c.transact(
      ids.flatMap((i) =>
        tenantRows(account, i).map(({ e, a, v }) => ({
          op: "assert",
          entityId: e,
          attribute: a,
          value: v,
          validFrom: SEED_VALID_FROM,
        })),
      ),
      { actor: "seed", commandId: "seed" },
    );
    assert(source.ok);
    const { catalog, read } = await scopedDeepPolicy(c, source.value.position),
      p = catalog.position,
      basis = { tx: p, validTime: iso(V_W0) },
      worlds = await read(c, ids, { position: p, validAt: V_W0 }, account.key),
      flags = (w: W0.World, release: W0.CompiledRelease) =>
        evaluate(w, release, basis).flags.some((f) => f.name === "overtime");
    assert.deepEqual(
      worlds.map((w) => [flags(w, W0.R2), flags(w, W0.R3)]),
      [
        [false, false],
        [true, false],
        [true, true],
        [true, true],
        [true, false],
      ],
    );
    const floor = (w: W0.World) => w.facts.find((f) => f.a === "stateMinWageCents");
    assert.deepEqual(floor(worlds[1]!), floor(worlds[4]!));
    assert.equal(floor(worlds[1]!)?.tx, p);
    await assert.rejects(read(c, ids, { position: p - 1, validAt: V_W0 }, account.key));
    const decision = (w: W0.World, release: W0.CompiledRelease) => {
      const { tasks, flags } = evaluate(w, release, basis);
      return JSON.stringify([tasks, flags]);
    };
    assert(worlds.some((w) => decision(w, W0.R1) !== decision(w, W0.R2)));
  } finally {
    await c.close();
  }
});
