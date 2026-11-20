import assert from "node:assert/strict";
import { DatomicClient } from "../../../../../packages/datomic/dist/index.js";
import { decodeRowText } from "../../../../../packages/datomic/dist/rowText.js";
import { command } from "../group/workload.ts";
import { scopeKey } from "../field/traffic.ts";
import type { Fact } from "../../../../bench/lib/world.ts";

type Ack = {
  operationId: string;
  t: { v: string };
  position: { v: string };
  recordedAt: { v: number };
  datoms: number;
  groupSize?: number;
  groupStages: null | {
    evaluateMicros: number;
    prepareMicros: number;
    speculativeMicros: number;
    reused: number;
    materializeMicros: number;
    awaitMicros: number;
  };
  nativeComputeMs: number;
  requestBytes: number;
  groupQueueMicros?: number;
  readyToNativeEntryMs: number;
  submitToNativeEntryMs: number;
  transactMicros: number;
  timeline: { payloadPrepared: number };
};
type Row = {
  i: number;
  id: string;
  p: number;
  t: string;
  clock: number;
  width: number;
  datoms: number;
  group: number;
  stages: Ack["groupStages"];
  computeMs: number;
  appMs: number;
  queueMs: number;
  prepareMs: number;
  awaitMs: number;
  nativeQueueMs: number;
  readyToNativeMs: number;
  bytes: number;
};

export async function capacityTrial(
  url: string,
  nonce: string,
  prepared: boolean,
  readWal: () => number,
) {
  const c = new DatomicClient(url, 35000);
  const scope = scopeKey(nonce);
  try {
    const { db, created } = await c.create(scope, "lean", true, 35000);
    assert(created);
    const phases = [];
    for (const depth of [1, 8, 32, 64, 128]) {
      const commands: {
        entity: string;
        seed: ReturnType<typeof command>;
        replacement: ReturnType<typeof command>;
        width: number;
      }[] = [];
      const count = 192;
      for (let i = 0; i < count; i++) {
        const id = `d${depth}-save-${i}`;
        const entity = `acct/a${i % 10}/d${depth}/p${i}`;
        const facts = Array.from(
          { length: 1 + (i % 3) },
          (_, j): Fact => ({
            e: entity,
            a: `:field/v${j}`,
            v: { type: "string", value: `old/${i}/${j}` },
          }),
        );
        const seed = command(id + "-seed", facts, [], false);
        const replacement = command(
          id,
          facts.map((f, j) => ({
            ...f,
            v: { type: "string", value: `new/${i}/${j}` },
          })),
          seed.rows,
        );
        commands.push({ entity, seed, replacement, width: facts.length });
      }
      for (let i = 0; i < commands.length; i += 16) {
        const batch = commands.slice(i, i + 16).map((x) => x.seed);
        const input = {
          ...batch[0]!,
          rows: batch.flatMap((r) => r.rows),
          newIds: batch.flatMap((r) => r.newIds),
          entities: batch.flatMap((r) => r.entities ?? []),
        };
        await c.transact(db, input);
      }
      const old = await c.begin(db);
      await c.release(db, old.handle);
      const rows: Row[] = [];
      let next = 0;
      const walBefore = readWal();
      const start = performance.now();
      await Promise.all(
        Array.from({ length: depth }, async () => {
          while (next < commands.length) {
            const i = next++;
            const cmd = commands[i]!.replacement;
            const begin = performance.now();
            const ack = (await c.transact(db, cmd)) as Ack;
            const end = performance.now();
            assert.equal(ack.operationId, cmd.operationId);
            assert(ack.nativeComputeMs > 0 && ack.requestBytes > 0);
            rows.push({
              i,
              id: ack.operationId,
              p: Number(ack.position.v),
              t: ack.t.v,
              clock: ack.recordedAt.v,
              width: commands[i]!.width,
              datoms: ack.datoms,
              group: ack.groupSize ?? 1,
              stages: ack.groupStages,
              computeMs: ack.nativeComputeMs,
              appMs: end - begin,
              queueMs: (ack.groupQueueMicros ?? 0) / 1000,
              prepareMs: ack.timeline.payloadPrepared / 1000,
              awaitMs: ack.transactMicros / 1000,
              nativeQueueMs: ack.submitToNativeEntryMs,
              readyToNativeMs: ack.readyToNativeEntryMs,
              bytes: ack.requestBytes,
            });
          }
        }),
      );
      const durationMs = performance.now() - start;
      const walBytes = readWal() - walBefore;
      assert(walBytes > 0);
      const ordered = rows.sort((a, b) => a.p - b.p);
      const physical = new Map<string, typeof ordered>();
      for (const [i, r] of ordered.entries()) {
        assert.equal(r.p, old.position + i + 1);
        assert(!i || ordered[i - 1]!.clock < r.clock);
        const members = physical.get(r.t) ?? [];
        members.push(r);
        physical.set(r.t, members);
      }
      for (const members of physical.values())
        assert(members.every((r, i) => r.group === members.length && r.p === members[0]!.p + i));
      let after = old.position;
      while (after < old.position + count) {
        const page = await c.request<{ transactions: [string, number, string[]][] }>(
          "POST",
          `/v2/db/${db}/transactions`,
          { after, limit: 64 },
        );
        assert(page.transactions.length > 0);
        for (const [tx, p, texts] of page.transactions) {
          const r = ordered[p - old.position - 1]!;
          const cmd = commands[r.i]!.replacement;
          assert.equal(++after, p);
          assert.equal(tx, cmd.claims[0]!.txId);
          const observed = texts.map(decodeRowText);
          const expected = cmd.rows.filter((row) => row.entity_type === "_Transaction");
          assert.deepEqual(observed.map((r) => r.id).sort(), expected.map((r) => r.id).sort());
          assert(
            observed.every((row) => row.recorded_position === p && row.recorded_at === r.clock),
          );
        }
      }
      const byI = new Map(ordered.map((r) => [r.i, r]));
      for (let i = 0; i < commands.length; i += 16) {
        const batch = commands.slice(i, i + 16);
        const got = await c.rows(db, {
          entityIds: batch.map((x) => x.entity),
          basis: { recordedPosition: old.position + count },
          pattern: {},
        });
        const expected = batch.flatMap((x, k) => {
          const ack = byI.get(i + k)!;
          return x.replacement.rows
            .filter((r) => r.entity_type !== "_Transaction" && r.retracted_at === null)
            .map((r) => ({ ...r, recorded_position: ack.p, recorded_at: ack.clock }));
        });
        const order = (a: { id: string }, b: { id: string }) => a.id.localeCompare(b.id);
        assert.deepEqual([...got].sort(order), expected.sort(order));
      }
      const head = await c.begin(db);
      assert.equal(head.position, old.position + count);
      await c.release(db, head.handle);
      phases.push({
        depth,
        durationMs,
        first: old.position + 1,
        rows,
        physical: physical.size,
        walBytes,
      });
    }
    return { nonce, scope, db, prepared, phases };
  } finally {
    c.close();
  }
}
