import { FairTurns } from "./fair-turns.ts";
import { creditModes, defaultCreditMode, type CreditMode } from "../jvm1/launch.mjs";
import { overdueGrantInterval } from "./deadline-order.ts";

type Ready = { account: number; due: number; overdue?: boolean };
// [DX-PREP1] freshFirst is PREP1's fresh-first arm (dropped after it missed its falsifier); default off.
export type Admission = { mode: "barrier" | "rolling"; credits: number; quietAccount?: number; freshFirst?: boolean };
export interface CreditScheduler {
  dispatch<T extends Ready>(ready: () => readonly T[], submit: (save: T, ticket: number, neighboursAhead?: number) => void): void;
  resolved(known: boolean, ticket?: number): void;
}
export const rollingWidths = [6, 8, 12, 16] as const;

// [DX-PREP1] Why: keep a credit free for quiet arrivals and release each live ticket on its own settlement.
// Rejected: lending the last slot to neighbours (a quiet save would have to wait for a neighbour ACK).
export class RollingCredits {
  private sequence = 0;
  private uncertain = false;
  private readonly active = new Map<number, number>();
  private readonly recent: number[] = [];
  private readonly served: number[];
  private neighbours = 0;
  private freshGrants = 0;

  private readonly accountCount: number;
  private readonly credits: number;
  private readonly quietAccount: number;
  private readonly freshFirst: boolean;
  constructor(accountCount: number, credits: number, quietAccount: number, freshFirst = false) {
    this.accountCount = accountCount;
    this.credits = credits;
    this.quietAccount = quietAccount;
    this.freshFirst = freshFirst;
    if (!rollingWidths.some((width) => width === credits) ||
        !Number.isInteger(quietAccount) || quietAccount < 0 || quietAccount >= accountCount) {
      throw new RangeError("Invalid rolling credit count or quiet account");
    }
    this.served = Array<number>(accountCount).fill(0);
  }

  dispatch<T extends Ready>(
    ready: () => readonly T[],
    submit: (save: T, ticket: number, neighboursAhead?: number) => void,
  ) {
    while (!this.uncertain && this.active.size < this.credits) {
      let next: T | undefined;
      const preferOverdue = this.freshGrants >= overdueGrantInterval - 1;
      for (const save of ready()) {
        if (save.account === this.quietAccount) {
          next = save;
          break;
        }
        if (this.neighbours >= this.credits - 1) continue;
        if (next && this.freshFirst && Boolean(save.overdue) !== Boolean(next.overdue)) {
          if (Boolean(save.overdue) === preferOverdue) next = save;
          continue;
        }
        if (!next || this.served[save.account]! < this.served[next.account]! ||
            (this.served[save.account] === this.served[next.account] && save.due < next.due)) {
          next = save;
        }
      }
      if (!next) return;
      const ahead = this.neighbours;
      const ticket = ++this.sequence;
      this.active.set(ticket, next.account);
      if (next.account !== this.quietAccount) {
        this.neighbours++;
        if (this.freshFirst) this.freshGrants = next.overdue ? 0 : Math.min(overdueGrantInterval - 1, this.freshGrants + 1);
      }
      this.recent.push(next.account);
      this.served[next.account]!++;
      if (this.recent.length > this.accountCount) this.served[this.recent.shift()!]!--;
      submit(next, ticket, ahead);
    }
  }

  resolved(known: boolean, ticket?: number) {
    const account = ticket === undefined ? undefined : this.active.get(ticket);
    if (account === undefined) throw new Error("Settled an unknown or released credit");
    this.active.delete(ticket!);
    if (account !== this.quietAccount) this.neighbours--;
    // [DX-PREP1] Why: an unresolved durable outcome closes ingress just as it closes a barrier.
    // Rejected: letting a later acknowledgement reopen the write window before receipt recovery.
    if (!known) this.uncertain = true;
  }
}

export function admission(accountCount: number, selection: Admission): CreditScheduler {
  if (selection.freshFirst && selection.mode !== "rolling")
    throw new Error("Fresh-first admission requires rolling credits");
  return selection.mode === "rolling"
    ? new RollingCredits(accountCount, selection.credits, selection.quietAccount ?? 0, selection.freshFirst)
    : new FairTurns(accountCount, selection.credits, selection.quietAccount);
}

export function creditModeSelection(mode: CreditMode = defaultCreditMode): Admission {
  if (!creditModes.includes(mode)) throw new RangeError("Unknown credit mode");
  return mode === defaultCreditMode
    ? { mode: "barrier", credits: 6 }
    : { mode: "rolling", credits: Number(mode.slice("rolling".length)) };
}
