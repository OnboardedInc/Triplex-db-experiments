// M3 round 2: the outage fallback replays the whole log per pull (BrokerStorageAdapter.ts fromLog(0, ...)).
// Measures pull latency during an outage against log size, and what one fallback pull does to a concurrent
// commit's ACK (readFramesFrom is synchronous, so the event loop is blocked for the whole replay).
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { graphIri } from "../../../../packages/qlever/src/rdf.js";
import { ModelReplica, at, freshDir, key, openRt, oracleAt, ops, writeJson } from "./harness.js";

const SIZES = (process.env["V_P2Q_OUTAGE_SIZES"] ?? "2000,10000,30000").split(",").map(Number);
const far = () => Date.now() + 10 ** 9;

describe("outage fallback cost against log size", () => {
  it(`pulls during an outage at ${SIZES.join(", ")} commands`, async () => {
    const out: any[] = [];
    for (const n of SIZES) {
      const scope = `v-p2q-scale:${randomUUID()}`;
      const replica = new ModelReplica(graphIri(scope));
      const rt = await openRt(freshDir(`scale${n}`), scope, replica, { autoApply: false });
      try {
        let next = 0;
        await Promise.all(
          Array.from({ length: 64 }, async () => {
            while (next < n) {
              const i = next++;
              await rt.run(rt.triples.transact(ops(`s:${i % 500}`, 1, `v${i}`)));
            }
          }),
        );
        const head = rt.broker.head();
        const bytes = fs.statSync(rt.broker.segmentPath).size;
        // Baseline: replica reachable (marker 0, overlay route) and a lone commit.
        let t0 = performance.now();
        await rt.run(rt.adapter.getByEntity("s:7", at(head)));
        const overlayPullMs = performance.now() - t0;
        t0 = performance.now();
        await rt.run(rt.triples.transact(ops("s:base", 1, "b")));
        const loneCommitMs = performance.now() - t0;
        replica.down = true;
        const rss0 = process.memoryUsage().rss;
        t0 = performance.now();
        const rows = await rt.run(rt.adapter.getByEntity("s:7", at(head)));
        const outagePullMs = performance.now() - t0;
        const rss1 = process.memoryUsage().rss;
        const exact = key(rows) === key(oracleAt(rt.broker.segmentPath, head, far(), (r) => r.entity_id === "s:7"));
        // A commit submitted while a fallback pull runs: its ACK waits for the replay.
        const c0 = performance.now();
        const commit = rt.run(rt.triples.transact(ops("s:during", 1, "d"))).then(() => performance.now() - c0);
        const pull = rt.run(rt.adapter.getByEntity("s:8", at(head)));
        const [commitDuringPullMs] = await Promise.all([commit, pull]);
        // Eight concurrent outage pulls (a small reader pool).
        t0 = performance.now();
        await rt.run(Effect.all(Array.from({ length: 8 }, (_v, i) => rt.adapter.getByEntity(`s:${i}`, at(head))), { concurrency: "unbounded" }));
        const eightPullsMs = performance.now() - t0;
        replica.down = false;
        const route = rt.reads.at(-1)?.route;
        out.push({ commands: n, segmentBytes: bytes, overlayPullMs: Math.round(overlayPullMs), outagePullMs: Math.round(outagePullMs), eightConcurrentOutagePullsMs: Math.round(eightPullsMs), loneCommitMs: Math.round(loneCommitMs), commitDuringOutagePullMs: Math.round(commitDuringPullMs), rssDeltaMB: Math.round((rss1 - rss0) / 2 ** 20), exact, route });
      } finally {
        await rt.dispose();
        await rt.broker.close();
      }
    }
    writeJson("check3-outage-scale.json", out);
    expect(out.every((o) => o.exact)).toBe(true);
  }, 1_200_000);
});
