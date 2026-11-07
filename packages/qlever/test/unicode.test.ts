import { randomUUID } from "node:crypto";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { EntityId, Triples, json, string } from "@triplex-build/triplex";
import { Capabilities, DatabaseScope, WriteError } from "@triplex-build/triplex/runtime";
import { makeQleverRuntime } from "../src/index.js";
import { assertionIri, claimIri, graphIri, literal, operationIri } from "../src/rdf.js";

describe("QLever Unicode lexical boundary", () => {
  it("rejects isolated surrogates before lexical or namespace encoding", () => {
    for (const text of ["\ud800", "\udfff", "prefix\ud800suffix"])
      for (const encode of [literal, assertionIri, claimIri, graphIri, operationIri])
        expect(() => encode(text)).toThrow(/well-formed Unicode/);
    expect(assertionIri("\ufffd")).not.toBe(assertionIri("😀"));
    expect(literal("😀 café e\u0301")).toBe(JSON.stringify("😀 café e\u0301"));
  });
});

describe.skipIf(process.env["QLEVER_INTEGRATION"] !== "1")(
  "QLever public Unicode mutations",
  () => {
    it("rejects unrepresentable text atomically and retains escaped JSON strings", async () => {
      const scope = DatabaseScope.test(`unicode-boundary:${randomUUID()}`);
      await Effect.runPromise(
        Effect.gen(function* () {
          const t = yield* Triples;
          const failure = yield* t
            .transact(
              [
                {
                  op: "assert",
                  entityId: EntityId.make("good"),
                  attribute: ":value",
                  value: string("valid"),
                },
                {
                  op: "assert",
                  entityId: EntityId.make("bad"),
                  attribute: ":value",
                  value: string("\ud800"),
                },
              ],
              { commandId: "unrepresentable-text" },
            )
            .pipe(Effect.flip);
          expect(failure).toBeInstanceOf(WriteError);
          expect(yield* t.currentPosition()).toBe(0);
          expect(yield* t.entity(EntityId.make("good"))).toEqual([]);
          expect(yield* t.transactionByCommand("unrepresentable-text")).toBeNull();
          const value = json({ high: "\ud800", low: "\udfff", valid: "😀" });
          yield* t.assert({ entityId: EntityId.make("json"), attribute: ":value", value });
          expect((yield* t.entity(EntityId.make("json")))[0]?.value).toEqual(value);
          expect(
            (yield* t.queryAll({ find: ["?v"], where: [["json", ":value", "?v"]] })).results,
          ).toEqual([{ "?v": JSON.stringify(value.value) }]);
          yield* t.assert({
            entityId: EntityId.make("😀"),
            attribute: ":value",
            value: string("😀 café e\u0301"),
          });
          expect((yield* t.entity(EntityId.make("😀")))[0]?.value).toEqual(
            string("😀 café e\u0301"),
          );
          const escaped = String.raw`C:\users\ud800\U0000D800`;
          yield* t.assert({
            entityId: EntityId.make("escaped"),
            attribute: ":escaped",
            value: string(escaped),
          });
          expect((yield* t.entity(EntityId.make("escaped")))[0]?.value).toEqual(string(escaped));
          expect(
            (yield* t.queryAll({ find: ["?e"], where: [["?e", ":escaped", escaped]] })).results,
          ).toEqual([{ "?e": "escaped" }]);
        }).pipe(
          Effect.provide(
            makeQleverRuntime({ url: process.env["QLEVER_URL"] ?? "http://127.0.0.1:7019" }).layer({
              scope,
              capabilities: Capabilities.none,
            }),
          ),
          Effect.scoped,
        ),
      );
    }, 60000);
  },
);
