import assert from "node:assert/strict";
import { W0, canonical } from "../../../../bench/lib/w0-world.ts";
import { DomainOraclePool } from "../../../../bench/lib/w0-gates.ts";
import { unpack } from "../../notify1/store.ts";
import { toWire } from "../join/check.ts";
import { checkForms, expectForms } from "../join/form-expect.ts";
import type { Settlement } from "../join/settlement.ts";

// [DX-ACT7] Why: the several-accounts case checked each account against an oracle that had folded every release at
// Publish time and kept every owed notice (about 2 million per account at 20 owed forms) and every subject's ledger in
// the runner's memory, and read each account's stored changes and packets whole. Three accounts fit in the runner's
// 8 GiB; ten do not. With DX_ACT7_STREAM_CHECK=1 (default off) the case folds nothing at Publish and, after settlement,
// checks one account at a time: a fresh oracle pool folds the account's releases in order over pages of 32 subjects
// per oracle process, and each page is compared at once with the store's packets (read in order, one event at a time),
// its stored changes (read frame page by frame page) and, after the last release, its ledgers; then the pool is closed.
// What it checks is what the in-memory check checked, in the same order: every stored change of the release under
// test equal to the oracle's at the release's own position, every notice of every release of the account in order,
// no packet of any other event, every ledger, and the independent form rule for a release that only adds forms.
// Rejected: keeping the in-memory check and raising the heap (ten accounts need about ten times the memory, and the
// oracle processes would hold ten accounts' ledgers at once).
export type StreamRelease = { seq: number; position: number; doc: W0.ReleaseDoc; old: W0.ReleaseDoc | null };

type Packet = { event: number; deliveries: unknown[] };
const packetsOf = (w: Settlement, at: number) =>
  (w.recorder as unknown as { orderedPackets(at: number): AsyncIterable<Packet> }).orderedPackets(at);

async function* deliveriesOf(w: Settlement, at: number, seq: number) {
  for await (const p of packetsOf(w, at)) if (p.event === seq) for (const d of p.deliveries) yield toWire(d);
}

export async function streamCheck(o: {
  worker: Settlement;
  roster: string[];
  /** The account's releases in Publish order (the first from nothing). */
  releases: StreamRelease[];
  /** The release whose stored changes are checked (it must be stored). */
  target: number;
  world: (at: number) => (i: number) => W0.World;
  workers: number;
  validTime: string;
}) {
  const pool = new DomainOraclePool(new URL("../join/oracle.py", import.meta.url).pathname, o.workers);
  const w = o.worker;
  const at = await w.recorder.archive.store.head();
  const counts = { subjects: o.roster.length, releases: o.releases.length, changes: 0, subjectsChanged: 0,
    notices: 0, noticesByRelease: [] as number[], ledgers: 0, ledgerItems: 0,
    independent: null as null | { owing: number; changes: number; notices: number } };
  try {
    const last = o.releases.length - 1;
    for (const [k, r] of o.releases.entries()) {
      const isTarget = r.seq === o.target;
      const stored = isTarget ? w.archive.storedStream(r.seq) : undefined;
      const delivered = deliveriesOf(w, at, r.seq);
      const independent = isTarget && r.doc.forms?.length && !r.old?.forms?.length
        ? { owing: 0, changes: 0, notices: 0 } : undefined;
      let notices = 0;
      const ledger = w.recorder.archive.db;
      for (let base = 0; base < o.roster.length; base += 32 * pool.children.length) {
        const pages = await Promise.all(pool.children.map(async (oracle, n) => {
          const lo = base + n * 32;
          if (lo >= o.roster.length) return [];
          const ids = o.roster.slice(lo, lo + 32);
          const out = JSON.parse(await oracle.call("check", { document: r.doc, old: r.old, basis: { tx: r.position, validTime: o.validTime },
            worlds: ids.map((_, j) => o.world(r.position)(lo + j)), fold: true })) as {
            subject: string; rows: [string, string | null, string | null][]; deliveries: unknown[]; items: unknown[] }[];
          return out.map((x, j) => ({ ...x, index: lo + j }));
        }));
        const page = pages.flat();
        const ledgers = k === last
          ? await ledger.rows<string>(page.map((x) => "recorded-ledger:" + x.subject), at) : undefined;
        for (const x of page) {
          assert.equal(x.subject, o.roster[x.index]);
          const mine: unknown[] = [];
          for (const d of x.deliveries) {
            const next = await delivered.next();
            assert(!next.done, "account notices end before the oracle's (" + x.subject + ")");
            assert.deepEqual(next.value, d, "notice differs from the oracle: " + x.subject);
            mine.push(next.value);
          }
          notices += x.deliveries.length;
          if (stored) {
            const want = x.rows.map(([key, , v]) => [key, v] as [string, string | null]);
            if (want.length) {
              const next = await stored.next();
              assert(!next.done, "stored changes end before the oracle's (" + x.subject + ")");
              assert.equal(canonical(next.value), canonical({ subject: x.subject, changes: want }),
                "stored changes differ: " + x.subject);
              counts.changes += want.length;
              counts.subjectsChanged++;
            }
            if (independent) {
              const e = expectForms(o.world(r.position)(x.index), r.doc, o.validTime);
              const g = checkForms(e, x.subject, want, mine as never);
              if (e.changes.size) independent.owing++;
              independent.changes += g.changes;
              independent.notices += g.notices;
            }
          }
          if (ledgers) {
            const v = ledgers.get("recorded-ledger:" + x.subject);
            assert.deepEqual(v ? unpack<unknown[]>(v.value).map(toWire) : [], x.items, "ledger of " + x.subject);
            counts.ledgers++;
            counts.ledgerItems += x.items.length;
          }
        }
      }
      assert((await delivered.next()).done, "the account holds notices of release " + r.seq + " the oracle does not owe");
      if (stored) {
        const end = await stored.next();
        assert(end.done, "the store holds stored changes the oracle does not");
        assert.equal(end.value.status, "stored");
      }
      counts.noticesByRelease.push(notices);
      counts.notices += notices;
      if (independent) counts.independent = independent;
    }
    // No packet of an event outside the account's releases.
    let all = 0;
    const known = new Set(o.releases.map((r) => r.seq));
    for await (const p of packetsOf(w, at)) {
      assert(known.has(p.event), "a packet of an event the check does not know: " + p.event);
      all += p.deliveries.length;
    }
    assert.equal(all, counts.notices);
    return counts;
  } finally {
    pool.close();
  }
}
