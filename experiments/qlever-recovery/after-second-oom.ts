import { readFile, writeFile } from "node:fs/promises";
import { Effect } from "effect";
import { EntityId, Triples } from "../../packages/core/dist/index.js";
import { Capabilities, DatabaseScope } from "../../packages/core/dist/runtime/index.js";
import { makeQleverRuntime } from "../../packages/qlever/dist/index.js";

const scope = DatabaseScope.test("qlever-case-4a742ee1-307a-4779-b92d-11dbecb7457d");
const recovered = await Effect.runPromise(
  Effect.gen(function* () {
    const t = yield* Triples;
    return {
      position: yield* t.currentPosition(),
      facts: yield* t.history(EntityId.make("42")),
      receipts: (yield* t.transactions({ limit: 10 })).transactions,
    };
  }).pipe(
    Effect.provide(
      makeQleverRuntime({ url: "http://127.0.0.1:7019" }).layer({
        scope,
        capabilities: Capabilities.none,
      }),
    ),
    Effect.scoped,
  ),
);
const expected = new Map([
  [":conf/code", { type: "string", value: "007" }],
  [":conf/count", { type: "number", value: 7 }],
  [":conf/enabled", { type: "boolean", value: true }],
  [":conf/instant", { type: "datetime", value: 1700000000000 }],
  [":conf/data", { type: "json", value: { ok: true } }],
  [":conf/owner", { type: "ref", value: "7" }],
]);
const typedFactsComplete =
  recovered.facts.length === 7 &&
  [...expected].every(
    ([attribute, value]) =>
      JSON.stringify(recovered.facts.find((fact) => fact.attribute === attribute)?.value) ===
      JSON.stringify(value),
  ) &&
  recovered.facts.some(
    (fact) =>
      fact.attribute === ":conf/blob" &&
      fact.value.type === "blob" &&
      fact.value.value === "sha256:artifact",
  );
const receiptsComplete =
  recovered.receipts.length === 1 &&
  recovered.receipts[0]!.position === 1 &&
  recovered.receipts[0]!.changes.length === 7 &&
  recovered.receipts[0]!.changes.every((change) =>
    recovered.facts.some(
      (fact) =>
        fact.id === change.tripleId && JSON.stringify(fact.value) === JSON.stringify(change.value),
    ),
  );
const previous = JSON.parse(
  await readFile("qualification/evidence/qlever-oom-recovery-1793976956162.json", "utf8"),
);
const artifact = {
  at: new Date().toISOString(),
  profile: "same4GiB4CPU",
  oomEvidence: "qlever-oom-conformance-20261106T145356.json",
  priorAcknowledgedState: {
    artifact: "qlever-oom-recovery-1793976956162.json",
    pass: previous.pass,
  },
  scope,
  recovered,
  typedFactsComplete,
  receiptsComplete,
  pass: previous.pass && typedFactsComplete && receiptsComplete && recovered.position === 1,
  claim: "Read-triggered OOM recovery only; no in-flight write or power-loss atomicity claim",
};
const path = `qualification/evidence/qlever-second-oom-recovery-${Date.now()}.json`;
await writeFile(path, JSON.stringify(artifact, null, 2) + "\n");
console.log(
  JSON.stringify(
    {
      path,
      pass: artifact.pass,
      typedFactsComplete,
      receiptsComplete,
      facts: recovered.facts.length,
      position: recovered.position,
    },
    null,
    2,
  ),
);
