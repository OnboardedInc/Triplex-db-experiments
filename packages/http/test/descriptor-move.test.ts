// [EXP-R01] Pins that moving the descriptor compiler to core kept the REST exposure rules and
// their error codes, paths and messages.
import { Attribute, EntityType, InMemoryConfigStore } from "@triplex-build/triplex/config";
import { Effect, Result } from "effect";
import { describe, expect, it } from "vitest";

import { compile, type ExposureOptions } from "../src/ConfigApi.js";

const release = (...types: ReadonlyArray<{ readonly nodes: Effect.Effect<any, any> }>) =>
  Effect.runPromise(
    Effect.gen(function* () {
      const objects = [];
      for (const type of types) objects.push(...((yield* type.nodes) as ReadonlyArray<any>));
      return (yield* InMemoryConfigStore.commit(InMemoryConfigStore.empty(), {
        label: "v1",
        objects,
      })).snapshot;
    }),
  );

const failure = async (
  types: ReadonlyArray<{ readonly nodes: Effect.Effect<any, any> }>,
  options?: ExposureOptions,
) => {
  const result = await Effect.runPromise(Effect.result(compile(await release(...types), options)));
  if (Result.isSuccess(result)) throw new Error("expected a compile failure");
  return { ...result.failure, tag: result.failure._tag, message: result.failure.message };
};

const ProjectMember = EntityType.make("ProjectMember", {
  attributes: { role: Attribute.use(Attribute.text(":member/role"), { required: true }) },
});

describe("ConfigApi exposure rules after the move to core", () => {
  it("rejects a default collection that is not a safe path segment", async () => {
    expect(await failure([ProjectMember])).toMatchObject({
      tag: "ConfigConflictError",
      code: "config_conflict",
      path: "entities.ProjectMember.collection",
      message: 'Collection "projectMembers" is not a safe, non-reserved path segment',
    });
  });

  it("accepts the same type with a collection override", async () => {
    const descriptor = await Effect.runPromise(
      compile(await release(ProjectMember), { collections: { ProjectMember: "members" } }),
    );
    expect(descriptor.entities.map((entity) => [entity.entityType, entity.collection])).toEqual([
      ["ProjectMember", "members"],
    ]);
    expect(descriptor.entities[0]!.operations).toEqual(["read", "create", "replace", "delete"]);
  });

  it("still requires at least one application attribute", async () => {
    expect(await failure([EntityType.make("Empty", { attributes: {} })])).toMatchObject({
      tag: "UnsupportedConfigError",
      code: "unsupported_config",
      path: "entities.Empty.attributes",
      message: "REST exposure requires at least one application attribute",
    });
  });

  it("rejects overrides for unknown entity types and duplicate operations", async () => {
    expect(
      await failure([ProjectMember], {
        collections: { ProjectMember: "members", Ghost: "ghosts" },
      }),
    ).toMatchObject({ tag: "ConfigConflictError", path: "exposure.collections.Ghost" });
    expect(
      await failure([ProjectMember], {
        collections: { ProjectMember: "members" },
        operations: { ProjectMember: ["read", "read"] },
      }),
    ).toMatchObject({
      tag: "ConfigConflictError",
      path: "entities.ProjectMember.operations",
      message: "Operations must be unique",
    });
  });
});
