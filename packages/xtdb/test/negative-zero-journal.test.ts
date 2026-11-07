// [EXP-F02b] Paired check for RULINGS Q30a with its Q34c boundary and AMB-04, live on XTDB:
// user JSON containing -0 is rejected with InvalidTripleError before any mutation, while a number
// -0 assertion commits, is journaled with the sign bit set (the journal embeds the typed value in a
// JSON change, now written by ExactJson.stringify), replays from the journal into a fresh scope, and
// reads back as -0 from a second, fresh runtime. Run with XTDB_INTEGRATION=1 XTDB_URL=...
import { randomUUID } from "node:crypto";
import { Effect, Exit } from "effect";
import { describe, expect, it } from "vitest";
import {
  CommandAlreadyCommittedError,
  EntityId,
  Triples,
  json,
  number,
  type TransactOp,
} from "@triplex-build/triplex";
import { Capabilities, DatabaseScope } from "@triplex-build/triplex/runtime";
import { packValue } from "../src/codecs.js";
import { makeXtdbRuntime } from "../src/index.js";

const enabled = process.env["XTDB_INTEGRATION"] === "1";
const url = process.env["XTDB_URL"] ?? "postgres://xtdb:xtdb@127.0.0.1:5470/xtdb";
const inScope = <A, E>(scope: string, program: Effect.Effect<A, E, Triples>) =>
  Effect.runPromise(
    program.pipe(
      Effect.provide(
        makeXtdbRuntime({ url }).layer({
          scope: DatabaseScope.test(scope),
          capabilities: Capabilities.none,
        }),
      ),
      Effect.scoped,
    ),
  );

describe.skipIf(!enabled)("XTDB number -0 journal round trip (EXP-F02b)", () => {
  it("rejects user JSON -0; commits, journals, replays and reads back number -0", async () => {
    const run = randomUUID();
    const source = `f02b-journal:xtdb:${run}`;
    const entityId = EntityId.make(`f02b:nz:${run}`);
    const commandId = `f02b-nz-${run}`;
    const rejected = await inScope(
      source,
      Effect.gen(function* () {
        const triples = yield* Triples;
        const exit = yield* Effect.exit(
          triples.transact([
            { op: "assert", entityId, attribute: ":f02b/json", value: json({ amount: -0 }) },
          ]),
        );
        return { exit, facts: yield* triples.entity(entityId) };
      }),
    );
    expect(
      Exit.isFailure(rejected.exit) &&
        rejected.exit.cause.reasons.some(
          (reason) =>
            reason._tag === "Fail" &&
            reason.error._tag === "InvalidTripleError" &&
            reason.error.detail === "inexact-json-number",
        ),
    ).toBe(true);
    expect(rejected.facts).toEqual([]);
    const committed = await inScope(
      source,
      Effect.gen(function* () {
        const triples = yield* Triples;
        return yield* triples.transact(
          [{ op: "assert", entityId, attribute: ":f02b/n", value: number(-0), validFrom: 1 }],
          { commandId },
        );
      }),
    );
    // A second, fresh runtime: the fact, the journal and the idempotent command replay.
    const read = await inScope(
      source,
      Effect.gen(function* () {
        const triples = yield* Triples;
        const facts = yield* triples.entity(entityId, { validAt: 2 });
        const record = yield* triples.transaction(committed.txId);
        const again = yield* Effect.exit(
          triples.transact(
            [{ op: "assert", entityId, attribute: ":f02b/n", value: number(-0), validFrom: 1 }],
            { commandId },
          ),
        );
        return { facts, record, again };
      }),
    );
    expect(read.facts.map((fact) => fact.attribute)).toEqual([":f02b/n"]);
    expect(Object.is(read.facts[0]!.value.value, -0)).toBe(true);
    const change = read.record?.changes.find((c) => c.op === "assert" && c.entityId === entityId);
    expect(change?.value).toEqual({ type: "number", value: -0 });
    expect(Object.is(change?.value.value, -0)).toBe(true);
    expect(
      Exit.isFailure(read.again) &&
        read.again.cause.reasons.some(
          (reason) =>
            reason._tag === "Fail" &&
            reason.error instanceof CommandAlreadyCommittedError &&
            reason.error.transactionId === committed.txId,
        ),
    ).toBe(true);
    // Replay the journal change into a fresh scope, as a replay or restore route would.
    const replayed = await inScope(
      `f02b-journal-replay:xtdb:${run}`,
      Effect.gen(function* () {
        const triples = yield* Triples;
        const op: TransactOp = {
          op: "assert",
          entityId: change!.entityId,
          attribute: change!.attribute,
          value: change!.value,
          validFrom: change!.validFrom,
        };
        const result = yield* triples.transact([op]);
        const replayRecord = yield* triples.transaction(result.txId);
        return { facts: yield* triples.entity(entityId, { validAt: 2 }), replayRecord };
      }),
    );
    expect(Object.is(replayed.facts[0]!.value.value, -0)).toBe(true);
    expect(
      Object.is(replayed.replayRecord?.changes.find((c) => c.op === "assert")?.value.value, -0),
    ).toBe(true);
  }, 300_000);
});

describe("XTDB JSON payload keeps -0 (no engine)", () => {
  it("packValue writes the journal's embedded number -0 as -0", () => {
    const change = { op: "assert", value: { type: "number", value: -0 } };
    expect(packValue(json(change)).value_json).toBe(
      '{"op":"assert","value":{"type":"number","value":-0}}',
    );
    expect(packValue(json({ b: 1, a: [0.5] })).value_json).toBe('{"b":1,"a":[0.5]}');
  });
});
