import { integerOrderKey } from "../src/rdf.js";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { Attribute, TypeExpr } from "@triplex-build/triplex/config";
import { DatabaseScope } from "@triplex-build/triplex/runtime";
import { integer } from "@triplex-build/triplex";
import type { QleverClient, SparqlBinding } from "../src/QleverClient.js";
import { makeQleverNativeQueries } from "../src/native/NativeQueries.js";
import { makeQleverNativeContext } from "../src/native/NativeContext.js";
import { evaluateQleverRules } from "../src/recursion.js";
import { compileQlever } from "../src/compiler.js";

const literal = (value: string) => ({ type: "literal", value });
const scope = DatabaseScope.test("native-unit");
const clientFor = (rows: SparqlBinding[]) => {
  const queries: string[] = [];
  const client: QleverClient = {
    query: async (query) => {
      queries.push(query);
      return queries.length === 1 ? [{ position: literal("7"), stamp: literal(integerOrderKey("1000000")) }] : rows;
    },
    update: async () => {
      throw new Error("Native query facade must not mutate");
    },
    command: async () => {
      throw new Error("No administrative command expected");
    },
    cancel: async () => {},
    close: async () => {},
  };
  return { client, queries };
};

describe("schema-aware native QLever queries", () => {
  it("executes authored SPARQL and decodes declared exact values without Datalog probes", async () => {
    const { client, queries } = clientFor([
      {
        amount: literal("9223372036854775807"),
        ratio: literal("1.0000000000000002"),
        zero: literal("-0"),
        text: literal("007"),
        enabled: literal("0"),
      },
    ]);
    const amount = Attribute.int64(":ledger/amount");
    const result = await Effect.runPromise(
      makeQleverNativeQueries(client, scope).select(
        {
          name: "native-ledger",
          parameters: TypeExpr.struct({ search: TypeExpr.required(TypeExpr.text) }),
          row: TypeExpr.struct({
            amount: TypeExpr.required(TypeExpr.int64),
            ratio: TypeExpr.required(TypeExpr.number),
            zero: TypeExpr.required(TypeExpr.number),
            text: TypeExpr.required(TypeExpr.text),
            enabled: TypeExpr.required(TypeExpr.boolean),
          }),
        },
        { search: 'a"\\u0041' },
        (view, input) => {
          const search = (input as { search: string }).search;
          return `SELECT ?amount ?ratio ?zero ?text ?enabled WHERE { ${view.fact("?entry", amount, "?amount", { order: "?amountOrder" })} FILTER(?amountOrder >= ${view.integerOrder("9007199254740993")}) BIND(CONCAT(${view.literal(search)}, " native") AS ?text) } LIMIT 10`;
        },
        { basis: { validAt: 100, recordedAt: 200, recordedPosition: 5 }, includeRaw: true },
      ),
    );
    expect(queries).toHaveLength(2);
    expect(queries[1]).toContain("CONCAT(");
    expect(queries[1]).toContain("value_integer_order");
    expect(queries[1]).toContain("retracted_position_order");
    expect(result.rows).toEqual([
      {
        amount: integer("9223372036854775807"),
        ratio: 1.0000000000000002,
        zero: -0,
        text: "007",
        enabled: false,
      },
    ]);
    expect(Object.is((result.rows[0] as { zero: number }).zero, -0)).toBe(true);
    expect(result.rawRows?.[0]).toHaveProperty("amount.value", "9223372036854775807");
    expect(result.basis.recordedPosition).toBe(5);
    expect(result.trace.language).toBe("sparql-1.1");
  });

  it("retains RDF kind, datatype, language and unbound fields for Any", async () => {
    const raw = {
      uri: { type: "uri", value: "urn:example:one" },
      label: { type: "literal", value: "bonjour", "xml:lang": "fr" },
      exact: { type: "literal", value: "9007199254740993", datatype: "urn:triplex:int64" },
    };
    const { client } = clientFor([raw]);
    const result = await Effect.runPromise(
      makeQleverNativeQueries(client, scope).select(
        { name: "raw-native", parameters: TypeExpr.any, row: TypeExpr.any },
        {},
        () => "SELECT ?uri ?label ?exact WHERE { ?uri ?label ?exact } LIMIT 1",
      ),
    );
    expect(result.rows).toEqual([raw]);
    expect(result.rows[0]).not.toHaveProperty("unbound");
  });

  it("rejects invalid parameters before network calls and oversized answers without partial results", async () => {
    const { client, queries } = clientFor([{ value: literal("a") }, { value: literal("b") }]);
    const native = makeQleverNativeQueries(client, scope);
    await expect(
      Effect.runPromise(
        native.select(
          { name: "bad-input", parameters: TypeExpr.text, row: TypeExpr.any },
          42,
          () => "SELECT * {}",
        ),
      ),
    ).rejects.toThrow();
    expect(queries).toHaveLength(0);
    await expect(
      Effect.runPromise(
        native.select(
          { name: "bounded", parameters: TypeExpr.any, row: TypeExpr.any },
          {},
          () => "SELECT ?value WHERE { ?s ?p ?value }",
          { maxRows: 1 },
        ),
      ),
    ).rejects.toThrow("QLever native SELECT failed");
  });

  it("rejects unsafe helper terms and native precision loss while allowing exact lexical comparisons", () => {
    const view = makeQleverNativeContext({ scope, recordedPosition: 1, validAt: 10 });
    expect(() => view.nativeNumber(1.0000000000000002)).toThrow();
    expect(() => view.nativeNumber(-0)).toThrow();
    expect(() => view.iri("urn:example:bad> ?s ?p ?o")).toThrow();
    expect(() => view.fact("?bad }", Attribute.number(":item/price"), "?price")).toThrow();
    expect(view.integerOrder("9223372036854775807")).toBe('"ffffffffffffffff"');
    expect(view.fact("?item", Attribute.number(":item/price"), "?price")).toContain(
      "value_number>",
    );
  });

  it("[EXP-C8] evaluates an equality self-rule with reads only, without weakening duplicate-projection validation", async () => {
    const queries: string[] = [];
    const client: QleverClient = {
      query: async (query) => {
        queries.push(query);
        return [{ v0_value: literal("n"), v1_value: literal("n") }];
      },
      update: async () => {
        throw new Error("C8: a read path attempted an update");
      },
      command: async () => ({}),
      cancel: async () => {},
      close: async () => {},
    };
    const relations = await evaluateQleverRules(
      client,
      {
        find: ["?node"],
        where: [["self", "?node", "?node"]],
        rules: [{ name: "self", body: [["?node", ":same", "?node"]] }],
      },
      scope,
      { basis: { validAt: 10, recordedPosition: 0 }, signal: new AbortController().signal },
    );
    expect(queries).toHaveLength(1);
    expect(queries[0]).toContain("BIND(?v0_value AS ?v1_value)");
    expect(queries[0]).toContain("BIND(?v0_type AS ?v1_type)");
    expect(queries[0]).not.toMatch(/\b(INSERT|DELETE)\b/);
    expect(relations.get("self")).toEqual([["n", "n"]]);
    expect(() =>
      compileQlever({ find: ["?node", "?node"], where: [["?node", ":same", "?node"]] }, scope, {
        basis: { validAt: 10, recordedPosition: 0 },
      }),
    ).toThrow("projected more than once");
  });
});
