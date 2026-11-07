import { Effect, Option, Result } from "effect";
import { describe, expect, it } from "vitest";

import { Attribute, EntityType, InMemoryConfigStore } from "../../src/config/index.js";
import {
  DescriptorCompileError,
  Descriptors,
  EntityCodec,
  EntityShapeError,
} from "../../src/entity/index.js";
import type { Triple } from "../../src/Triple.js";

const release = (
  ...types: ReadonlyArray<{ readonly nodes: EntityType.EntityType<string, any>["nodes"] }>
) =>
  Effect.runPromise(
    Effect.gen(function* () {
      const objects = [];
      for (const type of types) objects.push(...(yield* type.nodes));
      return (yield* InMemoryConfigStore.commit(InMemoryConfigStore.empty(), {
        label: "v1",
        objects,
      })).snapshot;
    }),
  );

describe("Descriptors.compile (moved from http ConfigApi)", () => {
  it("compiles multi-word and attribute-less types that only REST exposure rejects", async () => {
    const ProjectMember = EntityType.make("ProjectMember", {
      attributes: { role: Attribute.use(Attribute.text(":member/role"), { required: true }) },
    });
    const Empty = EntityType.make("Empty", { attributes: {} });
    const compiled = await Effect.runPromise(
      Descriptors.compile(await release(ProjectMember, Empty)),
    );
    expect(compiled.entities.map((entity) => entity.entityType).sort()).toEqual([
      "Empty",
      "ProjectMember",
    ]);
    expect(compiled.entities.find((e) => e.entityType === "ProjectMember")!.attributes).toEqual([
      expect.objectContaining({ key: ":member/role", alias: "role", storage: "string" }),
    ]);
  });

  it("runs exposure hooks and propagates their errors unchanged", async () => {
    const Person = EntityType.make("Person", {
      attributes: { name: Attribute.use(Attribute.text(":person/name")) },
    });
    const calls: string[] = [];
    const result = await Effect.runPromise(
      Effect.result(
        Descriptors.compile<string>(await release(Person), {
          beforeAttributes: (type) => Effect.sync(() => void calls.push(`before:${type}`)),
          afterAttributes: (type, attrs) =>
            Effect.sync(() => void calls.push(`attrs:${type}:${attrs.length}`)),
          afterEntity: (type) => Effect.sync(() => void calls.push(`entity:${type}`)),
          afterEntities: () => Effect.fail("stop"),
        }),
      ),
    );
    expect(calls).toEqual(["before:Person", "attrs:Person:1", "entity:Person"]);
    expect(Result.isFailure(result) && result.failure).toBe("stop");
  });

  it("fails with a neutral DescriptorCompileError for reserved attributes", async () => {
    const Person = EntityType.make("Person", {
      attributes: { secret: Attribute.use(Attribute.text(":triplex/secret")) },
    });
    const result = await Effect.runPromise(
      Effect.result(Descriptors.compile(await release(Person))),
    );
    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.failure).toBeInstanceOf(DescriptorCompileError);
      expect(result.failure.kind).toBe("conflict");
      expect(result.failure.path).toBe("attributes.:triplex/secret");
    }
  });
});

describe("EntityCodec (moved from http)", () => {
  it("raises the core EntityShapeError for a card-one attribute with two distinct values", async () => {
    const Person = EntityType.make("Person", {
      attributes: { name: Attribute.use(Attribute.text(":person/name")) },
    });
    const compiled = await Effect.runPromise(Descriptors.compile(await release(Person)));
    const fact = (id: string, value: string): Triple =>
      ({
        id,
        entityId: "p1",
        attribute: ":person/name",
        value: { type: "string", value },
        recordedAt: 0,
        validFrom: 0,
        validTo: Option.none(),
        createdBy: Option.none(),
        retractedAt: Option.none(),
        entityType: Option.some("Person"),
        schemaVersion: Option.none(),
        txId: Option.none(),
        retractTxId: Option.none(),
      }) as unknown as Triple;
    const entity = compiled.entities[0]!;
    const same = await Effect.runPromise(
      EntityCodec.encodeEntity(entity, [fact("a", "Maria"), fact("b", "Maria")]),
    );
    expect(same).toEqual({ id: "p1", type: "Person", attributes: { ":person/name": "Maria" } });
    const result = await Effect.runPromise(
      Effect.result(EntityCodec.encodeEntity(entity, [fact("a", "Maria"), fact("b", "Ana")])),
    );
    expect(Result.isFailure(result) && result.failure).toBeInstanceOf(EntityShapeError);
  });
});
