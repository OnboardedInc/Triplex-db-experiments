import { describe, expect, it } from "vitest";

import { PhysicalNames } from "../../src/entity/index.js";

const {
  decodeEntityId,
  encodeEntityId,
  rdfAttribute,
  rdfClass,
  rdfEntity,
  validateRdfBase,
  xtdbColumn,
  xtdbNormalForm,
  xtdbTable,
} = PhysicalNames;

describe("XTDB names", () => {
  it.each([
    [":person/name", "person$name"],
    [":person/first-name", "person$first_name"],
    [":person/first_name", "person$first_name"],
    [":a-b/c", "a_b$c"],
    [":a_b/c", "a_b$c"],
    [":placement/worker", "placement$worker"],
    [":common/created-by", "common$created_by"],
  ])("column %s -> %s (R3 vectors)", (key, column) => {
    expect(xtdbColumn(key)).toBe(column);
  });

  it("ports XTDB normal form, including the xt/ prefix and dots", () => {
    expect(xtdbNormalForm("xt/valid-from")).toBe("_valid_from");
    expect(xtdbNormalForm("a.b/C-d")).toBe("a$b$c_d");
  });

  it.each([
    ["Person", "person"],
    ["ProjectMember", "project_member"],
    ["HTTPRoute", "http_route"],
    ["ABTest", "ab_test"],
    ["AbTest", "ab_test"],
    ["W2Form", "w2_form"],
    ["I9Document", "i9_document"],
    ["Oauth2Token", "oauth2_token"],
  ])("table %s -> %s (R3 vectors)", (type, table) => {
    expect(xtdbTable(type)).toBe(table);
  });

  it("rejects invalid inputs", () => {
    expect(() => xtdbColumn(":Person/name")).toThrow(TypeError);
    expect(() => xtdbTable("person")).toThrow(TypeError);
  });
});

describe("RDF names", () => {
  it("uses urn:triplex: by default", () => {
    expect(rdfAttribute(":person/first-name")).toBe("urn:triplex:attr:person:first-name");
    expect(rdfClass("Person")).toBe("urn:triplex:type:Person");
    expect(rdfEntity("person:maria")).toBe("urn:triplex:entity:person:maria");
  });

  it("supports a hierarchical base", () => {
    const base = "https://example.org/triplex/";
    expect(rdfAttribute(":person/first-name", base)).toBe(
      "https://example.org/triplex/attr/person/first-name",
    );
    expect(rdfClass("Person", base)).toBe("https://example.org/triplex/type/Person");
    expect(rdfEntity("a/b c", base)).toBe("https://example.org/triplex/entity/a%2Fb%20c");
  });

  it("validates bases", () => {
    expect(validateRdfBase("urn:triplex:")).toBeUndefined();
    expect(validateRdfBase("https://x.org/ns#")).toBeUndefined();
    expect(validateRdfBase("not a base")).toBeDefined();
    expect(validateRdfBase("urn:triplex")).toBeDefined();
    expect(validateRdfBase("https://x.org/<a>/")).toBeDefined();
  });

  it.each([
    ["worker:maria", "worker:maria"],
    ["case:01J9XYZABC", "case:01J9XYZABC"],
    ["a/b c", "a%2Fb%20c"],
    ["100%", "100%25"],
    ["é/ü", "%C3%A9%2F%C3%BC"],
    ["-lead", "%2Dlead"],
    ["trail.", "trail%2E"],
    [".", "%2E"],
    ["..", "%2E%2E"],
    ["a.b", "a.b"],
    ["x~y", "x%7Ey"],
    ["emoji:😀", "emoji:%F0%9F%98%80"],
    ["Q?#", "Q%3F%23"],
    ["UPPER:lower", "UPPER:lower"],
  ])("entity id %j encodes to %s and round-trips (R3 vectors)", (id, segment) => {
    expect(encodeEntityId(id)).toBe(segment);
    expect(decodeEntityId(segment)).toBe(id);
  });

  it("rejects empty ids, lone surrogates and non-canonical encodings", () => {
    expect(() => encodeEntityId("")).toThrow(TypeError);
    expect(() => encodeEntityId("a\ud800b")).toThrow(TypeError);
    expect(() => decodeEntityId("%2a")).toThrow(TypeError);
    expect(() => decodeEntityId("%41")).toThrow(TypeError);
  });

  it("is injective over every string up to length 4 on a 9-symbol alphabet", () => {
    const alphabet = ["a", "A", "%", "/", ".", "-", ":", " ", "é"];
    const seen = new Map<string, string>();
    let count = 0;
    const visit = (prefix: string, depth: number): void => {
      if (prefix.length > 0) {
        const encoded = encodeEntityId(prefix);
        expect(seen.get(encoded) ?? prefix).toBe(prefix);
        seen.set(encoded, prefix);
        expect(decodeEntityId(encoded)).toBe(prefix);
        count++;
      }
      if (depth < 4) for (const symbol of alphabet) visit(prefix + symbol, depth + 1);
    };
    visit("", 0);
    expect(count).toBe(7380);
  });
});
