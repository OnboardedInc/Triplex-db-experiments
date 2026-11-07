/** Independent deterministic load recipe/oracle. No backend or query compiler is imported. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

export interface LoadSpec {
  readonly format: "triplex-load-spec/1";
  readonly id: string;
  readonly entities: number;
  readonly factsPerEntity: 1 | 10;
  readonly instances: number;
  readonly batchFacts: 500;
  readonly probeEntities: number;
  readonly maximumWriterCommands: number;
  readonly validAt: 1.25;
  readonly schema: unknown;
  readonly schemaSha256: string;
}
export interface SeedInstance {
  readonly index: number;
  readonly scope: string;
  readonly baselinePosition: number;
  readonly recordedAt: number;
  readonly hotFactIds: readonly string[];
}
export interface SeedBundle {
  readonly format: "triplex-load-seed-receipts/1";
  readonly backend: string;
  readonly specSha256: string;
  readonly instances: readonly SeedInstance[];
}
export interface LoadBasis {
  readonly scope: string;
  readonly knownPosition: string;
  readonly validAt: number;
  readonly recordedAt?: number;
}
export const classes = ["point-current", "point-history"] as const;
export type TaskClass = (typeof classes)[number];
export const canonical = (value: unknown): string =>
  JSON.stringify(value, (_key, item) =>
    item && typeof item === "object" && !Array.isArray(item)
      ? Object.fromEntries(
          Object.keys(item)
            .sort()
            .map((key) => [key, item[key]]),
        )
      : item,
  );
export const sha256 = (value: string | Uint8Array): string =>
  createHash("sha256").update(value).digest("hex");
export function validateSpec(spec: LoadSpec): void {
  assert.equal(spec.format, "triplex-load-spec/1");
  assert.match(spec.id, /^[a-z0-9][a-z0-9._-]{0,90}$/);
  // These are admitted first-wave stages, not an implementation of the 10m target.
  assert(Number.isSafeInteger(spec.entities) && spec.entities >= 10 && spec.entities <= 20_000);
  assert([1, 10].includes(spec.factsPerEntity));
  assert(Number.isSafeInteger(spec.instances) && spec.instances >= 1 && spec.instances <= 6);
  assert.equal(spec.batchFacts, 500);
  assert(
    Number.isSafeInteger(spec.probeEntities) &&
      spec.probeEntities >= 10 &&
      spec.probeEntities <= Math.min(256, spec.entities),
  );
  assert(
    Number.isSafeInteger(spec.maximumWriterCommands) &&
      spec.maximumWriterCommands >= 1 &&
      spec.maximumWriterCommands <= 1000,
  );
  assert.equal(spec.validAt, 1.25);
  assert.equal(spec.schemaSha256, sha256(canonical(spec.schema)));
  assert(
    spec.instances * spec.probeEntities * (spec.maximumWriterCommands + 1) * 2 <= 250_000,
    "The first-wave pinned oracle must fit its declared bounded catalog budget",
  );
}
export const instanceName = (spec: LoadSpec, index: number): string =>
  `${spec.id}-instance-${index}`;
export const entity = (spec: LoadSpec, index: number): string => `${spec.id}:entity:${index}`;
export const name = (spec: LoadSpec, index: number, version: number): string =>
  `${spec.id}:name:${index}:v${version}`;
export const expectedSeedTransactions = (spec: LoadSpec): number =>
  Math.ceil((spec.entities * spec.factsPerEntity) / spec.batchFacts);
export const probeIndex = (spec: LoadSpec, probe: number): number => {
  assert(Number.isSafeInteger(probe) && probe >= 0 && probe < spec.probeEntities);
  if (probe < 10) return probe;
  if (spec.probeEntities === 11) return 10;
  return 10 + Math.floor(((probe - 10) * (spec.entities - 11)) / (spec.probeEntities - 11));
};
export const recipeIdentity = (spec: LoadSpec): string =>
  sha256(
    canonical({
      recipe: "triplex-load-recipe/1",
      entities: spec.entities,
      factsPerEntity: spec.factsPerEntity,
      batchFacts: spec.batchFacts,
      probeEntities: spec.probeEntities,
      validAt: spec.validAt,
      schemaSha256: spec.schemaSha256,
      fields: [
        "name",
        "kind",
        "peer",
        "exact",
        "ratio",
        "active",
        "at",
        "payload",
        "blob",
        "group",
      ].slice(0, spec.factsPerEntity),
      writer: "one atomic retract/assert correction on each of ten distinct entities",
    }),
  );
export const oracleKey = (
  instance: number,
  task: TaskClass,
  probe: number,
  position: number,
): string => `${instance}/${task}/${probe}/${position}`;
export const basisFor = (
  spec: LoadSpec,
  receipt: SeedInstance,
  task: TaskClass,
  position: number,
): LoadBasis => ({
  scope: receipt.scope,
  knownPosition: String(position),
  validAt: spec.validAt,
  ...(task === "point-history" ? { recordedAt: receipt.recordedAt } : {}),
});
export function makeOracle(spec: LoadSpec, bundle: SeedBundle) {
  validateSpec(spec);
  assert.equal(bundle.format, "triplex-load-seed-receipts/1");
  assert.equal(bundle.specSha256, sha256(canonical(spec)));
  assert.equal(bundle.instances.length, spec.instances);
  const entries: Record<string, unknown> = {};
  for (const receipt of bundle.instances) {
    assert.equal(receipt.baselinePosition, expectedSeedTransactions(spec));
    assert(Number.isFinite(receipt.recordedAt) && receipt.recordedAt >= 0);
    for (let version = 0; version <= spec.maximumWriterCommands; version++)
      for (let probe = 0; probe < spec.probeEntities; probe++)
        for (const task of classes) {
          const index = probeIndex(spec, probe),
            position = receipt.baselinePosition + version;
          // Expected answers come only from the recipe plus planned correction ordinal.
          // Public seed receipts supply identities/cuts, never engine query answers.
          const rows = [[name(spec, index, task === "point-history" || index >= 10 ? 0 : version)]];
          entries[oracleKey(receipt.index, task, probe, position)] = {
            taskClass: task,
            logicalTaskId: `load/${task}`,
            paramsSha256: sha256(canonical({ entity: entity(spec, index) })),
            basis: basisFor(spec, receipt, task, position),
            expectedSha256: sha256(canonical(rows)),
          };
        }
  }
  return { format: "triplex-devloop-read-oracle/1", recipeIdentity: recipeIdentity(spec), entries };
}
