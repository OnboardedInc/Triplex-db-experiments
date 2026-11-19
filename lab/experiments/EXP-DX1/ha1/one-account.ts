import assert from "node:assert/strict";
type TripleRow = Input["rows"][number];
import {
  errorCode,
  immutable,
  type Input,
  type Receipt,
} from "../../../../packages/datomic/test/ha1-account.ts";
import {
  AccountEndpoint,
  AccountMove,
  RoutedAccount,
  PlacementError,
  readReceipt,
  readAtOrigin,
  resumeOrigin,
  type Directory,
  type Place,
} from "./placement.ts";
import { clock, sleep, hash } from "./common.ts";
import { ackProxy } from "./ack-proxy.ts";
import { healthyBroker } from "./one-db.ts";
import type { Stack } from "./stack.ts";

function intent(
  account: string,
  label: string,
  stamp: number,
  width = 1,
  subject = account + "~person-" + label,
): Input {
  const op = account + "~" + label,
    tx = op + "/tx";
  const rows: TripleRow[] = Array.from({ length: width }, (_, k) => ({
    id: op + "/f-" + k,
    entity_id: subject,
    entity_type: "Subject",
    attribute: "ha/value-" + k,
    value_type: "string",
    value_string: op + "/v-" + k,
    value_number: null,
    value_boolean: null,
    value_datetime: null,
    value_json: null,
    recorded_at: stamp,
    recorded_position: 1,
    valid_from: 10,
    valid_to: null,
    created_by: null,
    retracted_at: null,
    retracted_position: null,
    retract_tx_id: null,
    schema_version: 1,
    tx_id: tx,
  }));
  return {
    operationId: op,
    attemptId: op + "/attempt",
    sourceK: null,
    scopeWide: false,
    assignRecordTime: false,
    position: 1,
    span: 1,
    rows,
    newIds: rows.map((r) => r.id),
    claims: [{ commandId: op + "/cmd", txId: tx, timestamp: stamp }],
  };
}
// [DX-HA1] Why: a coordinator may die on either side of activation. Rejected: publishing a new endpoint from process memory with no persistent compare-and-swap.
class TestDirectory implements Directory {
  constructor(
    readonly s: Stack,
    readonly from: Place,
    readonly to: Place,
  ) {}
  async init() {
    await this.s.sql(
      "target",
      "CREATE TABLE ha1_placement(account text primary key, db text not null, generation bigint not null)",
    );
    await this.s.sql("target", "INSERT INTO ha1_placement VALUES ('red','" + this.from.db + "',1)");
  }
  async current(account: string) {
    assert.equal(account, "red");
    const row = await this.s.sql(
      "target",
      "SELECT db,generation FROM ha1_placement WHERE account='red'",
    );
    const p = [this.from, this.to].find((p) => row === p.db + "|" + p.generation);
    assert(p);
    return p;
  }
  async publish(account: string, source: Place, target: Place) {
    assert.equal(account, "red");
    assert.deepEqual(source, this.from);
    assert.deepEqual(target, this.to);
    await this.s.sql(
      "target",
      "UPDATE ha1_placement SET db='" +
        target.db +
        "',generation=2 WHERE account='red' AND db='" +
        source.db +
        "' AND generation=1",
    );
    assert.deepEqual(await this.current(account), target);
  }
}
export async function oneAccount(s: Stack, people: number) {
  await s.tool();
  await Promise.all([s.postgres("pg", s.a), s.postgres("target", s.b)]);
  await Promise.all([s.database("pg", "moving"), s.database("target", "moving")]);
  await Promise.all([
    s.tx("active", s.a, "pg", "moving"),
    s.tx("standby", s.b, "target", "moving"),
  ]);
  await Promise.all([healthyBroker(s, "active"), healthyBroker(s, "standby")]);
  await Promise.all([
    s.gateway("write", s.a, "pg", "moving"),
    s.gateway("read", s.b, "target", "moving"),
  ]);
  const places = await Promise.all(
    (["write", "read"] as const).map(async (role, i) => ({
      endpoint: await s.ready(role),
      db: s.sharedDb(role),
      generation: i + 1,
    })),
  );
  const a = places[0]!,
    b = places[1]!,
    red = new AccountEndpoint("red", a, s.admin),
    copy = new AccountEndpoint("red", b, s.admin);
  const blue = new AccountEndpoint("blue", a, s.admin),
    green = new AccountEndpoint("green", { ...b, generation: 1 }, s.admin),
    directory = new TestDirectory(s, a, b);
  const routed = new RoutedAccount("red", directory, (place) => (place.db === a.db ? red : copy));
  let tick = 1000000;
  const incoming = (tenant: string, label: string, width = 1, subject?: string) =>
    intent(tenant, label, ++tick, width, subject);
  const ledger = new Map<string, { input: Input; receipt: Receipt }>();
  function remember(i: Input, r: Receipt) {
    assert.equal(r.operationId, i.operationId);
    assert.equal(r.recordedAt.v, i.claims[0]!.timestamp);
    const prior = ledger.get(i.operationId);
    if (prior) assert.deepEqual(r, prior.receipt);
    else ledger.set(i.operationId, { input: i, receipt: r });
    return r;
  }
  const commit = async (endpoint: AccountEndpoint, i: Input) =>
    remember(i, await endpoint.commit(i));
  const code = (e: unknown) => (e instanceof PlacementError ? e.code : errorCode(e));
  const typed = async (p: Promise<unknown>, expected: string) =>
    assert.rejects(p, (e) => code(e) === expected);
  let busy = false,
    neighborTask: Promise<void> | undefined;
  const neighbors: { start: number; end: number; receipt: Receipt }[] = [];
  try {
    await directory.init();
    await red.post("init", { mode: "serving", source: a.db }, true);
    await blue.post("init", { mode: "serving", source: a.db }, true);
    await green.post("init", { mode: "serving", source: b.db }, true);
    await copy.post("init", { mode: "importing", source: a.db }, true);
    await typed(copy.commit(incoming("red", "not-active")), "AccountFenced");
    await typed(copy.page({ account: "red", after: 0 }, 1), "TargetImporting");
    const first = incoming("red", "first"),
      subject = first.rows[0]!.entity_id,
      pin = remember(first, await routed.commit(first));
    const neighborGap = await commit(blue, incoming("blue", "gap"));
    const r2 = incoming("red", "correct", 1, subject);
    const retired = {
      ...first.rows[0]!,
      retracted_at: r2.claims[0]!.timestamp,
      retracted_position: 1,
      retract_tx_id: r2.claims[0]!.txId,
    };
    const correction = { ...r2, rows: [{ ...r2.rows[0]!, valid_from: 20 }, retired] };
    const edit = await commit(red, correction);
    const retryWithoutHint = new AccountEndpoint("red", a);
    try {
      assert.deepEqual(await retryWithoutHint.commit(correction), edit);
    } finally {
      retryWithoutHint.close();
    }
    const linkRaw = incoming("red", "link"),
      reference = {
        ...linkRaw,
        rows: [{ ...linkRaw.rows[0]!, value_type: "ref" as const, value_string: subject }],
      };
    const linkReceipt = await commit(red, reference);
    const foreign = incoming("red", "foreign-link");
    await typed(
      red.commit({
        ...foreign,
        rows: [{ ...foreign.rows[0]!, value_type: "ref", value_string: "blue~other" }],
      }),
      "UnsupportedAccountCommand",
    );
    const oldView = await readReceipt(red, pin, subject),
      valid10 = await readReceipt(red, edit, subject, 10),
      valid20 = await readReceipt(red, edit, subject, 20),
      history = await readReceipt(red, edit, subject, 20, true);
    assert.equal(oldView.length, 1);
    assert.equal(oldView[0]!["value_string"].v, first.rows[0]!.value_string);
    assert.equal(valid10.length, 0);
    assert.equal(valid20.length, 1);
    assert.equal(valid20[0]!["value_string"].v, r2.rows[0]!.value_string);
    assert.equal(history.length, 2);
    const gapBasis = {
      origin: a.db,
      basisT: neighborGap.t.v,
      recordedPosition: Number(neighborGap.position.v),
      validAt: 10,
    };
    assert.deepEqual(await readAtOrigin(red, gapBasis, subject), oldView);
    for (let k = 0; k < 7; k++) await commit(green, incoming("green", "offset-" + k));
    await typed(
      red.commit({ ...first, rows: [{ ...first.rows[0]!, value_string: "changed" }] }),
      "OperationPayloadConflict",
    );
    await typed(red.commit(incoming("blue", "foreign")), "UnsupportedAccountCommand");
    const originNext = String(BigInt(pin.t.v) + 1n),
      cursor = { account: "red", after: (await red.lookup(pin.operationId)).sequence };
    const seedAt = clock();
    for (let k = 0; k < people; k++) await commit(red, incoming("red", "seed-" + k, 160));
    s.e.log("account-seeded", {
      database: a.db,
      account: red.account,
      subjects: people,
      facts: people * 160,
    });
    const lost = incoming("red", "lost"),
      p = await ackProxy(a.endpoint),
      fwd = new AccountEndpoint("red", { ...a, endpoint: p.url });
    let original: Receipt;
    try {
      const noAck = typed(fwd.commit(lost), "Transport");
      await p.wait([lost.operationId], true);
      const held = p.requests.get(lost.operationId)!;
      assert.equal(held.status, 200);
      original = remember(lost, immutable(held.reply));
      p.drop();
      await noAck;
    } finally {
      p.close();
      fwd.close();
    }
    const m = new AccountMove(red, copy, directory);
    await typed(m.fence(0), "CatchUpFirst");
    assert.equal((await red.state()).mode, "serving");
    const beforeCopy = clock(),
      firstEntry = (await red.page({ account: "red", after: 0 }, 1, true)).entries[0]!;
    await copy.post("import", { entry: firstEntry }, true);
    assert.equal((await copy.state()).verified, 0);
    const restart = () => new AccountMove(red, copy, new TestDirectory(s, a, b));
    busy = true;
    neighborTask = (async () => {
      while (busy) {
        const start = clock(),
          r = await commit(blue, incoming("blue", "live-" + neighbors.length));
        neighbors.push({ start, end: clock(), receipt: r });
        await sleep(100);
      }
    })();
    neighborTask.catch(() => {});
    const high = (await red.state()).sequence;
    const liveChanges = (async () => {
      for (let k = 0; k < 4; k++) {
        await sleep(40);
        await commit(red, incoming("red", "live-" + k, 3));
      }
    })();
    await Promise.all([restart().copy(high), liveChanges]);
    const complete = await restart().copy((await red.state()).sequence);
    const pre = (await copy.state()).verified;
    s.e.log("account-preverified", { source: a.db, target: b.db, sequence: pre });
    await commit(red, incoming("red", "last-delta", 3));
    const finalInput = incoming("red", "resume", 2);
    const start = clock(),
      seal = await m.fence(4);
    assert.equal(seal.sequence, pre + 1);
    assert.equal(seal.mode, "fenced");
    const attempted = clock();
    await typed(red.commit(finalInput), "AccountFenced");
    // [DX-HA1] Why: keep the same pending business operation across the physical endpoint change. Rejected: treating an activation ACK as resumed writes.
    const pending = routed
      .commit(finalInput)
      .then((ack) => ({ ack: remember(finalInput, ack), at: clock() }));
    pending.catch(() => {});
    const canary = commit(blue, incoming("blue", "during-cut")).then((receipt) => ({
      receipt,
      end: clock(),
    }));
    const throughout = readReceipt(red, pin, subject).then((rows) => {
      assert.deepEqual(rows, oldView);
      return clock();
    });
    const delta = await restart().switch(await red.state());
    const [firstNew, inside] = await Promise.all([pending, canary]);
    const end = firstNew.at;
    const readAt = await throughout;
    assert(readAt >= start && readAt <= end);
    assert(inside.end >= start && inside.end <= end, "Neighbor must commit while red is paused");
    assert(delta.checked === 1 && delta.facts === 3);
    busy = false;
    await neighborTask;
    assert(
      BigInt(firstNew.ack.t.v) > BigInt(original.t.v) &&
        BigInt(firstNew.ack.position.v) > BigInt(original.position.v),
    );
    assert.deepEqual(await restart().switch(await red.state()), { checked: 0, facts: 0 });
    assert.deepEqual(
      await routed.commit({ ...lost, attemptId: lost.attemptId + "-retry" }),
      original,
    );
    assert.deepEqual(await routed.read(pin, subject), oldView);
    const link = await readReceipt(copy, linkReceipt, linkRaw.rows[0]!.entity_id);
    assert.equal(link.length, 1);
    assert.equal(link[0]!["value_type"].v, "ref");
    assert.equal(link[0]!["value_string"].v, subject);
    assert.deepEqual(await readReceipt(copy, edit, subject, 10), valid10);
    assert.deepEqual(await readReceipt(copy, edit, subject, 20), valid20);
    assert.deepEqual(await readReceipt(copy, edit, subject, 20, true), history);
    assert.deepEqual(await copy.translate(a.db, "position", Number(neighborGap.position.v)), {
      account: "red",
      sequence: cursor.after,
    });
    assert.deepEqual(await copy.translate(b.db, "t", Number(firstNew.ack.t.v)), {
      account: "red",
      sequence: seal.sequence + 1,
    });
    assert.deepEqual(await routed.at(gapBasis, subject), oldView);
    assert.deepEqual(await readAtOrigin(copy, { ...gapBasis, recordedPosition: 0 }, subject), []);
    await typed(copy.translate("unrelated", "position", 1), "UnknownOrigin");
    await typed(copy.translate(a.db, "t", Number(firstNew.ack.t.v)), "UnknownOrigin");
    const lastNativeNext = String(BigInt(original.t.v) + 1n),
      postLost = await routed.resume(a.db, lastNativeNext, 16);
    assert.deepEqual(
      postLost.entries.map((e) => e.receipt.operationId),
      [
        ...Array.from({ length: 4 }, (_, i) => "red~live-" + i),
        "red~last-delta",
        finalInput.operationId,
      ],
    );
    const resumed = await resumeOrigin(copy, a.db, originNext, 4);
    assert.deepEqual(resumed, await copy.page(cursor, 4));
    let after = 0,
      checked = 0;
    while (after < seal.sequence) {
      const cap = Math.min(8, seal.sequence - after),
        q = { account: "red", after },
        src = await red.page(q, cap),
        dst = await copy.page(q, cap);
      assert.deepEqual(dst, src);
      for (const e of dst.entries) {
        const item = ledger.get(e.receipt.operationId);
        assert(item);
        assert.deepEqual(e.receipt, item.receipt);
        assert.equal(e.observedFacts, item.input.rows.length);
        const tx = item.input.claims[0]!;
        assert.deepEqual(e.feed, {
          positions: [item.receipt.position.v],
          commandIds: [tx.commandId],
          txIds: [tx.txId],
          operationId: item.input.operationId,
          stamp: String(tx.timestamp),
          stampStatus: "decided",
          changes: item.input.rows
            .map((r) => ({
              op: item.input.newIds.includes(r.id) ? "assert" : "retract",
              entity: r.entity_id,
              attribute: r.attribute,
              assertionId: r.id,
              validFrom: r.valid_from,
              validTo: r.valid_to,
              position: item.receipt.position.v,
            }))
            .sort((x, y) => (x.assertionId < y.assertionId ? -1 : 1)),
        });
        if (item.input.newIds.length === item.input.rows.length) {
          const actual = await readReceipt(copy, item.receipt, item.input.rows[0]!.entity_id);
          const values = new Map(actual.map((r) => [r["id"].v, r]));
          assert.equal(values.size, item.input.rows.length);
          for (const r of item.input.rows) {
            const v = values.get(r.id);
            assert(v);
            assert.equal(v["value_string"].v, r.value_string);
            assert.equal(v["valid_from"].v, r.valid_from);
            assert.equal(v["recorded_position"].v, item.receipt.position.v);
          }
        }
        checked++;
      }
      after = src.next;
    }
    const last = (await copy.page({ account: "red", after }, 2)).entries;
    assert.equal(last.length, 1);
    assert.deepEqual(last[0]!.receipt, firstNew.ack);
    assert.equal(checked + 1, [...ledger.keys()].filter((k) => k.startsWith("red~")).length);
    assert.equal((await red.state()).sequence, seal.sequence);
    await typed(red.commit(incoming("red", "stale-writer")), "AccountFenced");
    await typed(copy.lookup(neighborGap.operationId), "ScopeMismatch");
    assert.equal((await green.state()).sequence, 7);
    assert.equal((await blue.state()).sequence, neighbors.length + 2);
    const result = {
      people,
      facts: people * 160,
      seedMs: beforeCopy - seedAt,
      liveCopyMs: start - beforeCopy,
      sourceChangesDuringCopy: 4,
      verifiedBeforeFence: pre,
      finalDelta: delta,
      pauseMs: end - start,
      pinnedReadDuringCutMs: readAt - start,
      pendingWaitMs: end - attempted,
      neighborCommits: neighbors.length + 2,
      neighborDuringCutMs: inside.end - start,
      firstNew: firstNew.ack,
      oldPin: pin,
      oldCursor: cursor,
      oldNativeNext: originNext,
      neighborGapBasis: gapBasis,
      lastNativeNext,
      resumedThrough: postLost.entries.at(-1)!.receipt.operationId,
      recoveredAck: original,
      seal,
      copyResumedAt: complete.verified,
      allOriginalReceipts: checked,
      oldViewHash: hash(JSON.stringify(oldView)),
      feedEnd: after + 1,
    };
    s.e.write("account-move", {
      nonce: s.e.nonce,
      source: a.db,
      target: b.db,
      result,
      neighbors,
      ledger: [...ledger.values()].map((v) => v.receipt),
    });
    return result;
  } finally {
    busy = false;
    if (neighborTask) await neighborTask;
    for (const c of [red, blue, copy, green]) c.close();
  }
}
