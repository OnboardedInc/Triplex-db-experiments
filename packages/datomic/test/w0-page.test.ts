import { randomUUID } from "node:crypto";
import { Effect } from "effect";
import { describe, expect, it, vi } from "vitest";
import { DatabaseScope } from "@triplex-build/triplex/runtime";
import { DatomicClient } from "../src/DatomicClient.js";
import { DatomicClient as BuiltDatomicClient } from "../dist/index.js";
import { makeDatomicStorageAdapter } from "../src/DatomicStorageAdapter.js";
import { publicSweep, portableSweep } from "../../../lab/bench/lib/w0-public.js";
// [DX-B5-L5] Why: row order, shared refs and recorded positions must survive the page optimization.
// Rejected: a reader comparison that still calls the old portable-only Datomic helper.
describe.skipIf(process.env.DATOMIC_INTEGRATION !== "1")("W0 row page", () => {
  for (const layout of ["legacy", "lean"] as const)
    it(`equals the portable BFS in one HTTP request (${layout})`, async () => {
      const url = process.env.DATOMIC_GATEWAY_URL ?? "http://127.0.0.1:8505";
      const c = new DatomicClient(url, 30000);
      let selected: Awaited<ReturnType<typeof publicSweep>> | undefined;
      const scope = DatabaseScope.test(`b5-page-${randomUUID()}`),
        a = makeDatomicStorageAdapter(c, scope, { layout });
      try {
        await Effect.runPromise(a.initialize());
        await Effect.runPromise(
          a.withTransaction(
            Effect.gen(function* () {
              const p = yield* a.nextCommitPosition();
              for (let i = 0; i < 64; i++)
                yield* a.insert(
                  {
                    entityId: `s${i}`,
                    attribute: "shared",
                    value: { type: "ref", value: "shared" },
                    validFrom: 0,
                  },
                  "_tx/00000000000000000000000001",
                  10,
                  `ref${i}`,
                  p,
                );
              yield* a.insert(
                {
                  entityId: "shared",
                  attribute: "value",
                  value: { type: "integer", value: "42" },
                  validFrom: 0,
                },
                "_tx/00000000000000000000000001",
                10,
                "value",
                p,
              );
            }),
          ),
        );
        await Effect.runPromise(
          a.withTransaction(
            Effect.gen(function* () {
              const p = yield* a.nextCommitPosition();
              yield* a.retract("value", 20, "_tx/00000000000000000000000002", p);
              yield* a.insert(
                {
                  entityId: "shared",
                  attribute: "value",
                  value: { type: "integer", value: "43" },
                  validFrom: 0,
                },
                "_tx/00000000000000000000000002",
                20,
                "value2",
                p,
              );
            }),
          ),
        );
        const handle = {
          storage: a,
          scope,
          backend: { name: "datomic", url },
          run: Effect.runPromise,
        } as any;
        selected = await publicSweep("datomic", handle);
        const portable = portableSweep(handle);
        for (const position of [1, 2]) {
          const subjects = Array.from({ length: 64 }, (_, i) => `s${i}`),
            basis = { position, validAt: 30 };
          const expected = await portable.page(subjects, basis);
          let calls = 0;
          c.onRequest = () => {
            calls++;
          };
          // [DX-B9-A] Why: H6 uses its own built SDK client; count both it and the portable fallback.
          // Rejected: observing only the seed client (would report zero actual optimized HTTP requests).
          const request = BuiltDatomicClient.prototype.request;
          const observed = vi
            .spyOn(BuiltDatomicClient.prototype, "request")
            .mockImplementation(function (...args) {
              calls++;
              return request.apply(this, args);
            });
          let got;
          try {
            got = await selected.page(subjects, basis);
          } finally {
            observed.mockRestore();
            c.onRequest = undefined;
          }
          expect(got.rows).toEqual(expected.rows);
          expect(got.reportedBasis).toEqual(basis);
          expect(got.roundTrips).toBe(1);
          expect(calls).toBe(1);
          expect(got.rows).toHaveLength(65);
        }
      } finally {
        await selected?.close();
        await c.delete(scope);
        c.close();
      }
    });
});
