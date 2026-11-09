import { expect, it } from "vitest";
import { makeRouteEquivalenceCases } from "../src/routeEquivalence.js";

// [EXP-DA01] Why: a gate must reject false success, not just accept matching fixtures. Rejected: a runner tested only with identical rows.
it("rejects oracle drift, route/echo lies, fail-open flags and undeclared refusal", async () => {
  const good = { rows: [{ id: "one", value: -0 }], route: "source", basis: { p: 1 } };
  for (const read of [
    async () => ({ ...good, rows: [{ id: "one", value: 0 }] }),
    async () => ({ ...good, route: "other" }),
    async () => ({ ...good, basis: { p: 2 } }),
    async () => ({ ...good, eligible: false }),
    async () => {
      throw Object.assign(new Error("unavailable"), { code: "BasisNotAvailable" });
    },
  ]) {
    const [test] = makeRouteEquivalenceCases({
      seed: 7,
      bases: [good.basis],
      routes: [{ id: "source", eligible: () => true, refusals: [], read }],
      oracle: async () => good.rows,
      advance: async () => {},
    });
    await expect(test!.run()).rejects.toThrow();
  }
});
it("requires coverage, declared refusal and reproducibility after advance", async () => {
  let phase = 0;
  const run = () =>
    makeRouteEquivalenceCases({
      seed: 11,
      bases: [1],
      oracle: async () => [{ id: "one" }],
      advance: async () => {
        phase++;
      },
      routes: [
        {
          id: "source",
          eligible: () => true,
          refusals: [],
          read: async () => ({
            rows: phase ? [{ id: "two" }] : [{ id: "one" }],
            route: "source",
            basis: 1,
          }),
        },
      ],
    })[0]!.run();
  await expect(run()).rejects.toThrow("Oracle mismatch");
  const [empty] = makeRouteEquivalenceCases({
    seed: 1,
    bases: [1],
    routes: [],
    oracle: async () => [],
    advance: async () => {},
  });
  await expect(empty!.run()).rejects.toThrow("No route");
});
