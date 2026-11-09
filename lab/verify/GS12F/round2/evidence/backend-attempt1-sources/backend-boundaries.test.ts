import { writeFileSync } from "node:fs";
import { inspect } from "node:util";
import { vi, it, expect } from "vitest";
import { Cause, Effect, Layer, ManagedRuntime } from "effect";
import { EntityId, InvalidTripleError, Triples } from "@triplex-build/triplex";
import {
  Capabilities,
  DatabaseScope,
  Runtime,
  KvBackend,
  ValueDomains,
  invalidValue,
} from "@triplex-build/triplex/runtime";
import { makeFdbKvBackendService } from "../../../../packages/foundationdb/src/FdbKvBackend.js";

const observed = vi.hoisted(() => ({ transactions: 0, claimSets: 0, sets: 0 }));
// [CX-VGS12F-R2] Why: exercise the real FDB byte guard and public KV composition without a cluster.
// Rejected: a hand-written 100KB backend (would merely restate the limit instead of executing its code).
vi.mock("foundationdb", () => ({
  setAPIVersion: () => {},
  open: () => ({
    at() {
      return this;
    },
    rawCreateTransaction() {
      const values = new Map<string, Buffer>();
      const tx: any = {
        rawOnError: async () => {},
        rawCancel: () => {},
        _exec: async (fn: any) => {
          observed.transactions++;
          return fn(tx);
        },
        snapshot: () => tx,
        get: async (k: Buffer) => values.get(k.toString("hex")),
        getRangeAll: async () => [],
        set: (k: Buffer, v: Buffer) => {
          observed.sets++;
          if (k[0] === 0x22) observed.claimSets++;
          values.set(k.toString("hex"), v);
        },
        clear: (k: Buffer) => values.delete(k.toString("hex")),
        clearRange: () => {},
      };
      return tx;
    },
  }),
}));

it("FoundationDB rejects its catalog text endpoints before entering a transaction or claim", async () => {
  const backend = await Effect.runPromise(
    makeFdbKvBackendService({ subspace: new Uint8Array([0x70]) }),
  );
  const runtime = ManagedRuntime.make(
    Runtime.fromKv({
      name: "fdb-wrapper-review",
      backend: Layer.succeed(KvBackend, backend),
    }).layer({ scope: DatabaseScope.test("fdb-wrapper-review"), capabilities: Capabilities.none }),
  );
  const rows: any[] = [];
  try {
    const triples = await runtime.runPromise(Triples);
    const text = "x".repeat(1048576);
    for (const value of [
      { type: "string", value: text },
      { type: "ref", value: text },
      { type: "json", value: { text } },
      { type: "blob", value: "h", mimeType: "text/plain", size: 0, filename: text },
    ]) {
      const before = { ...observed };
      const exit = await runtime.runPromiseExit(
        triples.transact(
          [
            {
              op: "assert",
              entityId: EntityId.make("fdb:r2"),
              attribute: ":r2/value",
              value: value as any,
            },
          ],
          { commandId: value.type },
        ),
      );
      const error = exit._tag === "Failure" ? Cause.squash(exit.cause) : undefined;
      rows.push({
        kind: value.type,
        textUtf8Bytes: Buffer.byteLength(text),
        admittedByCatalog: invalidValue(value, ValueDomains.foundationdb) === undefined,
        before,
        after: { ...observed },
        typed: error instanceof InvalidTripleError,
        error: inspect(error, { depth: 4 }),
      });
    }
  } finally {
    await runtime.dispose();
  }
  writeFileSync(
    "lab/verify/GS12F/round2/evidence/fdb-backend-limits.json",
    JSON.stringify(rows, null, 2) + "\n",
  );
  expect(
    rows.filter(
      (r) =>
        !r.typed ||
        r.before.transactions !== r.after.transactions ||
        r.before.claimSets !== r.after.claimSets,
    ),
  ).toEqual([]);
});
