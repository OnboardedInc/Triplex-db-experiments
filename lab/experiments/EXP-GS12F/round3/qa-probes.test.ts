import { writeFileSync } from "node:fs";
import { inspect } from "node:util";
import { Cause, Effect, Layer, ManagedRuntime } from "effect";
import { expect, it } from "vitest";
import {
  EntityId,
  InvalidTripleError,
  Triples,
  WriteError,
  KvTriples,
} from "@triplex-build/triplex";
import {
  Capabilities,
  DatabaseScope,
  Runtime,
  StorageAdapter,
  QueryExecutor,
  KvBackend,
} from "@triplex-build/triplex/runtime";
import { makeXtdbStorageAdapter } from "../../../../packages/xtdb/src/XtdbStorageAdapter.js";
import { makeQleverStorageAdapter } from "../../../../packages/qlever/src/QleverStorageAdapter.js";
import { makeTestKvBackend } from "../../../../packages/core/src/kv/kv/InMemoryKvBackend.js";

const root = process.env["GS12F_EVIDENCE_DIR"] ?? "lab/experiments/EXP-GS12F/round3/evidence/";
const save = (name: string, rows: unknown) =>
  writeFileSync(root + name + ".json", JSON.stringify(rows, null, 2) + "\n");
const input = (value: any) => ({
  entityId: EntityId.make("review:entity"),
  attribute: ":review/value",
  value,
});
const cycle: any = {};
cycle.self = cycle;
const badValues: [string, any][] = [
  ...["9223372036854775808", "-9223372036854775809", "01", "-0", "+1", "1e3"].map(
    (v) => ["integer:" + v, { type: "integer", value: v }] as [string, any],
  ),
  ["number:NaN", { type: "number", value: NaN }],
  ["number:Infinity", { type: "number", value: Infinity }],
  ["datetime:NaN", { type: "datetime", value: NaN }],
  ["datetime:Infinity", { type: "datetime", value: Infinity }],
  ["json:nonfinite", { type: "json", value: { erasedAt: Infinity } }],
  ["json:undefined", { type: "json", value: undefined }],
  ["json:cycle", { type: "json", value: cycle }],
  ["json:bigint", { type: "json", value: 1n }],
  ["blob:negative-size", { type: "blob", value: "h", mimeType: "text/plain", size: -1 }],
  ["string:surrogate", { type: "string", value: "\ud800" }],
  ["decimal:excess-scale", { type: "decimal", value: "16.501" }],
];

// [CX-VGS12F] Why: observe the actual A0 adapter callbacks without a network or resident dependency.
// Rejected: a mock schema predicate (would miss late packing failures and WriteError wrapping).
for (const lane of ["xtdb", "qlever"] as const) {
  it(`${lane}: every unholdable value fails typed before transaction entry`, async () => {
    const observations: any[] = [];
    for (const [label, value] of badValues.filter(
      ([label]) => lane === "qlever" || label !== "string:surrogate",
    )) {
      let tx = 0,
        claims = 0,
        queries = 0,
        mutations = 0;
      const client: any = {
        query: async () => {
          queries++;
          return [];
        },
        submit: async () => {
          mutations++;
        },
        update: async () => {
          mutations++;
          throw new Error("offline mutation boundary");
        },
        command: async () => {
          mutations++;
          throw new Error("offline mutation boundary");
        },
        close: async () => {},
      };
      const base =
        lane === "xtdb"
          ? makeXtdbStorageAdapter(client, "review", { maxRetries: 0 })
          : makeQleverStorageAdapter(client, "review");
      const adapter: any = {
        ...base,
        withTransaction: (...args: any[]) => {
          tx++;
          return (base.withTransaction as any)(...args);
        },
        claimCommand: (...args: any[]) => {
          claims++;
          return (base.claimCommand as any)(...args);
        },
      };
      const runtime = ManagedRuntime.make(
        Runtime.define({
          name: "review",
          storage: Layer.succeed(StorageAdapter, adapter),
          queries: Layer.succeed(QueryExecutor, {} as never),
        }).layer({ scope: DatabaseScope.test("review"), capabilities: Capabilities.none }),
      );
      try {
        const triples = await runtime.runPromise(Triples);
        const initial = { queries, mutations };
        const good = input({ type: "string", value: "good" });
        for (const api of ["assert", "assertBatch", "transact"] as const) {
          const before = { tx, claims, queries, mutations };
          const write =
            api === "assert"
              ? triples.assert(input(value))
              : api === "assertBatch"
                ? triples.assertBatch([good, input(value)])
                : triples.transact(
                    [
                      { op: "assert", ...good },
                      { op: "assert", ...input(value) },
                    ],
                    { commandId: label },
                  );
          const exit = await runtime.runPromiseExit(write);
          observations.push({
            label,
            api,
            initial,
            before,
            after: { tx, claims, queries, mutations },
            exit: inspect(exit, { depth: 6 }),
            typed:
              exit._tag === "Failure" && Cause.squash(exit.cause) instanceof InvalidTripleError,
          });
        }
      } finally {
        await runtime.dispose();
      }
    }
    save(lane + "-preflight", observations);
    // All observations are saved before enforcing the requested claim, so first failures cannot hide later vectors.
    expect(
      observations
        .filter((r) => !r.typed || r.before.tx !== r.after.tx || r.before.claims !== r.after.claims)
        .map((r) => r.label + "/" + r.api),
    ).toEqual([]);
  });
}

// [EXP-GS12F-R3] Why: round 3 requires positive memory integer storage, superseding QA's rejection alternative.
// Rejected: retaining the old flip assertion (canonical integer admission must now succeed).
it("memory: canonical integers commit in the real callback and read back exactly", async () => {
  const backend = makeTestKvBackend();
  let callbacks = 0;
  const instrumented = {
    ...backend,
    transact: (fn: any) =>
      backend.transact((tx) => {
        callbacks++;
        return fn(tx);
      }),
  };
  const runtime = ManagedRuntime.make(
    Runtime.fromKv({
      name: "memory-review",
      backend: Layer.succeed(KvBackend, instrumented),
    }).layer({ scope: DatabaseScope.test("review-memory"), capabilities: Capabilities.none }),
  );
  const rows: any[] = [];
  try {
    const triples = await runtime.runPromise(Triples);
    for (const v of ["0", "9007199254740992", "9007199254740993", "9223372036854775807"]) {
      const value = { type: "integer" as const, value: v };
      const before = callbacks;
      const result = await runtime.runPromise(
        triples.transact([{ op: "assert", ...input(value) }], { commandId: v }),
      );
      const stored = await runtime.runPromise(triples.get(result.triples[0]!.id));
      rows.push({ value: v, before, after: callbacks, stored: stored?.value });
      expect(stored?.value).toStrictEqual(value);
      expect(callbacks).toBe(before + 1);
    }
  } finally {
    await runtime.dispose();
  }
  save("memory-integers", rows);
});

it("QLever: declared 60-bit range is enforced before transaction entry", async () => {
  let entered = 0;
  const client: any = { query: async () => [], close: async () => {} };
  const base = makeQleverStorageAdapter(client, "review-range");
  // [CX-VGS12F] Why: a transaction-entry witness is sufficient to falsify pre-transaction rejection.
  // Rejected: a fake successful commit (would imply offline durability that was never observed).
  const adapter = {
    ...base,
    withTransaction: () => {
      entered++;
      return Effect.fail(new WriteError({ message: "review transaction-entry witness" }));
    },
  };
  const runtime = ManagedRuntime.make(
    Runtime.define({
      name: "review-range",
      storage: Layer.succeed(StorageAdapter, adapter as never),
      queries: Layer.succeed(QueryExecutor, {} as never),
    }).layer({ scope: DatabaseScope.test("review-range"), capabilities: Capabilities.none }),
  );
  const rows: any[] = [];
  try {
    const triples = await runtime.runPromise(Triples);
    for (const value of [(1n << 59n).toString(), (-(1n << 59n) - 1n).toString()]) {
      const before = entered;
      const error = await runtime.runPromise(
        triples
          .transact([{ op: "assert", ...input({ type: "integer", value }) }], { commandId: value })
          .pipe(Effect.flip),
      );
      rows.push({
        value,
        before,
        after: entered,
        typed: error instanceof InvalidTripleError,
        error: inspect(error),
      });
    }
  } finally {
    await runtime.dispose();
  }
  save("qlever-declared-range", rows);
  expect(rows.filter((r) => !r.typed || r.before !== r.after)).toEqual([]);
});

it("memory: nonfinite values and ill-formed strings may not silently convert", async () => {
  const rows: any[] = [];
  for (const [label, value] of badValues.filter(([s]) => !s.startsWith("integer:"))) {
    const runtime = ManagedRuntime.make(KvTriples.layer);
    try {
      const triples = await runtime.runPromise(Triples);
      const exit = await runtime.runPromiseExit(triples.assert(input(value)));
      let stored: unknown;
      if (exit._tag === "Success")
        stored = await runtime.runPromiseExit(triples.get(exit.value.id));
      rows.push({
        label,
        input: inspect(value),
        exit: inspect(exit, { depth: 4 }),
        stored: inspect(stored, { depth: 4 }),
        typed: exit._tag === "Failure" && Cause.squash(exit.cause) instanceof InvalidTripleError,
      });
    } finally {
      await runtime.dispose();
    }
  }
  save("memory-values", rows);
  expect(rows.filter((r) => !r.typed).map((r) => r.label)).toEqual([]);
});
