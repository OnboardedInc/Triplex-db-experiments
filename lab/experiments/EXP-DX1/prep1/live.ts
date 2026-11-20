import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { setTimeout as wait } from "node:timers/promises";
import { DatomicClient, DatomicHttpError } from "../../../../packages/datomic/dist/index.js";
import { decodeRowText } from "../../../../packages/datomic/dist/rowText.js";
import type { Fact } from "../../../bench/lib/world.ts";
import { command } from "../w1/group/workload.ts";

type Input = ReturnType<typeof command>;
type Receipt = {
  operationId: string;
  position: { v: string };
  recordedAt: { v: number };
  t: { v: string };
  groupSize?: number;
  writerFunction?: string;
  preparedStats?: {
    path: string;
    replays: number;
    submittedNs?: string;
    afterOperation?: string;
  };
};
type Save = {
  id: string;
  subject: string;
  account: number;
  serial: number;
  at: number;
  width: number;
};
const sha = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const fields = (subject: string, size: number, value: string): Fact[] =>
  Array.from({ length: size }, (_, j) => ({
    e: subject,
    a: `:field/f${j}`,
    v: { type: "string", value: `${value}/${j}` },
  }));
const roots = Array.from({ length: 1200 }, (_, i) => `acct/a${i % 10}/p${i}`);

function schedule(rate: number, seconds: number, block: number): Save[] {
  let random = 207 | 0;
  const jitter = () => {
    random = Math.imul(random, 1664525) + 1013904223;
    return (random >>> 0) / 2 ** 32;
  };
  const count = (seconds * rate) / 10;
  assert(Number.isInteger(count), "duration must yield an integer offer count per account");
  return roots
    .slice(0, 10)
    .flatMap((_, account) =>
      Array.from({ length: count }, (_, serial) => ({
        id: `live-${block}-${account}-${serial}`,
        subject: roots[((serial * 67) % 120) * 10 + account]!,
        at: ((serial + jitter()) * seconds * 1000) / count,
        account,
        serial,
        width: 1 + ((account + serial) % 3),
      })),
    )
    .sort((a, b) => a.at - b.at);
}
function percentile(values: number[], q: number) {
  return values.length ? values.sort((a, b) => a - b)[Math.ceil(values.length * q) - 1]! : null;
}

async function seed(c: DatomicClient, db: string, subjects: string[]) {
  const bySubject = new Map<string, Input["rows"]>();
  for (let i = 0; i < subjects.length; i += 8) {
    const batch = subjects.slice(i, i + 8).map((subject, j) => {
      const s = command(`seed-${i + j}`, fields(subject, 160, `original/${subject}`), [], false);
      return s;
    });
    const saved = (await c.transact(db, {
      ...batch[0]!,
      rows: batch.flatMap((s) => s.rows),
      newIds: batch.flatMap((s) => s.newIds),
      entities: batch.flatMap((s) => s.entities ?? []),
    })) as Receipt;
    assert.equal(saved.operationId, batch[0]!.operationId);
    assert.equal(Number(saved.position.v), i / 8 + 1);
    for (const s of batch)
      bySubject.set(
        s.entities![0]!,
        s.rows.slice(0, 3).map((row) => ({
          ...row,
          recorded_at: saved.recordedAt.v,
          recorded_position: Number(saved.position.v),
        })),
      );
  }
  return bySubject;
}

async function phase(
  c: DatomicClient,
  db: string,
  bySubject: Map<string, Input["rows"]>,
  tape: Save[],
  seconds: number,
) {
  const basis = await c.begin(db);
  await c.release(db, basis.handle);
  const pending = new Set<Promise<void>>();
  const runningSubjects = new Set<string>();
  const waiting: Save[] = [];
  const records: {
    id: string;
    account: number;
    due: number;
    sent: number;
    end: number;
    outcome: string;
    result?: Receipt;
    recovered?: Receipt;
  }[] = [];
  const inputs = new Map<string, Input>();
  const startNs = process.hrtime.bigint();
  const elapsed = () => Number(process.hrtime.bigint() - startNs) / 1e6;
  const pump = () => {
    // [DX-PREP1] Why: fixed sender capacity makes the same offered load observable under overload.
    // Rejected: shifting scheduled offers to the time a socket or same-subject predecessor becomes ready.
    while (pending.size < 96) {
      const i = waiting.findIndex((x) => !runningSubjects.has(x.subject));
      if (i < 0) break;
      const s = waiting.splice(i, 1)[0]!;
      const old = bySubject.get(s.subject)!;
      const input = command(s.id, fields(s.subject, s.width, s.id), old.slice(0, s.width));
      inputs.set(s.id, input);
      runningSubjects.add(s.subject);
      const sent = elapsed();
      const work = (async () => {
        try {
          const result = (await c.transact(db, input)) as Receipt;
          const end = elapsed();
          assert.equal(result.operationId, s.id);
          assert.match(result.writerFunction ?? "", /^:triplex\.write\/v-[0-9a-f]{24}$/);
          bySubject.set(s.subject, [
            ...input.rows.slice(0, s.width).map((r) => ({
              ...r,
              recorded_at: result.recordedAt.v,
              recorded_position: Number(result.position.v),
            })),
            ...old.slice(s.width),
          ]);
          records.push({
            id: s.id,
            account: s.account,
            due: s.at,
            sent,
            end,
            outcome: "acked",
            result,
          });
        } catch (error) {
          if (error instanceof assert.AssertionError) throw error;
          const outcome = error instanceof DatomicHttpError ? error.code : "transport";
          records.push({
            id: s.id,
            account: s.account,
            due: s.at,
            sent,
            end: elapsed(),
            outcome,
          });
        }
      })().finally(() => {
        runningSubjects.delete(s.subject);
        pending.delete(work);
        pump();
      });
      pending.add(work);
    }
  };
  for (const save of tape) {
    let remaining = save.at - elapsed();
    while (remaining > 0) {
      await wait(Math.ceil(remaining));
      remaining = save.at - elapsed();
    }
    waiting.push(save);
    pump();
  }
  while (pending.size) await Promise.all([...pending]);
  assert.equal(waiting.length, 0);
  assert.equal(records.length, tape.length);
  assert.equal(new Set(records.map((r) => r.id)).size, tape.length);
  const drained = elapsed();
  let position = basis.position;
  const byId = new Map(records.map((r) => [r.id, r]));
  const observed = new Set<string>();
  const head = await c.begin(db);
  await c.release(db, head.handle);
  while (position < head.position) {
    const page = await c.request<{ transactions: [string, number, string[]][] }>(
      "POST",
      `/v2/db/${db}/transactions`,
      { after: position, limit: 128, basis: { recordedPosition: head.position } },
    );
    assert(page.transactions.length);
    for (const [tx, p, texts] of page.transactions) {
      assert.equal(++position, p);
      const decoded = texts.map(decodeRowText);
      const id = decoded.find((r) => r.attribute === ":_tx/command-id")!.value_string!;
      const input = inputs.get(id)!;
      const ack = byId.get(id)!;
      assert(input && ack && !observed.has(id));
      observed.add(id);
      assert.equal(tx, input.claims[0]!.txId);
      const expected = input.rows.filter((r) => r.entity_type === "_Transaction");
      assert.deepEqual(
        decoded.map((r) => [r.id, r.attribute]).sort(),
        expected.map((r) => [r.id, r.attribute]).sort(),
      );
      const changes = (rows: typeof decoded, assigned: boolean) =>
        rows
          .filter((r) => r.attribute === ":_tx/change")
          .map((r) => {
            const x = JSON.parse(r.value_json!);
            if (assigned && x.op === "assert") x.recordedAt = decoded[0]!.recorded_at;
            return x;
          })
          .sort((a, b) => String(a.tripleId).localeCompare(String(b.tripleId)));
      assert.deepEqual(changes(decoded, false), changes(expected, true));
      if (ack.result) {
        assert.equal(p, Number(ack.result.position.v));
        assert(
          decoded.every(
            (r) => r.recorded_at === ack.result!.recordedAt.v && r.recorded_position === p,
          ),
        );
      } else {
        const receipt = await c.operation(db, id);
        assert(receipt.status === "committed" && receipt.operationId === id);
        assert.equal(Number(receipt.position?.v), p);
        assert.equal(receipt.recordedAt?.v, decoded[0]!.recorded_at);
        ack.recovered = receipt as Receipt;
      }
    }
  }
  assert(records.every((r) => !r.result || observed.has(r.id)));
  assert.equal(position, head.position);
  const acked = records.filter((r) => r.result);
  const inWindow = acked.filter((r) => r.end <= seconds * 1000).length;
  const outcomes = Object.fromEntries(
    [...new Set(records.map((r) => r.outcome))].map((k) => [
      k,
      records.filter((r) => r.outcome === k).length,
    ]),
  );
  return {
    tapeSha256: sha(tape),
    startNs: startNs.toString(),
    positionBefore: basis.position,
    offers: tape.length,
    inWindow,
    inWindowPerSecond: inWindow / seconds,
    afterDrain: observed.size,
    recovered: observed.size - acked.length,
    outcomes,
    drained,
    p99CompletedMs: percentile(
      acked.map((r) => r.end - r.due),
      0.99,
    ),
    beyond50msOrMissing: records.filter((r) => !r.result || r.end - r.due > 50).length,
    pendingPeakAllowed: 96,
    records,
  };
}

const [first, second, secondsArg, attemptId, selectedArm] = process.argv.slice(2);
assert(first && second && secondsArg);
const seconds = Number(secondsArg);
assert(Number.isSafeInteger(seconds) && seconds > 0 && seconds <= 60 && seconds % 10 === 0);
const attempt = attemptId || randomUUID();
assert(selectedArm === undefined || /^[0-3]$/.test(selectedArm));
for (const [arm, url] of [first, second, second, first].entries()) {
  if (selectedArm !== undefined && Number(selectedArm) !== arm) continue;
  const c = new DatomicClient(url!, 35000);
  const scope = JSON.stringify(["triplex-scope-v1", "test", "prep1-live", `${attempt}-${arm}`, 0]);
  try {
    const { db, created } = await c.create(scope, "lean", true, 35000);
    assert(created);
    const seeded = await seed(c, db, roots);
    for (const [block, rate] of [50, 235, 394].entries()) {
      const result = await phase(c, db, seeded, schedule(rate, seconds, block), seconds);
      console.log("PREP1_LIVE " + JSON.stringify({ attempt, db, arm, rate, seconds, ...result }));
    }
    await c.delete(scope);
  } finally {
    c.close();
  }
}
