import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { Effect } from "effect";
import {
  CommandAlreadyCommittedError,
  EntityId,
  MAX_INTEGER,
  MIN_INTEGER,
  Triples,
  blob,
  integer,
  string,
  WriteError,
} from "@triplex-build/triplex";
import { Capabilities, DatabaseScope } from "@triplex-build/triplex/runtime";
import {
  Attribute,
  ConfigStore,
  EntityType,
  TypeExpr,
  TypeSchema,
} from "@triplex-build/triplex/config";
import { makeXtdbRuntime } from "../src/index.js";

const enabled = process.env["XTDB_INTEGRATION"] === "1";
const url = process.env["XTDB_URL"] ?? "postgres://xtdb:xtdb@localhost:5442/xtdb";
const run = <A, E>(program: Effect.Effect<A, E, Triples>) =>
  Effect.runPromise(
    program.pipe(
      Effect.provide(
        makeXtdbRuntime({ url }).layer({
          scope: DatabaseScope.test(`exact-storage:${randomUUID()}`),
          capabilities: Capabilities.none,
        }),
      ),
      Effect.scoped,
    ),
  );

describe.skipIf(!enabled)("Exact integer public Triplex storage", () => {
  it("retains exact boundaries through writes, receipt replay, correction and historical reads", async () => {
    await run(
      Effect.gen(function* () {
        const triples = yield* Triples;
        const subject = EntityId.make("exact:ledger");
        const commandId = `exact:${randomUUID()}`;
        const original = yield* triples.transact(
          [
            {
              op: "assert",
              entityId: subject,
              attribute: ":ledger/min",
              value: integer(MIN_INTEGER),
              validFrom: 1,
            },
            {
              op: "assert",
              entityId: subject,
              attribute: ":ledger/max",
              value: integer(MAX_INTEGER),
              validFrom: 1,
            },
            {
              op: "assert",
              entityId: subject,
              attribute: ":ledger/exact",
              value: integer("9007199254740993"),
              validFrom: 1,
            },
            {
              op: "assert",
              entityId: subject,
              attribute: ":ledger/text",
              value: string("9007199254740993"),
              validFrom: 1,
            },
          ],
          { commandId },
        );
        expect(
          (yield* triples.entity(subject, { validAt: 100 })).map(({ value }) => value),
        ).toEqual(
          expect.arrayContaining([
            integer(MIN_INTEGER),
            integer(MAX_INTEGER),
            integer("9007199254740993"),
            string("9007199254740993"),
          ]),
        );
        const duplicate = yield* triples.transact([], { commandId }).pipe(Effect.flip);
        expect(duplicate).toBeInstanceOf(CommandAlreadyCommittedError);
        const receipt = yield* triples.transactionByCommand(commandId);
        expect(receipt?.txId).toBe(original.txId);
        expect(receipt?.changes.map(({ value }) => value)).toContainEqual(integer(MAX_INTEGER));
        yield* Effect.sleep("2 millis");
        const prior = original.triples.find(({ attribute }) => attribute === ":ledger/exact")!;
        yield* triples.transact([
          { op: "retract", id: prior.id },
          {
            op: "assert",
            entityId: subject,
            attribute: ":ledger/exact",
            value: integer("9007199254740992"),
            validFrom: 1,
          },
        ]);
        expect(
          (yield* triples.entity(subject, { recordedAt: original.instant, validAt: 100 })).find(
            ({ attribute }) => attribute === ":ledger/exact",
          )?.value,
        ).toEqual(integer("9007199254740993"));
        expect(
          (yield* triples.entity(subject, { validAt: 100 })).find(
            ({ attribute }) => attribute === ":ledger/exact",
          )?.value,
        ).toEqual(integer("9007199254740992"));
        expect(
          (yield* triples.history(subject))
            .filter(({ attribute }) => attribute === ":ledger/exact")
            .map(({ value }) => value),
        ).toEqual(
          expect.arrayContaining([integer("9007199254740993"), integer("9007199254740992")]),
        );
      }),
    );
  });

  it("rejects malformed raw integer payloads and preserves blob descriptor fields", async () => {
    await run(
      Effect.gen(function* () {
        const triples = yield* Triples;
        const subject = EntityId.make("exact:invalid");
        for (const value of ["01", "9223372036854775808"]) {
          const before = yield* triples.currentPosition();
          const error = yield* triples
            .assert({
              entityId: subject,
              attribute: ":ledger/amount",
              value: { type: "integer", value },
            })
            .pipe(Effect.flip);
          expect(error).toBeInstanceOf(WriteError);
          expect(yield* triples.currentPosition()).toBe(before);
        }
        const descriptor = blob("sha256:descriptor", "text/plain", 0, "");
        const fact = yield* triples.assert({
          entityId: subject,
          attribute: ":ledger/blob",
          value: descriptor,
        });
        expect((yield* triples.get(fact.id))?.value).toEqual(descriptor);
      }),
    );
  });

  it("persists an exact integer schema release through the Triplex config store", async () => {
    await run(
      Effect.gen(function* () {
        const amount = Attribute.int64(":ledger/amount");
        const ledger = EntityType.make("ExactLedger", {
          attributes: { amount: Attribute.use(amount, { required: true, unique: true }) },
        });
        const store = yield* ConfigStore.ConfigStore;
        const committed = yield* store.commit({
          label: "Exact ledger v1",
          objects: yield* ledger.nodes,
          ref: "exact-ledger",
        });
        const resolved = yield* store.resolveRef("exact-ledger");
        expect(resolved?.id).toBe(committed.snapshot.id);
        expect(TypeSchema.is(ledger.schema, { ":ledger/amount": integer(MAX_INTEGER) })).toBe(true);
        expect(amount.type).toEqual(TypeExpr.int64);
      }).pipe(Effect.provide(ConfigStore.layer)),
    );
  });
});
