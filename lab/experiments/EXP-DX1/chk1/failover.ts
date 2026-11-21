import assert from "node:assert/strict";
import { DatomicClient, orderedSaveIdentity } from "../../../../packages/datomic/dist/index.js";
import { admission, creditModeSelection } from "../prep1/rolling-credits.ts";
import { field, task } from "../scale1/decision/plan.ts";
import type { SyncPair } from "../hasync1/pair.ts";
import { command } from "../w1/group/workload.ts";
import { replay, type Receipt } from "./replay.ts";

export async function failover(pair: SyncPair) {
  const { s } = pair;
  const opened = await pair.open({ lean: true });
  const db = opened.ac.db;
  const seed = new DatomicClient(pair.writer, 35_000);
  const owners = Array.from({ length: 6 }, (_, account) => task(account, 0));
  const attribute = field(0);
  const seedInput = command(
    "initial-" + s.e.nonce,
    owners.map((e) => ({ e, a: attribute, v: { type: "string" as const, value: "initial" } })),
  );
  const initial = await seed.transactCommand(db, seedInput);
  seed.close();
  const oldCopy = await pair.clone();
  await pair.service();
  const ingress = new DatomicClient(pair.route!.url, 35_000);
  const reader = new DatomicClient(pair.reader, 35_000);
  const read = (position: number, owner: string) =>
    reader.rows(db, {
      pattern: { attribute },
      entityIds: [owner],
      basis: { recordedPosition: position, validAt: 1 },
    });
  const known: Receipt[] = [
    {
      id: initial.operationId,
      p: initial.position,
      t: initial.t,
      clock: initial.recordedAt,
      tx: initial.txId,
    },
  ];
  const inputs = (label: string, rows: Awaited<ReturnType<typeof read>>[]) =>
    owners.map((owner, i) => {
      const prior = rows[i]![0];
      assert(prior && prior.entity_id === owner);
      const out = command(
        `combined-${s.e.nonce}-${label}-${i}`,
        [{ e: owner, a: attribute, v: { type: "string", value: label } }],
        [prior],
        true,
        false,
        orderedSaveIdentity(),
      );
      out.sourceK = prior.recorded_position;
      out.live = [prior.id];
      return out;
    });
  const turn = async (wave: ReturnType<typeof inputs>, position: number) => {
    const scheduler = admission(owners.length, creditModeSelection("rolling6"));
    const offers = wave.map((_, account) => ({ account, due: performance.now() }));
    const sent: Promise<Receipt>[] = [];
    scheduler.dispatch(
      () => offers,
      (entry, ticket) => {
        offers.splice(offers.indexOf(entry), 1);
        const input = wave[entry.account]!;
        const pending = ingress.transact(db, input).then(
          async (ack) => {
            assert.equal(ack.operationId, input.operationId);
            assert.equal(ack.subjectAppendRetirement, true);
            scheduler.resolved(true, ticket);
            const p = Number(ack.position.v);
            assert(p > position);
            const fresh = input.rows[0]!;
            const pinned = await read(p, fresh.entity_id);
            assert.deepEqual(
              pinned.map((row) => [row.id, row.value_string]),
              [[fresh.id, fresh.value_string]],
            );
            return {
              id: input.operationId,
              p,
              t: String(ack.t.v),
              clock: Number(ack.recordedAt.v),
              tx: input.claims[0]!.txId,
            };
          },
          (error: unknown) => {
            scheduler.resolved(false, ticket);
            throw error;
          },
        );
        sent.push(pending);
      },
    );
    assert.equal(offers.length, 0);
    return Promise.all(sent);
  };

  try {
    const initialRows = await Promise.all(owners.map((owner) => read(initial.position, owner)));
    const before = await turn(inputs("before", initialRows), initial.position);
    known.push(...before);
    const oldCut = initial.position + before.length;
    const beforeRows = await Promise.all(owners.map((owner) => read(oldCut, owner)));
    const held = inputs("held", beforeRows);
    let heldObserved = false;
    pair.beforeReplacement = async () => {
      assert.deepEqual(await Promise.all(owners.map((owner) => read(oldCut, owner))), beforeRows);
      const attempts = await Promise.allSettled(held.map((input) => ingress.transact(db, input)));
      assert(attempts.every((r) => r.status === "rejected" && r.reason.code === "WriterSealed"));
      for (const input of held)
        assert.equal((await reader.operation(db, input.operationId)).status, "absent");
      s.e.write("combined-held-offers", {
        nonce: s.e.nonce,
        source: s.e.source,
        slot: s.e.slot,
        database: db,
        codes: attempts.map(() => "WriterSealed"),
        operations: held.map((row) => row.operationId),
        oldCut,
      });
      heldObserved = true;
    };
    const killed = await Promise.all([s.kill("pg"), s.kill("active")]);
    await pair.supervisor().run("fault", "two-copy");
    assert(heldObserved && pair.replacement);
    const after = await turn(held, oldCut);
    known.push(...after);
    const flushed = await pair.verifyReplacement(pair.replacement);
    const terminal = oldCut + after.length;
    const commits = await replay(pair.reader, db, terminal, known);
    s.e.write("combined-failover-replay", {
      nonce: s.e.nonce,
      source: s.e.source,
      slot: s.e.slot,
      database: db,
      known,
      terminal,
      commits: commits.length,
      killed,
      transitions: pair.transitions,
    });
    return {
      before: before.length,
      resumed: after.length,
      oldCopy,
      flushed,
      replay: commits.length,
      terminal,
    };
  } finally {
    reader.close();
    ingress.close();
  }
}
