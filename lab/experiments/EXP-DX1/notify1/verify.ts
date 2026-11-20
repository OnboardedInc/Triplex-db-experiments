import assert from "node:assert/strict";
import { DomainOracle } from "../../../bench/lib/w0-gates.ts";
import { canonical, W0 } from "../../../bench/lib/w0-world.ts";
import { memberPage, width } from "./census.ts";
import type { Dispatcher } from "./dispatcher.ts";
import type { Request, Cut } from "./journal.ts";
import { hash, parse, transportHash, unpack, type Ack, type Documents } from "./store.ts";
import { Fixture } from "./fixture.ts";

export interface Offered {
  req: Request;
  receipt: Ack;
}
export const wireDelivery = (d: W0.Delivery) => ({ ...d, payload: JSON.parse(d.payload) });
const wireItems = (ds: W0.ItemState[]) => ds.map((d) => ({ ...d, payload: JSON.parse(d.payload) }));

function privateSave(
  fixture: Fixture,
  prefix: string,
  changes: readonly { entityId: string; attribute: string; op: string }[],
  sequence: number,
) {
  // [DX-STG1] Why: the compact fixture has one complete independent world
  // per row. Prove the complement from the original frame. Rejected: using
  // the sender's selected owners as the oracle's input list.
  if (!fixture.ranges || changes.length !== 6) return;
  const edits = changes.filter((c) => !c.entityId.startsWith(prefix));
  const id = edits[0]?.entityId;
  if (
    !id?.startsWith("notice-fixture:") ||
    edits.length !== 2 ||
    edits.some((c) => c.entityId !== id || c.attribute !== "world") ||
    edits[0]!.op !== "retract" ||
    edits[1]!.op !== "assert" ||
    changes.filter((c) => c.entityId === prefix + "tail").length !== 2 ||
    !changes.some((c) => c.op === "assert" && c.entityId.startsWith(prefix + "claim:")) ||
    !changes.some((c) => c.op === "assert" && c.entityId === prefix + "event:" + sequence)
  )
    return;
  return id.slice("notice-fixture:".length);
}

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
    censusHash = hash(ids),
    origin = hash([a.db.prefix, identity.value.epoch]);
  const ledger = worker.ledgerStore?.(identity.value.epoch) ?? a.db,
    at = await ledger.head();
  assert.deepEqual([...census].sort(), ids);
  assert.equal(identity.value.sequence, events.length);
  let comparisons = 0,
    isolatedSaves = 0,
    previous = 0,
    parent = hash([a.db.prefix, identity.value.epoch, identity.value.census]);
  let predecessor: string | undefined;
  let previousPolicy: string | null = null;
  const counts: number[] = [];
  const coverage: { affected: string; complement: string; selected: string }[] = [];
  let document: W0.ReleaseDoc | undefined;
  try {
    for (const [idx, { req, receipt }] of events.entries()) {
      const predecessorAt = previous;
      assert(receipt.position > previous && receipt.txId);
      if (req.kind === "activation") document = req.document;
      const row = await a.event(idx + 1, receipt.position);
      const original = await a.db.store.transactionByCommand(
        a.db.command("event-command:" + req.id),
      );
      assert(original.ok && original.value);
      const r = original.value;
      const policy = document ? W0.compileRelease(document).hash : W0[req.release].hash;
      const prior = events[idx - 1];
      assert(
        row.at === receipt.position &&
          row.value.kind === req.kind &&
          row.value.from === req.from &&
          row.value.request === req.id &&
          row.value.next === req.release &&
          row.value.nextHash === policy &&
          row.value.oldHash === previousPolicy &&
          row.value.validTime === req.validTime &&
          row.value.census.members === censusHash &&
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
      const exact = await a.coverage(row, ledger, at);
      if (exact)
        assert(
          exact.parent === predecessor &&
            exact.txId === receipt.txId &&
            exact.edits === transportHash(r.changes) &&
            (exact.indexAt === undefined || exact.indexAt === predecessorAt),
          "Ordered range identifies a different source commit",
        );
      predecessor = row.id;
      const idsSelected = exact?.ids ?? (selection.kind === "subjects" ? selection.ids : ids);
      const selected = idsSelected === ids ? census : new Set(idsSelected);
      if (idsSelected !== ids)
        assert(
          selected.size === idsSelected.length && idsSelected.every((s) => census.has(s)),
          "Invalid durable subject selection",
        );
      const before = effects.length,
        affected = [],
        complement = [];
      let privateSubject: string | undefined;
      const fixture = a.inputs;
      if (
        fixture instanceof Fixture &&
        req.kind === "reconcile" &&
        prior &&
        prior.req.validTime === req.validTime &&
        row.value.sourceBefore === predecessorAt &&
        receipt.position === predecessorAt + 1
      ) {
        privateSubject = privateSave(fixture, a.db.prefix, r.changes, idx + 1);
        if (privateSubject !== undefined) {
          assert(census.has(privateSubject));
          for (const position of [predecessorAt, receipt.position]) {
            const cut = { position, validTime: req.validTime };
            const actual: W0.World[] = await fixture.worlds([privateSubject], cut);
            const witness: W0.World[] = await worlds([privateSubject], cut);
            assert.deepEqual(actual, witness, "Compact save differs from independent world");
          }
          isolatedSaves++;
        }
      }
      const universe = privateSubject === undefined ? ids : [privateSubject];
      // [DX-STG1] Why: a narrowed source event can omit a retirement or change even
      // when every emitted packet and receiver state matches that same narrowed list.
      // Rejected: supplying the production selection as the oracle's input universe.
      for (let n = 0; n < universe.length; n += width) {
        const list = universe.slice(n, n + width),
          cut = { position: receipt.position, validTime: req.validTime };
        if (privateSubject === undefined && row.value.selection.kind === "census")
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
      if (exact)
        assert.deepEqual(exact.ids, affected, "Ordered range includes unaffected subjects");
      coverage.push({
        affected: hash(affected),
        complement:
          privateSubject === undefined
            ? hash(complement)
            : affected.length
              ? hash(ids.filter((s) => s !== privateSubject))
              : censusHash,
        selected: idsSelected === ids ? censusHash : hash([...selected]),
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
      isolatedSaves,
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
