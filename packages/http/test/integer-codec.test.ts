import { Effect, Option } from "effect";
import { describe, expect, it } from "vitest";
import { EntityId, integer, type Triple } from "@triplex-build/triplex";
import { Attribute, EntityType, InMemoryConfigStore } from "@triplex-build/triplex/config";
import { compile } from "../src/ConfigApi.js";
import { compileHttpApi } from "../src/EntityHttpApi.js";
import { decodeInput, encodeEntity } from "../src/EntityCodec.js";

const descriptor = Effect.gen(function* () {
  const Ledger = EntityType.make("ExactLedger", {
    attributes: {
      amount: Attribute.use(Attribute.int64(":ledger/amount"), { required: true }),
      changes: Attribute.use(Attribute.int64(":ledger/change"), { cardinality: "many" }),
    },
  });
  const release = yield* InMemoryConfigStore.commit(InMemoryConfigStore.empty(), {
    label: "exact-integers",
    objects: yield* Ledger.nodes,
  });
  return yield* compile(release.snapshot, { collections: { ExactLedger: "exact-ledgers" } });
});
const fact = (attribute: string, value: ReturnType<typeof integer>): Triple => ({
  id: "exact-fact" as Triple["id"],
  entityId: EntityId.make("ledger:one"),
  attribute: attribute as Triple["attribute"],
  value,
  recordedAt: 1,
  validFrom: 1,
  validTo: Option.none(),
  createdBy: Option.none(),
  retractedAt: Option.none(),
  retractTxId: Option.none(),
  entityType: Option.some("ExactLedger"),
  schemaVersion: Option.none(),
  txId: Option.none(),
});

describe("Lossless HTTP exact integer codec", () => {
  it("compiles a persisted int64 schema and OpenAPI with decimal text payloads", async () => {
    const config = await Effect.runPromise(descriptor);
    expect(config.entities[0]!.attributes.map((attribute) => attribute.storage)).toEqual([
      "integer",
      "integer",
    ]);
    const contract = compileHttpApi(config, { basePath: "/api", version: "exact" });
    const document = JSON.parse(JSON.stringify(contract.openApi));
    expect(
      document.components.schemas.ExactLedgerAttributes.properties[":ledger/amount"],
    ).toMatchObject({
      type: "object",
      properties: { type: { type: "string", enum: ["integer"] }, value: { type: "string" } },
      description: expect.stringContaining("canonical decimal text"),
    });
  });
  it("round-trips both signed bounds and independently deduplicates exact many values", async () => {
    const config = await Effect.runPromise(descriptor),
      entity = config.entities[0]!;
    const body = {
      attributes: {
        ":ledger/amount": integer("9223372036854775807"),
        ":ledger/change": [
          integer("-9223372036854775808"),
          integer("9007199254740993"),
          integer("9007199254740993"),
        ],
      },
    };
    const decoded = await Effect.runPromise(decodeInput(entity, JSON.parse(JSON.stringify(body))));
    const facts = [...decoded].flatMap(([attribute, values]) =>
      values.map((value) => fact(attribute.key, value as ReturnType<typeof integer>)),
    );
    const output = await Effect.runPromise(encodeEntity(entity, facts));
    expect(output.attributes[":ledger/amount"]).toEqual(body.attributes[":ledger/amount"]);
    expect(output.attributes[":ledger/change"]).toEqual([
      integer("-9223372036854775808"),
      integer("9007199254740993"),
    ]);
    expect(JSON.parse(JSON.stringify(output))).toEqual(output);
  });
  it("rejects rounded JSON numbers, plain text, noncanonical digits and overflow", async () => {
    const config = await Effect.runPromise(descriptor),
      entity = config.entities[0]!;
    for (const value of [
      9007199254740992,
      "9007199254740993",
      { type: "integer", value: "01" },
      { type: "integer", value: "-0" },
      { type: "integer", value: "9223372036854775808" },
    ]) {
      await expect(
        Effect.runPromise(decodeInput(entity, { attributes: { ":ledger/amount": value } })),
      ).rejects.toMatchObject({ code: "invalid_request" });
    }
  });
});
