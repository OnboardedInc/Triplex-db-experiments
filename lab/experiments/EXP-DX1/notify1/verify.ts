import assert from "node:assert/strict";
import { DomainOracle } from "../../../bench/lib/w0-gates.ts";
import { canonical, W0 } from "../../../bench/lib/w0-world.ts";
import type { Dispatcher } from "./dispatcher.ts";
import type { Request, Cut } from "./journal.ts";
import { hash, parse, unpack, type Ack } from "./store.ts";

export interface Offered {
  req: Request;
  receipt: Ack;
}
export const wireDelivery = (d: W0.Delivery) => ({ ...d, payload: JSON.parse(d.payload) });
const wireItems = (ds: W0.ItemState[]) => ds.map((d) => ({ ...d, payload: JSON.parse(d.payload) }));
export async function verify(
  worker: Dispatcher,
  ids: string[],
  events: Offered[],
  worlds: (s: string[], cut: Cut) => Promise<W0.World[]>,
) {
  const a = worker.notices,
    oracle = new DomainOracle(new URL("./oracle.py", import.meta.url).pathname);
  const effects: any[] = [],
    at = await a.db.head(),
    sinkAt = await worker.sink.head();
  const identity = await a.observe(),
    origin = hash([a.db.prefix, identity.value.epoch]);
  assert.equal(identity.value.sequence, events.length);
  let comparisons = 0,
    previous = 0;
  const counts: number[] = [];
  try {
    for (const [idx, { req, receipt }] of events.entries()) {
      assert(receipt.position > previous && receipt.txId);
      previous = receipt.position;
      const row = await a.event(idx + 1, receipt.position);
      assert(
        row.at === receipt.position &&
          row.value.request === req.id &&
          row.value.next === req.release &&
          row.value.validTime === req.validTime &&
          row.value.census.members === hash(ids),
      );
      assert.deepEqual(row.value.selection, req.selection);
      const group = req.selection.kind === "subjects" ? req.selection.ids : ids,
        before = effects.length;
      for (let n = 0; n < group.length; n += 64) {
        const list = group.slice(n, n + 64),
          cut = { position: receipt.position, validTime: req.validTime };
        const input = await worlds(list, cut);
        assert.deepEqual(
          input.map((w) => w.subject),
          list,
        );
        effects.push(
          ...parse<any[]>(
            await oracle.call("fold", {
              basis: { tx: cut.position, validTime: cut.validTime },
              release: req.release,
              worlds: input,
            }),
          ),
        );
        comparisons += list.length;
      }
      counts.push(effects.length - before);
    }
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
        a.db.rows<string>(
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
    };
  } finally {
    oracle.close();
  }
}
