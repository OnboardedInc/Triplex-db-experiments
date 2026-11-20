import assert from "node:assert/strict";
import { DatomicClient } from "../../../../../packages/datomic/dist/index.js";
import { openComposition } from "../../../../bench/lib/composition.ts";
import { seedOps } from "../../../../bench/lib/commands.ts";
import { SEED_VALID_FROM, type Fact } from "../../../../bench/lib/world.ts";
import { ack } from "../../load1/oracle.ts";
import { decodeFeed, now } from "./observer.ts";
import { field, person, root, task, type Write } from "./plan.ts";
import { expectedSave, type Save } from "./writes.ts";
import type { Destination } from "./seed.ts";

// [DX-SCALE1] Why: a fresh native witness exercises the exact three widths, retired row identities and grouped journal format before trusting timed cells. Rejected: spending a large restore on an untested observation codec.
export async function nativeProbe(id: Destination, writeUrl: string, readUrl: string) {
  const scope = "dx-scale-decision-probe-" + id.nonce;
  const comp = await openComposition("reach", "datomic", scope);
  const w = new DatomicClient(writeUrl, 30000),
    r = new DatomicClient(readUrl, 30000);
  try {
    const facts: Fact[] = [];
    for (const account of [0, 1])
      for (let personIndex = 0; personIndex < 3; personIndex++)
        facts.push(...person(account, personIndex));
    const operations = seedOps(facts);
    assert.equal(await comp.currentPosition(), 0);
    const init = await comp.transact(operations, {
      commandId: id.nonce + "/probe-seed",
      actor: "bulk-import",
    });
    assert(init.ok);
    const observed = ack({ first: 0, end: 6, operations }, init.value);
    assert.equal(observed.position, 1);
    const key = JSON.stringify(["triplex-scope-v1", "test", "test", scope, 0]);
    const opened = await w.create(key, "lean", true, 35000);
    assert(!opened.created && opened.strictRecordClocks);
    const { db } = opened;
    const oracle = await r.rows(db, {
      entityIds: [root(0, 0), root(1, 0)],
      pattern: { attribute: ":subject/account" },
      basis: { recordedPosition: observed.position, validAt: SEED_VALID_FROM },
    });
    assert.deepEqual(oracle.map((row) => row.value_string).sort(), ["account-001", "account-002"]);
    const testCases = [];
    for (const a of [0, 1])
      for (const n of [0, 1, 2]) {
        const owner = task(a, n);
        const before = await r.rows(db, {
          entityIds: [owner],
          basis: { recordedPosition: 1, validAt: SEED_VALID_FROM },
        });
        const prior = [field(0), field(1), field(2)].map(
          (attr) => before.find((row) => row.attribute === attr)!,
        );
        assert(prior.every(Boolean));
        const e: Write = {
          account: a,
          ordinal: n,
          subject: n,
          ms: 0,
          width: n + 1,
          version: "probe/" + a + "/" + n,
        };
        const o: Save = {
          id: id.nonce + "/" + e.version,
          account: a,
          subject: n,
          ordinal: n,
          width: n + 1,
          db,
          due: now(),
          enqueued: now(),
          status: "offered",
        };
        testCases.push({ o, body: expectedSave(o, e, prior) });
      }
    const responses = await Promise.all(
      testCases.map(async ({ o, body }) => {
        const a = (await w.transact(db, body.input)) as {
          operationId: string;
          position: { v: string };
          t: { v: string };
          recordedAt: { v: number };
        };
        assert.equal(a.operationId, o.id);
        assert(Number(a.position.v) > 1 && Number(a.t.v) > 0);
        return { a, tx: body.input.claims[0]!.txId, digest: body.digest };
      }),
    );
    const feed = await r.request<{ transactions: [string, number, string[]][] }>(
      "POST",
      `/v2/db/${db}/transactions`,
      { after: 1, limit: 10 },
    );
    assert.equal(feed.transactions.length, 6);
    const expected = responses.sort((a, b) => Number(a.a.position.v) - Number(b.a.position.v));
    for (const [i, row] of feed.transactions.entries()) {
      const got = decodeFeed(db, row, now()),
        s = expected[i]!;
      assert.deepEqual(
        [got.id, got.position, got.tx, got.clock, got.digest],
        [s.a.operationId, Number(s.a.position.v), s.tx, s.a.recordedAt.v, s.digest],
      );
      assert.equal(got.position, i + 2);
    }
    return {
      ...id,
      at: Date.now(),
      scope,
      seedFacts: facts.length,
      saves: expected.length,
      nativeTransactions: new Set(expected.map((x) => x.a.t.v)).size,
      pinnedAccounts: oracle.length,
    };
  } finally {
    r.close();
    w.close();
    await comp.close();
  }
}
