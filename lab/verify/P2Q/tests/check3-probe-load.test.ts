// New-defect probe (round 2): how many marker probes the Datalog gate sends while it waits. awaitReplica
// (broker.ts) probes the replica in its own request on every pass: every 10 ms when the cached marker is
// already at or above B (a regression the applier has not repaired yet), else after each 100 ms publication wait.
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { graphIri } from "../../../../packages/qlever/src/rdf.js";
import { ModelReplica, freshDir, openRt, ops, sleep, writeJson } from "./harness.js";

const countingMarkers = (replica: ModelReplica) => {
  let n = 0;
  const query = replica.query.bind(replica);
  replica.query = async (sparql: string) => {
    if (sparql.startsWith("SELECT ?brokerPosition ?brokerEpoch")) n++;
    return query(sparql);
  };
  return () => n;
};

describe("Datalog gate probe load while waiting", () => {
  it("16 waiters for 1 s: during an unrepaired regression and during ordinary publication lag", async () => {
    const out: Record<string, unknown> = {};
    for (const scenario of ["regression", "lag"] as const) {
      const scope = `v-p2q-probe:${randomUUID()}`;
      const replica = new ModelReplica(graphIri(scope));
      const rt = await openRt(freshDir(`probe-${scenario}`), scope, replica, { idleProbeMs: 60_000 }, { basisWaitMs: 1_000 });
      try {
        const before = replica.snapshot();
        if (scenario === "lag") replica.hold(); // publication of the commit is slow
        const a = await rt.run(rt.triples.transact(ops("s:p", 1, "p")));
        if (scenario === "regression") {
          expect(await rt.broker.drain(10_000)).toBe(true);
          replica.hold(); // the repair (fence and replay) cannot complete inside the window
          replica.restore(before);
        }
        const markers = countingMarkers(replica);
        const t0 = performance.now();
        const results = await Promise.all(
          Array.from({ length: 16 }, () => rt.adapter.resolveQueryBasis(a.position).then(() => "answered", (e: any) => `${e?._tag}:${e?.reason}`)),
        );
        const ms = performance.now() - t0;
        out[scenario] = { waiters: 16, windowMs: Math.round(ms), markerProbes: markers(), probesPerWaiterPerSecond: Math.round(markers() / 16 / (ms / 1000)), outcomes: [...new Set(results)] };
        replica.release();
        await sleep(50);
      } finally {
        replica.release();
        await rt.dispose();
        await rt.broker.close();
      }
    }
    writeJson("check3-probe-load.json", out);
    expect(out).toBeDefined();
  });
});
