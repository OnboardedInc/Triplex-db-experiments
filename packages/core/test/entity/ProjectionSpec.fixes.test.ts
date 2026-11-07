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
