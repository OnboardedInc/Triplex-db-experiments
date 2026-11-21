import assert from "node:assert/strict";
import { DatomicClient, DatomicHttpError } from "../../../../packages/datomic/dist/index.js";
import { setTimeout as sleep } from "node:timers/promises";
import type { Evidence } from "../ha1/common.ts";
import { importFrame } from "../load1/fair-campaign.ts";
import { creditModeSelection } from "../prep1/rolling-credits.ts";
import { now } from "../scale1/decision/observer.ts";
import { field, task, type Write } from "../scale1/decision/plan.ts";
import { play, type Sender } from "../scale1/decision/writes.ts";
import { pinnedFields } from "../v01/pinned-fields.ts";
import { command } from "../w1/group/workload.ts";
import { replay, type Receipt } from "./replay.ts";

export async function protectedReads(e: Evidence, writeUrl: string, readUrl: string) {
  const writer = new DatomicClient(writeUrl, 35_000);
  const reader = new DatomicClient(readUrl, 35_000);
  const bulk = new DatomicClient(writeUrl, 35_000);
  try {
    const scope = JSON.stringify([
      "triplex-scope-v1",
      "test",
      "test",
      "dx-chk1-read-" + e.nonce,
      0,
    ]);
    const { db, created } = await writer.create(scope, "lean", true);
    assert(created);
    const attribute = field(0);
    await writer.declareProtection(db, [attribute], true);
    const people = Array.from({ length: 8 }, (_, i) => task(i, 0));
    const seed = command(
      "read-seed-" + e.nonce,
      people.map((id, i) => ({
        e: id,
        a: attribute,
        v: { type: "string" as const, value: "original-" + i },
      })),
    );
    const initial = await writer.transactCommand(db, seed);
    const basis = { recordedPosition: initial.position, validAt: 1 };
    const receipts: Receipt[] = [];
    const sizes: number[] = [];
    const available = async <T>(fn: () => Promise<T>) => {
      const end = now() + 5000;
      for (;;)
        try {
          return await fn();
        } catch (error) {
          if (
            !(error instanceof DatomicHttpError) ||
            error.code !== "ErasureFrontierUnavailable" ||
            now() >= end
          )
            throw error;
          await sleep(5);
        }
    };
    const batch = pinnedFields(reader, db, attribute, basis, 8, (send, size) => {
      sizes.push(size);
      return available(send);
    });
    const exact = async (removed?: Awaited<ReturnType<DatomicClient["erase"]>>) => {
      const pinned = await Promise.all(people.map(batch));
      for (const [i, set] of pinned.entries()) {
        assert.equal(set.length, 1);
        const [row] = set;
        assert.deepEqual([row!.id, row!.recorded_position], [seed.rows[i]!.id, initial.position]);
        if (i === 7 && removed) {
          assert.equal(row!.value_string, null);
          assert.deepEqual(JSON.parse(row!.value_json!), {
            type: "erased",
            valueType: "string",
            erasedAt: removed.erasedAt,
            erasureTxId: removed.txId,
          });
        } else assert.deepEqual([row!.value_type, row!.value_string], ["string", "original-" + i]);
      }
      return pinned.map(([r]) => r!);
    };
    const original = await exact();
    const senders: Sender[] = people.slice(0, 7).map((id, account) => ({
      client: writer,
      rows: new Map([[id, [original[account]!]]]),
      scope: {
        name: scope,
        db,
        cut: initial.position,
        seedCut: initial.position,
        accounts: [account],
      },
    }));
    let erase: Promise<Awaited<ReturnType<DatomicClient["erase"]>>> | undefined;
    const submit = writer.transact.bind(writer);
    const started: string[] = [];
    const changes = new Map<string, number>();
    writer.transact = async (...args) => {
      const request = submit(...args);
      const input = args[1];
      started.push(input.operationId);
      if (!erase) {
        erase = bulk.erase(db, "live-removal-" + e.nonce, [{ id: seed.rows[7]!.id }]);
        void erase.catch(() => {});
      }
      const ack = await request;
      const cut = Number(ack.position.v);
      const { id, value_string, entity_id } = input.rows[0]!;
      const actual = await available(() =>
        reader.rows(db, {
          entityIds: [entity_id],
          pattern: { attribute },
          basis: { recordedPosition: cut, validAt: 1 },
        }),
      );
      assert.deepEqual(
        actual.map((r) => [r.id, r.value_string, r.recorded_position]),
        [[id, value_string, cut]],
      );
      assert(cut > (changes.get(entity_id) ?? initial.position));
      changes.set(entity_id, cut);
      await exact(await erase);
      return ack;
    };
    const tape: Write[] = Array.from({ length: 21 }, (_, ordinal) => ({
      ordinal,
      account: ordinal % 7,
      subject: 0,
      ms: 100 * Math.floor(ordinal / 7),
      width: 1,
      version: "read-" + ordinal,
    }));
    const start = now() + 100;
    let sent = 0;
    const frames: { index: number; position: number }[] = [];
    const result = await play(
      senders,
      tape,
      start,
      e.nonce,
      true,
      true,
      creditModeSelection("rolling6"),
      undefined,
      true,
      undefined,
      {
        limit: 2,
        end: start + 3000,
        ready: () => sent < 4,
        async send() {
          const index = sent++;
          const frame = importFrame(e.nonce, 8, index);
          const saved = await bulk.transactCommand(db, frame.input);
          assert.equal(saved.txId, frame.input.claims[0]!.txId);
          receipts.push({
            id: saved.operationId,
            p: saved.position,
            t: saved.t,
            clock: saved.recordedAt,
            tx: saved.txId,
          });
          const observed = await available(() =>
            reader.rows(db, {
              entityIds: [frame.entity],
              basis: { recordedPosition: saved.position, validAt: 1 },
            }),
          );
          assert.deepEqual(
            observed.map((r) => [r.attribute, r.value_type, r.value_ref ?? r.value_string]).sort(),
            frame.facts.map((f) => [f.a, f.v.type, f.v.value]).sort(),
          );
          frames.push({ index, position: saved.position });
        },
      },
    );
    assert(erase && started.length >= tape.length);
    const removed = await erase;
    assert.equal(removed.identities[0]!.assertionId, seed.rows[7]!.id);
    assert.equal(result.rows.length, tape.length);
    for (const r of result.rows) {
      assert(
        r.status === "acked" &&
          r.receipt &&
          r.stage?.subjectOrderedIds &&
          !r.stage.subjectAppendRetirement,
        JSON.stringify(r),
      );
      receipts.push({ ...r.receipt, id: r.id });
    }
    assert.deepEqual(frames.map((f) => f.index).sort(), [0, 1, 2, 3]);
    assert(
      frames
        .toSorted((a, b) => a.index - b.index)
        .every((f, i, all) => i === 0 || f.position > all[i - 1]!.position),
    );
    const terminal = Number((await writer.basis(db)).position.v);
    assert.equal(terminal, initial.position + receipts.length + 1);
    const replayed = await replay(readUrl, db, terminal, receipts);
    assert(
      replayed.some(
        (entry) =>
          entry.t === removed.t &&
          entry.transaction.changes.some(
            (c) => c.op === "erase" && c.assertionId === seed.rows[7]!.id,
          ),
      ),
    );
    assert(sizes.every((n) => n === 8) && sizes.length === tape.length + 1);
    const resultRow = {
      readScopes: 1,
      db,
      oldBasis: basis.recordedPosition,
      terminal,
      saves: result.rows.length,
      imports: frames,
      erased: removed,
      receipts,
      batches: sizes.length,
      logicalReads: sizes.reduce((a, b) => a + b, 0),
      replayed: replayed.length,
    };
    e.write("read-combined", { source: e.source, attempt: e.nonce, slot: e.slot, ...resultRow });
    return resultRow;
  } finally {
    for (const c of [writer, reader, bulk]) c.close();
  }
}
