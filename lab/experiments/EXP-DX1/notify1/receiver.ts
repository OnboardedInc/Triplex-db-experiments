import { derivedSealOn, inputUnion, isRemoved, isSealed, namedInputs, open, seal } from "../../../bench/lib/derived-seal.ts";
import { ErasureChanged, withErasure } from "../../../bench/lib/datomic-erasure.ts";
import type { ErasureFrontier } from "../../../../packages/datomic/dist/index.js";
import assert from "node:assert/strict";
import { W0, canonical } from "../../../bench/lib/w0-world.ts";
import { Documents, hash, pack, parse, unpack, type Op, type Check } from "./store.ts";
import type { Packet } from "./dispatcher.ts";
type Receipt = { batch: number; digest: string };
const inbox = (origin: string, s: string) => "receiver:" + origin + ":" + s;
const empty = (p: Packet) => hash([p.account, p.epoch, "receiver-genesis"]);
export async function receiveOrdered(
  db: Documents,
  account: string,
  p: Packet,
  digest: string,
  grant?: () => Promise<void>,
  checkpoint?: { binding: string; ops: Op[]; checks: Check[] },
  frontier?: () => Promise<ErasureFrontier | undefined>,
  // [DX-ACT9] TX2_ACCOUNT_TICKETS=1 (recorded.ts): `frontier` has already checked the packet against the source
  // account's removals (it throws when stale) and returns the frontier it checked; the commit's cross-database ticket
  // carries that frontier's sequence and names these source accounts. Absent: as before.
  accounts?: readonly string[],
  // [DX-ERA4] TX2_DERIVED_SEAL=1: the source database's composition; the packet's deliveries are sealed there and this
  // recipient's state is sealed under the same source assertions (era4/DERIVED-COPIES.md 3.4).
  sealSource?: { backend?: { name: string; url: string }; scopeName?: string },
) {
  const sealOn = derivedSealOn();
  assert(!sealOn || sealSource, "TX2_DERIVED_SEAL: a receiver needs its source to seal its state");
  const requireFrontier = async () => {
    if (frontier || p.erasureSeq !== undefined) {
      const state = await frontier?.();
      if (!state || (accounts === undefined && !sealOn && state.seq !== p.erasureSeq))
        throw new ErasureChanged("Receiver erasure frontier unavailable or stale");
      return state;
    }
  };
  await requireFrontier();
  assert.equal(hash(p), digest);
  assert(p.account === account && p.deliveries.length > 0);
  const origin = hash([p.account, p.epoch]),
    key = "received:" + origin,
    id = key + ":" + p.batch;
  const intent = checkpoint ? [digest, checkpoint.binding] : digest;
  const before = await db.original(id, intent);
  if (before) return false;
  const at = await db.head(),
    head = await db.row<Receipt>(key, at);
  if (head && head.value.batch >= p.batch) {
    // [DX-STG1] Why: another delivery worker can commit this packet between the first receipt lookup and the head read. Rejected: treating a genuine concurrent replay as an ordering failure or accepting a reused number with different bytes.
    assert(await db.original(id, intent), "Missing original receiver receipt");
    return false;
  }
  assert(
    (head?.value.batch ?? 0) + 1 === p.batch && (head?.value.digest ?? empty(p)) === p.previous,
    "Out-of-order receiver packet",
  );
  const subjects = [...new Set(p.deliveries.map((d) => d.subject))],
    rows = await db.rows<string>(
      subjects.map((s) => inbox(origin, s)),
      at,
    );
  const by = new Map<string, W0.Delivery[]>();
  for (const d of p.deliveries) {
    if (!by.has(d.subject)) by.set(d.subject, []);
    by.get(d.subject)!.push(d);
  }
  const ops: Op[] = [];
  if (sealOn) ops.push(...(await sealedReceive(db, sealSource!, by, rows, origin)));
  else
  for (const [subject, ds] of by) {
    const k = inbox(origin, subject),
      prior = rows.get(k),
      state = prior ? unpack<W0.ReceiverState>(prior.value) : W0.EMPTY_RECEIVER;
    const next = W0.receive(state, ds);
    assert.equal(canonical(next.applied.effects), canonical(ds), "Gap or duplicate at receiver");
    ops.push(...db.change(k, prior, pack(next.state)));
  }
  const ack = { batch: p.batch, digest };
  // [DX-STG1] Why: a single receiver transaction stores the actual ordered effects with deduplication and progress. Rejected: acknowledging a non-idempotent external call whose result can be lost.
  await grant?.();
  const authority = await requireFrontier();
  await withErasure(
    authority?.seq,
    () =>
      db.commit(
        id,
        intent,
        [
          ...ops,
          ...db.change(key, head, ack),
          db.put("effects:" + origin + ":" + p.batch, pack(p.deliveries)),
          ...(authority ? [db.put("effect-erasure:" + origin + ":" + p.batch, authority.seq)] : []),
          ...(checkpoint?.ops ?? []),
        ],
        [db.guard(key, head), ...(checkpoint?.checks ?? [])],
      ),
    authority?.database,
    accounts,
  );
  return true;
}

/** [DX-ERA4] One subject's received state under TX2_DERIVED_SEAL: its generation and one entry per item (`{effect,
 * projection}`), each sealed under what the deliveries applied to it named; an entry that opens as removed is kept as it
 * is. A delivery of a higher generation starts the subject's state again (the source forgot it, 3.4); a delivery that
 * opens as removed is not applied (its content is removed; every later one of the same item opens as removed too). */
type Entry = { effect?: W0.EffectState; projection?: W0.ProjectionEntry };
type SealedState = { g: number; e: unknown[] };
async function sealedReceive(
  db: Documents,
  source: { backend?: { name: string; url: string }; scopeName?: string },
  by: Map<string, W0.Delivery[]>,
  rows: Map<string, { id: string; value: string }>,
  origin: string,
) {
  const url = source.backend!.url,
    ops: Op[] = [];
  for (const [subject, list] of by) {
    const ds = list as unknown as { subject: string; generation: number; sealed: unknown }[];
    const generation = ds[0]!.generation;
    assert(ds.every((d) => d.subject === subject && d.generation === generation), "Mixed generations in one packet");
    const k = inbox(origin, subject),
      prior = rows.get(k),
      held = prior ? unpack<SealedState>(prior.value) : { g: 0, e: [] };
    assert(generation >= held.g, "A packet of an earlier generation");
    const entries = generation > held.g ? [] : held.e;
    const [openedEntries, openedDeliveries] = [await open(url, entries), await open(url, ds.map((d) => d.sealed))];
    const kept: unknown[] = [];
    const named = new Map<string, string[]>();
    const effects: W0.EffectState[] = [],
      projection: W0.ProjectionEntry[] = [];
    openedEntries.forEach((v, i) => {
      if (isRemoved(v)) return void kept.push(entries[i]);
      const x = (typeof v === "string" ? parse<Entry>(v) : v) as Entry;
      const id = x.effect?.id ?? x.projection!.id;
      named.set(id, namedInputs(entries[i]));
      if (x.effect) effects.push(x.effect);
      if (x.projection) projection.push(x.projection);
    });
    const readable: W0.Delivery[] = [];
    openedDeliveries.forEach((v, i) => {
      if (isRemoved(v)) return;
      const d = (typeof v === "string" ? parse<W0.Delivery>(v) : v) as W0.Delivery;
      named.set(d.id, inputUnion(named.get(d.id) ?? [], namedInputs(ds[i]!.sealed)));
      readable.push(d);
    });
    const next = W0.receive({ effects, projection }, readable);
    assert.equal(canonical(next.applied.effects), canonical(readable), "Gap or duplicate at receiver");
    const byId = new Map<string, Entry>();
    for (const e of next.state.effects) byId.set(e.id, { ...byId.get(e.id), effect: e });
    for (const p of next.state.projection) byId.set(p.id, { ...byId.get(p.id), projection: p });
    const ids = [...byId.keys()].sort();
    const sealed = await seal(source, ids.map((id) => ({ inputs: named.get(id) ?? [], value: canonical(byId.get(id)) })));
    const e = [...kept, ...sealed.map((v) => (typeof v === "string" && !isSealed(v) ? parse<unknown>(v) : v))];
    ops.push(...db.change(k, prior as never, pack({ g: generation, e })));
  }
  return ops;
}
