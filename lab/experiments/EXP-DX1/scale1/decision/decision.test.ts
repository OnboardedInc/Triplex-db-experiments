import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { Histogram } from "../../../../bench/lib/hist.ts";
import { fieldValue } from "../../../../bench/lib/deep-world.ts";
import { checkCell, ratios, type Observation } from "./check.ts";
import {
  cells,
  field,
  factsFor,
  layoutOf,
  operationId,
  person,
  quiet,
  readTape,
  sampleEvery,
  sha,
  task,
  workloadPins,
  writeTape,
} from "./plan.ts";
import type { ReadResult } from "./observer.ts";
import type { Save } from "./writes.ts";

test("the profile pins exact offered counts and quiet schedules on both physical layouts", () => {
  const pin = JSON.parse(fs.readFileSync(new URL("./pins.json", import.meta.url), "utf8"));
  for (const n of [10000, 100000] as const) {
    const p = pin.items.find((x: any) => x.seed.people === n);
    assert.deepEqual(workloadPins(n), p.tapes);
    assert.equal(p.seed.factsPerAccount, factsFor(n));
    for (const repeat of [0, 1]) {
      const doses = (cell: (typeof cells)[number]) =>
        writeTape(n, cell, repeat)
          .filter((x) => x.account === quiet)
          .map(({ version: _version, ...x }) => x);
      for (const c of cells) {
        assert.equal(writeTape(n, c, repeat).length, (c === "alone" ? 3.5 : c) * 90);
        assert.deepEqual(doses(c), doses("alone"));
      }
      assert.equal(readTape(n, repeat).length, 3840);
    }
  }
  const samples = (layout: "pooled" | "split5") =>
    layoutOf(layout).flatMap((db) =>
      db.map((a) => sha([person(a, 0), person(a, 257), person(a, 99999)])),
    );
  assert.deepEqual(samples("pooled"), samples("split5"));
});

test("deadline expiry before dispatch is counted separately and incomplete reads stay unjudged", () => {
  const people = 10000,
    start = 1800000000000,
    nonce = "unit",
    scopes = [
      { name: "synthetic", db: "seed", cut: 21, seedCut: 21, accounts: layoutOf("pooled")[0]! },
    ];
  const writes = writeTape(people, "alone", 0).map(
    (w): Save => ({
      id: operationId(nonce, w.version),
      account: w.account,
      subject: w.subject,
      ordinal: w.ordinal,
      width: w.width,
      db: "seed",
      due: start + w.ms,
      enqueued: start + w.ms + 1,
      end: start + w.ms + 30001,
      status: "expired-before-dispatch",
      expiryCause: "dispatch",
    }),
  );
  const makeRead = (worker: number): ReadResult => {
    const ops = readTape(people, 0).filter((x) => x.seat % 2 === worker),
      h = new Histogram();
    for (const _ of ops) h.recordMs(12);
    return {
      planned: ops.length,
      latency: h.toJSON(),
      samples: ops
        .filter((r) => (r.ordinal + 1) % sampleEvery === 0)
        .map((r) => ({
          ordinal: r.ordinal,
          start: start + r.ms,
          end: start + r.ms + 12,
          digest: sha([task(0, r.subject), field(0), fieldValue(r.subject, 0, 0, 0)]),
        })),
    };
  };
  const x: Observation = {
    people,
    nonce,
    start,
    scopes,
    source: "f".repeat(40),
    slot: "fixture",
    cell: "alone",
    repeat: 0,
    writes,
    feed: [],
    reads: [makeRead(0), makeRead(1)],
  };
  const summary = checkCell(x, []);
  assert.equal(summary.preDispatchExpiry, 315);
  assert.equal(summary.goodput, 0);
  assert.equal(summary.writes.p99, null);
  assert.equal(summary.read.n, 3840);
  assert.equal(summary.capacityBars, false);
  assert.throws(() =>
    checkCell(
      { ...x, writes: [{ ...writes[0]!, dispatched: writes[0]!.enqueued }, ...writes.slice(1)] },
      [],
    ),
  );
  const damaged = structuredClone(x.reads) as [ReadResult, ReadResult];
  damaged.flatMap((r) => r.samples)[0]!.digest = "f".repeat(64);
  assert.throws(() => checkCell({ ...x, reads: damaged }, []));

  const alone = [0, 1].map((repeat) => ({
    ...summary,
    repeat,
    quietComplete: true,
    distributions: { ...summary.distributions, commit: Array<number>(315).fill(7) },
  }));
  const loaded = alone.map((a) => ({
    ...a,
    cell: 235 as const,
    distributions: { ...a.distributions, commit: Array<number>(315).fill(10) },
  }));
  const [commit, read] = ratios(alone, loaded);
  assert.equal(commit!.pass, false);
  assert.equal(commit!.denominatorN, 630);
  assert.equal(read!.pass, true);
  loaded[0]!.readErrors = 1;
  assert.equal(ratios(alone, loaded)[1]!.pass, null);
});
