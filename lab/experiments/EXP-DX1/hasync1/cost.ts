import assert from "node:assert/strict";
import {
  DatomicClient,
  immutable,
  type Input,
  type Receipt,
} from "../../../../packages/datomic/test/ha1-account.ts";
import { latency } from "../ha1/one-backup.ts";
import type { Account } from "../ha1/one-db.ts";
import type { SyncPair } from "./pair.ts";
import { lsn, timeouts, wait } from "./supervisor.ts";

type Sample = {
  receipt: Receipt;
  commandId: string;
  subject: string;
  group: number;
  offered: number;
  ended: number;
};
type Block = {
  depth: number;
  sync: boolean;
  elapsed: number;
  peak: number;
  samples: Sample[];
  verifiedFlush: string;
  beforeWal: string;
  afterWal: string;
};
const depths = [1, 16, 64] as const;

function intent(ac: Account, id: string): Input {
  return {
    ...ac.intent(id, 10, "save-" + id),
    // [DX-HASYNC1] Why: exercise the actual W1 strict-clock lean grouping gate. Rejected: enabling group commit on the legacy fixture where every save still runs solo.
    assignRecordTime: true,
    replaySafe: true,
  };
}

async function block(
  pair: SyncPair,
  ac: Account,
  writer: DatomicClient,
  depth: number,
  sync: boolean,
  id: string,
  n: number,
): Promise<Block> {
  const verifiedFlush = await pair.setSync(sync);
  const wal = () =>
    pair.sql("pg", "select wal_records,wal_fpi,wal_bytes,wal_sync from pg_stat_wal");
  const beforeWal = await wal();
  const queue = Array.from({ length: n }, (_, i) => intent(ac, "cost-" + id + "-" + i));
  const start = performance.now();
  const samples: Sample[] = [];
  let offered = 0;
  let active = 0;
  let peak = 0;
  const workers = Array.from({ length: depth }, async () => {
    for (;;) {
      const next = queue[offered++];
      if (!next) break;
      peak = Math.max(peak, ++active);
      const start = performance.now();
      try {
        const raw = (await writer.transact(ac.db, next)) as { groupSize?: number };
        const end = performance.now();
        const receipt = immutable(raw);
        assert.equal(receipt.operationId, next.operationId);
        const group = raw.groupSize ?? 1;
        assert(Number.isInteger(group) && group >= 1 && group <= 8);
        samples.push({
          receipt,
          commandId: next.claims[0]!.commandId,
          subject: next.rows[0]!.entity_id,
          group,
          offered: start,
          ended: end,
        });
      } finally {
        active--;
      }
    }
  });
  const work = await Promise.allSettled(workers);
  const elapsed = performance.now() - start;
  for (const done of work) if (done.status === "rejected") throw done.reason;
  assert.equal(peak, depth);
  assert.equal(samples.length, n);
  assert.equal(new Set(samples.map((s) => s.receipt.operationId)).size, n);
  return { depth, sync, elapsed, peak, samples, verifiedFlush, beforeWal, afterWal: await wal() };
}

async function audit(ac: Account, blocks: Block[]) {
  const samples = blocks
    .flatMap((cell) => cell.samples)
    .sort((a, b) => Number(a.receipt.position.v) - Number(b.receipt.position.v));
  const start = samples[0]!;
  for (const [i, v] of samples.entries()) {
    assert.equal(Number(v.receipt.position.v), Number(start.receipt.position.v) + i);
    if (i) {
      const prev = samples[i - 1]!;
      assert(BigInt(v.receipt.t.v) >= BigInt(prev.receipt.t.v));
      assert(v.receipt.recordedAt.v > prev.receipt.recordedAt.v);
    }
  }
  const last = samples.at(-1)!.receipt;
  const expected = new Map(ac.inputs.map((i) => [i.operationId, i]));
  for (let n = 0; n < samples.length; n += 24) {
    const batch = samples.slice(n, n + 24);
    const ids = batch.map((s) => s.receipt.operationId);
    const response = await ac.r.request<{ database: string; operations: unknown[] }>(
      "POST",
      "/ha1/" + ac.db + "/operations",
      { ids },
    );
    assert.equal(response.database, ac.db);
    assert.deepEqual(
      response.operations.map(immutable),
      batch.map((s) => s.receipt),
    );
    const rows = await ac.r.rows(ac.db, {
      entityIds: batch.map((s) => s.subject),
      basisT: last.t.v,
      basis: { recordedPosition: Number(last.position.v), validAt: 10 },
    });
    const order = (a: { id: string }, b: { id: string }) => a.id.localeCompare(b.id);
    assert.deepEqual(
      [...rows].sort(order),
      batch
        .flatMap((s) =>
          expected.get(s.receipt.operationId)!.rows.map((r) => ({
            ...r,
            recorded_position: Number(s.receipt.position.v),
            recorded_at: s.receipt.recordedAt.v,
          })),
        )
        .sort(order),
    );
  }
  return { saves: samples.length, last };
}

function summarize(blocks: Block[]) {
  return depths.map((depth) => {
    const summary = (sync: boolean) => {
      const arms = blocks.filter((b) => b.depth === depth && b.sync === sync);
      const samples = arms.flatMap((a) => a.samples);
      const time = arms.reduce((a, b) => a + b.elapsed, 0);
      const native = new Set(samples.map((s) => s.receipt.t.v)).size;
      return {
        ...latency(samples.map((s) => s.ended - s.offered)),
        physicalTransactions: native,
        savesPerTransaction: samples.length / native,
        maxGroup: Math.max(...samples.map((s) => s.group)),
        elapsedMsPerSave: time / samples.length,
      };
    };
    const local = summary(false),
      sync = summary(true);
    return {
      depth,
      local,
      sync,
      ratio: {
        p50: sync.p50 / local.p50,
        p99: sync.p99 / local.p99,
        elapsedPerSave: sync.elapsedMsPerSave / local.elapsedMsPerSave,
      },
    };
  });
}

export async function costDrill(
  pair: SyncPair,
  people: number,
  grouped: boolean,
  options: { seed?: (ac: Account) => Promise<unknown>; blockSize?: number } = {},
) {
  const { ac, setup } = await pair.open({
    grouped,
    lean: true,
    init:
      options.seed ??
      (async (ac) => {
        for (let i = 0; i < people; i++) {
          const raw = await ac.w.transact(ac.db, {
            ...ac.intent("cost-seed-" + i, 160, "seed-" + i),
            assignRecordTime: true,
          });
          assert.equal(immutable(raw).operationId, ac.inputs.at(-1)!.operationId);
        }
        return { people, facts: people * 160 };
      }),
  });
  await pair.clone();
  await pair.service(grouped);
  const w = new DatomicClient(pair.route!.url, timeouts.request);
  try {
    const blocks: Block[] = [];
    for (const depth of depths) {
      for (const [i, sync] of [false, true, true, false].entries()) {
        const cell = await block(
          pair,
          ac,
          w,
          depth,
          sync,
          depth + "-" + i,
          options.blockSize ?? 128,
        );
        blocks.push(cell);
        pair.s.e.write("cost-" + depth + "-" + i, cell);
      }
    }
    // A matched local-flush arm can leave an asynchronous tail. Observe its actual replay before reading B.
    const end = lsn(await pair.sql("pg", "select pg_current_wal_flush_lsn()"));
    await pair.setSync(true);
    await wait("all timed writes on B", timeouts.replay, async () =>
      lsn((await pair.candidate()).replay) >= end ? true : undefined,
    );
    const verified = await audit(ac, blocks);
    await pair.auditCheckpoint("after");
    const cells = summarize(blocks);
    for (const cell of cells) {
      for (const arm of [cell.local, cell.sync]) {
        if (grouped && cell.depth > 1) assert(arm.maxGroup > 1 && arm.savesPerTransaction > 1);
        else assert(arm.maxGroup === 1 && arm.savesPerTransaction === 1);
      }
    }
    const result = { policy: grouped ? "W1" : "plain", setup, cells, verified };
    pair.s.e.write("cost", result);
    return result;
  } finally {
    w.close();
  }
}
