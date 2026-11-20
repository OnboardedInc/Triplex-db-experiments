import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";
import type { CompositionHandle, Receipt } from "../../../bench/lib/composition.ts";
import { SEED_VALID_FROM } from "../../../bench/lib/world.ts";
import { sha, type Frame, type SnapshotData } from "./source.ts";
import { ack, record } from "./oracle.ts";

export const microHz = 130;
export const microCycleMs = 8;
export const microDuration = 108000;
export const volumeDuration = 540000;

// [DX-LOAD3] Why: the three widths pack exactly two, three or four complete eight-fact subjects.
// Rejected: padding a frame to its budget or splitting a subject between receipts.
export function microFixture(groups: number, width: number): SnapshotData {
  const stride = width / 8;
  assert(Number.isSafeInteger(stride) && stride > 0 && groups % stride === 0);
  return {
    seal: sha(
      JSON.stringify([sha(readFileSync(new URL(import.meta.url))), groups, SEED_VALID_FROM]),
    ),
    groups,
    namespace: "acct/import/",
    validAt: SEED_VALID_FROM,
    *batches(first = 0) {
      assert(Number.isSafeInteger(first) && first >= 0 && first <= groups && first % stride === 0);
      for (let start = first; start < groups; start += stride) {
        const operations: Frame["operations"] = [];
        for (let i = start; i < start + stride; i++) {
          const root = "acct/import/p:" + i;
          const ref = root + "/answer";
          for (let j = 0; j < 8; j++) {
            const value: Frame["operations"][number]["value"] =
              j === 0 ? { type: "ref", value: ref } : { type: "string", value: i + "/" + j };
            operations.push({
              op: "assert",
              entityId: j < 5 ? root : ref,
              attribute: ":import/field-" + j,
              value,
              validFrom: SEED_VALID_FROM,
            });
          }
        }
        yield { first: start, end: start + stride, operations };
      }
    },
  };
}

// [DX-LOAD3] Why: permit one ready credit when the previous frame took longer than one period.
// Rejected: a backlog of catch-up frames which could outrank live saves or conceal the achieved rate.
export class FrameCredits {
  private due: number;
  private readonly period = 1000 / microHz;
  constructor(start: number) {
    this.due = start;
  }
  async grant(end: number) {
    while (performance.now() < this.due && performance.now() < end)
      await delay(Math.max(1, Math.min(end, this.due) - performance.now()));
    const at = performance.now();
    if (at >= end) return false;
    this.due = Math.max(this.due + this.period, at);
    return true;
  }
}
export function observedRows(rows: Awaited<ReturnType<CompositionHandle["sweepPage"]>>["rows"]) {
  return rows.map((r) => [
    r.entityId,
    r.attribute,
    r.value,
    r.validFrom,
    r.validTo ?? null,
    r.position,
  ]);
}

// [DX-LOAD3] Why: a near-end marker read proves the committed prefix was already queryable in the window.
// Rejected: calling an ACK queryable or counting a read that finished during drain.
export async function queryMarker(
  comp: CompositionHandle,
  frame: Frame,
  entry: { position: number; ids: string },
) {
  const basis = { position: entry.position, validAt: SEED_VALID_FROM };
  const entities = [...new Set(frame.operations.map((o) => o.entityId))];
  const result = await comp.sweepPage(entities, basis);
  assert.deepEqual(result.reportedBasis, basis);
  const sortRows = (rows: any[][]) =>
    rows.toSorted((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  const rows = result.rows.filter((r) => entities.includes(r.entityId));
  assert.deepEqual(
    sortRows(observedRows(rows)),
    sortRows(
      frame.operations.map((o) => [
        o.entityId,
        o.attribute,
        o.value,
        o.validFrom,
        null,
        entry.position,
      ]),
    ),
  );
  const ids = new Map(rows.map((r) => [JSON.stringify([r.entityId, r.attribute]), r.id]));
  const digest = sha(
    JSON.stringify(frame.operations.map((o) => ids.get(JSON.stringify([o.entityId, o.attribute])))),
  );
  assert.equal(digest, entry.ids);
  return { first: frame.first, end: frame.end, position: entry.position, digest };
}

export const temporalPrefix = "load1/micro-temporal/";
export async function temporalExercise(
  comp: CompositionHandle,
  markLost: (command: string) => void,
) {
  const e = "acct/import-proof/temporal";
  const attributes = [":import/birth", ":import/backdated"];
  const origin = SEED_VALID_FROM;
  const a = (i: number, validFrom: number) => ({
    op: "assert",
    entityId: e,
    attribute: attributes[i],
    value: { type: "string", value: String(i) },
    validFrom,
  });
  const commits = new Map<string, { receipt: Receipt; operations: any[]; correlationId: string }>();
  async function commit(part: string, operations: any[], lose = false) {
    const commandId = temporalPrefix + part,
      correlationId = sha(JSON.stringify(operations));
    const meta = { actor: "bulk-import", commandId, correlationId };
    if (lose) markLost(commandId);
    const result = await comp.transact(operations, meta);
    let receipt: Receipt;
    if (lose) {
      // [DX-LOAD3] Why: recover the original application command after its first HTTP reply was discarded.
      // Rejected: treating a duplicate error as a fresh write or requiring the transport to replay a lost reply.
      const found = await comp.transactionByCommand(commandId);
      assert(found.ok && found.value);
      const frame = { first: 0, end: 1, operations };
      const expected = record(frame, meta, found.value);
      if (result.ok) assert.deepEqual(ack(frame, result.value), expected);
      const retry = await comp.transact(operations, meta);
      if (retry.ok) assert.deepEqual(ack(frame, retry.value), expected);
      else assert.equal(retry.tag, "CommandAlreadyCommittedError");
      const resolved = await comp.transactionByCommand(commandId);
      assert(resolved.ok && resolved.value);
      assert.deepEqual(record(frame, meta, resolved.value), expected);
      receipt = {
        ...expected,
        triples: found.value.changes.map((row: any) => ({
          id: row.tripleId,
          entityId: row.entityId,
          attribute: row.attribute,
          value: row.value,
          validFrom: row.validFrom,
        })),
      };
    } else {
      if (!result.ok) throw new Error("Temporal exercise " + result.tag, { cause: result.error });
      receipt = result.value;
    }
    commits.set(commandId, { receipt, operations, correlationId });
    return receipt;
  }
  const birth = await commit("birth", [a(0, origin)]);
  const back = await commit("backdate", [a(1, origin - 1000)], true);
  const retired = await commit("retire", [
    { op: "retract", id: birth.triples[0]!.id },
    { op: "retract", id: back.triples[0]!.id },
  ]);
  for (const [at, validAt, expected] of [
    [birth, origin - 1, []],
    [birth, origin, [attributes[0]]],
    [back, origin - 1, [attributes[1]]],
    [back, origin, attributes],
    [retired, origin, []],
  ] as const) {
    const pulled = await comp.pull(e, {
      recordedPosition: at.position,
      recordedAt: at.instant,
      validAt,
    });
    assert.deepEqual(
      pulled.triples
        .filter((r) => r.entityId === e)
        .map((r) => r.attribute)
        .sort(),
      [...expected].sort(),
    );
  }
  return commits;
}
