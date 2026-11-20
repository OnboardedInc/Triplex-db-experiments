import assert from "node:assert/strict";
import { W0, canonical } from "../../../bench/lib/w0-world.ts";
import { Documents, hash, pack, unpack, type Op, type Check } from "./store.ts";
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
) {
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
  const ops = [];
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
  await db.commit(
    id,
    intent,
    [
      ...ops,
      ...db.change(key, head, ack),
      db.put("effects:" + origin + ":" + p.batch, pack(p.deliveries)),
      ...(checkpoint?.ops ?? []),
    ],
    [db.guard(key, head), ...(checkpoint?.checks ?? [])],
  );
  return true;
}
