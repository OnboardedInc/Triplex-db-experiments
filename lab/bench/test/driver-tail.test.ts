import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { MessageChannel } from "node:worker_threads";
import { Option } from "effect";
import type { Receipt } from "../lib/composition.ts";
import { Model } from "../lib/model.ts";
import { ModelJournalThread } from "../lib/model-journal-thread.ts";
import { R, type ReadRecord } from "../lib/observe.ts";
import { ReceiptCapture } from "../lib/receipt-capture.ts";
import { PHASE_RYOW, receiptReadRow } from "../lib/receipt-read.ts";
import { SpillThread } from "../lib/spill-thread.ts";
import { ids } from "../lib/world.ts";

// [DX-DRV1] Why: a worker boundary must preserve Option-backed receipt fields, range visibility and assertion identity.
// Rejected: a queue-count-only fixture that never checks the rehydrated world.
test("worker journal restores the exact ordered receipt model", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "triplex-drv1-"));
  try {
    const model = new Model(1);
    const journal = new ModelJournalThread(path.join(directory, "journal"), {
      run: "driver-journal-test",
      source: "fixture",
      slot: "test",
      subjects: 1,
    });
    const entityId = ids.placement(0);
    const operation = {
      op: "assert",
      entityId,
      attribute: ":placement/stamp",
      value: { type: "number", value: 7 },
      validFrom: 10,
      validTo: 40,
    };
    const receipt = {
      instant: 100,
      position: 1,
      txId: "1",
      triples: [
        {
          ...operation,
          id: "assertion-1",
          validTo: Option.some(40),
          createdBy: Option.some("fixture"),
        },
      ],
    } as unknown as Receipt;
    const retract = [{ op: "retract", id: "assertion-1" }];
    const second = { instant: 130, position: 2, txId: "2", triples: [] } as unknown as Receipt;
    const commit = {
      instant: 100,
      position: 1,
      txId: "1",
      stamp: 7,
      stampValidFrom: 10,
      parts: [],
      ackAtMs: 101,
      stream: "background",
    };
    for (const sink of [model, journal]) {
      sink.bindReceipt([operation], receipt);
      sink.addCommit(0, commit);
      sink.bindReceipt(retract, second);
    }
    const sealed = await journal.seal(),
      restored = sealed.journal.restore();
    assert.equal(sealed.queue.frames, 3);
    assert(sealed.queue.peakOutstanding <= sealed.queue.capacity);
    for (const recordedAt of [99, 100, 129, 130])
      for (const validAt of [9, 10, 39, 40])
        assert.deepEqual(
          restored.model.expected(0, recordedAt, validAt),
          model.expected(0, recordedAt, validAt),
        );
    assert.equal(restored.model.expected(0, 100, 10).stamp, 7);
    assert.equal(restored.model.expected(0, 130, 10).facts, 0);
    assert.notEqual((await sealed.journal.archive()).archive.bytes, 0);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("receipt capture waits for every spill acknowledgement and retains failures", async () => {
  const { port1, port2 } = new MessageChannel();
  const progress = new Int32Array(new SharedArrayBuffer(4));
  const observed: ReadRecord[] = [];
  port2.on("message", ({ id, records }) => {
    observed.push(...records);
    port2.postMessage({ id });
  });
  const capture = new ReceiptCapture(
    port1,
    progress,
    () => 150,
    async ({ subject, basis }) => {
      if (subject === 130) throw Error("injected");
      return {
        observed: {
          facts: 5,
          digest: String(basis.recordedPosition),
          stamp: subject,
          stamps: 1,
          bytes: 30,
        },
        route: "fallback",
        language: "Datalog",
        waitedMs: 1,
        depth: 1,
        roundTrips: 1,
        entities: 1,
        replicaFallbackReason: "watermark-timeout",
      };
    },
  );
  try {
    for (let id = 1; id <= 260; id++)
      capture.add(id, {
        subject: id,
        start: 101,
        commitTraceId: "off",
        basis: { recordedAt: 100, validAt: 101, recordedPosition: id },
      });
    const result = await capture.finish(260);
    assert.equal(Atomics.load(progress, 0), 260);
    assert.deepEqual(result, { retained: 260, fallbackReasons: { "watermark-timeout": 259 } });
    assert.deepEqual(
      observed.map((row) => row[R.basisPosition]),
      Array.from({ length: 260 }, (_, i) => i + 1),
    );
    assert.equal(observed[0]![R.latency], 49);
    assert.equal(observed[129]![R.error], "Error");
    assert.equal(observed[259]![R.digest], "260");
  } finally {
    port2.close();
  }
});

// [DX-BM1] Why: a loaded run retains independent reader and receipt batches in the same lossless spill.
// Rejected: proving each port separately while losing a phase or an ACK coordinate on the shared drain.
test("loaded readers and receipt capture drain their exact rows through separate ports", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "triplex-loaded-capture-"));
  const spill = new SpillThread(path.join(directory, "observations"));
  const reader = spill.connect();
  const observed = (position: number) => ({
    observed: { stamp: position, facts: 1, digest: "d" + position, bytes: 8, stamps: 1 },
    route: "replica",
    language: "Datalog",
    waitedMs: 0,
    depth: 1,
    roundTrips: 0,
    entities: 1,
  });
  const capture = new ReceiptCapture(
    spill.connect(),
    new Int32Array(new SharedArrayBuffer(4)),
    () => 200,
    async (input) => observed(input.basis.recordedPosition),
  );
  try {
    await spill.beginPhase(4, 0, 0);
    const ack = new Promise<number>((resolve) => reader.once("message", (m) => resolve(m.id)));
    const readerRows = [];
    for (let i = 1; i <= 260; i++) {
      const basis = { recordedAt: 100, recordedPosition: i, validAt: 110 };
      capture.add(i, { subject: i, start: 110, commitTraceId: "off", basis });
      const row = receiptReadRow(i + 1, basis, i, 110, 1, observed(i));
      row[R.phase] = 4;
      readerRows.push(row);
    }
    reader.postMessage({ id: 1, records: readerRows, samples: [], splitEvents: [] });
    assert.equal(await ack, 1);
    assert.equal((await capture.finish(260)).retained, 260);
    const rows = await spill.finish();
    const identities: string[] = [];
    rows.forEach((r) =>
      identities.push([r[R.phase], r[R.subject], r[R.basisPosition], r[R.digest]].join("/")),
    );
    const expected = Array.from({ length: 260 }, (_, n) => n + 1).flatMap((i) => [
      [PHASE_RYOW, i, i, "d" + i].join("/"),
      [4, i + 1, i, "d" + i].join("/"),
    ]);
    assert.deepEqual(identities.sort(), expected.sort());
  } finally {
    reader.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
