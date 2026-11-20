import assert from "node:assert/strict";
import { DomainOracle } from "../../../bench/lib/w0-gates.ts";
import { canonical, W0 } from "../../../bench/lib/w0-world.ts";
import { memberPage, width } from "./census.ts";
import type { Dispatcher } from "./dispatcher.ts";
import type { Request, Cut } from "./journal.ts";
import { hash, parse, unpack, type Ack, type Documents } from "./store.ts";

export interface Offered {
  req: Request;
  receipt: Ack;
}
export const wireDelivery = (d: W0.Delivery) => ({ ...d, payload: JSON.parse(d.payload) });
const wireItems = (ds: W0.ItemState[]) => ds.map((d) => ({ ...d, payload: JSON.parse(d.payload) }));
export async function verify(
  worker: Pick<Dispatcher, "notices" | "sink" | "effects"> & {
    ledgerStore?(epoch: string): Documents;
  },
  ids: string[],
  events: Offered[],
  worlds: (s: string[], cut: Cut) => Promise<W0.World[]>,
) {
  const a = worker.notices,
    oracle = new DomainOracle(new URL("./oracle.py", import.meta.url).pathname);
  const effects: any[] = [],
    sinkAt = await worker.sink.head();
  const identity = await a.observe(),
    census = new Set(ids),
    origin = hash([a.db.prefix, identity.value.epoch]);
  const ledger = worker.ledgerStore?.(identity.value.epoch) ?? a.db,
    at = await ledger.head();
  assert.deepEqual([...census].sort(), ids);
  assert.equal(identity.value.sequence, events.length);
  let comparisons = 0,
    previous = 0,
    parent = hash([a.db.prefix, identity.value.epoch, identity.value.census]);
  let previousPolicy: string | null = null;
  const counts: number[] = [];
  const coverage: { affected: string; complement: string; selected: string }[] = [];
  let document: W0.ReleaseDoc | undefined;
  try {
    for (const [idx, { req, receipt }] of events.entries()) {
      assert(receipt.position > previous && receipt.txId);
      if (req.kind === "activation") document = req.document;
      const row = await a.event(idx + 1, receipt.position);
      const original = await a.db.store.transactionByCommand(
        a.db.command("event-command:" + req.id),
      );
      assert(original.ok && original.value);
      const r = original.value;
      const policy = document ? W0.compileRelease(document).hash : W0[req.release].hash;
      assert(
        row.at === receipt.position &&
          row.value.kind === req.kind &&
          row.value.from === req.from &&
          row.value.request === req.id &&
          row.value.next === req.release &&
          row.value.nextHash === policy &&
          row.value.oldHash === previousPolicy &&
          row.value.validTime === req.validTime &&
          row.value.census.members === hash(ids) &&
          row.value.census.id === identity.value.census.id &&
          row.value.census.count === ids.length &&
          row.value.epoch === identity.value.epoch &&
          row.value.parent === parent &&
          row.value.sourceBefore >= previous &&
          r.actor === "notice-v1" &&
          r.position === receipt.position &&
          r.txId === receipt.txId,
      );
      assert(
        r.changes.some(
          (c: any) =>
            c.op === "assert" &&
            c.entityId === a.db.prefix + "event:" + (idx + 1) &&
            c.tripleId === row.id &&
            c.value.value === canonical(row.value),
        ),
      );
      previous = receipt.position;
      previousPolicy = policy;
      parent = hash(row.value);
      const selection = row.value.selection;
      assert(selection.kind === "subjects" || selection.kind === "census");
      const selected = selection.kind === "subjects" ? new Set(selection.ids) : census;
      if (selection.kind === "subjects")
        assert(
          selected.size === selection.ids.length && selection.ids.every((s) => census.has(s)),
          "Invalid durable subject selection",
        );
      const before = effects.length,
        affected = [],
        complement = [];
      // [DX-STG1] Why: a narrowed source event can omit a retirement or change even
      // when every emitted packet and receiver state matches that same narrowed list.
      // Rejected: supplying the production selection as the oracle's input universe.
      for (let n = 0; n < ids.length; n += width) {
        const list = ids.slice(n, n + width),
          cut = { position: receipt.position, validTime: req.validTime };
        if (row.value.selection.kind === "census")
          assert.deepEqual(await memberPage(a.db, row.value.census, n, row.at), list);
        const input = await worlds(list, cut);
        assert.deepEqual(
          input.map((w) => w.subject),
          list,
        );
        const expected = parse<{ affected: string[]; deliveries: unknown[] }>(
          await oracle.call("coverage", {
            basis: { tx: cut.position, validTime: cut.validTime },
            release: req.release,
            worlds: input,
            ...(document ? { document } : {}),
          }),
        );
        const changed = new Set(expected.affected);
        for (const subject of list) {
          if (changed.has(subject)) {
            assert(selected.has(subject), "Durable selection omits affected subject " + subject);
            affected.push(subject);
          } else complement.push(subject);
        }
        effects.push(...expected.deliveries);
        comparisons += list.length;
      }
      coverage.push({
        affected: hash(affected),
        complement: hash(complement),
        selected: hash([...selected]),
      });
      counts.push(effects.length - before);
    }
    assert.equal(identity.value.parent, parent);
    const observed = (await worker.effects()).map(wireDelivery);
    assert.equal(
      canonical(observed),
      canonical(effects),
      "Ordered durable effects differ from O-DOMAIN",
    );
    for (let n = 0; n < ids.length; n += 64) {
      const group = ids.slice(n, n + 64),
        expect = parse<any[]>(await oracle.call("inspect", group));
      const [ledgers, receivers] = await Promise.all([
        ledger.rows<string>(
          group.map((s) => "ledger:" + s),
          at,
        ),
        worker.sink.rows<string>(
          group.map((s) => "receiver:" + origin + ":" + s),
          sinkAt,
        ),
      ]);
      for (const [i, s] of group.entries()) {
        const l = ledgers.get("ledger:" + s),
          r = receivers.get("receiver:" + origin + ":" + s);
        assert.equal(canonical(l ? wireItems(unpack(l.value)) : []), canonical(expect[i].items));
        const state = r ? unpack<W0.ReceiverState>(r.value) : W0.EMPTY_RECEIVER;
        const actual = {
          effects: state.effects.map((x) => ({ ...x, waiting: x.waiting.map(wireDelivery) })),
          projection: state.projection.map((x) => ({ ...x, payload: JSON.parse(x.payload) })),
        };
        assert.equal(canonical(actual), canonical(expect[i].receiver));
      }
    }
    return {
      subjects: ids.length,
      evaluations: comparisons,
      eventCounts: counts,
      effects: effects.length,
      orderedEffectSha256: hash(observed),
      receiverStates: ids.length,
      ledgerStates: ids.length,
      coverage,
    };
  } finally {
    oracle.close();
  }
}
