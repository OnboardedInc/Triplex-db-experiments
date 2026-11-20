import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { Option } from "effect";
import { EntityId } from "../../../../packages/core/dist/index.js";
import {
  packEntity,
  RecentReads,
  type ReplicaRow,
} from "../../../../packages/datomic/dist/index.js";
import { prepareEntity, ReplicaReader } from "../../../bench/lib/replica-reads.ts";
import { ExpectationCache } from "../../../bench/lib/expectation-cache.ts";
import { Model } from "../../../bench/lib/model.ts";
import { observe, type ReadRecord } from "../../../bench/lib/observe.ts";
import type { Receipt } from "../../../bench/lib/composition.ts";
import { judgeReadCode } from "../../../bench/lib/read-judgment.ts";
import { ReadBatch, READ_BATCH_SIZE, unpackReadBatch } from "../../../bench/lib/read-batch.ts";
import { accountsFor, ids, ownFacts, sharedFacts } from "../../../bench/lib/world.ts";

export const fixtureBasis = { recordedAt: 100, validAt: 1_000 };
export const unexpectedGateway = async (): Promise<never> => {
  throw Error("Immutable replay attempted a gateway request");
};

// [DX-RD1] Why: run actual packed closures and model rows at a fixed cut, with the same subjects in each treatment.
// Rejected: using the replica's digest as its own expected answer, or warming the native stack with probe traffic.
export function costFixture(subjects: number) {
  const accounts = accountsFor(subjects);
  const facts = [
    ...Array.from({ length: subjects }, (_, i) => ownFacts(i, accounts)).flat(),
    ...Array.from({ length: accounts }, (_, i) => sharedFacts(i)).flat(),
  ];
  const model = new Model(subjects);
  const entities = new Map<string, ReplicaRow[]>();
  const metadata = {
    recordedAt: 100,
    createdBy: "fixture",
    entityType: null,
    schemaVersion: 1,
    txId: "seed",
  };
  const triples = facts.map((f, i) => {
    const value =
      f.v.type === "ref" ? { type: "ref" as const, value: EntityId.make(f.v.value) } : f.v;
    const stored = { id: `fixture-${i}`, entityId: f.e, attribute: f.a, value, validFrom: 0 };
    const rows = entities.get(f.e) ?? [];
    rows.push({ ...stored, position: 1, publicMetadata: metadata });
    entities.set(f.e, rows);
    return { ...stored, validTo: Option.none(), createdBy: Option.some("fixture") };
  });
  const operations = triples.map((r) => ({
    op: "assert",
    entityId: r.entityId,
    attribute: r.attribute,
    value: r.value,
    validFrom: 0,
  }));
  model.bindReceipt(
    operations,
    { txId: "seed", position: 1, instant: 100, triples } as unknown as Receipt,
    "fixture",
  );
  const index = new RecentReads(20_000, 8 * 1024 ** 2, true);
  index.apply(
    {
      position: 1,
      valid: true,
      reset: true,
      recordTime: 100,
      clockEnd: 1,
      changes: Array.from(entities, ([id, rows]) => [id, undefined, packEntity(1, rows)]),
    },
    prepareEntity,
  );
  return { index, model };
}

export async function fixtureRead(
  reader: ReplicaReader,
  subject: number,
  fullRows = false,
): Promise<ReadRecord> {
  const start = performance.now();
  const result = await reader.pullAt(
    ids.placement(subject),
    fixtureBasis,
    unexpectedGateway,
    undefined,
    fullRows,
    1,
  );
  const latency = performance.now() - start;
  const observed = observe(result);
  return [
    0,
    subject,
    fixtureBasis.recordedAt,
    fixtureBasis.validAt,
    start,
    latency,
    observed.stamp,
    observed.facts,
    observed.digest,
    observed.bytes,
    result.depth,
    result.roundTrips,
    null,
    0,
    1,
    0,
    -1,
    0,
    result.route,
    result.language,
    result.waitedMs,
  ];
}

const cpu = () => {
  const x = process.threadCpuUsage();
  return (x.user + x.system) / 1000;
};

// [DX-RD1] Why: calibrate the ON treatment using two real exact local read paths and a fixed observation rate.
// Rejected: idle cached pulls that leave the six cores mostly unused, or unrelated busy loops.
export async function calibrateReplay(
  fixture: ReturnType<typeof costFixture>,
  readsPerS: number,
  targetCores: number,
) {
  const reader = new ReplicaReader(8 * 1024 ** 2, fixture.index);
  const expected = new ExpectationCache(fixture.model);
  const count = 1_024;
  const measure = async (fullRows: boolean) => {
    const start = cpu();
    for (let i = 0; i < count; i++) {
      const row = await fixtureRead(reader, (i * 31) % fixture.model.subjects, fullRows);
      assert.equal(judgeReadCode(row, expected), 0);
    }
    return ((cpu() - start) * 1_000) / count;
  };
  const cachedUs = await measure(false);
  const fullRowsUs = await measure(true);
  const targetUs = (targetCores * 1_000_000) / readsPerS;
  const fullRowShare =
    fullRowsUs > cachedUs
      ? Math.max(0, Math.min(1, (targetUs - cachedUs) / (fullRowsUs - cachedUs)))
      : 0;
  return { cachedUs, fullRowsUs, targetUs, fullRowShare, targetCores, readsPerS };
}

async function measure() {
  const count = Number(process.argv[2] ?? 65_536),
    subjects = 256;
  assert(Number.isSafeInteger(count) && count >= READ_BATCH_SIZE && count % READ_BATCH_SIZE === 0);
  const { index, model } = costFixture(subjects);
  const reader = new ReplicaReader(8 * 1024 ** 2, index);
  const expected = new ExpectationCache(model);
  for (let i = 0; i < subjects; i++)
    assert.equal(judgeReadCode(await fixtureRead(reader, i), expected), 0);
  const results = [];
  for (const treatment of ["tuples", "transfer", "transfer", "tuples"]) {
    let issueCpu = 0,
      verifyCpu = 0,
      recordCpu = 0;
    const packed = new ReadBatch();
    for (let start = 0; start < count; start += READ_BATCH_SIZE) {
      let lap = cpu();
      const rows: ReadRecord[] = [];
      for (let i = 0; i < READ_BATCH_SIZE; i++)
        rows.push(await fixtureRead(reader, (i + start) % subjects));
      issueCpu += cpu() - lap;
      lap = cpu();
      if (treatment === "transfer") {
        for (const row of rows) packed.push(row);
        const batch = packed.take();
        const remote = structuredClone(batch, { transfer: [batch.values.buffer] });
        recordCpu += cpu() - lap;
        lap = cpu();
        for (const row of unpackReadBatch(remote)) assert.equal(judgeReadCode(row, expected), 0);
        packed.recycle(remote.values.buffer);
      } else {
        const remote = structuredClone(rows);
        recordCpu += cpu() - lap;
        lap = cpu();
        for (const row of remote) assert.equal(judgeReadCode(row, expected), 0);
      }
      verifyCpu += cpu() - lap;
    }
    results.push({
      treatment,
      count,
      issueAndObserveCpuUsPerRead: (issueCpu * 1000) / count,
      recordCpuUsPerRead: (recordCpu * 1000) / count,
      unpackAndVerifyCpuUsPerRead: (verifyCpu * 1000) / count,
    });
  }
  console.log(
    JSON.stringify(
      { diagnostic: "single-thread fixture, local exact reads and in-process wire copy", results },
      null,
      2,
    ),
  );
}

if (process.argv[1]?.endsWith("/reader-cost.ts")) await measure();
