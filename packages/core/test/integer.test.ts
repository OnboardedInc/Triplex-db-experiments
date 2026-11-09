import { describe, expect, it } from "vitest";
import { Effect, Schema } from "effect";
import { integer, IntegerValue, MIN_INTEGER, MAX_INTEGER, TripleValue } from "../src/Value.js";
import { EntityId } from "../src/Branded.js";
import { Triples } from "../src/store/Triples.js";
import { KvTriples } from "../src/kv/layers/KvTriplesLive.js";
import * as TypeExpr from "../src/config/TypeExpr.js";
import * as TypeSchema from "../src/config/TypeSchema.js";
import * as Attribute from "../src/config/Attribute.js";
import * as EntityType from "../src/config/EntityType.js";
import { tripleValueToSnapshotValue, canonicalize } from "../src/snapshots/canonical.js";

describe("Exact signed 64-bit values", () => {
  it("constructs both boundaries and canonicalizes decimal input without Number", () => {
    expect(integer(MIN_INTEGER)).toEqual({ type: "integer", value: "-9223372036854775808" });
    expect(integer(MAX_INTEGER.toString())).toEqual({
      type: "integer",
      value: "9223372036854775807",
    });
    expect(integer("+0007")).toEqual({ type: "integer", value: "7" });
    expect(integer("-0")).toEqual({ type: "integer", value: "0" });
    expect(integer("9007199254740993")).not.toEqual(integer("9007199254740992"));
  });
  it("rejects overflow, fractions, exponential notation and already-rounded numbers", () => {
    for (const value of [MIN_INTEGER - 1n, MAX_INTEGER + 1n, "1.1", "1e3", " 1", ""])
      expect(() => integer(value)).toThrow();
    expect(() => integer(9007199254740993 as never)).toThrow(TypeError);
  });
  it("validates canonical wire payloads and keeps text values distinct", () => {
    expect(Schema.is(IntegerValue)(integer(MAX_INTEGER))).toBe(true);
    expect(Schema.is(TripleValue)(integer(MAX_INTEGER))).toBe(true);
    for (const value of ["01", "-0", "+1", "9223372036854775808"])
      expect(Schema.is(IntegerValue)({ type: "integer", value })).toBe(false);
    expect(Schema.is(IntegerValue)({ type: "string", value: "1" })).toBe(false);
  });
  it("adds a separate schema primitive while preserving legacy integer semantics", async () => {
    expect(TypeSchema.is(TypeExpr.int64, integer(MAX_INTEGER))).toBe(true);
    expect(TypeSchema.is(TypeExpr.int64, MAX_INTEGER.toString())).toBe(false);
    expect(TypeSchema.is(TypeExpr.int64, 7)).toBe(false);
    expect(TypeSchema.is(TypeExpr.integer, 7)).toBe(true);
    expect(TypeSchema.is(TypeExpr.integer, integer("7"))).toBe(false);
    const schema = TypeExpr.struct({ amount: TypeExpr.optional(TypeExpr.int64, integer("7")) });
    expect(Schema.decodeUnknownSync(TypeExpr.TypeExprSchema)(schema)).toEqual(schema);
    expect(await Effect.runPromise(TypeSchema.normalize(schema, {}))).toEqual({
      amount: integer("7"),
    });
    const ledger = EntityType.make("ExactLedger", {
      attributes: { amount: Attribute.use(Attribute.int64(":ledger/amount"), { required: true }) },
    });
    expect(ledger.amount.assertion(integer(MAX_INTEGER)).value).toEqual(integer(MAX_INTEGER));
    expect(TypeSchema.is(ledger.schema, { ":ledger/amount": integer(MAX_INTEGER) })).toBe(true);
  });
  it("preserves the exact tag and digits in entity snapshot canonicalization", () => {
    const value = integer(MAX_INTEGER);
    expect(tripleValueToSnapshotValue(value)).toEqual(value);
    expect(canonicalize({ ":ledger/amount": value })).not.toEqual(
      canonicalize({ ":ledger/amount": { type: "string", value: value.value } }),
    );
  });
  it("checks int64 schema bounds against exact payloads", () => {
    const bounded = TypeExpr.constrained(TypeExpr.int64, [
      { _tag: "Min", value: -1 },
      { _tag: "Max", value: 10 },
    ]);
    for (const value of ["-1", "0", "1", "10"])
      expect(TypeSchema.is(bounded, integer(value))).toBe(true);
    for (const value of [MIN_INTEGER, "-2", "11", MAX_INTEGER])
      expect(TypeSchema.is(bounded, integer(value))).toBe(false);
    for (const value of [0.5, Number.MAX_SAFE_INTEGER + 1]) {
      expect(() =>
        TypeSchema.compile(TypeExpr.constrained(TypeExpr.int64, [{ _tag: "Min", value }])),
      ).toThrow(RangeError);
    }
  });
  it("applies union bounds through each numeric branch without flattening exact values", async () => {
    const bounded = TypeExpr.constrained(TypeExpr.union([TypeExpr.int64, TypeExpr.number]), [
      TypeExpr.min(0),
      TypeExpr.max(10),
    ]);
    for (const value of [integer(0n), integer(5n), integer(10n), 0, 5.5, 10])
      expect(TypeSchema.is(bounded, value)).toBe(true);
    for (const value of [integer(-1n), integer(11n), -1, 10.5, "5"])
      expect(TypeSchema.is(bounded, value)).toBe(false);
    expect(await Effect.runPromise(TypeSchema.normalize(bounded, integer(5n)))).toEqual(
      integer(5n),
    );
    const large = TypeExpr.constrained(TypeExpr.union([TypeExpr.int64, TypeExpr.number]), [
      TypeExpr.min(Number.MAX_SAFE_INTEGER),
    ]);
    expect(TypeSchema.is(large, integer("9007199254740990"))).toBe(false);
    expect(TypeSchema.is(large, integer("9007199254740991"))).toBe(true);
    expect(TypeSchema.is(large, integer("9007199254740992"))).toBe(true);
    const nested = TypeExpr.constrained(
      TypeExpr.union([TypeExpr.constrained(TypeExpr.int64, [TypeExpr.min(0)]), TypeExpr.number]),
      [TypeExpr.max(10)],
    );
    expect(TypeSchema.is(nested, integer(5n))).toBe(true);
    expect(TypeSchema.is(nested, integer(-1n))).toBe(false);
    expect(TypeSchema.is(nested, integer(11n))).toBe(false);
    expect(() =>
      TypeSchema.compile(
        TypeExpr.constrained(TypeExpr.union([TypeExpr.int64, TypeExpr.number]), [
          TypeExpr.min(0.5),
        ]),
      ),
    ).toThrow(RangeError);
  });
  it("KV commits canonical int64 through its backend callback and reads exact payloads", async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const triples = yield* Triples;
        for (const raw of [MIN_INTEGER, 0n, 9007199254740993n, MAX_INTEGER]) {
          const value = integer(raw);
          const fact = yield* triples.assert({
            entityId: EntityId.make("kv:integer"),
            attribute: ":ledger/amount",
            value,
          });
          expect((yield* triples.get(fact.id))?.value).toStrictEqual(value);
        }
      }).pipe(Effect.provide(KvTriples.layer)),
    );
  });
});
