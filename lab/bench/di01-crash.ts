import { evidenceBinding } from "./lib/di01-evidence.ts";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import { DependencyIndex, SqliteConsumerStore } from "../../packages/host/dist/feed/index.js";
import { runFeedCrashConformance } from "../../packages/testkit/dist/feed/index.js";
import { dependencyPlans } from "./lib/di01-refs.ts";
import { W0, canonical, sha256 } from "./lib/w0-world.ts";
const binding = evidenceBinding();
const root =
  process.argv[2] ??
  `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-DI01/crash-${randomUUID()}`;
fs.mkdirSync(root, { recursive: true });
const files = [
  "lab/bench/di01-crash.ts",
  "lab/bench/di01-crash-child.mjs",
  "packages/host/src/feed/ConsumerStore.ts",
  "packages/host/src/feed/DependencyIndex.ts",
  "packages/testkit/src/feed/index.ts",
  "lab/experiments/EXP-FD01/round2/reviewer-probes/mutate.mjs",
];
const source = () => Object.fromEntries(files.map((f) => [f, sha256(fs.readFileSync(f))]));
const start = source();
const options = {
  consumer: "c",
  validAt: 100,
  initialRelease: W0.R1.hash,
  plans: dependencyPlans(),
};
const pairs = [
  ["pl:a", "location"],
  ["loc:a", "jurisdiction"],
  ["pl:a", "documents"],
  ["pl:a", "weeklyMinutes"],
  ["p5:tenant", "p5/activation"],
];
const refs = [
  { entity: "pl:a", attribute: "location", value: "loc:a" },
  { entity: "loc:a", attribute: "jurisdiction", value: "jur:a" },
  { entity: "pl:a", attribute: "documents", value: "pl:a/doc:1" },
  { entity: "p5:tenant", attribute: "p5/activation", value: W0.R1.hash },
].map((r) => ({ ...r, position: 1, validFrom: 0 }));
const page = {
  entries: [
    {
      kind: "commit",
      stream: "s",
      epoch: "0",
      offset: "1",
      transactions: [
        {
          positions: ["1"],
          txIds: ["tx1"],
          commandIds: ["cmd1"],
          operationId: "op1",
          stamp: null,
          stampStatus: "pending-RT01",
          changes: pairs.map(([entity, attribute], i) => ({
            op: "assert",
            entity,
            attribute,
            assertionId: "a" + i,
            position: "1",
            validFrom: attribute === "weeklyMinutes" ? 200 : 0,
            validTo: null,
          })),
        },
      ],
    },
  ],
  cursor: { source: "DI01/crash/fixture", token: "1" },
};
const input = path.join(root, "input.json");
fs.writeFileSync(input, canonical({ options, refs, page }));
const open = (file: string) =>
  new DependencyIndex(file, {
    ...options,
    readRefs: async () => refs,
    resolveActivation: () => W0.R1.hash,
  });
const snapshot = (store: SqliteConsumerStore) => ({
  effects: store.effects("c"),
  affected: store.affected("c"),
  checkpoint: store.checkpoint("c"),
  dependencies: store.dependencySnapshot("c"),
});
const baseline = open(path.join(root, "baseline.db")),
  before = snapshot(baseline);
await baseline.consume(null, page as any);
const after = snapshot(baseline);
baseline.close();
assert(
  after.dependencies.di_ref!.length > 0 &&
    after.dependencies.di_release!.length > 0 &&
    after.dependencies.di_boundary!.length > 0,
);
const observations = fs.openSync(path.join(root, "observations.jsonl"), "wx");
const result = await runFeedCrashConformance(
  async (point, attempt, arm) => {
    const file = path.join(root, `${arm}-${point}-${attempt}.db`),
      args = ["lab/bench/di01-crash-child.mjs", file, input, arm];
    const stopped = spawnSync(process.execPath, [...args, point], { encoding: "utf8" });
    assert.equal(stopped.status, 77, stopped.stderr);
    const reopened = open(file),
      observed = snapshot(reopened);
    reopened.close();
    const trace = JSON.parse(fs.readFileSync(file + ".trace.json", "utf8"));
    assert.equal(trace.inputSha256, sha256(fs.readFileSync(input)));
    assert.equal(trace.arm, arm);
    assert.equal(trace.point, point);
    const resumed = spawnSync(process.execPath, [...args, "resume"], { encoding: "utf8" });
    assert.equal(resumed.status, 0, resumed.stderr);
    const recovered = open(file),
      actual = snapshot(recovered);
    assert.deepEqual(actual, after, `recovered ${arm}/${point}/${attempt}`);
    recovered.close();
    let duplicateEffects = 0;
    if (arm === "unkeyed-split") {
      const db = new DatabaseSync(file);
      duplicateEffects =
        Number(db.prepare("SELECT count(*) n FROM unkeyed_effects").get()!.n) -
        after.effects.length;
      db.close();
    }
    fs.writeSync(
      observations,
      canonical({
        point,
        attempt,
        arm,
        exit: stopped.status,
        beforeReplay: observed,
        afterSha256: sha256(canonical(actual)),
        trace,
        duplicateEffects,
      }) + "\n",
    );
    return {
      crashed: true,
      beforeReplay: observed,
      gaps: 0,
      duplicateEffects,
      affectedMatches: true,
      checkpointMatches: true,
      resumeBytesMatch: sha256(fs.readFileSync(input)) === trace.inputSha256,
    };
  },
  { before, after },
);
assert.deepEqual(source(), start);
assert.deepEqual(evidenceBinding(), binding);
fs.closeSync(observations);
fs.writeFileSync(
  path.join(root, "result.json"),
  JSON.stringify(
    {
      status: "MATCH",
      binding,
      attempt: randomUUID(),
      source: start,
      inputSha256: sha256(fs.readFileSync(input)),
      before,
      after,
      result,
      offline: true,
      slot: null,
    },
    null,
    2,
  ),
);
console.log(root, result);
