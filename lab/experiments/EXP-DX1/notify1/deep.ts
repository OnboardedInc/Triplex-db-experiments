import assert from "node:assert/strict";
import type { CompositionHandle, Receipt } from "../../../bench/lib/composition.ts";
import { readDeepWorlds } from "../../../bench/lib/deep-activation.ts";
import { DeepWriter } from "../../../bench/lib/deep-command.ts";
import { makeDeepTrace, deepSeed } from "../../../bench/lib/deep-trace.ts";
import { W0 } from "../../../bench/lib/w0-world.ts";
import { ids as entities } from "../../../bench/lib/world.ts";
import { seedAccounts } from "../act2/rung.ts";
import { keyFor, tenantQueries } from "../scale1/tenants.ts";
import type { Cut } from "./journal.ts";
import type { Op } from "./store.ts";
import type { Profile } from "./workload.ts";

export async function deepProfile(
  store: CompositionHandle,
  n: number,
  date: string,
  reader: CompositionHandle = store,
): Promise<Profile> {
  const account = { index: 0, key: keyFor(0), first: 0, people: n };
  const plan = makeDeepTrace(deepSeed(0), n, 7200),
    offers = plan.events,
    ids = Array.from({ length: n }, (_, i) => W0.placementId(i));
  const writer = new DeepWriter(new Set(offers.map((e) => e.subject)));
  // [DX-STG1] Why: bind the frozen writer's actual predecessor rows during the original deep seed, including mutable task fields. Rejected: replaying matching traffic timestamps with synthetic one-field saves on the server.
  const seeding = {
    ...store,
    transact: async (...args: Parameters<CompositionHandle["transact"]>) => {
      const result = await store.transact(...args);
      if (result.ok) writer.bind(result.value);
      return result;
    },
  };
  await seedAccounts(seeding, [account]);
  const v = Date.parse(date);
  const project = (handle: CompositionHandle) => async (s: string[], cut: Cut) => {
    const result: W0.World[] = [];
    for (let j = 0; j < s.length; j += 32)
      result.push(
        ...(await readDeepWorlds(
          handle,
          s.slice(j, j + 32).map((id) => Number(id.slice(4))),
          { position: cut.position, validAt: Date.parse(cut.validTime) },
          account.key,
        )),
      );
    return result;
  };
  const worlds = project(store);
  const input = {
    identity: "act2-native-deep-policy-v1",
    async roster(cut: Cut) {
      const proof = await tenantQueries(store, [account], {
        position: cut.position,
        validAt: Date.parse(cut.validTime),
      });
      assert.equal(proof.counts[account.key], n);
      return ids;
    },
    worlds,
  };
  const by = new Map(offers.map((e) => [e.seq, e]));
  return {
    inputs: input,
    readWorlds: project(reader),
    ids,
    validTime: date,
    offers,
    witness: worlds,
    async write(e, cut) {
      const event = by.get(e.seq)!;
      const page = await store.sweepPage([entities.placement(e.subject)], {
        position: cut.position,
        validAt: v,
      });
      const stamp = page.rows.find(
        (r) => r.entityId === entities.placement(e.subject) && r.attribute === ":placement/stamp",
      );
      const address = page.rows.find(
        (r) => r.entityId === entities.worker(e.subject) && r.attribute === ":worker/address",
      );
      assert(stamp && address);
      writer.bind({ triples: page.rows } as unknown as Receipt);
      const b = writer.build(
        "notice",
        event,
        {
          stamp: Number(stamp.value.value),
          stampId: stamp.id,
          stampValidFrom: stamp.validFrom,
          address: address.value.value,
          addressId: address.id,
          addressValidFrom: address.validFrom,
        },
        v,
      );
      return { ops: b.operations as Op[], checks: b.preconditions };
    },
  };
}
