import { test } from "node:test";
import assert from "node:assert/strict";
import {
  basisFor,
  canonical,
  makeOracle,
  name,
  oracleKey,
  probeIndex,
  sha256,
  validateSpec,
  type LoadSpec,
  type SeedBundle,
} from "./model.ts";

const spec: LoadSpec = {
  format: "triplex-load-spec/1",
  id: "independent-load-fixture",
  entities: 1000,
  factsPerEntity: 10,
  instances: 2,
  batchFacts: 500,
  probeEntities: 64,
  maximumWriterCommands: 3,
  validAt: 1.25,
  schema: { test: "independent schema identity" },
  schemaSha256: sha256(canonical({ test: "independent schema identity" })),
};
const bundle: SeedBundle = {
  format: "triplex-load-seed-receipts/1",
  backend: "xtdb",
  specSha256: sha256(canonical(spec)),
  instances: [0, 1].map((index) => ({
    index,
    scope: `scope-${index}`,
    baselinePosition: 20,
    recordedAt: 1000.25,
    hotFactIds: Array.from({ length: 10 }, (_, i) => `fact-${index}-${i}`),
  })),
};
test("independent oracle follows returned P and keeps historical R stable across corrections", () => {
  const oracle = makeOracle(spec, bundle);
  for (const index of [0, 1])
    for (const version of [0, 1, 3]) {
      const current = oracle.entries[oracleKey(index, "point-current", 0, 20 + version)] as {
        expectedSha256: string;
        basis: unknown;
      };
      const historical = oracle.entries[oracleKey(index, "point-history", 0, 20 + version)] as {
        expectedSha256: string;
        basis: unknown;
      };
      assert.equal(current.expectedSha256, sha256(canonical([[name(spec, 0, version)]])));
      assert.equal(historical.expectedSha256, sha256(canonical([[name(spec, 0, 0)]])));
      assert.deepEqual(
        current.basis,
        basisFor(spec, bundle.instances[index]!, "point-current", 20 + version),
      );
      assert(!("recordedAt" in (current.basis as object)));
    }
  assert.equal(
    oracle.entries[oracleKey(0, "point-current", 0, 24)],
    undefined,
    "Unplanned external writer cuts have no oracle entry",
  );
});
test("cold probes span the declared distinct-entity population and never change under hot corrections", () => {
  assert.equal(probeIndex(spec, 10), 10);
  assert.equal(probeIndex(spec, 63), 999);
  const oracle = makeOracle(spec, bundle),
    key = (position: number) => oracleKey(0, "point-current", 63, position);
  assert.equal(
    (oracle.entries[key(20)] as any).expectedSha256,
    (oracle.entries[key(23)] as any).expectedSha256,
  );
});
test("oracle refuses changed recipe, wrong seed commit count and an excessive catalog", () => {
  assert.throws(() => makeOracle({ ...spec, factsPerEntity: 1 }, bundle));
  assert.throws(() =>
    makeOracle(spec, {
      ...bundle,
      instances: bundle.instances.map((receipt) => ({ ...receipt, baselinePosition: 19 })),
    }),
  );
  assert.throws(() =>
    validateSpec({ ...spec, instances: 6, maximumWriterCommands: 1000, probeEntities: 256 }),
  );
});
