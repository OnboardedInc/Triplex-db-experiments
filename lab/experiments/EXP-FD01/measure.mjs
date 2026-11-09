// @ts-nocheck -- [CX-A01-040] Why: integration adds this runtime protocol or command fixture to checkJs; dynamic JSON/message fields lack static record types. Binding errors remain checked by lab/bin/checkjs.mjs. Rejected: excluding current executable code.
// [EXP-FD01] Why: measure the host durable write separately from publication-clock feed lag (Q98c/d).
// Rejected: calling a decided wall-clock stamp a publication instant, or labelling zero readers L256.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { createHash, randomUUID } from "node:crypto";
const root = path.resolve(import.meta.dirname, "../../..");
const requireHost = createRequire(path.join(root, "packages/host/package.json"));
const { SqliteConsumerStore } = requireHost("@triplex-build/triplex-host/feed");
const dir = path.join(
  "/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-FD01",
  "measure-" + randomUUID(),
);
fs.mkdirSync(dir, { recursive: true });
const source = Object.fromEntries(
  [
    "packages/host/dist/feed/ConsumerStore.js",
    "packages/core/dist/feed/index.js",
    "pnpm-lock.yaml",
    "lab/experiments/EXP-FD01/measure.mjs",
  ].map((p) => [
    p,
    createHash("sha256")
      .update(fs.readFileSync(path.join(root, p)))
      .digest("hex"),
  ]),
);
const store = new SqliteConsumerStore(path.join(dir, "consumer.db"));
const times = [];
let previous = null;
for (let i = 1; i <= 1000; i++) {
  const p = String(i);
  const page = {
    cursor: { source: "FD01-offline-synthetic", token: p },
    entries: [
      {
        stream: "s",
        epoch: "0",
        offset: p,
        kind: "commit",
        transactions: [
          {
            positions: [p],
            txIds: ["tx" + p],
            operationId: "op" + p,
            commandIds: ["cmd" + p],
            stamp: null,
            stampStatus: "pending-RT01",
            changes: [
              {
                op: "assert",
                entity: "subject",
                attribute: ":a",
                validFrom: 0,
                validTo: null,
                position: p,
                assertionId: "a" + p,
              },
            ],
          },
        ],
      },
    ],
  };
  const start = performance.now();
  store.apply("measure", previous, page, [{ epoch: "0", position: p, subject: "subject" }]);
  times.push(performance.now() - start);
  previous = page.cursor;
}
const effects = store.effects("measure");
if (
  effects.length !== 1000 ||
  store.affected("measure").length !== 1000 ||
  store.checkpoint("measure")?.token !== "1000" ||
  effects.some(
    (e) =>
      e.subject !== "subject" ||
      e.epoch !== "0" ||
      BigInt(e.position) < 1n ||
      BigInt(e.position) > 1000n,
  )
)
  throw Error("Consumer content/checkpoint mismatch");
const pragmas = store.pragmas();
store.close();
const sorted = [...times].sort((a, b) => a - b);
const result = {
  format: "FD01-write-measurement/1",
  diagnostic: true,
  source,
  readerLevel: 0,
  sourcePublicationLagMeasured: false,
  slot: null,
  samples: times.length,
  p50Ms: sorted[499],
  p99Ms: sorted[989],
  maxMs: sorted.at(-1),
  pragmas,
  rawWriteMs: times,
};
fs.writeFileSync(path.join(dir, "measurement.json"), JSON.stringify(result, null, 2) + "\n");
console.log(
  JSON.stringify({
    dir,
    p50Ms: result.p50Ms,
    p99Ms: result.p99Ms,
    maxMs: result.maxMs,
    samples: 1000,
    diagnostic: true,
  }),
);
