// [EXP-DI01] Why: round 2 for CX-VDI01 F1. The shipped readers' own guard paths must refuse with one tagged BasisNotAvailable, and a refusal must leave every durable table unchanged until the same page is retried. Rejected: injecting an already-typed callback error (that only tests propagation, which the reviewer's expiry-seam test already covers).
import assert from "node:assert/strict";
import { test, after } from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Replay, W0 } from "./lib/di01-harness.ts";
import {
  BasisNotAvailable,
  dependencyPlans,
  memoryReferenceReader,
  resolveActivation,
  storageReferenceReader,
} from "./lib/di01-refs.ts";
import { DependencyIndex } from "../../packages/host/dist/feed/index.js";
import { V_W0, triplexValue } from "./lib/w0-world.ts";
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "DI01-refusal-"));
after(() => fs.rmSync(dir, { recursive: true, force: true }));
const run = async (e: any) => e;
const storageRow = (
  entity: string,
  attribute: string,
  value: string,
  position: number,
  extra = {},
) => ({
  id: `${entity}/${attribute}/${position}`,
  entity_id: entity,
  attribute,
  value_string: value,
  recorded_position: position,
  valid_from: V_W0,
  ...extra,
});
const refused = (e: any, reason: string) => {
  assert.ok(e instanceof BasisNotAvailable, "must be the shared refusal class");
  assert.equal(e._tag, "BasisNotAvailable");
  assert.equal(e.reason, reason);
  assert.match(e.message, /BasisNotAvailable/);
  return true;
};

test("shipped readers refuse an unavailable requested basis with the stable tag and fields (inverts the reviewer's GAP test)", async () => {
  let reads = 0;
  const storage = {
    currentCommitPosition: () => 5,
    getByEntities: () => {
      reads++;
      throw Error("must not read");
    },
  };
  const headOnly = storageReferenceReader({ storage, run }, true);
  await assert.rejects(headOnly(["pl:a"], 1, V_W0), (e: any) => {
    refused(e, "head-moved");
    assert.deepEqual(e.requested, { position: 1, validAt: V_W0 });
    assert.equal(e.availableHead, 5);
    assert.equal(e.retentionFloor, undefined);
    return true;
  });
  assert.equal(reads, 0, "guard must refuse before reading");
  // A reader that is not head-only still refuses a position the source has not reached.
  const ahead = storageReferenceReader({
    storage: { ...storage, currentCommitPosition: () => 1 },
    run,
  });
  await assert.rejects(ahead(["pl:a"], 5, V_W0), (e: any) => {
    refused(e, "head-moved");
    assert.equal(e.availableHead, 1);
    return true;
  });
  const memory = memoryReferenceReader({
    sweepPage: async () => ({
      rows: [],
      reportedBasis: { position: 5, validAt: V_W0 },
    }),
  } as any);
  await assert.rejects(memory(["pl:a"], 1, V_W0), (e: any) => {
    refused(e, "reported-basis-mismatch");
    assert.deepEqual(e.requested, { position: 1, validAt: V_W0 });
    assert.deepEqual(e.reportedBasis, { position: 5, validAt: V_W0 });
    return true;
  });
  const silent = memoryReferenceReader({
    sweepPage: async () => ({ rows: [] }),
  } as any);
  await assert.rejects(silent(["pl:a"], 1, V_W0), (e: any) => {
    refused(e, "reported-basis-mismatch");
    assert.deepEqual(e.reportedBasis, {});
    return true;
  });
});

test("rows outside the pinned basis and a head that moves during the read are refused with the same tag", async () => {
  const mk = (rows: any[], heads: number[]) =>
    storageReferenceReader(
      {
        storage: {
          currentCommitPosition: () => (heads.length > 1 ? heads.shift()! : heads[0]),
          getByEntities: () => new Map([["loc:a", rows]]),
        },
        run,
      },
      true,
    );
  for (const bad of [
    storageRow("loc:a", "jurisdiction", "jur:a", 6),
    storageRow("loc:a", "jurisdiction", "jur:a", 0),
    storageRow("loc:a", "jurisdiction", "jur:a", 2, { retracted_position: 5 }),
  ])
    await assert.rejects(mk([bad], [5])(["loc:a"], 5, V_W0), (e: any) => {
      refused(e, "row-outside-basis");
      assert.equal(e.availableHead, 5);
      return true;
    });
  await assert.rejects(mk([], [5, 6])(["loc:a"], 5, V_W0), (e: any) => {
    refused(e, "head-moved");
    assert.equal(e.availableHead, 6);
    return true;
  });
});

test("a backend-provided typed expiration error propagates unchanged, not wrapped or replaced", async () => {
  class Expired extends Error {
    readonly _tag = "RetentionExpired";
    readonly floor = 9;
  }
  const original = new Expired("retained basis expired");
  const reader = storageReferenceReader({
    storage: {
      currentCommitPosition: () => 10,
      getByEntities: () => {
        throw original;
      },
    },
    run,
  });
  await assert.rejects(reader(["pl:a"], 1, V_W0), (e: any) => {
    assert.equal(e, original);
    assert.ok(!(e instanceof BasisNotAvailable));
    return true;
  });
  const memory = memoryReferenceReader({
    sweepPage: async () => {
      throw original;
    },
  } as any);
  await assert.rejects(memory(["pl:a"], 1, V_W0), (e: any) => e === original);
});

const open = (file: string, readRefs: any) =>
  new DependencyIndex(file, {
    consumer: "c",
    validAt: V_W0,
    initialRelease: W0.R1.hash,
    plans: dependencyPlans(),
    readRefs,
    resolveActivation,
  });
const snap = (d: DependencyIndex) => ({
  checkpoint: d.checkpoint("c"),
  deps: d.dependencySnapshot("c"),
  effects: d.effects("c"),
  affected: d.affected("c"),
});

test("after a shipped-reader refusal (unavailable basis, or expired basis) and reopen, index, effects and checkpoint are unchanged and the same page retries successfully", async () => {
  // Reference history keyed by position; the fake source head and an expiry switch are the two ways the basis becomes unavailable.
  const history: Record<number, any[]> = {
    1: [
      storageRow("pl:a", "location", "loc:a", 1),
      storageRow("loc:a", "jurisdiction", "jur:a", 1),
    ],
    5: [storageRow("pl:a", "location", "loc:b", 5)],
  };
  let head = 1,
    expired: Error | null = null;
  class Expired extends Error {
    readonly _tag = "RetentionExpired";
  }
  const storage = {
    currentCommitPosition: () => head,
    getByEntities: (entities: readonly string[], basis: { recordedPosition: number }) => {
      if (expired) throw expired;
      return new Map(
        entities.map((e) => [
          e,
          (history[basis.recordedPosition] ?? []).filter((r) => r.entity_id === e),
        ]),
      );
    },
  };
  const file = path.join(dir, "reopen.db");
  const reader = storageReferenceReader({ storage, run }, true);
  const r = new Replay();
  const p1 = r.add(
    [
      ["pl:a", "location", "loc:a"],
      ["loc:a", "jurisdiction", "jur:a"],
    ],
    V_W0,
  );
  const p5 = r.add([["pl:a", "location", "loc:b"]], V_W0, [], 5);
  let d = open(file, reader);
  await d.consume(null, p1);
  d.close();

  // 1. head-only guard: source head moved past the page's position.
  d = open(file, reader);
  const before = snap(d);
  assert.equal(before.checkpoint!.token, "1");
  head = 7;
  await assert.rejects(d.consume(d.checkpoint("c"), p5), (e: any) => {
    refused(e, "head-moved");
    assert.equal(e.requested.position, 5);
    assert.equal(e.availableHead, 7);
    return true;
  });
  assert.deepEqual(snap(d), before);
  d.close();
  d = open(file, reader);
  assert.deepEqual(snap(d), before, "reopen preserves the pre-refusal state");

  // 2. backend expiry error: propagates unchanged, state still unchanged.
  head = 5;
  expired = new Expired("retained basis expired");
  await assert.rejects(d.consume(d.checkpoint("c"), p5), (e: any) => e === expired);
  assert.deepEqual(snap(d), before);
  d.close();

  // 3. basis becomes available: the identical page succeeds.
  expired = null;
  d = open(file, reader);
  assert.deepEqual(snap(d), before);
  await d.consume(d.checkpoint("c"), p5);
  assert.equal(d.checkpoint("c")!.token, "5");
  assert.deepEqual(d.reach([["loc:b", "jurisdiction"]], W0.R1.hash), ["pl:a"]);
  d.close();
});

test("a memory-reader refusal leaves the index unchanged across reopen and the same page succeeds once the basis matches", async () => {
  let mismatch = true;
  const rowsAt = (position: number) =>
    position === 1
      ? [
          {
            entityId: "pl:a",
            attribute: "location",
            value: triplexValue("location", "loc:a"),
            position: 1,
            validFrom: V_W0,
          },
          {
            entityId: "loc:a",
            attribute: "jurisdiction",
            value: triplexValue("jurisdiction", "jur:a"),
            position: 1,
            validFrom: V_W0,
          },
        ]
      : [];
  const comp = {
    sweepPage: async (_: any, basis: { position: number; validAt: number }) => ({
      rows: rowsAt(basis.position),
      reportedBasis: mismatch ? { position: 99, validAt: V_W0 } : basis,
    }),
  } as any;
  const reader = memoryReferenceReader(comp);
  const file = path.join(dir, "memory.db");
  const r = new Replay();
  const p1 = r.add([["pl:a", "location", "loc:a"]], V_W0);
  let d = open(file, reader);
  const before = snap(d);
  await assert.rejects(d.consume(null, p1), (e: any) => refused(e, "reported-basis-mismatch"));
  assert.deepEqual(snap(d), before);
  assert.equal(d.checkpoint("c"), null);
  d.close();
  d = open(file, reader);
  assert.deepEqual(snap(d), before);
  mismatch = false; // the fake now echoes the requested basis
  await d.consume(null, p1);
  assert.equal(d.checkpoint("c")!.token, "1");
  d.close();
});

test("a reader that reports the requested basis but returns a row at a later position is refused by the consumer with the tagged error, state unchanged after reopen, same page then succeeds", async () => {
  let future = true;
  const reader = memoryReferenceReader({
    sweepPage: async (_: any, basis: any) => ({
      reportedBasis: basis,
      rows: [
        {
          entityId: "pl:a",
          attribute: "location",
          value: triplexValue("location", "loc:a"),
          position: future ? 2 : 1,
          validFrom: V_W0,
        },
      ],
    }),
  } as any);
  const file = path.join(dir, "future-row.db");
  const r = new Replay();
  const p1 = r.add([["pl:a", "location", "loc:a"]], V_W0);
  let d = open(file, reader);
  const before = snap(d);
  await assert.rejects(d.consume(null, p1), (e: any) => {
    refused(e, "row-outside-basis");
    assert.deepEqual(e.requested, { position: 1, validAt: V_W0 });
    assert.deepEqual(e.observedRow, {
      entity: "pl:a",
      attribute: "location",
      position: 2,
      validFrom: V_W0,
    });
    return true;
  });
  assert.deepEqual(snap(d), before);
  assert.equal(d.checkpoint("c"), null);
  d.close();
  d = open(file, reader);
  assert.deepEqual(snap(d), before);
  future = false;
  await d.consume(null, p1);
  assert.equal(d.checkpoint("c")!.token, "1");
  assert.deepEqual(d.reach([["loc:a", "jurisdiction"]], W0.R1.hash), ["pl:a"]);
  d.close();
});

test("consumer row validation refuses retracted, unrequested and out-of-valid-time rows with the tagged error and keeps a backend error's identity", async () => {
  const mk = (row: any) =>
    open(path.join(dir, `bad-${Math.random().toString(36).slice(2)}.db`), async () => [row]);
  const base = {
    entity: "pl:a",
    attribute: "location",
    value: "loc:a",
    position: 1,
    validFrom: V_W0,
  };
  const page = () => new Replay().add([["pl:a", "location", "loc:a"]], V_W0);
  for (const bad of [
    { ...base, retractedPosition: 1 },
    { ...base, entity: "pl:zzz" },
    { ...base, validFrom: V_W0 + 1 },
    { ...base, validTo: V_W0 + 5 },
    { ...base, position: 0 },
  ]) {
    const d = mk(bad);
    await assert.rejects(d.consume(null, page()), (e: any) => refused(e, "row-outside-basis"));
    assert.equal(d.checkpoint("c"), null);
    d.close();
  }
  const original = Object.assign(new Error("expired"), { _tag: "RetentionExpired" });
  const d = open(path.join(dir, "backend.db"), async () => {
    throw original;
  });
  await assert.rejects(d.consume(null, page()), (e: any) => e === original);
  d.close();
});
