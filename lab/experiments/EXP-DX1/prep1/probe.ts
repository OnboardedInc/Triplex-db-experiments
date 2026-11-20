import assert from "node:assert/strict";
import { setTimeout as sleep } from "node:timers/promises";
import { DatomicClient, DatomicHttpError } from "../../../../packages/datomic/dist/index.js";
import { decodeRowText } from "../../../../packages/datomic/dist/rowText.js";
import type { Fact } from "../../../bench/lib/world.ts";
import { command } from "../w1/group/workload.ts";

const mode = process.env.PREP1_MODE;
const arm = process.env.PREP1_ARM;
const subjectProfile = mode === "subject-profile";
const deep = mode === "profile" || mode === "census";
const guardProbe = deep || mode === "cheap";
const depths = subjectProfile
  ? [1, 2, 4, 6].flatMap((n) => [n, n, n])
  : guardProbe
    ? [32]
    : mode === "ortho"
      ? [1, 8, 32, 32, 8, 1]
      : [32, 32];
const count = subjectProfile ? 30 : guardProbe ? 96 : 192;
const subjectCount = deep ? 1200 : depths.length * count;
// [DX-PREP1] Why: sample across the same seeded depth as the earlier open-loop experiment.
// Rejected: a narrow prefix of that database, where all historical lookups can share the same index leaves.
const subjectFor = (offer: number) => (deep ? (offer * 67) % subjectCount : offer);
const depth = 160;
const attempt = process.env.PREP1_ATTEMPT!;
const scope = JSON.stringify([
  "triplex-scope-v1",
  "test",
  "prep1",
  guardProbe || subjectProfile ? `${attempt}-${arm}` : attempt,
  0,
]);
const peers = (process.env.PREP1_PEERS ?? process.env.PREP1_URL!)
  .split(",")
  .map((url) => new DatomicClient(url, 35000));
const c = peers[0]!;
const emit = (kind: string, data: unknown) =>
  console.log("PREP1_PROBE " + JSON.stringify({ attempt, kind, data, arm }));
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
  subjectSave?: string;
  subjectReplan?: boolean;
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
  preparedStats?: {
    path: string;
    replays: number;
    submittedNs: string;
    renderedNs: string;
    afterOperation: string | null;
    observedNs: string;
  };
  timeline: { payloadPrepared: number; completed: number; responsePrepared: number };
};

async function seedBatch(
  db: string,
  input: Parameters<DatomicClient["transact"]>[1],
  position: number,
) {
  try {
    const ack = (await c.transact(db, input)) as Ack;
    assert.equal(ack.operationId, input.operationId);
    assert.equal(Number(ack.position.v), position);
  } catch (failure) {
    if (
      mode !== "census" ||
      !(failure instanceof DatomicHttpError) ||
      failure.code !== "OutcomeUnknown"
    )
      throw failure;
    // [DX-PREP1] Why: under concurrent Mac work the seed reply can miss the gateway's wait budget.
    // Rejected: sending another seed transaction or extending the driver's edit timing to include recovery.
    for (let i = 0; i < 60; i++) {
      const stored = await c.operation(db, input.operationId);
      if (stored.status === "committed") {
        assert.equal(stored.operationId, input.operationId);
        assert.equal(Number(stored.position?.v), position);
        assert(Number(stored.t?.v) > 0);
        console.log("PREP1_SEED_RECOVERED " + JSON.stringify({ attempt, db, arm, stored }));
        return;
      }
      await sleep(500);
    }
    throw failure;
  }
}

// [DX-PREP1] Why: each block edits existing rows in disjoint, equally deep ten-account cohorts.
// Rejected: posting fresh entities or rewriting a preceding block's measured payload.
try {
  const { db, created } = await c.create(scope, "lean", true, 35000);
  assert(created);
  const seeds: ReturnType<typeof command>["rows"][] = [];
  for (let i = 0; i < subjectCount; i += 8) {
    const batch = Array.from({ length: 8 }, (_, j) =>
      command(`seed-${i + j}`, facts(i + j, depth, "original"), [], false),
    );
    await seedBatch(
      db,
      {
        ...batch[0]!,
        entities: batch.flatMap((x) => x.entities ?? []),
        newIds: batch.flatMap((x) => x.newIds),
        rows: batch.flatMap((x) => x.rows),
      },
      i / 8 + 1,
    );
    seeds.push(...batch.map((x) => x.rows.slice(0, 3)));
  }
  const seedHead = await c.begin(db);
  await c.release(db, seedHead.handle);
  assert.equal(seedHead.position, seeds.length / 8);
  if (subjectProfile) {
    const installed = [];
    for (const [i, client] of peers.entries()) {
      if (i > 0) assert.equal((await client.create(scope, "lean", true, 35000)).db, db);
      const observed = await client.request<{
        database: string;
        position: number;
        subjectSave?: boolean;
        subjectFunction?: string;
        subjectFunctionTx?: string;
        options: { groupCommit: boolean; livePriority: boolean; fieldCoalesce: boolean };
      }>("GET", `/v1/db/${db}/write-options`);
      assert.equal(observed.database, db);
      assert.equal(observed.position, seedHead.position);
      assert.equal(peers.length, Number(arm![1]));
      assert.equal(!!observed.subjectSave, arm!.startsWith("B"));
      assert.equal(observed.options.groupCommit, arm!.startsWith("A"));
      assert.equal(observed.options.livePriority, arm!.startsWith("A"));
      assert.equal(observed.options.fieldCoalesce, false);
      if (observed.subjectSave) {
        assert.match(observed.subjectFunction ?? "", /^:triplex\.subject\/v-[0-9a-f]{24}$/);
        assert.match(observed.subjectFunctionTx ?? "", /^[1-9][0-9]*$/);
      }
      installed.push(observed);
    }
    emit("writers", installed);
  }
  emit("seed", {
    db,
    scope,
    position: seedHead.position,
    subjects: seeds.length,
    facts: seeds.length * depth,
  });
  if (subjectProfile) {
    const idleStart = BigInt(now());
    await sleep(30100);
    emit("idle", { db, elapsedNs: (BigInt(now()) - idleStart).toString() });
  }

  for (const [block, outstanding] of depths.entries()) {
    const inputs = Array.from({ length: count }, (_, j) => {
      const i = block * count + j;
      const width = 1 + ((subjectProfile ? block : j) % 3);
      const subject = subjectFor(i);
      const edit = command(
        `edit-${i}`,
        facts(subject, width, "edited"),
        seeds[subject]!.slice(0, width),
      );
      return subjectProfile ? { ...edit, sourceK: seedHead.position } : edit;
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
            const peer = index % peers.length;
            const ack = (await peers[peer]!.transact(db, input)) as Ack;
            const end = now();
            assert.equal(ack.operationId, input.operationId);
            recorded.push({ index, begin, end, ack, ...(subjectProfile ? { peer } : {}) });
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
            seeds[subjectFor(block * count + r.index)]!.slice(0, expected.length)
              .map((x) => x.id)
              .sort(),
          );
        }),
      );
    }
    emit("block", {
      db,
      block,
      outstanding,
      start,
      end,
      head,
      rows,
      ...(subjectProfile ? { width: 1 + (block % 3), afterIdle: block === 0 } : {}),
    });
  }
  emit("finished", { db, head: seedHead.position + depths.length * count });
  if (subjectProfile) await c.delete(scope);
} finally {
  for (const peer of peers) peer.close();
}

function byId(a: { id: string }, b: { id: string }) {
  return a.id.localeCompare(b.id);
}
