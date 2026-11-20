import assert from "node:assert/strict";
import { test } from "node:test";
import { interpreter, type Recipe, type Tail } from "../../notify1/journal.ts";
import type { Op } from "../../notify1/store.ts";
import { valid } from "../fixture.ts";
import type { Store } from "../store.ts";
import { JoinedAccount } from "./account.ts";
import { selector } from "./index.ts";

test("shared location and jurisdiction saves record census reconciles", async () => {
  const account = new JoinedAccount({
    profile: "w0",
    comp: { scopeName: "shared-fixture" },
  } as Store);
  const cut = 10;
  const census = { id: "fixture", count: 2, members: "fixture-members" };
  const tail: Tail = {
    epoch: "fixture-epoch",
    census,
    sequence: 1,
    parent: "fixture-parent",
    release: "R2",
    from: valid,
    validTime: valid,
    inputs: selector,
    evaluator: interpreter,
  };
  // [DX-ACT1] Why: run real save and journal planning across the native cut boundary. Rejected: a test that normalizes an owner independently of the save handler.
  Object.assign(account, {
    command: (_id: string, _args: unknown, plan: (cut: number) => Promise<{ ops: Op[] }>) =>
      plan(cut),
    state: async () => ({
      meta: { epoch: tail.epoch, valid },
      c: { at: valid },
      tail: { key: "tail", id: "tail-row", at: cut, value: tail },
    }),
    intervals: async () => [],
  });
  account.db.row = async (key) => {
    assert.equal(key, "join-invalid");
    return undefined;
  };
  for (const [entity, attribute] of [
    ["loc:shared", "localMinWageCents"],
    ["jur:shared", "stateMinWageCents"],
  ] as const) {
    const { ops } = await account.save(
      "shared-save",
      { e: entity, a: attribute, values: [1810] },
      valid,
    );
    const event = ops.find(
      (op: Op) => op.op === "assert" && op.entityId === account.db.prefix + "event:2",
    );
    assert(event?.op === "assert");
    const recipe: Recipe = JSON.parse(String(event.value.value));
    assert.deepEqual(recipe.selection, { kind: "census" });
    assert.deepEqual(recipe.census, census);
    assert.equal(recipe.sourceBefore, cut);
    assert.equal(recipe.ownerProof, undefined);
  }
});
