import { it, expect } from "vitest";
import { Effect } from "effect";
import {
  makeA0RecordTimeSuite,
  recordTimeDeterministicFixture,
} from "@triplex-build/triplex-testkit";
import { makeXtdbStorageAdapter } from "../src/XtdbStorageAdapter.js";
import type { QueryExecutorService } from "@triplex-build/triplex/runtime";
import { makeRecordTimeClient } from "./fixtures/record-time-client.js";

for (const commitEncoding of ["a0", "compact"] as const)
  it(`offline actual XTDB A0 protocol T1-T12 (${commitEncoding}; deferred T8 N/A)`, async () => {
    const real = makeRecordTimeClient();
    let lose = false;
    const client = {
      ...real,
      submit: async (...args: Parameters<typeof real.submit>) => {
        const r = await real.submit(...args);
        if (lose) {
          lose = false;
          throw new Error("lost ACK");
        }
        return r;
      },
    };
    const suite = makeA0RecordTimeSuite(
      makeXtdbStorageAdapter(client, "offline", { maxRetries: 256, commitEncoding }),
      {} as QueryExecutorService,
      "offline",
      {
        loseNextAck: () => {
          lose = true;
        },
      },
    );
    await Effect.runPromise(suite.run.pipe(Effect.provide(suite.layer)));
  }, 30000);
it("fresh offline A0 receipts are byte-identical across runs and encodings", async () => {
  const runs = [];
  for (const commitEncoding of ["a0", "compact", "a0"] as const) {
    const client = makeRecordTimeClient();
    const suite = makeA0RecordTimeSuite(
      makeXtdbStorageAdapter(client, "determinism", { commitEncoding }),
      {} as QueryExecutorService,
      "determinism",
      { loseNextAck: () => {} },
    );
    runs.push(await Effect.runPromise(recordTimeDeterministicFixture(suite)));
  }
  expect(runs[1]).toEqual(runs[0]);
  expect(runs[2]).toEqual(runs[0]);
});

it("the decided stamp shares the existing A0/compact CAS statement", async () => {
  const { compactGuards } = await import("../src/XtdbStorageAdapter.js");
  for (const ids of [[], ["command"]]) {
    const guards = compactGuards("scope", 7, "op", ids, ["row"], 1000001);
    expect(guards).toHaveLength(2);
    expect(guards[0]!.sql).toContain("MAX(position)");
    expect(guards[0]!.sql).toContain("MAX(stamp)");
    expect(guards[0]!.params!.at(-1)).toBe(1000001);
  }
});
