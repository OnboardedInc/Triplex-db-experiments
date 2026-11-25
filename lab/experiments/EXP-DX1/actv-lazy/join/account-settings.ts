// [DX-ACT8, second review] The held account's one-way settings (PUBLISH-BESIDE-SAVES.md section 0.8).
//
// Where they live: the account's origin fact (`namesOf(s).ORIGIN`, attribute `lazy/generation`), field `settings`. Every
// Publish plan and every settlement frame already reads that fact (`controls`); a build from before this change compares
// it exactly with `{ profile, held }` and so refuses the account once a setting is on. Every guarded Publish and every
// settlement frame under the progress precondition is also guarded on the origin row, so nothing this build planned under
// the old settings commits after the transition.
//
// The transition: a process allowed to turn a setting on (TX2_ACCOUNT_KEYS, TX2_SETTLE_FRAME_GUARDS,
// TX2_LEDGER_CAP_AT_PUBLISH) rewrites the origin with the merged settings, guarded on the origin row it read. Settings
// only turn on. A process with none of the three variables never writes a setting.
//
// [DX-ACT8, third review] U2: the ledger mode is never a process's. Under any setting the account's ledgers are written
// in parts with their retired items kept beside them (`archive`, ledger-parts.ts), because a ledger in parts replaces a
// whole ledger or one in parts alike and holds the most; the transition stores `ledger: "parts", archive: true` whatever
// the process names. U5: the transition also fences what any build planned before it (the account's calendar row, which
// every Publish is guarded on, and every settlement progress row in force, which every frame is guarded on), so a plan
// of a build from before the settings that was made before the transition is refused at its commit, whatever the
// rollout order. U6: no per-process cache: whether a transition is needed is read at each plan from the stored settings.
import { randomUUID } from "node:crypto";
import { Documents, hash, type Op } from "../../notify1/store.ts";
import { readErasure, withErasure } from "../../../../bench/lib/datomic-erasure.ts";
import { Conflict, fact, namesOf, originSettings, value, type AccountSettings, type EntityGuard, type Store } from "../store.ts";

export type LedgerSetting = "whole" | "parts";
/** What a process may turn on, and the ledger mode it names itself (TX2_NOTICE_LEDGER, if set). */
export type Permits = { accountKeys: boolean; frameGuards: boolean; ledgerCap: boolean; ledger?: LedgerSetting };
/** A process's permits: its environment. A store may carry `permits` instead: the in-process fuzzer (act10/fuzz.ts)
 * models several processes of a fleet, each with its own, in one Node process. */
export function permitsOf(s: Pick<Store, "held">): Permits {
  const own = (s as { permits?: Permits }).permits;
  if (own) return own;
  const ledger = process.env.TX2_NOTICE_LEDGER;
  return {
    accountKeys: process.env.TX2_ACCOUNT_KEYS === "1",
    frameGuards: process.env.TX2_SETTLE_FRAME_GUARDS === "1",
    ledgerCap: process.env.TX2_LEDGER_CAP_AT_PUBLISH === "1",
    ...(ledger === "whole" || ledger === "parts" ? { ledger } : {}),
  };
}
export class SettingsConflict extends Error {}
/** Diagnostic only, the negative controls: DX_ACT8_INJECT is a comma-separated list of the defences to drop. */
export const injected = (name: string) => (process.env.DX_ACT8_INJECT ?? "").split(",").includes(name);

/** The ledger mode a held account's settlement writes with: under any setting, in parts with the archive, whatever the
 * process names (a ledger in parts replaces a whole one, and one that fits one part is written exactly as a whole one,
 * so no process's mode can lock the account); with no setting, the process's own, as before. */
export function ledgerFor(settings: AccountSettings | undefined, own: LedgerSetting, _explicit: boolean): LedgerSetting {
  return settings ? "parts" : own;
}

/** Whether the stored settings already hold everything `w` may turn on (and the fields every transition writes). */
const holds = (stored: AccountSettings | undefined, w: Permits) =>
  Boolean(stored) && stored!.ledger === "parts" && stored!.archive === true &&
  (!w.accountKeys || stored!.accountKeys === true) && (!w.frameGuards || stored!.frameGuards === true) &&
  (!w.ledgerCap || stored!.ledgerCap === true);
const allowsAny = (w: Permits) => w.accountKeys || w.frameGuards || w.ledgerCap;
function merge(stored: AccountSettings | undefined, w: Permits): AccountSettings {
  return {
    v: 1,
    ...(stored?.accountKeys || w.accountKeys ? { accountKeys: true as const } : {}),
    ...(stored?.frameGuards || w.frameGuards ? { frameGuards: true as const } : {}),
    ...(stored?.ledgerCap || w.ledgerCap ? { ledgerCap: true as const } : {}),
    ledger: "parts",
    archive: true,
  };
}

/** [U6] Kept for the tests that model a new process: there is no per-process cache any more. */
export const forgetSettled = () => {};
/** Whether this process must turn a setting on, given the settings stored at its read (no read of its own). */
export const needsTransition = (s: Pick<Store, "held">, stored: AccountSettings | undefined) => {
  const w = permitsOf(s);
  return Boolean(s.held) && allowsAny(w) && !holds(stored, w);
};

/** Turns on, one way, the settings this process is allowed to turn on that the account does not have yet. Nothing at all
 * (not even a read) for a process allowed none, or for a store that is not a held account; one read otherwise. */
export async function ensureSettings(s: Store) {
  const w = permitsOf(s);
  if (!s.held || !allowsAny(w)) return undefined;
  for (let attempt = 0; attempt < 8; attempt++) {
    const p = await s.head();
    const c = await s.controls(p);
    if (!c.origin) return undefined; // not enrolled yet: the first Publish after enrolment turns them on
    if (holds(c.settings, w)) return c.settings;
    const next = merge(c.settings, w);
    const origin = namesOf(s).ORIGIN;
    // The removal sequence the fences were read under: the commit carries it as its ticket (as a settlement frame does),
    // so a removal on request that lands between this read and the commit refuses the transition, which reads again.
    const authority = await readErasure(s.comp);
    try {
      // A random command ID: no other account can compute it and claim it first, and the transition needs no recovery
      // by ID (it is read back from the origin itself).
      // DX_ACT8_INJECT=no-fence (diagnostic only, a negative control) leaves what was planned before unfenced.
      const fence = injected("no-fence") ? { ops: [], guards: [] } : await fences(s, p, c.releases, authority?.seq);
      const ops = [{ op: "retract" as const, id: c.origin.id }, fact(origin, "lazy/generation", { ...value(c.origin), settings: next }),
        ...fence.ops];
      // Guarded on the origin row and on every row it fences, each as read at `p`: a frame that writes one of them
      // between this read and the commit refuses the transition (it reads again), so a row is never written twice.
      await withErasure(authority?.seq, () => s.commit("account-settings:" + randomUUID(), "lazy/settings", ops,
        p, { settings: next }, undefined, undefined, [{ entityId: origin, tripleIds: [c.origin!.id] }, ...fence.guards]));
    } catch (e) {
      if (!(e instanceof Conflict) && !isConflict(e) && !/erasure|frontier/i.test(String((e as Error)?.name) + String((e as Error)?.message))) throw e;
    }
  }
  // Eight tries, each refused by a write to a row it fences: the settings stay as stored, and this process plans under
  // them (as a process allowed nothing does); its next plan tries again. Never a reason to refuse the plan itself.
  return (await s.controls(await s.head())).settings;
}
const isConflict = (e: unknown) => /conflict|changed|live triple/i.test(String((e as Error)?.message));

/**
 * [U5] What the transition writes beside the settings so that every write any build planned before it is refused at its
 * commit: the account's calendar row, rewritten with its own value (a guarded Publish carries an `EntityState` guard on
 * it, a whole-head Publish the head fence); every values progress row of an owed release that is still pending, and the
 * notice cursor, rewritten the same way (every frame under the progress precondition is guarded on its progress row; a
 * frame under the head precondition on the head); and for an owed release, or the account's notices, with no progress
 * row yet, the row a first frame would start from (`valuesProgress`, the fresh cursor), so a first frame planned before
 * is refused too. Every value is the one a reader already reads, so nothing a reader sees changes.
 */
async function fences(s: Store, p: number, releases: readonly { storage?: string; seq?: number }[], erasureSeq: number | undefined) {
  const [{ JoinedAccount }, { identityOf, valuesProgress, progressKey }] = await Promise.all([
    import("./account.ts"), import("./archive.ts")]);
  const docs = namesOf(s).documents;
  const joined = new Documents(s.comp, "joined" + docs),
    values = new Documents(s.comp, "settlement-values" + docs),
    notices = new Documents(s.comp, "settlement-notices" + docs);
  const ops: Op[] = [], guards: EntityGuard[] = [];
  const guard = (d: Documents, key: string, row: { id: string } | undefined) => guards.push({ entityId: d.prefix + key, tripleIds: row ? [row.id] : [] });
  const calendar = await joined.row("join-calendar", p);
  if (calendar) {
    ops.push(...joined.change("join-calendar", calendar, calendar.value));
    guard(joined, "join-calendar", calendar);
  }
  const a = new JoinedAccount(s);
  for (const rel of releases.filter((x) => x.storage === "owed")) {
    const key = progressKey(rel.seq!), row = await values.row<{ status: string }>(key, p);
    if (row) {
      if (row.value.status === "pending") {
        ops.push(...values.change(key, row, row.value));
        guard(values, key, row);
      }
    } else {
      const { marker, event } = await a.receipt(rel.seq!, p);
      ops.push(values.put(key, valuesProgress(identityOf(s.scope, marker, event.at))));
      guard(values, key, undefined);
    }
  }
  const cursor = await notices.row("notice-progress", p);
  if (cursor) {
    ops.push(...notices.change("notice-progress", cursor, cursor.value));
    guard(notices, "notice-progress", cursor);
  } else {
    const tail = (await a.notices.observe()).value.sequence;
    if (tail >= 1) {
      const t = (await a.notices.event(tail, p)).value;
      ops.push(notices.put("notice-progress", {
        epoch: t.epoch, event: 1, start: 0, batch: 0, entries: 0,
        parent: hash([a.db.prefix, t.epoch, t.census]), previous: hash([a.db.prefix, t.epoch, "receiver-genesis"]),
        ...(erasureSeq !== undefined ? { erasureSeq } : {}),
      }));
      guard(notices, "notice-progress", undefined);
    }
  }
  return { ops, guards };
}

/** The held account's origin row and stored settings at `p` (one row read), for a settlement frame. */
export async function originAt(s: Store, p: number) {
  if (!s.held) return { row: undefined, settings: undefined };
  const rows = await s.rows([namesOf(s).ORIGIN], p);
  const row = rows.find((r: { position: number }) => r.position > s.held!.cut);
  return { row, settings: row && p > s.held.cut ? originSettings(value(row), { profile: s.profile, held: s.held.seal }) : undefined };
}
