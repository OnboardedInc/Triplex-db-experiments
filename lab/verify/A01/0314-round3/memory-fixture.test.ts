import { Effect } from "effect";
import { it, expect } from "vitest";
import { Triples, KvTriples, EntityId } from "@triplex-build/triplex";
type TripleValue = any; type ValueDomain = any;
const ValueDomains = {"memory":{"id":"memory/kv","kinds":["string","number","integer","boolean","datetime","ref","json","blob"],"integer":{"min":"-9223372036854775808","max":"9223372036854775807"},"decimal":null,"string":{"maxUtf8Bytes":1048576,"allowNul":false},"number":{"min":-1.7976931348623157e+308,"max":1.7976931348623157e+308,"negativeZero":false},"datetime":{"min":-8640000000000000,"max":8640000000000000,"integerMilliseconds":false},"storage":null,"json":{"maxDepth":128,"maxArrayHoles":0,"journalDepthAllowance":16},"sources":["packages/core/src/kv/hexastore/KvTripleStore.ts:serializeDatom"],"blob":{"minSize":0,"maxSize":9007199254740991}}};
const nested = (depth: number): unknown => {
  let v: unknown = null;
  for (let i = 0; i < depth; i++) v = { child: v };
  return v;
};
const valid = (d: ValueDomain): TripleValue[] => [
  ...["", "x".repeat(d.string.maxUtf8Bytes), "😀".repeat(d.string.maxUtf8Bytes / 4)].map(
    (value) => ({ type: "string" as const, value }),
  ),
  { type: "ref", value: EntityId.make("x".repeat(d.string.maxUtf8Bytes)) },
  ...[d.number.min, -Number.MIN_VALUE, 0, Number.MIN_VALUE, 0.1, d.number.max].map((value) => ({
    type: "number" as const,
    value,
  })),
  ...[d.datetime.min, d.datetime.max, 0, ...(d.datetime.integerMilliseconds ? [] : [0.5])].map(
    (value) => ({
      type: "datetime" as const,
      value,
    }),
  ),
  {
    type: "blob",
    value: "x".repeat(d.string.maxUtf8Bytes),
    mimeType: "x".repeat(d.string.maxUtf8Bytes),
    size: 0,
    filename: "x".repeat(d.string.maxUtf8Bytes),
  },
  { type: "boolean", value: false },
  { type: "boolean", value: true },
  { type: "json", value: nested(d.json.maxDepth) },
  { type: "json", value: { unicode: "😀", nested: [true, null, 0.1] } },
  ...[d.blob.minSize, d.blob.maxSize].map((size) => ({
    type: "blob" as const,
    value: "h",
    mimeType: "text/plain",
    size,
    filename: "",
  })),
  ...(d.integer
    ? [d.integer.min, "0", "9007199254740993", d.integer.max].map((value) => ({
        type: "integer" as const,
        value,
      }))
    : []),
];
it("memory accepted endpoints survive journal, callback, get and receipt without conversion", async () => {
  await Effect.runPromise(
    Effect.gen(function* () {
      const triples = yield* Triples;
      for (const [index, value] of valid(ValueDomains.memory).entries()) {
        const commandId = `bound:accepted:${index}`;
        const result = yield* triples.transact(
          [
            {
              op: "assert",
              entityId: EntityId.make("bound:entity"),
              attribute: `:bound/${index}`,
              value,
              validFrom: 0,
            },
          ],
          { commandId },
        );
        expect((yield* triples.get(result.triples[0]!.id))?.value).toStrictEqual(value);
        const receipt = yield* triples.transactionByCommand(commandId);
        expect(receipt?.txId).toBe(result.txId);
        expect(receipt?.changes[0]?.value).toStrictEqual(value);
        const historical = yield* triples.entity(EntityId.make("bound:entity"), {
          recordedAt: result.instant,
          validAt: 0,
        });
        expect(historical.find((f) => f.attribute === `:bound/${index}`)?.value).toStrictEqual(
          value,
        );
      }
    }).pipe(Effect.provide(KvTriples.layer), Effect.scoped),
  );
});
