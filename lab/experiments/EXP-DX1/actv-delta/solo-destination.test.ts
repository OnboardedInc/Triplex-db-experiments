import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { memoryComposition } from "../../../bench/lib/memory.ts";
import { soloScope } from "./solo-population.ts";
test("one attempt leaves its large database empty after writing the preflight database", async () => {
  const nonce = randomUUID(),
    stores = new Map<string, ReturnType<typeof memoryComposition>>();
  function open(people: number) {
    const name = soloScope(nonce, people);
    let c = stores.get(name);
    if (!c) {
      c = memoryComposition("datomic", name);
      stores.set(name, c);
    }
    return c;
  }
  const small = open(1000),
    large = open(100000);
  try {
    const r = await small.transact(
      [
        {
          op: "assert",
          entityId: "preflight",
          attribute: "proof",
          value: { type: "string", value: nonce },
          validFrom: 0,
        },
      ],
      { actor: "preflight", commandId: "preflight-completed" },
    );
    assert(r.ok && r.value.position > 0);
    assert.equal(await open(1000).currentPosition(), r.value.position);
    assert.equal(await open(100000).currentPosition(), 0);
    assert.notEqual(small.scopeName, large.scopeName);
  } finally {
    await Promise.all([...stores.values()].map((x) => x.close()));
  }
});
