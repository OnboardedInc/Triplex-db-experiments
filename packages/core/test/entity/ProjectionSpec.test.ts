import { Effect, Result } from "effect";
import { describe, expect, it } from "vitest";

import {
  Attribute,
  ContentId,
  EntityType,
  InMemoryConfigStore,
  TypeExpr,
} from "../../src/config/index.js";
import { ProjectionSpec, ProjectionSpecError } from "../../src/entity/index.js";
import { integer } from "../../src/Value.js";

const XSD = "http://www.w3.org/2001/XMLSchema#";

const Company = EntityType.make("Company", {
  attributes: {
    name: Attribute.use(Attribute.text(":company/name"), { required: true }),
  },
});
const Person = EntityType.make("Person", {
  attributes: {
    name: Attribute.use(Attribute.text(":person/name"), { required: true }),
    firstName: Attribute.use(Attribute.text(":person/first-name")),
    age: Attribute.use(Attribute.integer(":person/age")),
    score: Attribute.use(Attribute.number(":person/score")),
    salary: Attribute.use(Attribute.int64(":person/salary")),
    active: Attribute.use(Attribute.boolean(":person/active")),
    born: Attribute.use(Attribute.date(":person/born")),
    seen: Attribute.use(Attribute.instant(":person/seen")),
    level: Attribute.use(Attribute.enumOf(":person/level", ["junior", "senior"])),
    skills: Attribute.use(Attribute.text(":person/skill"), { cardinality: "many" }),
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

const usage = (
  key: string,
  type: TypeExpr.TypeExpr = TypeExpr.text,
  cardinality: "one" | "many" = "one",
): ProjectionSpec.AttributeUsageInput => ({ key, type, required: false, cardinality });

describe("ProjectionSpec.compile", () => {
  it("compiles the full spec of one entity type (golden)", () => {
    const spec = compile([Company]);
    expect(spec).toEqual({
      id: spec.id,
      layout: "triplex-projection/1",
      rdfBase: "urn:triplex:",
      inexactPolicy: "ledger-only",
      coordinates: {
        xtdb: {
          validTime: [
            { _tag: "MicrosecondGrid" },
            { _tag: "NumberRange", min: -8.64e15, max: 8.64e15 },
          ],
          entityId: [{ _tag: "WellFormedUnicode" }],
        },
        rdf: { validTime: [], entityId: [{ _tag: "WellFormedUnicode" }, { _tag: "NonEmpty" }] },
      },
      entityTypes: [
        {
          entityType: "Company",
          xtdb: { table: "company" },
          rdf: { class: "urn:triplex:type:Company" },
          attributes: [
            {
              key: ":company/name",
              type: TypeExpr.text,
              required: true,
              cardinality: "one",
              storage: "string",
              xtdb: {
                column: "company$name",
                list: false,
                type: "VARCHAR",
                encoding: "native",
                ordering: "order-key",
                exactness: [{ _tag: "WellFormedUnicode" }],
              },
              rdf: {
                predicate: "urn:triplex:attr:company:name",
                object: { kind: "literal", datatype: `${XSD}string` },
                encoding: "native",
                ordering: "order-key",
                exactness: [{ _tag: "WellFormedUnicode" }],
              },
            },
          ],
        },
      ],
    });
    expect(ContentId.isContentId(spec.id)).toBe(true);
  });

  it("assigns one declared physical type per attribute per engine", () => {
    const spec = compile([Person, Company]);
    expect(spec.entityTypes.map((entity) => entity.entityType)).toEqual(["Company", "Person"]);
    const person = ProjectionSpec.entityType(spec, "Person")!;
    expect(person.xtdb.table).toBe("person");
    const table = Object.fromEntries(
      person.attributes.map((a) => [
        a.key,
        [a.xtdb.column, a.xtdb.type, a.xtdb.list, a.rdf.object, a.storage],
      ]),
    );
    expect(table).toEqual({
      ":person/active": [
        "person$active",
        "BOOLEAN",
        false,
        { kind: "literal", datatype: `${XSD}boolean` },
        "boolean",
      ],
      ":person/age": [
        "person$age",
        "BIGINT",
        false,
        { kind: "literal", datatype: `${XSD}integer` },
        "number",
      ],
      ":person/born": [
        "person$born",
        "DATE",
        false,
        { kind: "literal", datatype: `${XSD}date` },
        "string",
      ],
      ":person/employer": ["person$employer", "VARCHAR", false, { kind: "iri" }, "ref"],
      ":person/first-name": [
        "person$first_name",
        "VARCHAR",
        false,
        { kind: "literal", datatype: `${XSD}string` },
        "string",
      ],
      ":person/level": [
        "person$level",
        "VARCHAR",
        false,
        { kind: "literal", datatype: `${XSD}string` },
        "string",
      ],
      ":person/name": [
        "person$name",
        "VARCHAR",
        false,
        { kind: "literal", datatype: `${XSD}string` },
        "string",
      ],
      ":person/salary": [
        "person$salary",
        "BIGINT",
        false,
        { kind: "literal", datatype: `${XSD}integer` },
        "integer",
      ],
      ":person/score": [
        "person$score",
        "DOUBLE PRECISION",
        false,
        { kind: "literal", datatype: `${XSD}double` },
        "number",
      ],
      ":person/seen": [
        "person$seen",
        "TIMESTAMP WITH TIME ZONE",
        false,
        { kind: "literal", datatype: `${XSD}dateTime` },
        "datetime",
      ],
      ":person/skill": [
        "person$skill",
        "VARCHAR",
        true,
        { kind: "literal", datatype: `${XSD}string` },
        "string",
      ],
    });
    expect(ProjectionSpec.attribute(spec, "Person", ":person/employer")?.refTarget).toBe("Company");
    expect(ProjectionSpec.attribute(spec, "Person", ":person/first-name")?.rdf.predicate).toBe(
      "urn:triplex:attr:person:first-name",
    );
  });

  it("maps JSON, constrained and union types to one physical type", () => {
    const spec = compile([
      {
        entityType: "Doc",
        attributes: [
          usage(":doc/body", TypeExpr.struct({ a: TypeExpr.required(TypeExpr.text) })),
          usage(":doc/tags", TypeExpr.list(TypeExpr.text)),
          usage(":doc/code", TypeExpr.constrained(TypeExpr.text, [TypeExpr.minLength(1)])),
          usage(":doc/when", TypeExpr.union([TypeExpr.text, TypeExpr.date])),
          usage(":doc/n", TypeExpr.union([TypeExpr.number, TypeExpr.integer])),
          usage(":doc/big", TypeExpr.constrained(TypeExpr.int64, [TypeExpr.min(0)])),
        ],
      },
    ]);
    const kinds = Object.fromEntries(
      spec.entityTypes[0]!.attributes.map((a) => [
        a.key,
        [a.xtdb.type, a.xtdb.encoding, a.rdf.object],
      ]),
    );
    const json = { kind: "literal", datatype: "http://www.w3.org/1999/02/22-rdf-syntax-ns#JSON" };
    expect(kinds).toEqual({
      ":doc/big": ["BIGINT", "native", { kind: "literal", datatype: `${XSD}integer` }],
      ":doc/body": ["VARCHAR", "canonical-json", json],
      ":doc/code": ["VARCHAR", "native", { kind: "literal", datatype: `${XSD}string` }],
      ":doc/n": ["DOUBLE PRECISION", "native", { kind: "literal", datatype: `${XSD}double` }],
      ":doc/tags": ["VARCHAR", "canonical-json", json],
      ":doc/when": ["VARCHAR", "native", { kind: "literal", datatype: `${XSD}string` }],
    });
  });

  it("uses a configurable RDF base", () => {
    const spec = compile([Company], { rdfBase: "https://example.org/t/" });
    expect(spec.entityTypes[0]!.rdf.class).toBe("https://example.org/t/type/Company");
    expect(spec.entityTypes[0]!.attributes[0]!.rdf.predicate).toBe(
      "https://example.org/t/attr/company/name",
    );
    expect(spec.id).not.toBe(compile([Company]).id);
    expect(compileError([Company], { rdfBase: "nope" }).reason).toBe("invalid-option");
  });
});

describe("ProjectionSpec id", () => {
  it("is content-addressed: equal content, equal id, regardless of input order", () => {
    expect(compile([Person, Company]).id).toBe(compile([Company, Person]).id);
  });

  it("ignores aliases and unique, and changes with type, requiredness, cardinality", () => {
    const base = compile([Company]).id;
    const renamed = EntityType.make("Company", {
      attributes: {
        title: Attribute.use(Attribute.text(":company/name"), { required: true, unique: true }),
      },
    });
    expect(compile([renamed]).id).toBe(base);
    const optional = EntityType.make("Company", {
      attributes: { name: Attribute.use(Attribute.text(":company/name")) },
    });
    const many = EntityType.make("Company", {
      attributes: {
        name: Attribute.use(Attribute.text(":company/name"), {
          required: true,
          cardinality: "many",
        }),
      },
    });
    const retyped = EntityType.make("Company", {
      attributes: { name: Attribute.use(Attribute.date(":company/name"), { required: true }) },
    });
    const ids = new Set([base, compile([optional]).id, compile([many]).id, compile([retyped]).id]);
    expect(ids.size).toBe(4);
  });

  it("is the same when compiled from the persisted release", async () => {
    const release = await Effect.runPromise(
      Effect.gen(function* () {
        const objects = [...(yield* Person.nodes), ...(yield* Company.nodes)];
        return (yield* InMemoryConfigStore.commit(InMemoryConfigStore.empty(), {
          label: "v1",
          objects,
        })).snapshot;
      }),
    );
    const fromRelease = await Effect.runPromise(ProjectionSpec.fromRelease(release));
    expect(fromRelease).toEqual(compile([Person, Company]));
  });
});

describe("ProjectionSpec collisions and rejections", () => {
  it("rejects '-' versus '_' column collisions, naming both keys", () => {
    const error = compileError([
      { entityType: "Person", attributes: [usage(":person/first-name")] },
      { entityType: "Robot", attributes: [usage(":person/first_name")] },
    ]);
    expect(error.reason).toBe("column-collision");
    expect(error.inputs).toEqual([":person/first-name", ":person/first_name"]);
    expect(error.message).toContain("person$first_name");
    expect(
      compileError([{ entityType: "X", attributes: [usage(":a-b/c"), usage(":a_b/c")] }]).reason,
    ).toBe("column-collision");
  });

  it("allows one attribute key on several types (same column everywhere)", () => {
    const spec = compile([
      { entityType: "Person", attributes: [usage(":common/created-by")] },
      { entityType: "Robot", attributes: [usage(":common/created-by")] },
    ]);
    expect(spec.entityTypes.map((e) => e.attributes[0]!.xtdb.column)).toEqual([
      "common$created_by",
      "common$created_by",
    ]);
  });

  it("rejects case-folded table collisions such as ABTest and AbTest", () => {
    const error = compileError([
      { entityType: "AbTest", attributes: [] },
      { entityType: "ABTest", attributes: [] },
    ]);
    expect(error.reason).toBe("table-collision");
    expect(error.inputs).toEqual(["ABTest", "AbTest"]);
    expect(error.message).toContain("ab_test");
  });

  it.each(["XtRecord", "TxLog", "PgThing", "TriplexMeta"])(
    "rejects reserved table for %s",
    (name) => {
      expect(compileError([{ entityType: name, attributes: [] }]).reason).toBe("reserved-name");
    },
  );

  it("rejects reserved namespaces and XTDB system columns", () => {
    expect(compileError([{ entityType: "P", attributes: [usage(":triplex/thing")] }]).reason).toBe(
      "reserved-namespace",
    );
    expect(compileError([{ entityType: "P", attributes: [usage(":xt/id")] }]).reason).toBe(
      "reserved-name",
    );
  });

  it("rejects invalid names, duplicates and unprojectable types", () => {
    expect(compileError([{ entityType: "person", attributes: [] }]).reason).toBe("invalid-name");
    expect(compileError([{ entityType: "_Transaction", attributes: [] }]).reason).toBe(
      "invalid-name",
    );
    expect(compileError([{ entityType: "P", attributes: [usage(":_tx/x")] }]).reason).toBe(
      "invalid-name",
    );
    expect(compileError([Company, Company]).reason).toBe("duplicate-entity-type");
    expect(
      compileError([{ entityType: "P", attributes: [usage(":p/a"), usage(":p/a")] }]).reason,
    ).toBe("duplicate-attribute");
    expect(
      compileError([{ entityType: "P", attributes: [usage(":p/a", TypeExpr.any)] }]).reason,
    ).toBe("unsupported-type");
    const mixed = compileError([
      {
        entityType: "P",
        attributes: [usage(":p/a", TypeExpr.union([TypeExpr.text, TypeExpr.int64]))],
      },
    ]);
    expect(mixed.reason).toBe("unsupported-type");
    expect(mixed.inputs).toEqual(["P.:p/a"]);
  });
});

describe("ProjectionSpec exactness", () => {
  const spec = compile([Person, Company]);
  const rules = (key: string, engine: "xtdb" | "rdf") =>
    ProjectionSpec.attribute(spec, "Person", key)![engine].exactness;
  const exact = (
    key: string,
    engine: "xtdb" | "rdf",
    value: Parameters<typeof ProjectionSpec.isExact>[1],
  ) => ProjectionSpec.isExact(rules(key, engine), value);

  it("QLever integers are exact only inside +-2^59 (R2 4.1); XTDB BIGINT holds all int64", () => {
    expect(exact(":person/salary", "rdf", integer("576460752303423487"))).toBe(true);
    expect(exact(":person/salary", "rdf", integer("576460752303423488"))).toBe(false);
    expect(exact(":person/salary", "rdf", integer("-576460752303423488"))).toBe(true);
    expect(exact(":person/salary", "rdf", integer("-576460752303423489"))).toBe(false);
    expect(exact(":person/salary", "xtdb", integer("9223372036854775807"))).toBe(true);
    expect(exact(":person/salary", "xtdb", integer("-9223372036854775808"))).toBe(true);
  });

  it("JS integers: -0 is never exact in an integer column; 2^63 exceeds BIGINT", () => {
    expect(exact(":person/age", "xtdb", { type: "number", value: 42 })).toBe(true);
    expect(exact(":person/age", "xtdb", { type: "number", value: -0 })).toBe(false);
    expect(exact(":person/age", "rdf", { type: "number", value: -0 })).toBe(false);
    expect(exact(":person/age", "xtdb", { type: "number", value: 2 ** 63 })).toBe(false);
    expect(exact(":person/age", "rdf", { type: "number", value: 2 ** 53 })).toBe(true);
    expect(exact(":person/age", "rdf", { type: "number", value: 2 ** 59 })).toBe(false);
  });

  it("QLever doubles drop the low 4 mantissa bits (49 significant bits); XTDB DOUBLE is exact", () => {
    expect(exact(":person/score", "rdf", { type: "number", value: 0.5 })).toBe(true);
    expect(exact(":person/score", "rdf", { type: "number", value: -0 })).toBe(true);
    expect(exact(":person/score", "rdf", { type: "number", value: 0.1 })).toBe(false);
    expect(exact(":person/score", "rdf", { type: "number", value: 0.30000000000000004 })).toBe(
      false,
    );
    expect(exact(":person/score", "rdf", { type: "number", value: 2 ** 40 + 1 })).toBe(true);
    expect(exact(":person/score", "rdf", { type: "number", value: 2 ** 52 + 1 })).toBe(false);
    expect(exact(":person/score", "xtdb", { type: "number", value: 0.1 })).toBe(true);
  });

  it("QLever dateTime is millisecond and years 1..9999; sub-ms instants are never exact", () => {
    expect(exact(":person/seen", "rdf", { type: "datetime", value: 1_700_000_000_123 })).toBe(true);
    expect(exact(":person/seen", "rdf", { type: "datetime", value: 1_700_000_000_123.5 })).toBe(
      false,
    );
    expect(exact(":person/seen", "rdf", { type: "datetime", value: 253402300800000 })).toBe(false);
    expect(exact(":person/seen", "rdf", { type: "datetime", value: -62135596800001 })).toBe(false);
    expect(exact(":person/seen", "xtdb", { type: "datetime", value: 253402300800000 })).toBe(true);
    expect(exact(":person/seen", "xtdb", { type: "datetime", value: 1.5 })).toBe(false);
  });

  it("strings and refs must be well-formed Unicode; RDF refs must be non-empty", () => {
    expect(exact(":person/name", "xtdb", { type: "string", value: "a\ud800" })).toBe(false);
    expect(exact(":person/name", "rdf", { type: "string", value: "Maria" })).toBe(true);
    expect(exact(":person/employer", "rdf", { type: "ref", value: "" as never })).toBe(false);
    expect(exact(":person/employer", "xtdb", { type: "ref", value: "" as never })).toBe(true);
  });

  it("XTDB valid-time coordinates must lie on the microsecond grid", () => {
    const validTime = spec.coordinates.xtdb.validTime;
    expect(ProjectionSpec.isExact(validTime, 1_700_000_000_000)).toBe(true);
    expect(ProjectionSpec.isExact(validTime, 1.001)).toBe(true);
    expect(ProjectionSpec.isExact(validTime, 1.0005)).toBe(false);
    expect(ProjectionSpec.isExact(validTime, 0.1234567)).toBe(false);
    expect(ProjectionSpec.isExact(validTime, 9e15)).toBe(false);
    expect(ProjectionSpec.isExact(spec.coordinates.rdf.validTime, 0.1234567)).toBe(true);
  });

  it("entity ids: lone surrogates are inexact for both engines, empty ids for RDF", () => {
    expect(ProjectionSpec.isExact(spec.coordinates.xtdb.entityId, "a\udc00")).toBe(false);
    expect(ProjectionSpec.isExact(spec.coordinates.rdf.entityId, "")).toBe(false);
    expect(ProjectionSpec.isExact(spec.coordinates.rdf.entityId, "person:maria")).toBe(true);
  });
});
