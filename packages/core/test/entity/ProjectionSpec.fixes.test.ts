// [EXP-R01] Fixes for the independent verifier's findings (VERIFY.md F1-F6) under Sam's numeric
// rule (lab/SCOPE.md 2.4): exact storage and round trip, order-preserving comparison, and a hard
// error, never silent conversion.
import { Effect, Result } from "effect";
import { describe, expect, it } from "vitest";

import { Attribute, EntityType, TypeExpr } from "../../src/config/index.js";
import { ProjectionSpec, type ProjectionSpecError } from "../../src/entity/index.js";

const Company = EntityType.make("Company", {
  attributes: { name: Attribute.use(Attribute.text(":company/name"), { required: true }) },
});
const Person = EntityType.make("Person", {
  attributes: {
    name: Attribute.use(Attribute.text(":person/name"), { required: true }),
    age: Attribute.use(Attribute.integer(":person/age")),
    score: Attribute.use(Attribute.number(":person/score")),
    salary: Attribute.use(Attribute.int64(":person/salary")),
    born: Attribute.use(Attribute.date(":person/born")),
    seen: Attribute.use(Attribute.instant(":person/seen")),
    employer: Attribute.use(Attribute.ref(":person/employer", Company)),
  },
});

const compile = (
  inputs: ReadonlyArray<ProjectionSpec.EntityTypeInput>,
  options?: ProjectionSpec.CompileOptions,
) => Effect.runSync(ProjectionSpec.compile(inputs, options));

const compileError = (
  inputs: ReadonlyArray<ProjectionSpec.EntityTypeInput>,
  options?: ProjectionSpec.CompileOptions,
): ProjectionSpecError => {
  const result = Effect.runSync(Effect.result(ProjectionSpec.compile(inputs, options)));
  if (Result.isSuccess(result)) throw new Error("expected a compile failure");
  return result.failure;
};

const usage = (key: string, type: TypeExpr.TypeExpr): ProjectionSpec.AttributeUsageInput => ({
  key,
  type,
  required: false,
  cardinality: "one",
});

const spec = compile([Person, Company]);
const rules = (key: string, engine: "xtdb" | "rdf") =>
  ProjectionSpec.attribute(spec, "Person", key)![engine].exactness;
const num = (value: number) => ({ type: "number" as const, value });
const str = (value: string) => ({ type: "string" as const, value });

describe("F1: doubles and the numeric rule", () => {
  it("an RDF double is exact only if it survives storage (>>4 bits) and %.13g export", () => {
    const rdf = rules(":person/score", "rdf");
    expect(ProjectionSpec.isExact(rdf, num(1 + 2 ** -40))).toBe(false); // exports 1.000000000001
    expect(ProjectionSpec.isExact(rdf, num(1 + 2 ** -48))).toBe(false);
    expect(ProjectionSpec.isExact(rdf, num(16.5))).toBe(true);
    expect(ProjectionSpec.isExact(rdf, num(0.375))).toBe(true);
    expect(ProjectionSpec.isExact(rdf, num(2 ** 40))).toBe(true);
    expect(ProjectionSpec.isExact(rdf, num(-0))).toBe(true);
    expect(ProjectionSpec.firstViolation(rdf, num(1 + 2 ** -40))?._tag).toBe("DoubleRoundTrip");
  });

  it("binary64 attributes are classed approximate and can be refused at compile", () => {
    expect(ProjectionSpec.attribute(spec, "Person", ":person/score")?.numeric).toBe("approximate");
    expect(ProjectionSpec.attribute(spec, "Person", ":person/age")?.numeric).toBe("exact-integer");
    expect(ProjectionSpec.attribute(spec, "Person", ":person/salary")?.numeric).toBe(
      "exact-integer",
    );
    expect(ProjectionSpec.attribute(spec, "Person", ":person/name")?.numeric).toBeUndefined();
    const error = compileError([Person, Company], { approximateNumbers: "reject" });
    expect(error.reason).toBe("approximate-number");
    expect(error.inputs).toEqual(["Person.:person/score"]);
  });

  it("inexact values fail with a typed InexactValueError; the policy is part of the id", async () => {
    const result = await Effect.runPromise(
      Effect.result(ProjectionSpec.requireExact("rdf", rules(":person/score", "rdf"), num(0.1))),
    );
    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.failure._tag).toBe("InexactValueError");
      expect(result.failure.rule).toBe("DoubleRoundTrip");
      expect(result.failure.value).toBe("0.1");
    }
    await Effect.runPromise(
      ProjectionSpec.requireExact("rdf", rules(":person/score", "rdf"), num(0.5)),
    );
    const rejecting = compile([Person, Company], { inexactPolicy: "reject" });
    expect(rejecting.inexactPolicy).toBe("reject");
    expect(rejecting.id).not.toBe(spec.id);
  });

  it("range-rule ordering is declared per engine; text needs an order key", () => {
    const ordering = (key: string) => {
      const attribute = ProjectionSpec.attribute(spec, "Person", key)!;
      return [attribute.xtdb.ordering, attribute.rdf.ordering];
    };
    expect(ordering(":person/name")).toEqual(["order-key", "order-key"]);
    expect(ordering(":person/age")).toEqual(["native", "native"]);
    expect(ordering(":person/salary")).toEqual(["native", "native"]);
    expect(ordering(":person/born")).toEqual(["native", "native"]);
    expect(ordering(":person/seen")).toEqual(["native", "native"]);
  });

  it("exact integers cover at least 2^53 on both engines", () => {
    for (const engine of ["xtdb", "rdf"] as const) {
      expect(ProjectionSpec.isExact(rules(":person/age", engine), num(2 ** 53 - 1))).toBe(true);
      expect(ProjectionSpec.isExact(rules(":person/age", engine), num(-(2 ** 53 - 1)))).toBe(true);
    }
  });
});

describe("F2: calendar dates", () => {
  it.each(["xtdb", "rdf"] as const)(
    "dates are real calendar dates in years 1..9999 (%s)",
    (engine) => {
      const date = rules(":person/born", engine);
      expect(ProjectionSpec.isExact(date, str("2024-02-29"))).toBe(true);
      expect(ProjectionSpec.isExact(date, str("2000-02-29"))).toBe(true);
      expect(ProjectionSpec.isExact(date, str("9999-12-31"))).toBe(true);
      expect(ProjectionSpec.isExact(date, str("2023-02-29"))).toBe(false);
      expect(ProjectionSpec.isExact(date, str("1900-02-29"))).toBe(false);
      expect(ProjectionSpec.isExact(date, str("2023-02-30"))).toBe(false);
      expect(ProjectionSpec.isExact(date, str("2023-04-31"))).toBe(false);
      expect(ProjectionSpec.isExact(date, str("2023-13-01"))).toBe(false);
      expect(ProjectionSpec.isExact(date, str("2023-00-10"))).toBe(false);
      expect(ProjectionSpec.isExact(date, str("0000-01-01"))).toBe(false);
      expect(ProjectionSpec.firstViolation(date, str("2023-02-30"))?._tag).toBe("CalendarDate");
    },
  );

  it("an invalid date is rejected with a typed error", async () => {
    const result = await Effect.runPromise(
      Effect.result(
        ProjectionSpec.requireExact("xtdb", rules(":person/born", "xtdb"), str("2023-02-30")),
      ),
    );
    expect(Result.isFailure(result) && result.failure.rule).toBe("CalendarDate");
  });
});

describe("F3: XTDB valid-time microsecond grid", () => {
  const validTime = spec.coordinates.xtdb.validTime;
  it("whole-millisecond coordinates are exact up to the documented range", () => {
    expect(ProjectionSpec.isExact(validTime, 253402300799999)).toBe(true);
    expect(ProjectionSpec.isExact(validTime, 1e13)).toBe(true);
    expect(ProjectionSpec.isExact(validTime, 8.64e15)).toBe(true);
    expect(ProjectionSpec.isExact(validTime, -8.64e15)).toBe(true);
    expect(ProjectionSpec.isExact(validTime, 8.64e15 + 2)).toBe(false);
  });

  it("fractional coordinates are exact only with at most three fractional digits", () => {
    expect(ProjectionSpec.isExact(validTime, 1.001)).toBe(true);
    expect(ProjectionSpec.isExact(validTime, 1e13 + 0.125)).toBe(true);
    expect(ProjectionSpec.isExact(validTime, 1e12 + 0.0625)).toBe(false);
    expect(ProjectionSpec.isExact(validTime, 1.0005)).toBe(false);
    expect(ProjectionSpec.isExact(validTime, 1e-7)).toBe(false);
    expect(ProjectionSpec.isExact(validTime, Number.NaN)).toBe(false);
    expect(ProjectionSpec.isExact(validTime, Number.POSITIVE_INFINITY)).toBe(false);
  });
});

describe("F4: non-finite numbers", () => {
  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    "%s is never exact in number or integer columns",
    (value) => {
      for (const engine of ["xtdb", "rdf"] as const) {
        for (const key of [":person/score", ":person/age"]) {
          expect(ProjectionSpec.isExact(rules(key, engine), num(value))).toBe(false);
        }
      }
    },
  );
});

describe("F5: the handle path agrees with the release path", () => {
  it("rejects one key with two value types", () => {
    const conflict = compileError([
      { entityType: "Person", attributes: [usage(":common/code", TypeExpr.text)] },
      { entityType: "Robot", attributes: [usage(":common/code", TypeExpr.int64)] },
    ]);
    expect(conflict.reason).toBe("attribute-type-conflict");
    expect(conflict.inputs).toEqual(["Person.:common/code", "Robot.:common/code"]);
  });

  it("rejects refs to entity types that are not in the inputs, including nested refs", () => {
    const dangling = compileError([Person]);
    expect(dangling.reason).toBe("unknown-ref-target");
    expect(dangling.inputs).toEqual(["Person.:person/employer", "Company"]);
    const nested = compileError([
      { entityType: "P", attributes: [usage(":p/refs", TypeExpr.list(TypeExpr.ref("Ghost")))] },
    ]);
    expect(nested.reason).toBe("unknown-ref-target");
  });
});

describe("F6: names the compiler must flag", () => {
  it.each(["Order", "Group", "Default", "From", "To", "Select", "Table"])(
    "rejects the SQL-reserved table name of %s",
    (name) => {
      expect(compileError([{ entityType: name, attributes: [] }]).reason).toBe("reserved-name");
    },
  );

  it.each([
    "urn:triplex:assertion:",
    "urn:triplex:scope:",
    "urn:triplex:native:",
    "urn:triplex:field/",
  ])("rejects an rdfBase %s that overlaps a ledger namespace", (rdfBase) => {
    expect(compileError([Company], { rdfBase }).reason).toBe("invalid-option");
  });

  it("keeps the default base and unrelated bases", () => {
    expect(compile([Company]).rdfBase).toBe("urn:triplex:");
    expect(compile([Company], { rdfBase: "urn:acme:" }).rdfBase).toBe("urn:acme:");
    expect(compile([Company], { rdfBase: "urn:triplex:domain:" }).rdfBase).toBe(
      "urn:triplex:domain:",
    );
  });
});

// [EXP-F02b] RULINGS Q30a-e: the rules EXP-F02 found wrong or missing (lab/experiments/
// EXP-F02-wire-exactness/REPORT.md, "ProjectionSpec rules wrong or missing" 1-5).
describe("Q30: wire exactness rules from EXP-F02", () => {
  const wire = compile([
    {
      entityType: "Wire",
      attributes: [
        usage(":wire/json", TypeExpr.list(TypeExpr.number)),
        { ...usage(":wire/num", TypeExpr.number), cardinality: "many" },
        { ...usage(":wire/big", TypeExpr.int64), cardinality: "many" },
        usage(":wire/day", TypeExpr.date),
        { ...usage(":wire/at", TypeExpr.instant), cardinality: "many" },
      ],
    },
  ]);
  const attr = (key: string) => ProjectionSpec.attribute(wire, "Wire", key)!;
  const json = (value: unknown) => ({ type: "json" as const, value });

  it.each(["xtdb", "rdf"] as const)(
    "Q30a: JSON is exact only with no -0 and no non-finite number anywhere inside (%s)",
    (engine) => {
      const jsonRules = attr(":wire/json")[engine].exactness;
      expect(jsonRules.map((rule) => rule._tag)).toEqual(["Finite", "NoNegativeZero"]);
      expect(ProjectionSpec.firstViolation(jsonRules, json({ amount: -0 }))?._tag).toBe(
        "NoNegativeZero",
      );
      expect(ProjectionSpec.isExact(jsonRules, json([0, -0, 1]))).toBe(false);
      expect(ProjectionSpec.isExact(jsonRules, json({ a: [{ b: -0 }] }))).toBe(false);
      expect(ProjectionSpec.firstViolation(jsonRules, json([Number.NaN]))?._tag).toBe("Finite");
      expect(ProjectionSpec.isExact(jsonRules, json([1.0000000000000002, 1 + 2 ** -40]))).toBe(
        true,
      );
      expect(ProjectionSpec.isExact(jsonRules, json({ v: 2 ** 53 + 2, s: "-0" }))).toBe(true);
    },
  );

  it("Q30a: approximateNumbers reject applies recursively inside List, Struct and Constrained", () => {
    const doc = (type: TypeExpr.TypeExpr) => [
      { entityType: "Doc", attributes: [usage(":doc/v", type)] },
    ];
    for (const type of [
      TypeExpr.list(TypeExpr.number),
      TypeExpr.struct({ amount: TypeExpr.required(TypeExpr.number) }),
      TypeExpr.list(TypeExpr.struct({ v: TypeExpr.optional(TypeExpr.number) })),
      TypeExpr.struct({
        v: TypeExpr.required(TypeExpr.constrained(TypeExpr.number, [TypeExpr.min(0)])),
      }),
    ]) {
      const error = compileError(doc(type), { approximateNumbers: "reject" });
      expect(error.reason).toBe("approximate-number");
      expect(error.inputs).toEqual(["Doc.:doc/v"]);
    }
    for (const type of [
      TypeExpr.list(TypeExpr.integer),
      TypeExpr.struct({ cents: TypeExpr.required(TypeExpr.int64) }),
    ])
      expect(compile(doc(type), { approximateNumbers: "reject" }).entityTypes).toHaveLength(1);
  });

  it.each(["xtdb", "rdf"] as const)("Q30b: an instant of -0 is not exact (%s)", (engine) => {
    const atRules = attr(":wire/at")[engine].exactness;
    expect(ProjectionSpec.firstViolation(atRules, { type: "datetime", value: -0 })?._tag).toBe(
      "NoNegativeZero",
    );
    expect(ProjectionSpec.isExact(atRules, { type: "datetime", value: 0 })).toBe(true);
  });

  it("Q30c: XTDB lists bind ARRAY[CAST(? AS <type>) ...]; date and instant read as text only", () => {
    expect(attr(":wire/num").xtdb.wire).toEqual({
      bind: "CAST(? AS DOUBLE PRECISION)",
      param: "number",
      shape: "array",
      reads: ["driver", "text"],
    });
    expect(attr(":wire/big").xtdb.wire).toMatchObject({
      bind: "CAST(? AS BIGINT)",
      param: "bigint",
      shape: "array",
    });
    expect(attr(":wire/day").xtdb.wire).toEqual({
      bind: "CAST(? AS DATE)",
      param: "text",
      shape: "scalar",
      reads: ["text"],
    });
    expect(attr(":wire/at").xtdb.wire).toMatchObject({
      bind: "CAST(? AS TIMESTAMP WITH TIME ZONE)",
      param: "iso-8601",
      shape: "array",
      reads: ["text"],
    });
  });

  it("Q30c: checkXtdbWire accepts the pinned encoding and refuses every other, typed", () => {
    const check = (key: string, use: ProjectionSpec.XtdbWireUse) => {
      const result = Effect.runSync(Effect.result(ProjectionSpec.checkXtdbWire(attr(key), use)));
      return Result.isSuccess(result) ? "ok" : result.failure.reason;
    };
    const num: ProjectionSpec.XtdbWireUse = {
      bind: "CAST(? AS DOUBLE PRECISION)",
      param: "number",
      shape: "array",
      read: "driver",
    };
    expect(check(":wire/num", num)).toBe("ok");
    expect(check(":wire/num", { ...num, read: "text", bind: "cast(?  as double precision)" })).toBe(
      "ok",
    );
    // F02 finding 2: the whole list as one JSON parameter.
    expect(check(":wire/num", { ...num, shape: "json-parameter", bind: "?" })).toBe(
      "unpinned-encoding",
    );
    expect(check(":wire/big", { ...num, bind: "?", param: "json", shape: "json-parameter" })).toBe(
      "unpinned-encoding",
    );
    expect(check(":wire/num", { ...num, bind: "?" })).toBe("unpinned-encoding");
    // F02 finding 4: TIMESTAMPTZ and DATE through the driver's decoding.
    const at: ProjectionSpec.XtdbWireUse = {
      bind: "CAST(? AS TIMESTAMP WITH TIME ZONE)",
      param: "iso-8601",
      shape: "array",
      read: "text",
    };
    expect(check(":wire/at", at)).toBe("ok");
    expect(check(":wire/at", { ...at, read: "driver" })).toBe("unpinned-encoding");
    expect(check(":wire/at", { ...at, param: "date" })).toBe("unpinned-encoding");
    const day: ProjectionSpec.XtdbWireUse = {
      bind: "CAST(? AS DATE)",
      param: "text",
      shape: "scalar",
      read: "driver",
    };
    expect(check(":wire/day", day)).toBe("unpinned-encoding");
    expect(check(":wire/day", { ...day, read: "text" })).toBe("ok");
    expect(check(":wire/day", { ...day, read: "text", shape: "array" })).toBe("unpinned-encoding");
  });

  it.each(["xtdb", "rdf"] as const)(
    "Q30e: the integer range rule is the safe-integer domain (%s)",
    (engine) => {
      const integerRules = rules(":person/age", engine);
      expect(integerRules.find((rule) => rule._tag === "IntegerRange")).toEqual({
        _tag: "IntegerRange",
        min: "-9007199254740991",
        max: "9007199254740991",
      });
      expect(ProjectionSpec.isExact(integerRules, num(Number.MAX_SAFE_INTEGER))).toBe(true);
      expect(ProjectionSpec.isExact(integerRules, num(2 ** 53))).toBe(false);
    },
  );
});
