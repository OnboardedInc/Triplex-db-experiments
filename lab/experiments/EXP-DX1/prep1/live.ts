import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { setTimeout as wait } from "node:timers/promises";
import { DatomicClient, DatomicHttpError } from "../../../../packages/datomic/dist/index.js";
import { decodeRowText } from "../../../../packages/datomic/dist/rowText.js";
import type { Fact } from "../../../bench/lib/world.ts";
import { command } from "../w1/group/workload.ts";
import type { WriterObservation } from "../w1/write-options.ts";

type Input = ReturnType<typeof command>;
type Receipt = {
  operationId: string;
  position: { v: string };
  recordedAt: { v: number };
  t: { v: string };
  groupSize?: number;
  writerFunction?: string;
  writePath?: { function: string };
  subjectSave?: string;
  subjectReplan?: boolean;
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
const subjectComparison = process.env.DX_PREP1_SUBJECT_COMPARE === "1";
const quietSavesPerSecond = 3.5;

function jitterFrom(seed: number) {
  let random = seed;
  return () => {
    random = Math.imul(random, 1664525) + 1013904223;
    return (random >>> 0) / 2 ** 32;
  };
}

function schedule(rate: number, seconds: number, block: number, quietOnly = false): Save[] {
  const total = seconds * rate;
  const quiet = Math.round(quietSavesPerSecond * seconds);
  const legacyJitter = jitterFrom(207);
  return roots
    .slice(0, 10)
    .flatMap((_, account) => {
      const jitter = subjectComparison ? jitterFrom(207 + account) : legacyJitter;
      if (quietOnly && account !== 0) return [];
      const count = subjectComparison
        ? account === 0
          ? quiet
          : Math.floor((total - quiet) / 9) + Number(account <= (total - quiet) % 9)
        : Math.floor(total / 10) + Number(account < total % 10);
      return Array.from({ length: count }, (_, serial) => ({
        id: `${quietOnly ? "quiet" : "live"}-${block}-${account}-${serial}`,
        subject: roots[((serial * 67) % 120) * 10 + account]!,
        at: ((serial + jitter()) * seconds * 1000) / count,
        account,
        serial,
        width: 1 + ((account + serial) % 3),
      }));
    })
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
  frozen: Set<string>,
  tape: Save[],
  seconds: number,
) {
  const basis = await c.begin(db);
  await c.release(db, basis.handle);
  const committed = new Map(bySubject);
  const pending = new Set<Promise<void>>();
  const runningSubjects = new Set<string>();
  const waiting: Save[] = [];
  const accountQueues = Array.from({ length: 10 }, () => [] as Save[]);
  let nextAccount = 0;
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
  const remember = (rows: Map<string, Input["rows"]>, input: Input, receipt: Receipt) => {
    const subject = input.entities![0]!;
    const width = input.rows.findIndex((r) => r.entity_type === "_Transaction");
    assert(width > 0);
    rows.set(subject, [
      ...input.rows.slice(0, width).map((r) => ({
        ...r,
        recorded_at: receipt.recordedAt.v,
        recorded_position: Number(receipt.position.v),
      })),
      ...rows.get(subject)!.slice(width),
    ]);
  };
  const startNs = process.hrtime.bigint();
  const elapsed = () => Number(process.hrtime.bigint() - startNs) / 1e6;
  const takeReady = (queue: Save[]) => {
    const i = queue.findIndex((s) => !runningSubjects.has(s.subject) && !frozen.has(s.subject));
    return i === -1 ? undefined : queue.splice(i, 1)[0];
  };
  const take = () => {
    if (!subjectComparison) return takeReady(waiting);
    // [DX-PREP1] Why: one dispatch budget rotates across ready accounts under the same offered tape.
    // Rejected: letting a burst from one account occupy every newly freed sender.
    for (let i = 0; i < accountQueues.length; i++) {
      const account = (nextAccount + i) % accountQueues.length;
      const save = takeReady(accountQueues[account]!);
      if (save) {
        nextAccount = (account + 1) % accountQueues.length;
        return save;
      }
    }
    return undefined;
  };
  const pump = () => {
    // [DX-PREP1] Why: fixed sender capacity makes the same offered load observable under overload.
    // Rejected: shifting scheduled offers to the time a socket or same-subject predecessor becomes ready.
    while (pending.size < 96) {
      const s = take();
      if (!s) break;
      const old = bySubject.get(s.subject)!;
      const input = command(s.id, fields(s.subject, s.width, s.id), old.slice(0, s.width));
      if (subjectComparison)
        input.sourceK = Math.max(basis.position, ...old.map((r) => r.recorded_position));
      inputs.set(s.id, input);
      runningSubjects.add(s.subject);
      const sent = elapsed();
      const work = (async () => {
        try {
          const result = (await c.transact(db, input)) as Receipt;
          const end = elapsed();
          assert.equal(result.operationId, s.id);
          assert.match(
            result.writePath?.function ?? result.writerFunction ?? "",
            /^:triplex\.(?:write|subject)\/v-[0-9a-f]{24}$/,
          );
          remember(bySubject, input, result);
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
          if (outcome === "OutcomeUnknown" || outcome === "transport") frozen.add(s.subject);
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
    (subjectComparison ? accountQueues[save.account]! : waiting).push(save);
    pump();
  }
  while (pending.size) await Promise.all([...pending]);
  // [DX-PREP1] Why: until a lost acknowledgement resolves, a later save cannot safely name that subject's predecessor.
  // Rejected: sending another edit against the last acknowledged row and counting the resulting CAS failure as load.
  for (const s of subjectComparison ? accountQueues.flat() : waiting) {
    assert(frozen.has(s.subject));
    const end = elapsed();
    records.push({
      id: s.id,
      account: s.account,
      due: s.at,
      sent: end,
      end,
      outcome: "PredecessorUnknown",
    });
  }
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
            if (assigned) {
              if (x.op === "assert") x.recordedAt = decoded[0]!.recorded_at;
              if (subjectComparison && x.op === "retract") x.retractedAt = decoded[0]!.recorded_at;
            }
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
        frozen.delete(input.entities![0]!);
      }
      remember(committed, input, (ack.result ?? ack.recovered)!);
    }
  }
  assert(records.every((r) => !r.result || observed.has(r.id)));
  assert.equal(position, head.position);
  for (const [subject, rows] of committed) bySubject.set(subject, rows);
  const acked = records.filter((r) => r.result);
  const inWindow = acked.filter((r) => r.end <= seconds * 1000).length;
  const perAccount = Array.from({ length: 10 }, (_, account) => {
    const offered = records.filter((r) => r.account === account);
    const received = offered.filter((r) => r.result);
    return {
      account,
      offered: offered.length,
      received: received.length,
      p99CompletedMs: percentile(
        received.map((r) => r.end - r.due),
        0.99,
      ),
      beyond50msOrMissing: offered.filter((r) => !r.result || r.end - r.due > 50).length,
    };
  });
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
    subjectSaves: acked.filter((r) => r.result?.subjectSave).length,
    subjectReplans: acked.filter((r) => r.result?.subjectReplan).length,
    perAccount,
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
assert(Number.isSafeInteger(seconds) && seconds > 0 && seconds <= (subjectComparison ? 1800 : 60));
const attempt = attemptId || randomUUID();
assert(selectedArm === undefined || /^[0-3]$/.test(selectedArm));

async function checkWriter(c: DatomicClient, db: string, arm: number) {
  const expectedSource = process.env.DX_PREP1_SOURCE_SHA256;
  const expectedBoot = process.env.DX_PREP1_OPTIONS_ATTEMPT;
  assert.match(expectedSource ?? "", /^[a-f0-9]{64}$/);
  assert(expectedBoot);
  const options = await c.request<
    WriterObservation & {
      preparedWriter: null | { mode: string; guard: string; installed: boolean };
      subjectSave?: boolean;
      subjectFunction?: string;
      subjectFunctionTx?: string;
    }
  >("GET", `/v1/db/${db}/write-options`);
  assert.equal(options.database, db);
  assert.equal(options.gatewaySourceHash, expectedSource);
  assert.equal(options.attempt, expectedBoot);
  assert.equal(options.rowsVersion, 3);
  assert.equal(options.position, 0);
  assert.equal(options.strictRecordClocks, true);
  assert.equal(options.commitFunctionInstalled, true);
  assert.match(options.commitFunction, /^:triplex\.write\/v-[a-f0-9]{24}$/);
  if (subjectComparison) {
    const on = arm === 1 || arm === 2;
    assert.equal(!!options.subjectSave, on);
    if (on) {
      assert.match(options.subjectFunction ?? "", /^:triplex\.subject\/v-[a-f0-9]{24}$/);
      assert.match(options.subjectFunctionTx ?? "", /^[1-9][0-9]*$/);
    }
    assert.equal(options.options.groupCommit, !on);
    assert.equal(options.options.livePriority, !on);
    assert.equal(options.options.fieldCoalesce, false);
    assert.equal(options.options.budgetMicros, null);
    assert.equal(options.options.smallRows, false);
    assert.equal(options.options.packedJournal, false);
    assert.equal(options.options.ledger, false);
    console.log("PREP1_WRITER " + JSON.stringify({ arm, attempt, observed: options }));
    return;
  }
  assert.deepEqual(
    options.preparedWriter,
    arm === 1 || arm === 2
      ? { mode: "basis", guard: ":triplex.group/apply-v1", installed: true }
      : null,
  );
  assert.deepEqual(options.options, {
    predecessorLookup: true,
    groupCommit: true,
    livePriority: true,
    fieldCoalesce: false,
    queueClock: true,
    stageClock: true,
    smallRows: false,
    reusePrepared: true,
    maxMembers: 8,
    budgetMicros: null,
    bulkRows: 2048,
    bulkBytes: 1048576,
    ledger: false,
    packedJournal: false,
    fastReply: true,
  });
  console.log("PREP1_WRITER " + JSON.stringify({ arm, attempt, observed: options }));
}

for (const [arm, url] of [first, second, second, first].entries()) {
  if (selectedArm !== undefined && Number(selectedArm) !== arm) continue;
  const c = new DatomicClient(url!, 35000);
  const scope = JSON.stringify(["triplex-scope-v1", "test", "prep1-live", `${attempt}-${arm}`, 0]);
  try {
    const { db, created } = await c.create(scope, "lean", true, 35000);
    assert(created);
    // [DX-PREP1] Why: both server arms must price the same fixed source on fresh opened scopes.
    // Rejected: assuming the supplied URLs, environment or requested flag prove the installed writer.
    if (selectedArm === undefined) await checkWriter(c, db, arm);
    const rates = subjectComparison ? [50, 235, 394, 620] : [50, 235, 394];
    const tapes = rates.map((rate, block) => schedule(rate, seconds, block));
    const seeded = await seed(c, db, [...new Set(tapes.flat().map((x) => x.subject))].sort());
    const frozen = new Set<string>();
    for (const [block, rate] of rates.entries()) {
      const alone = subjectComparison ? schedule(rate, seconds, block, true) : null;
      if (alone)
        assert.deepEqual(
          alone.map(({ at, subject, width }) => [at, subject, width]),
          tapes[block]!.filter((s) => s.account === 0).map(({ at, subject, width }) => [
            at,
            subject,
            width,
          ]),
        );
      const windows = alone ? (arm % 2 ? [true, false] : [false, true]) : [false];
      for (const quietOnly of windows) {
        const result = await phase(
          c,
          db,
          seeded,
          frozen,
          quietOnly ? alone! : tapes[block]!,
          seconds,
        );
        console.log(
          "PREP1_LIVE " + JSON.stringify({ attempt, db, arm, rate, seconds, quietOnly, ...result }),
        );
      }
    }
    await c.delete(scope);
  } finally {
    c.close();
  }
}
