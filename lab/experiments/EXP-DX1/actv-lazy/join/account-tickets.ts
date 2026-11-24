// [DX-ACT9] TX2_ACCOUNT_TICKETS=1 with TX2_REMOVAL_PER_ACCOUNT=1 (both default off): a held account's derived writes
// (Publish, settlement and notice frames, deliveries) name their account in the removal ticket, and every recheck of a
// derived copy (markers, stored changes, recorded notices, the held reader's cache) is made against that account's
// removal state, and for recorded notices against the subjects they hold (ACCOUNT-TICKETS.md sections 2 to 4).
// Why: one database holds every account, so the database-wide removal sequence let one removal anywhere refuse every
// account's derived work and make every account's earlier derived copies unreadable. What a held account derives is
// computed only from its own subjects' entities (decision.ts heldWorlds asserts it), so only removals of its entities
// or of unscoped ones can reach it.
// Rejected: naming the account without the per-account removal rule (the counters do not exist; the database-wide
// check is the only exact one there); naming several accounts (a held account reads one); a per-subject write ticket
// (the gateway fences accounts; per subject is applied where the client decides: recorded notices).
import { ErasureChanged, readErasure, recheckErasure } from "../../../../bench/lib/datomic-erasure.ts";
import { subjectOf } from "../../../../bench/lib/world.ts";
import type { Store } from "../store.ts";

export const accountTicketsOn = () =>
  process.env.TX2_ACCOUNT_TICKETS === "1" && process.env.TX2_REMOVAL_PER_ACCOUNT === "1";

/** The account a held store's derived writes name: its `acct/<account>/` key; undefined with the option off or for a
 * store that is not a held account of the one database. */
export function ticketAccount(s: Pick<Store, "held">): string | undefined {
  const h = s.held;
  if (!accountTicketsOn() || !h || h.prefix !== "acct/" + h.account + "/" || !/^[^/\s]{1,128}$/.test(h.account)) return;
  return h.account;
}
/** The ticket's account list (undefined: the ticket is sent exactly as before). */
export const ticketAccounts = (s: Pick<Store, "held">) => {
  const a = ticketAccount(s);
  return a === undefined ? undefined : [a];
};

export type AccountFrontier = NonNullable<Awaited<ReturnType<typeof readErasure>>> & {
  perAccount?: boolean;
  accountSeq?: number;
  unscopedSeq?: number;
  touched?: string[];
  touchedComplete?: boolean;
};
/** The frontier as this store's checks see it (with the account's and the unscoped sequences when narrowed). */
export async function frontierFor(s: Pick<Store, "held" | "comp">, since?: number) {
  const account = ticketAccount(s);
  return (await readErasure(s.comp, account, account === undefined ? undefined : since)) as AccountFrontier | undefined;
}
/** `recheckErasure` with the store's account when narrowed; exactly as before otherwise. */
export const recheckFor = (s: Pick<Store, "held" | "comp">, sequence: number | undefined) =>
  recheckErasure(s.comp, sequence, ticketAccount(s));

/** What a cache of derived answers is keyed on: the account's and unscoped sequences when narrowed, else the global
 * sequence (as before). */
export const fingerprint = (f: AccountFrontier | undefined) =>
  f === undefined ? undefined : f.perAccount === true && Number.isSafeInteger(f.accountSeq) && Number.isSafeInteger(f.unscopedSeq)
    ? "a" + f.accountSeq + "/" + f.unscopedSeq
    : f.seq;

/**
 * The subjects (by number) of the account whose entities a removal published after `since` touched, or "all" when
 * that cannot be told exactly (the unscoped account was touched, the list was cut short, or the frontier is not
 * narrowed). An entity under the account's prefix that belongs to no subject is in no world (heldWorlds) and is left
 * out.
 */
export function touchedSubjects(f: AccountFrontier | undefined, prefix: string, since: number): Set<number> | "all" {
  if (!f || f.perAccount !== true || !Number.isSafeInteger(f.unscopedSeq) || !Number.isSafeInteger(f.accountSeq)) return "all";
  if (!(since <= f.seq) || f.unscopedSeq! > since) return "all";
  const out = new Set<number>();
  if (f.accountSeq! <= since) return out;
  if (f.touchedComplete !== true || !Array.isArray(f.touched)) return "all";
  for (const e of f.touched) {
    if (!e.startsWith(prefix)) return "all";
    const n = subjectOf(e.slice(prefix.length));
    if (n !== null) out.add(n);
  }
  return out;
}
/** The subject number of a delivery's or ledger's subject ID (`pl:s00000012`), or undefined. */
export const subjectNumber = (id: string) => (/^pl:s[0-9]{8}$/.test(id) ? Number(id.slice(4)) : undefined);

/**
 * [DX-ACT9] With the option on (else undefined): a check that a recorded copy stamped `stamp` holding `subjects` is
 * current: no removal published after the stamp touched the unscoped account or an entity of one of those subjects.
 * Returns the frontier it was checked against; throws ErasureChanged otherwise. Frontiers are kept per stamp for the
 * check's life unless `fresh` (a delivery checks right before its commit).
 */
export function copyCheck(s: Pick<Store, "held" | "comp">) {
  if (ticketAccount(s) === undefined) return undefined;
  const seen = new Map<number, AccountFrontier | undefined>();
  return async (stamp: number | undefined, subjects: Iterable<string>, fresh = false) => {
    if (stamp === undefined) {
      const f = await frontierFor(s);
      if (f) throw new ErasureChanged("Discard the old protected input cut");
      return f;
    }
    let f = fresh ? undefined : seen.get(stamp);
    if (!f) {
      f = await frontierFor(s, stamp);
      if (!fresh) seen.set(stamp, f);
    }
    verifyCopy(f, s.held!.prefix, stamp, subjects);
    return f;
  };
}
/** The decision itself (pure, so the unit tests and the in-process gate drive it directly). */
export function verifyCopy(f: AccountFrontier | undefined, prefix: string, stamp: number, subjects: Iterable<string>) {
  const stale = () => {
    throw new ErasureChanged("Discard the old protected input cut");
  };
  if (!f) return stale();
  if (f.perAccount !== true) return f.seq === stamp ? undefined : stale();
  const touched = touchedSubjects(f, prefix, stamp);
  if (touched === "all")
    return stamp <= f.seq && f.accountSeq! <= stamp && f.unscopedSeq! <= stamp ? undefined : stale();
  for (const id of subjects) {
    const n = subjectNumber(id);
    if (n === undefined || touched.has(n)) stale();
  }
}
