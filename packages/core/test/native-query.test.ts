import { describe, expect, it } from "vitest";
import { Effect } from "effect";
import * as TypeExpr from "../src/config/TypeExpr.js";
import {
  decodeNativeParameters,
  decodeNativeRows,
  hydrateNativeValue,
  nativeEvidenceValue,
  nativeQueryContractId,
  resolveNativeReadBasis,
} from "../src/native/NativeQuery.js";
import { DatabaseScope } from "../src/runtime/DatabaseScope.js";
import * as CanonicalJson from "../src/content/CanonicalJson.js";
import * as ContentId from "../src/content/ContentId.js";

const contract = {
  name: "native/exact-count",
  parameters: TypeExpr.struct({ owner: TypeExpr.required(TypeExpr.text) }),
  row: TypeExpr.struct({ count: TypeExpr.required(TypeExpr.int64) }),
};

describe("native query contracts", () => {
  it("preserves signed-zero evidence and parameter identities before JSON serialization", () => {
    const negative = nativeEvidenceValue({ value: -0, nested: [-0, 0, 7n] });
    expect(negative).toEqual({
      value: { type: "float64", bits: "8000000000000000" },
      nested: [{ type: "float64", bits: "8000000000000000" }, 0, { type: "integer", value: "7" }],
    });
    expect(Object.is(nativeEvidenceValue(0), 0)).toBe(true);
    const identity = (input: unknown) =>
      ContentId.hash(
        "native-parameter-test/v1",
        CanonicalJson.encodeOrThrow(nativeEvidenceValue(input) as CanonicalJson.CanonicalValue),
      );
    expect(identity({ value: -0 })).not.toBe(identity({ value: 0 }));
    expect(JSON.parse(JSON.stringify(negative))).toEqual(negative);
  });

  it("decodes a declared int64 losslessly while preserving untyped native strings", async () => {
    expect(
      await Effect.runPromise(decodeNativeRows(contract, [{ count: "9223372036854775807" }])),
    ).toEqual([{ count: { type: "integer", value: "9223372036854775807" } }]);
    expect(hydrateNativeValue(TypeExpr.any, "9223372036854775807")).toBe("9223372036854775807");
    expect(hydrateNativeValue(TypeExpr.union([TypeExpr.text, TypeExpr.int64]), "123")).toBe("123");
    await expect(
      Effect.runPromise(decodeNativeRows(contract, [{ count: 9223372036854775807 }])),
    ).rejects.toThrow();
  });

  it("validates named parameter and row contracts without asserting a generic shape", async () => {
    expect(await Effect.runPromise(decodeNativeParameters(contract, { owner: "alice" }))).toEqual({
      owner: "alice",
    });
    await expect(
      Effect.runPromise(decodeNativeParameters(contract, { owner: 1 })),
    ).rejects.toThrow();
    await expect(
      Effect.runPromise(decodeNativeRows(contract, [{ count: "1", extra: true }])),
    ).rejects.toThrow();
    expect(nativeQueryContractId(contract)).toBe(nativeQueryContractId({ ...contract }));
    expect(nativeQueryContractId({ ...contract, name: "other" })).not.toBe(
      nativeQueryContractId(contract),
    );
  });

  it("preserves fractional coordinates and rejects unavailable or unsafe source cuts", () => {
    const scope = DatabaseScope.test("native-contract");
    expect(
      resolveNativeReadBasis({
        scope,
        now: 100,
        currentPosition: 5,
        options: { basis: { validAt: 2.25, recordedAt: 10.5, recordedPosition: 3 } },
      }),
    ).toEqual({ scope, recordedPosition: 3, recordedAt: 10.5, validAt: 2.25 });
    for (const recordedPosition of [-1, 1.5, 6, Number.MAX_SAFE_INTEGER + 1]) {
      expect(() =>
        resolveNativeReadBasis({
          scope,
          now: 100,
          currentPosition: 5,
          options: { basis: { recordedPosition } },
        }),
      ).toThrow();
    }
  });
});
