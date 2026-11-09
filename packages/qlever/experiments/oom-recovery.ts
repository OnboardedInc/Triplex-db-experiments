import { qleverConnectionModeOf } from "../src/QleverClient.js";
import { readFile, writeFile } from "node:fs/promises";
import { Effect } from "effect";
import { Triples, EntityId } from "@triplex-build/triplex";
import { DatabaseScope, Capabilities } from "@triplex-build/triplex/runtime";
import { makeQleverRuntime, makeQleverClient } from "@triplex-build/triplex-qlever";
const packet = JSON.parse(
  await readFile(
    "qualification/evidence/qlever/workloads-2026-11-06T14-37-48-090Z-ef903d8b-workloads.json",
    "utf8",
  ),
);
const sentinel = JSON.parse(
  await readFile(
    "qualification/evidence/qlever-cancel-restart-ab62c5a3-b727-47a9-8f57-bf5f5f175ba8.json",
    "utf8",
  ),
);
const runtime = makeQleverRuntime({ url: "http://127.0.0.1:7019" });
const run = <A, E>(scope: string, effect: Effect.Effect<A, E, Triples>) =>
  Effect.runPromise(
    effect.pipe(
      Effect.provide(
        runtime.layer({ scope: DatabaseScope.test(scope), capabilities: Capabilities.none }),
      ),
      Effect.scoped,
    ),
  );
const recoveredSentinel = await run(
  `recovery:${sentinel.run}`,
  Effect.gen(function* () {
    const t = yield* Triples;
    return {
      receipt: yield* t.transactionByCommand(`recovery:${sentinel.run}`),
      facts: yield* t.entity(EntityId.make("recovery:sentinel"), { validAt: 100 }),
      position: yield* t.currentPosition(),
    };
  }),
);
const workloads = [];
for (const fixture of packet.workloads) {
  if (!fixture.groups.length) continue;
  const scope = JSON.parse(fixture.scope)[3];
  const recovered = await run(
    scope,
    Effect.gen(function* () {
      const t = yield* Triples;
      const receipts = yield* Effect.forEach(fixture.groups, (group: { commandId: string }) =>
        t.transactionByCommand(group.commandId),
      );
      const entities = [
        ...new Set(
          receipts.flatMap((receipt) => receipt?.changes.map((change) => change.entityId) ?? []),
        ),
      ];
      const histories = yield* Effect.forEach(entities, (entity) => t.history(entity));
      return {
        position: yield* t.currentPosition(),
        receipts,
        histories: Object.fromEntries(entities.map((entity, index) => [entity, histories[index]])),
      };
    }),
  );
  const expectedPosition = Math.max(
    ...fixture.groups.map((group: { actualPosition: number }) => group.actualPosition),
  );
  const checks = fixture.groups.map(
    (
      group: { commandId: string; actualPosition: number; assertions: number; retractions: number },
      index: number,
    ) => {
      const receipt = recovered.receipts[index];
      const factsComplete =
        receipt?.changes.every((change) => {
          const fact = recovered.histories[change.entityId]?.find(
            (row) => row.id === change.tripleId,
          );
          return (
            fact !== undefined &&
            JSON.stringify(fact.value) === JSON.stringify(change.value) &&
            (change.op !== "retract" || fact.retractedAt._tag === "Some")
          );
        }) ?? false;
      return {
        commandId: group.commandId,
        position: receipt?.position,
        expectedPosition: group.actualPosition,
        changes: receipt?.changes.length,
        expectedChanges: group.assertions + group.retractions,
        factsComplete,
        pass:
          receipt?.position === group.actualPosition &&
          receipt?.changes.length === group.assertions + group.retractions &&
          factsComplete,
      };
    },
  );
  workloads.push({
    id: fixture.id,
    position: recovered.position,
    expectedPosition,
    checks,
    pass:
      recovered.position === expectedPosition &&
      checks.every((check: { pass: boolean }) => check.pass),
  });
}
const sentinelPass =
  recoveredSentinel.receipt?.txId === sentinel.recovered.receipt.txId &&
  JSON.stringify(recoveredSentinel.receipt) === JSON.stringify(sentinel.recovered.receipt) &&
  JSON.stringify(recoveredSentinel.facts) === JSON.stringify(sentinel.recovered.facts) &&
  recoveredSentinel.position === 1;
const client = makeQleverClient("http://127.0.0.1:7019"),
  version = await client.command("stats");
const artifact = {
  qleverConnectionMode: qleverConnectionModeOf(),
  at: new Date().toISOString(),
  version,
  oomEvidence: "qlever-oom-workloads-20261106T144001.json",
  profile: "same4GiB4CPU",
  sentinelPass,
  recoveredSentinel,
  workloads,
  pass: sentinelPass && workloads.every((workload) => workload.pass),
  claim:
    "Acknowledged public command receipts, cuts and typed sentinel facts retained after real4GiBOOM+sameprofile restart; failed operation partial-publication and power-loss atomicity remain unqualified",
};
const path = `qualification/evidence/qlever-oom-recovery-${Date.now()}.json`;
await writeFile(path, JSON.stringify(artifact, null, 2) + "\n");
console.log(
  JSON.stringify(
    {
      path,
      pass: artifact.pass,
      sentinelPass,
      workloads: workloads.map(({ id, position, expectedPosition, checks, pass }) => ({
        id,
        position,
        expectedPosition,
        receipts: checks.length,
        pass,
      })),
    },
    null,
    2,
  ),
);
