import assert from "node:assert/strict";
import { DatomicClient } from "../../../../packages/datomic/dist/index.js";
import { decodeRowText } from "../../../../packages/datomic/dist/rowText.js";
import type { Fact } from "../../../bench/lib/world.ts";
import { command } from "../w1/group/workload.ts";

const depths = [1, 8, 32, 32, 8, 1];
const count = 192;
const depth = 160;
const attempt = process.env.PREP1_ATTEMPT!;
const scope = JSON.stringify(["triplex-scope-v1", "test", "prep1", attempt, 0]);
const c = new DatomicClient("http://127.0.0.1:8080", 35000);
const emit = (kind: string, data: unknown) =>
  console.log("PREP1_PROBE " + JSON.stringify({ attempt, kind, data }));
const now = () => process.hrtime.bigint().toString();
const facts = (i: number, size: number, value: string): Fact[] =>
  Array.from({ length: size }, (_, j) => ({
    e: `acct/a${i % 10}/p${i}`,
    a: `:field/f${j}`,
    v: { type: "string", value: `${value}/${i}/${j}` },
  }));

type Ack = {
  operationId: string;
  position: { v: string };
  recordedAt: { v: number };
  t: { v: string };
  groupSize: number;
  datoms: number;
  requestBytes: number;
  nativeComputeMs: number;
  submitToNativeEntryMs: number;
  groupStages: null | {
    evaluateMicros: number;
    prepareMicros: number;
    speculativeMicros: number;
    materializeMicros: number;
    awaitMicros: number;
    reused: number;
  };
  timeline: { payloadPrepared: number; completed: number; responsePrepared: number };
};

// [DX-PREP1] Why: each block edits existing rows in disjoint, equally deep ten-account cohorts.
// Rejected: posting fresh entities or rewriting a preceding block's measured payload.
try {
  const { db, created } = await c.create(scope, "lean", true, 35000);
  assert(created);
  const seeds: ReturnType<typeof command>["rows"][] = [];
  for (let i = 0; i < depths.length * count; i += 8) {
    const batch = Array.from({ length: 8 }, (_, j) =>
      command(`seed-${i + j}`, facts(i + j, depth, "original"), [], false),
    );
    await c.transact(db, {
      ...batch[0]!,
      entities: batch.flatMap((x) => x.entities ?? []),
      newIds: batch.flatMap((x) => x.newIds),
      rows: batch.flatMap((x) => x.rows),
    });
    seeds.push(...batch.map((x) => x.rows.slice(0, 3)));
  }
  const seedHead = await c.begin(db);
  await c.release(db, seedHead.handle);
  assert.equal(seedHead.position, seeds.length / 8);
  emit("seed", {
    db,
    scope,
    position: seedHead.position,
    subjects: seeds.length,
    facts: seeds.length * depth,
  });

  for (const [block, outstanding] of depths.entries()) {
    const inputs = Array.from({ length: count }, (_, j) => {
      const i = block * count + j;
      const width = 1 + (j % 3);
      return command(`edit-${i}`, facts(i, width, "edited"), seeds[i]!.slice(0, width));
    });
    const head = seedHead.position + block * count;
    let next = 0;
    const start = now();
    const rows = (
      await Promise.all(
        Array.from({ length: outstanding }, async () => {
          const recorded = [];
          while (next < inputs.length) {
            const index = next++;
            const input = inputs[index]!;
            const begin = now();
            const ack = (await c.transact(db, input)) as Ack;
            const end = now();
            assert.equal(ack.operationId, input.operationId);
            recorded.push({ index, begin, end, ack });
          }
          return recorded;
        }),
      )
    )
      .flat()
      .sort((a, b) => Number(a.ack.position.v) - Number(b.ack.position.v));
    const end = now();
    assert.equal(rows.length, count);
    assert.equal(new Set(rows.map((r) => r.ack.operationId)).size, count);
    for (const [i, r] of rows.entries()) {
      assert.equal(Number(r.ack.position.v), head + i + 1);
      if (i) assert(r.ack.recordedAt.v > rows[i - 1]!.ack.recordedAt.v);
    }
    let after = head;
    while (after < head + count) {
      const page = await c.request<{ transactions: [string, number, string[]][] }>(
        "POST",
        `/v2/db/${db}/transactions`,
        { after, limit: 64 },
      );
      assert(page.transactions.length);
      for (const [tx, p, texts] of page.transactions) {
        const row = rows[after++ - head]!;
        const input = inputs[row.index]!;
        assert.equal(p, after);
        assert.equal(tx, input.claims[0]!.txId);
        const actual = texts.map(decodeRowText);
        const expected = input.rows.filter((x) => x.entity_type === "_Transaction");
        assert.deepEqual(actual.map((x) => x.id).sort(), expected.map((x) => x.id).sort());
        assert(
          actual.every((x) => x.recorded_position === p && x.recorded_at === row.ack.recordedAt.v),
        );
        const changes = (xs: typeof actual) =>
          xs
            .filter((x) => x.attribute === ":_tx/change")
            .map((x) => {
              const change = JSON.parse(x.value_json!);
              return [change.op, change.tripleId, change.value ?? null];
            })
            .sort((a, b) => String(a[1]).localeCompare(String(b[1])));
        assert.deepEqual(changes(actual), changes(expected));
      }
    }
    for (let j = 0; j < rows.length; j += 8) {
      await Promise.all(
        rows.slice(j, j + 8).map(async (r) => {
          const input = inputs[r.index]!;
          const p = Number(r.ack.position.v);
          const saved = await c.operation(db, input.operationId);
          assert.deepEqual(
            [saved.status, saved.operationId, saved.position?.v, saved.t?.v, saved.recordedAt?.v],
            ["committed", input.operationId, r.ack.position.v, r.ack.t.v, r.ack.recordedAt.v],
          );
          const expected = input.rows.filter(
            (x) => x.entity_type !== "_Transaction" && x.retracted_at === null,
          );
          const actual = await c.rows(db, {
            entityIds: input.entities,
            basis: { recordedPosition: p },
            pattern: {},
          });
          const attributes = new Set(expected.map((x) => x.attribute));
          assert.deepEqual(
            actual.filter((x) => attributes.has(x.attribute)).sort(byId),
            expected
              .map((x) => ({ ...x, recorded_position: p, recorded_at: r.ack.recordedAt.v }))
              .sort(byId),
          );
          const before = await c.rows(db, {
            entityIds: input.entities,
            basis: { recordedPosition: p - 1 },
            pattern: {},
          });
          assert.deepEqual(
            before
              .filter((x) => attributes.has(x.attribute))
              .map((x) => x.id)
              .sort(),
            seeds[block * count + r.index]!.slice(0, expected.length)
              .map((x) => x.id)
              .sort(),
          );
        }),
      );
    }
    emit("block", { db, block, outstanding, start, end, head, rows });
  }
  emit("finished", { db, head: seedHead.position + depths.length * count });
} finally {
  c.close();
}

function byId(a: { id: string }, b: { id: string }) {
  return a.id.localeCompare(b.id);
}
