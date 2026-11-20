import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { once } from "node:events";
import { randomUUID } from "node:crypto";
import { SpillThread } from "../../../bench/lib/spill-thread.ts";
import { R, type ReadRecord } from "../../../bench/lib/observe.ts";
import type { DeepIdentity } from "../../../bench/lib/deep-profile.ts";
import { BoundedReadEvidence } from "./bounded-read-evidence.ts";
import { boundedPhases, readerWindow, READER_SECONDS } from "./bounded-readers.ts";

const identity: DeepIdentity = {
  source: "a".repeat(40),
  slot: "tx2-dxscale1-test",
  nonce: randomUUID(),
  people: 100000,
  account: 0,
  arm: "interference",
  bounded: true,
  tenant: { study: "interference", physical: 0, topology: "pooled", live: "coincident" },
};

test("writer schedules have one fixed loaded repeat with 64 seats", () => {
  const p = boundedPhases(identity),
    w = readerWindow(identity)!;
  const total = p.filter((x) => x.readers).reduce((n, x) => n + x.seconds!, 0);
  assert.equal(total, READER_SECONDS);
  assert.equal(w.to - w.from, total);
  assert.equal(p.find((x) => x.readers)!.traceFromS, w.from);
  assert(p.filter((x) => x.readers).every((x) => x.readers === 64));
  const other: DeepIdentity = {
    ...identity,
    account: 2,
    people: 10000,
    tenant: { ...identity.tenant!, topology: "separate", physical: 2 },
  };
  assert(boundedPhases(other).every((x) => x.readers === 0));
});

test("every in-memory row survives the writer and reader ports and only one in 100 plus mismatches is persisted", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "scale1-bounded-"));
  const spill = path.join(dir, "spill"),
    file = path.join(dir, "samples.jsonl");
  const bus = new SpillThread(spill, undefined, 2 * 1024 ** 2);
  const port = bus.connect();
  const make = (k: number): ReadRecord => [
    0,
    k,
    30,
    20,
    1,
    3,
    2,
    10,
    "hash",
    80,
    1,
    1,
    k === 103 ? "failed" : null,
    0,
    8,
    0,
    -1,
    0,
    "replica",
    "ts",
    0,
  ];
  const rows = Array.from({ length: 208 }, (_, i) => make(i));
  bus.push(rows[0]!);
  port.postMessage({ id: 1, records: rows.slice(1), samples: [], splitEvents: [] });
  assert.deepEqual((await once(port, "message"))[0], { id: 1 });
  port.close();
  const retained = await bus.finish();
  assert.deepEqual(
    [...retained].map((r) => r[R.subject]).sort((a, b) => a - b),
    rows.map((r) => r[R.subject]),
  );
  assert(!fs.existsSync(spill));
  const evidence = new BoundedReadEvidence(file, identity);
  try {
    retained.forEach((row, i) =>
      evidence.observe(
        i,
        row,
        row[R.error] ? "error" : row[R.subject] === 102 ? "wrong-world" : "correct",
      ),
    );
    const seal = evidence.seal(retained.length);
    assert.equal(seal.judged, 208);
    assert.equal(seal.regular, 3);
    assert.equal(seal.errors, 1);
    assert.equal(seal.mismatches, 1);
    const records = fs
      .readFileSync(file, "utf8")
      .trimEnd()
      .split("\n")
      .map((l) => JSON.parse(l));
    assert.deepEqual(records[0].identity, identity);
    for (const sample of records.slice(1))
      assert.deepEqual(
        sample.observed,
        retained.find((row) => row[R.subject] === sample.observed[R.subject]),
      );
    assert(records.some((x) => x.kind === "wrong-world"));
    assert(records.some((x) => x.kind === "error"));
  } finally {
    evidence.close();
  }
});
