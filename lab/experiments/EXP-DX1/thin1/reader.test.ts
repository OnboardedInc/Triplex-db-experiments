import { describe, expect, it, vi } from "vitest";
import {
  DatomicTransportError,
  RecentReads,
  Replica,
} from "../../../../packages/datomic/dist/index.js";
import type { Basis, CompositionHandle } from "../../../bench/lib/composition.ts";
import { ReplicaReader, ReplicaReadHost } from "../../../bench/lib/replica-reads.ts";
import { touchedComposition, touchedPull } from "../../../bench/lib/touched-reads.ts";
import { firstValid, person, seedHead } from "./population.ts";
import { trialStore } from "./trial-store.ts";

describe("touched read through the public gateway", () => {
  it("retries an unavailable exact journal cut once and honors a protection refusal", async () => {
    const open = vi.spyOn(ReplicaReadHost, "open")
      .mockRejectedValueOnce(new Replica.UnsupportedScope("legacy-replica-journal-cut"))
      .mockRejectedValueOnce(new Replica.UnsupportedScope("legacy-replica-protection"));
    const fallback = { triples: [], entities: 0, depth: 0, roundTrips: 1,
      route: "source", language: "reach", waitedMs: 0 };
    const currentPosition = vi.fn().mockResolvedValueOnce(18).mockResolvedValueOnce(19);
    const base = { scopeName: "diagnostic", currentPosition, pull: vi.fn(async () => fallback) };
    vi.stubEnv("DX_TOUCHED_READ_MODE", "following");
    try {
      const reader = touchedComposition(base as unknown as CompositionHandle);
      const basis = { recordedPosition: 17, validAt: firstValid };
      expect(await reader.pull("root", basis)).toBe(fallback);
      expect(await reader.pull("root", basis)).toBe(fallback);
      expect(open.mock.calls.map((call) => call[3].position)).toEqual([18, 19]);
      expect(base.pull).toHaveBeenCalledWith("root", basis, undefined);
    } finally {
      open.mockRestore();
      vi.unstubAllEnvs();
    }
  });

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
