import assert, { AssertionError } from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { DatomicClient, orderedSaveIdentity } from "../../../../packages/datomic/dist/index.js";
import { fieldValue } from "../../../bench/lib/deep-world.ts";
import { SEED_VALID_FROM } from "../../../bench/lib/world.ts";
import { field, keyFor, root, task } from "../scale1/decision/plan.ts";
import { expectedSave, type Row } from "../scale1/decision/field-save.ts";
import { hash, type Evidence } from "../ha1/common.ts";
import { errorCode } from "../ha1/one-db.ts";
import type { ingress } from "./ingress.ts";

export const seedPosition = 87002;
export const writeRates = [50, 235] as const;
const readRate = 50;
const callerMs = 1000;
const wireMs = 5500;
const perAccount = 192;
const readSubjects = [0, 79, 99999] as const;
type Receipt = {
  operationId: string;
  position: { t: "long"; v: string };
  t: { t: "long"; v: string };
  recordedAt: { t: "double"; v: number };
};
type ClientState =
  | "acknowledged"
  | "pending-late"
  | "pending-unknown"
  | "refused"
  | "sender-expired"
  | "subject-busy"
  | "wrong";
export type Offer = {
  kind: "save" | "read";
  ordinal: number;
  due: number;
  start: number | null;
  end: number;
  state: ClientState;
  code?: string;
  receipt?: Receipt;
  epoch?: number;
};

export function readReceipt(value: unknown): Receipt {
  const { operationId, position, t, recordedAt } = value as Receipt;
  assert(typeof operationId === "string" && operationId);
  for (const n of [position, t]) assert(n?.t === "long" && /^[1-9][0-9]*$/.test(n.v));
  assert(
    Number.isSafeInteger(Number(position.v)) &&
      recordedAt?.t === "double" &&
      Number.isFinite(recordedAt.v),
  );
  return { operationId, position, t, recordedAt };
}

export async function readReceipts(
  reader: DatomicClient,
  db: string,
  expected: readonly Receipt[],
  observe?: (batch: { asked: readonly Receipt[]; reply: unknown }) => void,
) {
  const rows: { expected: Receipt; observed: Receipt | null }[] = [];
  assert.equal(new Set(expected.map((r) => r.operationId)).size, expected.length);
  assert.equal(new Set(expected.map((r) => r.position.v)).size, expected.length);
  for (let i = 0; i < expected.length; i += 256) {
    const request = expected.slice(i, i + 256);
    const reply = await reader.request<{ database: string; operations: { status: string }[] }>(
      "POST",
      "/ha1/" + db + "/operations",
      { ids: request.map((r) => r.operationId) },
      20000,
    );
    observe?.({ asked: request, reply });
    assert.equal(reply.database, db);
    assert.equal(reply.operations.length, request.length);
    for (const [i, item] of reply.operations.entries()) {
      assert(item.status === "committed" || item.status === "absent");
      const wanted = request[i]!;
      const observed = item.status === "committed" ? readReceipt(item) : null;
      if (observed) assert(isDeepStrictEqual(observed, wanted), "Stored receipt bytes changed");
      rows.push({ expected: wanted, observed });
    }
  }
  return rows;
}

export function partitionReceipts(rows: readonly Offer[], newEpoch: number) {
  const saved = rows.filter((r) => r.kind === "save" && r.receipt);
  assert(newEpoch === 1);
  assert(
    saved.every(
      (r) =>
        (r.epoch === 0 || r.epoch === newEpoch) &&
        r.start !== null &&
        r.end >= r.start &&
        r.start >= r.due,
    ),
  );
  return {
    before: saved.filter((r) => r.epoch === 0).map((r) => r.receipt!),
    after: saved.filter((r) => r.epoch === newEpoch).map((r) => r.receipt!),
  };
}

export function windows(
  rows: readonly Offer[],
  faultAt: number,
  routedAt: number,
  stopAt: number,
  newEpoch: number,
) {
  const writes = rows.filter((r) => r.kind === "save");
  const reads = rows.filter((r) => r.kind === "read");
  const newWrite = writes
    .filter((r) => r.epoch === newEpoch && r.receipt)
    .sort((a, b) => a.end - b.end)[0];
  assert(!newWrite || newWrite.end >= routedAt);
  const boundary = newWrite?.end ?? stopAt;
  const readOffered = reads.filter((r) => r.due >= faultAt && r.due < boundary);
  const answers = reads
    .filter((r) => r.state === "acknowledged" && r.end <= boundary)
    .map((r) => r.end)
    .sort((a, b) => a - b);
  const lastRead = answers.findLast((t) => t < faultAt);
  const firstRead = answers.find((t) => t >= faultAt);
  const brackets = [lastRead ?? faultAt, ...answers.filter((t) => t >= faultAt), boundary];
  const during = writes.filter((r) => r.due >= faultAt && r.due < boundary);
  const fate: Record<string, number> = {};
  for (const r of during) fate[r.state] = (fate[r.state] ?? 0) + 1;
  return {
    firstWriteMs: newWrite ? newWrite.end - faultAt : null,
    firstReceipt: newWrite?.receipt ?? null,
    firstReadMs: firstRead === undefined ? null : firstRead - faultAt,
    readGapMs: Math.max(0, ...brackets.slice(1).map((t, i) => t - brackets[i]!)),
    missedReads: readOffered.filter((r) => r.state !== "acknowledged").length,
    reads: readOffered.length,
    fate,
  };
}

async function prefill(reader: DatomicClient, db: string) {
  const fields = new Map<string, Row[]>();
  const basis = { recordedPosition: seedPosition, validAt: SEED_VALID_FROM };
  await Promise.all(
    Array.from({ length: 10 }, (_, account) =>
      (async () => {
        for (let i = 0; i < perAccount; i += 24) {
          const ids = Array.from({ length: 24 }, (_, j) => task(account, i + j));
          const got = await reader.rows(db, { entityIds: ids, basis });
          for (const [j, entity] of ids.entries()) {
            const own = got
              .filter(
                (r) =>
                  r.entity_id === entity && [field(0), field(1), field(2)].includes(r.attribute),
              )
              .sort((a, b) => a.attribute.localeCompare(b.attribute));
            assert.equal(own.length, 3);
            assert.deepEqual(
              own.map((r) => [r.attribute, r.value_string]),
              own.map((_, n) => [field(n), fieldValue(i + j, 0, n, 0).value]),
            );
            fields.set(entity, own);
          }
        }
      })(),
    ),
  );
  return fields;
}

export async function sundayTraffic(
  e: Evidence,
  route: Awaited<ReturnType<typeof ingress>>,
  reader: DatomicClient,
  scope: string,
  saveRate: (typeof writeRates)[number],
) {
  const db = "s2-" + Buffer.from(scope).toString("base64url");
  const writer = new DatomicClient(route.url, wireMs, undefined, { saveWire: true });
  try {
    const opened = await writer.create(scope, "lean", true, 120000);
    assert(opened.db === db && !opened.created && opened.strictRecordClocks === true);
    const before = await writer.basis(db);
    assert.equal(before.position.v, String(seedPosition));
    const [fields, readKeys] = await Promise.all([
      prefill(reader, db),
      Promise.all(
        Array.from({ length: 10 }, (_, account) =>
          Promise.all(
            readSubjects.map(async (subject) => {
              const identity = root(account, subject);
              const basis = { recordedPosition: seedPosition, validAt: SEED_VALID_FROM };
              const exact = async () => {
                const rows = await reader.rows(db, { entityIds: [identity], basis });
                const sample = rows
                  .filter(
                    (r) => r.attribute === ":subject/account" || r.attribute === ":subject/member",
                  )
                  .map((r) => [r.entity_id, r.attribute, r.value_type, r.value_string])
                  .sort((a, b) => String(a[1]).localeCompare(String(b[1])));
                const expected = [
                  [identity, ":subject/account", "string", keyFor(account)],
                  [identity, ":subject/member", "string", String(subject)],
                ];
                assert.deepEqual(sample, expected);
                return hash(JSON.stringify(sample));
              };
              return { account, subject, digest: await exact(), exact };
            }),
          ),
        ),
      ).then((all) => all.flat()),
    ]);
    const events = fs.openSync(path.join(e.dir, "sunday-offers.jsonl"), "wx");
    const log = (type: string, data: unknown) =>
      fs.writeSync(
        events,
        JSON.stringify({ nonce: e.nonce, slot: e.slot, database: db, type, data }) + "\n",
      );
    const start = performance.now() + 250;
    const plan = {
      start,
      saveRate,
      readRate,
      callerMs,
      wireMs,
      scope,
      source: e.source,
      before,
      pins: readKeys.map(({ exact: _, ...id }) => id),
    };
    log("plan", plan);
    const rows: Offer[] = [];
    const pending = new Set<Promise<void>>();
    const active = { read: 0, save: 0 };
    const next = { read: 0, save: 0 };
    const busy = new Set<string>();
    const uncertain = new Set<string>();
    const samples = new Map<string, Row[]>();
    let savedDisagreement = false;
    let timer: ReturnType<typeof setTimeout>;
    let stopAt: number | undefined;
    let stopped = false;
    function dispatch(kind: Offer["kind"], ordinal: number, due: number) {
      const account = ordinal % 10;
      const subject = Math.floor(ordinal / 10) % perAccount;
      const id = e.prefix + "-sunday-" + ordinal;
      const entity = task(account, subject);
      const pin = readKeys[ordinal % readKeys.length]!;
      const scheduled = { kind, ordinal, due };
      const save = (row: Offer) => {
        log("outcome", row);
        rows.push(row);
      };
      const now = performance.now();
      log("offer", {
        ...scheduled,
        ...(kind === "read"
          ? { account: pin.account, subject: pin.subject, pin: pin.digest }
          : { account, subject, operationId: id }),
      });
      if (now - due > callerMs || active[kind] >= (kind === "save" ? 384 : 96)) {
        save({ ...scheduled, start: null, end: now, state: "sender-expired" });
        return;
      }
      if (kind === "save" && (busy.has(entity) || uncertain.has(entity))) {
        save({ ...scheduled, start: null, end: now, state: "subject-busy" });
        return;
      }
      if (kind === "save") busy.add(entity);
      active[kind]++;
      const work = (async () => {
        const called = performance.now();
        let receipt: Receipt | undefined;
        let epoch: number | undefined;
        let failure: string | undefined;
        let state: ClientState;
        try {
          if (kind === "read") assert.equal(await pin.exact(), pin.digest);
          else {
            const width = 1 + (ordinal % 3);
            const prior = fields.get(entity)!;
            const run = { id, account, subject, orderedToken: orderedSaveIdentity().token };
            const { input } = expectedSave(run, { width, version: id }, prior);
            input.sourceK = Math.max(seedPosition, ...prior.map((row) => row.recorded_position));
            log("request", {
              id,
              digest: hash(JSON.stringify(input)),
              commandId: input.claims[0]!.commandId,
            });
            const response = (await writer.transact(db, input)) as {
              subjectSave?: string;
              subjectOrderedIds?: boolean;
            };
            receipt = readReceipt(response);
            epoch = route.receiptEpoch(receipt.operationId);
            assert(epoch !== undefined, "Missing proxy ACK epoch");
            assert(
              response.subjectSave && response.subjectOrderedIds === true,
              "Ordered writer not observed",
            );
            assert.equal(receipt.operationId, id);
            const next = input.rows.slice(0, width).map((r) => ({
              ...r,
              recorded_at: receipt!.recordedAt.v,
              recorded_position: Number(receipt!.position.v),
            }));
            for (let i = 0; i < width; i++) prior[i] = next[i]!;
            if (ordinal % 17 === 0) samples.set(id, next);
          }
          state = performance.now() - due > callerMs ? "pending-late" : "acknowledged";
        } catch (error) {
          failure = errorCode(error) ?? "unexpected";
          if (["WriterSealed", "WriteBudgetExceeded", "WriteQueueFull"].includes(failure)) {
            state = "refused";
          } else if (failure === "unexpected") {
            state = "wrong";
            if (!savedDisagreement) {
              savedDisagreement = true;
              log("first-wrong", {
                ...scheduled,
                id,
                message:
                  error instanceof AssertionError
                    ? "Pinned value or ACK mismatch"
                    : "Unexpected sender failure",
                ...(error instanceof AssertionError
                  ? { actual: error.actual, expected: error.expected }
                  : {}),
              });
            }
          } else {
            state = "pending-unknown";
            if (kind === "save") uncertain.add(entity);
          }
        }
        save({
          ...scheduled,
          start: called,
          end: performance.now(),
          state,
          ...(receipt ? { receipt } : {}),
          ...(epoch !== undefined ? { epoch } : {}),
          ...(failure ? { code: failure } : {}),
        });
      })().finally(() => {
        active[kind]--;
        if (kind === "save") busy.delete(entity);
        pending.delete(work);
      });
      pending.add(work);
    }
    function tick() {
      const until = stopAt ?? performance.now();
      for (const [kind, rate] of [
        ["save", saveRate],
        ["read", readRate],
      ] as const) {
        while (start + (next[kind] * 1000) / rate < until)
          dispatch(kind, next[kind], start + (next[kind]++ * 1000) / rate);
      }
      if (stopAt === undefined) timer = setTimeout(tick, 4);
    }
    tick();
    return {
      db,
      writer,
      rows,
      start,
      before,
      plan,
      samples,
      async stop() {
        if (stopped) return stopAt!;
        stopped = true;
        stopAt = performance.now();
        clearTimeout(timer);
        tick();
        try {
          await Promise.all(pending);
          log("stop", { stopAt });
        } finally {
          fs.closeSync(events);
          writer.close();
        }
        return stopAt;
      },
    };
  } catch (error) {
    writer.close();
    throw error;
  }
}
