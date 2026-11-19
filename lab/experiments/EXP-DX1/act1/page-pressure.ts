import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { W0, canonical, sha256, V_W0 } from "../../../bench/lib/w0-world.ts";
import { publishChanged } from "../../../bench/lib/w0-replica.ts";
import type { OutboxStore } from "../../../bench/lib/w0-outbox.ts";
import { open, observe } from "./check.ts";

const root = process.argv[2]!;
mkdirSync(root);
const scope = "act1-fifo-" + randomUUID(),
  store = await open(scope);
const ownerFile = process.env.TRIPLEX_LAB_SLOT_OWNER;
const owner = ownerFile ? readFileSync(ownerFile) : undefined;
if (process.env.DX_ACT1_NATIVE === "1") {
  assert.ok(owner);
  const o = JSON.parse(owner.toString());
  assert.equal(o.holder, "DX-ACT1");
  assert.equal(o.endpoint, process.env.DATOMIC_URL);
}
const sources = [
  "lab/bench/lib/w0-page-outbox.ts",
  "lab/bench/lib/w0-outbox.ts",
  "lab/bench/lib/w0-guarded.ts",
  "lab/bench/lib/w0-outbox-state.ts",
  "lab/bench/lib/w0-replica.ts",
  "lab/experiments/EXP-DX1/act1/page-pressure.ts",
];
const bindings = () => sources.map((s) => [s, sha256(readFileSync(s))]);
const source = bindings(),
  results = [];
async function live(cmd: string) {
  const body = Array.from({ length: 10 }, (_, i) => ({
    op: "assert",
    entityId: "pl:live",
    attribute: "sample-" + i,
    value: { type: "string", value: cmd },
    validFrom: 0,
  }));
  const start = performance.now();
  const receipt = await store.transact(body, { commandId: cmd, actor: "act1-queue-probe" });
  const serviceMs = performance.now() - start;
  assert.ok(receipt.ok);
  const claim = await store.transactionByCommand(cmd);
  assert.ok(claim.ok);
  assert.equal(claim.value.txId, receipt.value.txId);
  const rows = await store.sweepPage(["pl:live"], {
    position: receipt.value.position,
    validAt: V_W0,
  });
  const seen = rows.rows
    .filter((r) => r.position === receipt.value.position)
    .map((r) => [r.attribute, r.value.value])
    .sort();
  assert.deepEqual(seen, body.map((r) => [r.attribute, r.value.value]).sort());
  return { position: receipt.value.position, txId: receipt.value.txId, serviceMs };
}
try {
  let tx = 1;
  for (const [layout, width] of [
    ["guard-fact", 32],
    ["guard-fact", 64],
    ["guard-fact", 128],
    ["guard-fact", 256],
    ["page-cut", 256],
  ] as const) {
    const record = (i: number): W0.EvaluationRecord => ({
      subject: W0.placementId(i),
      basis: { tx: BigInt(tx), validTime: W0.POPULATION_VALID_TIME },
      release: W0.R1.hash,
      workItems: [],
    });
    await publishChanged(
      store,
      Array.from({ length: width }, (_, i) => record(i)),
      { layout, frameSize: width },
    );
    tx++;
    for (let repeat = 0; repeat < 3; repeat++, tx++) {
      const baseline = await live(randomUUID()),
        records = Array.from({ length: width }, (_, i) => record(i));
      const ready = Promise.withResolvers<{
        task: ReturnType<OutboxStore["transact"]>;
        offered: number;
        bytes: number;
        ops: number;
      }>();
      const proxy = {
        ...store,
        transact: (...args: Parameters<OutboxStore["transact"]>) => {
          const bytes = Buffer.byteLength(JSON.stringify(args));
          const task = store.transact(...args);
          ready.resolve({ task, offered: performance.now(), bytes, ops: args[0].length });
          return task;
        },
      };
      const batch = publishChanged(proxy, records, { layout, frameSize: width });
      // [DX-ACT1] Why: a single FIFO deliberately queues a live save directly behind native submission. Rejected: calling an overlapping save queued when it actually overtook the batch.
      const r = await Promise.race([
        ready.promise,
        batch.then(() => {
          throw Error("missing batch");
        }),
      ]);
      const committed = await r.task;
      assert.ok(committed.ok);
      const waitMs = performance.now() - r.offered;
      const save = await live(randomUUID());
      const published = await batch;
      assert.ok(save.position > committed.value.position);
      assert.equal(published.changed, width);
      const state = await observe(
        store,
        records.map((x) => x.subject).slice(0, 1),
        committed.value.position,
        layout,
      );
      assert.deepEqual(state[0], {
        items: [],
        pending: [],
        subjects: [
          { subject: records[0]!.subject, basis: { tx, validTime: W0.POPULATION_VALID_TIME } },
        ],
      });
      results.push({
        layout,
        width,
        repeat,
        baselineMs: baseline.serviceMs,
        bytes: r.bytes,
        operations: r.ops,
        batchTx: committed.value.txId,
        baseline,
        save,
        waitMs,
        offerToAckMs: waitMs + save.serviceMs,
      });
    }
  }
  assert.deepEqual(source, bindings());
  if (ownerFile) assert.equal(sha256(readFileSync(ownerFile)), sha256(owner!));
  writeFileSync(
    join(root, "samples.json"),
    JSON.stringify(
      {
        scope,
        source,
        owner: owner ? sha256(owner) : null,
        classification: "single FIFO diagnostic",
        results,
      },
      null,
      2,
    ),
    { flag: "wx" },
  );
} finally {
  await store.close();
}
