// [DX-ACT8, second review] The held account's one-way settings (PUBLISH-BESIDE-SAVES.md section 0.8).
//
// Where they live: the account's origin fact (`namesOf(s).ORIGIN`, attribute `lazy/generation`), field `settings`. Every
// Publish plan and every settlement frame already reads that fact (`controls`); a build from before this change compares
// it exactly with `{ profile, held }` and so refuses the account once a setting is on (it cannot publish twice or write an
// unguarded frame there). Every guarded Publish and every settlement frame under the progress precondition is also
// guarded on the origin row, so nothing planned under the old settings commits after the transition.
//
// The transition: a process allowed to turn a setting on (TX2_ACCOUNT_KEYS, TX2_SETTLE_FRAME_GUARDS,
// TX2_LEDGER_CAP_AT_PUBLISH) rewrites the origin with the merged settings, guarded on the origin row it read. Settings
// only turn on; the ledger mode is recorded at the first transition (TX2_NOTICE_LEDGER of that process, whole if unset)
// and may only go from whole to parts. A process with none of the three variables never writes a setting.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Conflict, fact, namesOf, originSettings, value, type AccountSettings, type Store } from "../store.ts";

export type LedgerSetting = "whole" | "parts";
const wanted = () => ({
  accountKeys: process.env.TX2_ACCOUNT_KEYS === "1",
  frameGuards: process.env.TX2_SETTLE_FRAME_GUARDS === "1",
  ledgerCap: process.env.TX2_LEDGER_CAP_AT_PUBLISH === "1",
});
export class SettingsConflict extends Error {}

/** The ledger mode a held account's settlement must write with: the stored one when the account has settings (a process
 * whose own explicit mode differs refuses), otherwise the process's own, as before. */
export function ledgerFor(settings: AccountSettings | undefined, own: LedgerSetting, explicit: boolean): LedgerSetting {
  if (!settings?.ledger) return own;
  if (explicit && own !== settings.ledger)
    throw new SettingsConflict("This account's stored ledger mode is " + settings.ledger + "; this process writes " + own +
      " ledgers (TX2_NOTICE_LEDGER): it refuses to settle the account");
  return settings.ledger;
}

function merge(stored: AccountSettings | undefined) {
  const w = wanted(), env = process.env.TX2_NOTICE_LEDGER;
  const ledger: LedgerSetting = stored?.ledger === "parts" || env === "parts" ? "parts" : stored?.ledger ?? "whole";
  if (stored?.ledger === "parts" && env === "whole")
    throw new SettingsConflict("This account's stored ledger mode is parts; this process has TX2_NOTICE_LEDGER=whole");
  const next: AccountSettings = {
    v: 1,
    ...(stored?.accountKeys || w.accountKeys ? { accountKeys: true as const } : {}),
    ...(stored?.frameGuards || w.frameGuards ? { frameGuards: true as const } : {}),
    ...(stored?.ledgerCap || w.ledgerCap ? { ledgerCap: true as const } : {}),
    ledger,
  };
  return next;
}

/** Turns on, one way, the settings this process is allowed to turn on that the account does not have yet. Nothing at all
 * (not even a read) for a process allowed none, or for a store that is not a held account. */
const settled = new Set<string>();
export async function ensureSettings(s: Store) {
  const w = wanted();
  if (!s.held || !(w.accountKeys || w.frameGuards || w.ledgerCap)) return undefined;
  // Settings only turn on, so once this process has seen them hold everything it may turn on, it need not look again.
  const key = JSON.stringify([s.scope, s.held.account, s.held.seal, w, process.env.TX2_NOTICE_LEDGER ?? null]);
  if (settled.has(key)) return undefined;
  for (let attempt = 0; attempt < 8; attempt++) {
    const p = await s.head();
    const c = await s.controls(p);
    if (!c.origin) return undefined; // not enrolled yet: the first Publish after enrolment turns them on
    const next = merge(c.settings);
    if (c.settings && JSON.stringify(sorted(c.settings)) === JSON.stringify(sorted(next))) {
      settled.add(key);
      return c.settings;
    }
    const origin = namesOf(s).ORIGIN;
    try {
      // A random command ID: no other account can compute it and claim it first, and the transition needs no recovery
      // by ID (it is read back from the origin itself).
      await s.commit("account-settings:" + randomUUID(), "lazy/settings",
        [{ op: "retract", id: c.origin.id }, fact(origin, "lazy/generation", { ...value(c.origin), settings: next })],
        p, { settings: next }, undefined, undefined, [{ entityId: origin, tripleIds: [c.origin.id] }]);
    } catch (e) {
      if (!(e instanceof Conflict) && !isConflict(e)) throw e;
    }
  }
  const c = await s.controls(await s.head());
  assert(c.settings, "The account's settings could not be turned on");
  return c.settings;
}
const sorted = (x: object) => Object.fromEntries(Object.entries(x).sort(([a], [b]) => a.localeCompare(b)));
const isConflict = (e: unknown) => /conflict|changed|live triple/i.test(String((e as Error)?.message));

/** The held account's origin row and stored settings at `p` (one row read), for a settlement frame. */
export async function originAt(s: Store, p: number) {
  if (!s.held) return { row: undefined, settings: undefined };
  const rows = await s.rows([namesOf(s).ORIGIN], p);
  const row = rows.find((r: { position: number }) => r.position > s.held!.cut);
  return { row, settings: row && p > s.held.cut ? originSettings(value(row), { profile: s.profile, held: s.held.seal }) : undefined };
}
