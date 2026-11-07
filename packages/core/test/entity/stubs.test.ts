import { Cause, Effect, Exit } from "effect";
import { describe, expect, it } from "vitest";

import { Attribute, EntityType } from "../../src/config/index.js";
import { NotImplementedError, Plan, ProjectionSpec, Repository } from "../../src/entity/index.js";
import { KvTriples } from "../../src/index.js";

// [EXP-R01] Behavior is deferred to EXP-R02; these tests pin that every stub fails clearly
// instead of returning a plausible but unreviewed answer.

const Person = EntityType.make("Person", {
  attributes: { name: Attribute.use(Attribute.text(":person/name"), { required: true }) },
});

const dies = async (effect: Effect.Effect<unknown, unknown, never>) => {
  const exit = await Effect.runPromiseExit(effect);
  expect(Exit.isFailure(exit)).toBe(true);
  if (Exit.isFailure(exit)) {
    const defect = Cause.squash(exit.cause);
    expect(defect).toBeInstanceOf(NotImplementedError);
    expect((defect as NotImplementedError).message).toMatch(/^EXP-R02: /);
  }
};

describe("EXP-R01 stubs", () => {
  it("planProjection, partialSet and rowSegments throw NotImplementedError", () => {
    const spec = Effect.runSync(ProjectionSpec.compile([Person]));
    expect(() => Plan.planProjection({ spec, touched: [], facts: [] })).toThrow(
      NotImplementedError,
    );
    expect(() => Plan.partialSet({ specId: spec.id, entities: [] }, "xtdb")).toThrow(
      NotImplementedError,
    );
  });

  it("repository reads die with NotImplementedError", async () => {
    const repository = await Effect.runPromise(
      Repository.make(Person).pipe(Effect.provide(KvTriples.layer)),
    );
    expect(repository.model).toBe(Person);
    await dies(repository.get("person:maria"));
    await dies(repository.getMany(["person:maria"]));
    await dies(repository.find());
    await dies(repository.count());
    await dies(repository.timeline("person:maria", "name"));
    await dies(repository.at({ validAt: 0 }).get("person:maria"));
  });

  it("writer and commit fail with NotImplementedError", async () => {
    const write = Repository.writer(Person);
    expect(() => write.create("person:maria", { name: "Maria" })).toThrow(NotImplementedError);
    expect(() => write.addValue("person:maria", "name", "Maria")).toThrow(NotImplementedError);
    await dies(write.patch("person:maria", { name: "M" }).pipe(Effect.provide(KvTriples.layer)));
    await dies(
      Repository.commit([], { actor: "a", commandId: "c" }).pipe(Effect.provide(KvTriples.layer)),
    );
  });
});
