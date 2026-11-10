import { randomUUID } from "node:crypto";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { DatabaseScope } from "@triplex-build/triplex/runtime";
import { DatomicClient } from "../src/DatomicClient.js";
import { makeDatomicStorageAdapter } from "../src/DatomicStorageAdapter.js";
import { publicSweep, portableSweep } from "../../../lab/bench/lib/w0-public.js";
// [DX-B5-L5] Why: row order, shared refs and recorded positions must survive the page optimization.
// Rejected: a reader comparison that still calls the old portable-only Datomic helper.
describe.skipIf(process.env.DATOMIC_INTEGRATION !== "1")("W0 row page", () => {
  for (const layout of ["legacy", "lean"] as const) it(`equals the portable BFS in one HTTP request (${layout})`, async () => {
    const c = new DatomicClient(process.env.DATOMIC_GATEWAY_URL ?? "http://127.0.0.1:8505", 30000);
    const scope = DatabaseScope.test(`b5-page-${randomUUID()}`), a = makeDatomicStorageAdapter(c, scope, {layout});
    try {
      await Effect.runPromise(a.initialize());
      await Effect.runPromise(a.withTransaction(Effect.gen(function* () {
        const p = yield* a.nextCommitPosition();
        for (let i = 0; i < 64; i++) yield* a.insert({entityId: `s${i}`, attribute: "shared", value: {type: "ref", value: "shared"}, validFrom: 0}, "tx", 10, `ref${i}`, p);
        yield* a.insert({entityId: "shared", attribute: "value", value: {type: "integer", value: "42"}, validFrom: 0}, "tx", 10, "value", p);
      })));
      await Effect.runPromise(a.withTransaction(Effect.gen(function* () {
        const p = yield* a.nextCommitPosition();
        yield* a.retract("value", 20, "tx2", p);
        yield* a.insert({entityId: "shared", attribute: "value", value: {type: "integer", value: "43"}, validFrom: 0}, "tx2", 20, "value2", p);
      })));
      const handle = {storage: a, scope, backend: {name: "datomic"}, run: Effect.runPromise} as any;
      const selected = await publicSweep("datomic", handle), portable = portableSweep(handle);
      for (const position of [1, 2]) {
        const subjects = Array.from({length: 64}, (_, i) => `s${i}`), basis = {position, validAt: 30};
        const expected = await portable.page(subjects, basis);
        let calls = 0; c.onRequest = () => {calls++;};
        const got = await selected.page(subjects, basis); c.onRequest = undefined;
        expect(got.rows).toEqual(expected.rows); expect(got.reportedBasis).toEqual(basis);
        expect(got.roundTrips).toBe(1); expect(calls).toBe(1);
        expect(got.rows).toHaveLength(65);
      }
    } finally {await c.delete(scope); c.close();}
  });
});
