import assert from "node:assert/strict";
import { test } from "node:test";
import { reachPull } from "../lib/composition.ts";

test("reach uses one closure call; split reads keep the basis and reject a changed root", async () => {
  const basis = { recordedAt: 123, validAt: 100 };
  const root = { id: "a", entityId: "root", attribute: ":a", value: { type: "string", value: "before" } };
  const child = { ...root, id: "b", entityId: "child" };
  const calls: string[] = [];
  let changed = false;
  const handle: any = {
    triples: {
      entities: (ids: string[], at: unknown) => {
        calls.push("entities"); assert.deepEqual(ids, ["root"]); assert.equal(at, basis);
        return [[root]];
      },
      reach: (id: string, at: unknown) => {
        calls.push("reach"); assert.equal(id, "root"); assert.equal(at, basis);
        return { triples: [{ value: changed ? { type: "string", value: "after" } : root.value,
          attribute: root.attribute, entityId: root.entityId, id: root.id }, child], hops: 2 };
      },
    },
    run: async (value: unknown) => value,
  };
  const single = await reachPull(handle, "root", basis, undefined, "test");
  assert.deepEqual(calls.splice(0), ["reach"]);
  assert.equal(single.roundTrips, 1);
  assert.equal(single.entities, 2);
  const split = await reachPull(handle, "root", basis, async () => { calls.push("between"); }, "test");
  assert.deepEqual(calls.splice(0), ["entities", "between", "reach"]);
  assert.equal(split.roundTrips, 2);
  await assert.rejects(reachPull(handle, "root", basis, async () => { changed = true; }, "test"), /snapshot violation/);
});
