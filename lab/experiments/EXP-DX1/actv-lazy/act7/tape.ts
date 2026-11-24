import assert from "node:assert/strict";
import type { DatomicClient } from "../../../../../packages/datomic/dist/index.js";
import { accountSaves, personOf } from "../../w1/field/production.ts";
import { task, type Write } from "../../scale1/decision/plan.ts";
import { isProduction, productionBand, productionNeighbours, productionParams, productionPredecessors, sortTape,
  type AgedCut, type ProductionWrite } from "../../v01/production-card.ts";
import { preload } from "../../v01/adopted.ts";
import type { AdoptedSeed } from "../../v01/adopt.ts";

// [DX-ACT7] Why: the owner's save shape is one commit per subject's save (2026-11-24), and the card's new-run tape is
// production-S without the end-of-cell burst. The held runner played Saturday-style held saves. With
// `DX_ACT7_TAPE=production-S[:ROWS]` (default off; ROWS form rows per second over all ten accounts, default 394, REAL2's
// band for that rate) every case's saves are that tape: the nine neighbour accounts exactly as the card builds them
// (`productionNeighbours`, shape S, edge "spread"), and account 0 from the same process (`accountSaves`, `personOf`)
// with its tenth of the rows, so every account, publishing or not, saves throughout. Predecessors are every task-0
// field of every subject the tape writes, checked as the card checks them (`productionPredecessors`; on an aged copy
// AGE1's rows against its replay tape).
// Rejected: the card's quiet stream for account 0 (it is Saturday's shape) and leaving the publishing account without
// saves (the run is about settling beside the account's own saves).
export type HeldTape = { kind: "held" } | { kind: "production-S"; rows: number };
export function heldTapeKind(value = process.env.DX_ACT7_TAPE): HeldTape {
  if (value === undefined || value === "" || value === "held") return { kind: "held" };
  const m = /^production-S(?::(\d+(?:\.\d+)?))?$/.exec(value);
  assert(m, "DX_ACT7_TAPE is held or production-S[:ROWS]");
  const rows = Number(m[1] ?? 394);
  assert(rows >= 10 && rows <= 2000);
  return { kind: "production-S", rows };
}

export function productionHeldTape(people: number, rows: number, seconds: number, label: string): ProductionWrite[] {
  const { params } = productionParams();
  const band = productionBand(rows);
  const total = Math.round(rows * seconds);
  const targets = Array.from({ length: 10 }, (_, a) => Math.floor(total / 10) + Number(a < total % 10));
  // The toy folds each tape subject onto one of its few people per account, in order of first appearance (as the card).
  const folded = new Map<string, number>(), perAccount = new Map<number, number>();
  const fold = people < 100_000 ? (account: number, person: number) => {
    const key = account + "/" + person;
    if (!folded.has(key)) {
      const n = perAccount.get(account) ?? 0;
      folded.set(key, n % people);
      perAccount.set(account, n + 1);
    }
    return folded.get(key)!;
  } : undefined;
  const neighbours = productionNeighbours("S", rows, targets.slice(1), seconds, label, fold, "spread");
  const own: ProductionWrite[] = [];
  if (targets[0]) {
    const { saves } = accountSaves(params, band, 0, targets[0], seconds, "spread");
    for (const [index, save] of saves.entries()) {
      const tapePerson = personOf(params, band, 0, save.person);
      const person = fold ? fold(0, tapePerson) : tapePerson;
      const slots = Array.from({ length: save.rows }, (_, r) => [r, ...(save.extras[r] ? [100 + r] : [])]).flat();
      own.push({ account: 0, ordinal: own.length, subject: person, ms: save.t * 1000, width: slots.length,
        version: [label, 0, own.length].join("/"), owner: task(0, person), person, slots, saveKey: "0/" + index,
        rows: save.rows, gap: save.gap });
    }
  }
  return sortTape([...own, ...neighbours] as Write[]) as ProductionWrite[];
}

/** Senders for a production tape: every task-0 field of every subject it writes, read and checked at `head`. */
export async function productionSenders(writer: DatomicClient, seed: AdoptedSeed, head: number, tape: ProductionWrite[],
  aged?: { cut: AgedCut; head: number }) {
  assert(tape.every(isProduction));
  const senders = await preload(writer, seed, head, []);
  const predecessors = await productionPredecessors(writer, seed.scope.db, head, seed.scope.cut,
    tape.map((e) => ({ account: e.account, person: e.person })), aged);
  const accountOf = new Map(tape.map((e) => [e.owner, e.account]));
  for (const [entity, rows] of predecessors.fields) senders[accountOf.get(entity)!]!.rows.set(entity, rows);
  return { senders, counts: predecessors.counts };
}
