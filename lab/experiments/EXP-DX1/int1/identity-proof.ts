import assert from "node:assert/strict";
import { DatomicClient, DatomicHttpError } from "../../../../packages/datomic/dist/index.js";
import { openComposition } from "../../../bench/lib/composition.ts";
import { runtimeApi } from "../../../bench/lib/triplex.ts";

export async function proveEvictedIdentities(attempt: string) {
  const scope = "int1-identity-" + attempt,
    scopeKey = runtimeApi.DatabaseScope.test(scope);
  const handle = await openComposition("reach", "datomic", scope);
  const writer = new DatomicClient(process.env.DATOMIC_URL!, 35000);
  const reader = new DatomicClient(process.env.DATOMIC_READ_URLS!.split(",")[0]!, 35000);
  const clients = [writer, reader];
  const fact = (entityId: string) => ({
    op: "assert",
    entityId,
    attribute: ":identity/name",
    value: { type: "string", value: entityId },
    validFrom: 0,
  });
  const stats = async () =>
    Promise.all(clients.map((c) => c.request<any>("GET", "/v2/admin/scan-stats")));
  try {
    assert.equal(await handle.currentPosition(), 0);
    const opened = await writer.create(scopeKey, "lean"),
      db = opened.db;
    assert.equal((await reader.create(scopeKey, "lean")).db, db);
    const name = "person-original";
    const saved = await handle.transact([fact(name)], {
      commandId: attempt + "-original",
      actor: "seed",
    });
    assert(saved.ok && saved.value.position === 1 && saved.value.triples.length === 1);
    const id = saved.value.triples[0]!.id;
    const basis = (recordedPosition: number) => ({ recordedPosition, validAt: 1000 });
    const original = await writer.reachEntities(db, [name], basis(1), true);
    const row = original?.entities.get(name)?.storedRows[0];
    assert(row && row.id === id && row.value_string === name);
    const first = await reader.readDemandWorld(scopeKey, name, basis(1));
    assert(first && first.triples.length === 1 && first.triples[0]!.id === id);
    const conflict = async (position: number) => {
      const command = attempt + "-reuse-" + position;
      await assert.rejects(
        writer.transact(db, {
          sourceK: position,
          scopeWide: true,
          span: 1,
          position: position + 1,
          operationId: command,
          attemptId: command,
          newIds: [id],
          claims: [],
          rows: [
            { ...row, recorded_position: position + 1, recorded_at: Date.now() + 10000,
              tx_id: "_tx/" + String(position + 1).padStart(26, "0") },
          ],
        }),
        (error: unknown) =>
          error instanceof DatomicHttpError &&
          error.status === 400 &&
          error.code === "IdentityConflict",
      );
      assert.equal(await handle.currentPosition(), position);
    };
    await conflict(1);
    const retired = await handle.transact([{ op: "retract", id }], {
      commandId: attempt + "-retired",
      actor: "seed",
    });
    assert(retired.ok && retired.value.position === 2);
    const before = await stats();
    const bound = before[0].idMemo.limit;
    assert.equal(bound, 4096);
    assert.equal(before[1].idMemo.limit, bound);
    let head = 2;
    for (let from = 0; from <= bound; from += 64) {
      const names = Array.from(
        { length: Math.min(64, bound + 1 - from) },
        (_, j) => "other-" + (from + j),
      );
      const ack = await handle.transact(names.map(fact), {
        commandId: attempt + "-other-" + from,
        actor: "seed",
      });
      assert(ack.ok && ack.value.position === ++head && ack.value.triples.length === names.length);
      const ids = new Map(ack.value.triples.map((r) => [r.entityId, r.id]));
      for (const client of clients) {
        const found = await client.reachEntities(db, names, basis(head), true);
        assert(found && found.closures.length === names.length);
        for (const root of names) {
          const rows = found.entities.get(root)!.storedRows;
          assert(
            rows.length === 1 && rows[0]!.id === ids.get(root) && rows[0]!.value_string === root,
          );
        }
      }
    }
    const after = await stats();
    assert(after.every((s, i) => s.idMemo.evictions > before[i].idMemo.evictions));
    // [DX-THIN1] Why: both caches have actually evicted the original positive lookup. Rejected: testing a never-used ID or inferring the conflict from the configured limit.
    for (const client of clients) {
      const old = await client.readDemandWorld(scopeKey, name, basis(1));
      const current = await client.readDemandWorld(scopeKey, name, basis(head));
      assert.deepEqual(old?.triples, first.triples);
      assert.deepEqual(current?.triples, []);
    }
    await conflict(head);
    return {
      scope,
      db,
      assertion: id,
      seedTx: saved.value.txId,
      retirementTx: retired.value.txId,
      head,
      otherEntities: bound + 1,
      outcomes: ["IdentityConflict", "IdentityConflict"],
      evictions: after.map((s, i) => s.idMemo.evictions - before[i].idMemo.evictions),
    };
  } finally {
    writer.close();
    reader.close();
    await handle.close();
  }
}
