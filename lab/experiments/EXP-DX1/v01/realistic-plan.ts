import assert from "node:assert/strict";
import { offers } from "../w1/field/schedule.ts";
import type { Account, Profile } from "../real1/population.ts";
import type { Write } from "../scale1/decision/plan.ts";

export const realPin = "3c618698e4035e341124203df806d49b162992fb";
export const sweepSize = (profile: Profile) => profile === "toy" ? 25 : 10_000;
export const thinLimit = (a: Account, profile: Profile) =>
  Math.min(a.people, 1_000_000) - sweepSize(profile) - 2;

type Roster = { accounts: Account[]; profile: Profile };
const hash = (n: number) => Math.imul(n ^ (n >>> 16), 0x45d9f3b) >>> 0;
export function realisticSubject(seed: Roster, n: number) {
  const lane = n % 20, round = Math.floor(n / 20);
  const accounts = seed.accounts;
  const account = lane < 16 ? accounts[1 + ((round * 16 + lane) % 9)]! :
    lane < 19 ? accounts[10]! : accounts[11 + round % (accounts.length - 11)]!;
  const size = account.kind === "thin" ? thinLimit(account, seed.profile) : account.people;
  const pool = (n + account.id) % 20 === 0 ? size : Math.max(1, Math.floor(size / 50));
  return { account, person: hash(n + 763) % pool };
}

// [DX-V01] Why: put REAL1's 80/15/5 mix on the same open-loop ceiling and ordered sender.
// Rejected: substituting the companion's separate command sizes, appender or 58/s burst for the matched scorecard.
export function realisticTape(seed: Roster, label: string, seconds: number, busyRate: number): Write[] {
  const quiet = offers(3.5, seconds, [0]).map((o, i) => ({
    account: 0, ordinal: i, subject: hash(i + 7) % seed.accounts[0]!.people,
    ms: o.ms, width: o.extra ? 2 : 1, version: label + "/q/" + i,
  }));
  const busy = busyRate === 0 ? [] : offers(busyRate, seconds, [1]).map((o, i) => {
    const { account, person } = realisticSubject(seed, i);
    return { account: account.id, ordinal: i, subject: person, ms: o.ms,
      width: account.kind === "thin" ? 1 : o.extra ? 2 : 1, version: label + "/b/" + i };
  });
  assert(busy.length === Math.round(busyRate * seconds));
  return [...quiet, ...busy].sort((a, b) => a.ms - b.ms || a.account - b.account || a.ordinal - b.ordinal);
}
