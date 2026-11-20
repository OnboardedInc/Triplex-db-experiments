import { describe, expect, it } from "vitest";
import {
  DatomicTransportError,
  RecentReads,
  Replica,
} from "../../../../packages/datomic/dist/index.js";
import type { Basis } from "../../../bench/lib/composition.ts";
import { ReplicaReader } from "../../../bench/lib/replica-reads.ts";
import { touchedPull } from "../../../bench/lib/touched-reads.ts";
import { firstValid, person, seedHead } from "./population.ts";
import { trialStore } from "./trial-store.ts";

describe("touched read through the public gateway", () => {
  it("falls back on transport failure and surfaces an admission content error", async () => {
    const store = await trialStore(50, "thin-reader-test", false);
    const p = seedHead(50),
      root = person(0);
    const basis = { recordedPosition: p, validAt: firstValid } as Basis;
    let fault: Error = new DatomicTransportError("read peer unavailable"),
      fallbacks = 0;
    const replica = new Replica(
      {
        ...store.source,
        async page() {
          throw fault;
        },
      },
      firstValid,
      "touched",
    );
    const index = new RecentReads(),
      reader = new ReplicaReader(undefined, index);
    replica.onUpdate = (delta) => index.apply(delta);
    await replica.bootstrap([], p);
    const exact = () => store.pull(root, p, firstValid);
    const read = () =>
      touchedPull(reader, replica, root, basis, () => {
        fallbacks++;
        return exact();
      });
    try {
      expect((await read()).triples).toEqual((await exact()).triples);
      expect(fallbacks).toBe(1);
      fault = new Error("mismatched rows at the same cut");
      await expect(read()).rejects.toThrow(fault.message);
      expect(fallbacks).toBe(1);
    } finally {
      await replica.stop();
      await store.close();
    }
  });
});
