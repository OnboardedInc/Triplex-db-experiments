import assert from "node:assert/strict";
import { offers, sha, type Offer } from "../w1/field/schedule.ts";

export const seconds = 144;
export const rates = [50, 235, 394, 620] as const;
export const widths = [1, 2, 4] as const;
export const arms = widths.flatMap((writers) =>
  (["K", "S", "S", "K"] as const).map((writer, repeat) => ({
    id: `${writers}-${repeat}-${writer}`,
    writers,
    writer,
    reverse: repeat % 2 === 1,
  })),
);
export type Arm = (typeof arms)[number];
export const operation = (label: string, ordinal: number) => `${label}-${ordinal}`;

export function cells(arm: Arm, duration = seconds) {
  const quiet = offers(3.5, duration, [0]);
  return rates
    .flatMap((rate) => {
      const remaining = rate * duration - quiet.length;
      const load: Offer[] = [...quiet];
      // [DX-PREP1] Why: reuse W1's field-save person, subtask and payload tape, holding the sentinel fixed.
      // Rejected: scaling the quiet stream with gross offered load.
      for (let a = 1; a < 10; a++) {
        const n = Math.floor(remaining / 9) + Number(a <= remaining % 9);
        load.push(...offers(n / duration, duration, [a]));
      }
      load.sort((a, b) => a.ms - b.ms || a.account - b.account || a.person - b.person);
      assert.equal(load.length, rate * duration);
      const alone = { label: `r${rate}-alone`, rate, tape: quiet, duration };
      const loaded = { label: `r${rate}-loaded`, rate, tape: load, duration };
      return arm.reverse ? [loaded, alone] : [alone, loaded];
    })
    .map((cell) => ({ ...cell, tapeSha: sha(cell.tape) }));
}

export function prediction(writers: number, writer: string, rate: number, quietOnly: boolean) {
  if (quietOnly) return { serving: 3.5, p99Ms: writer === "K" ? 10 : 8.8, quietRatio: 1 };
  const capacity = writer === "K" ? 255 : writers === 1 ? 383 : 697;
  const serving = Math.min(capacity, rate);
  const serviceMs =
    writer === "K"
      ? 30
      : ({ 50: 27.34, 235: 27.48, 394: 28, 620: 28.36 } as Record<number, number>)[rate]!;
  const queueMs = Math.max(0, rate / capacity - 1) * seconds * 990;
  // [DX-PREP1] Why: make saturated cells refutable on both completion rate and queue growth.
  // Rejected: reporting modeled service time as offer-to-ACK p99 above the modeled ceiling.
  const quietRatio =
    writer === "K"
      ? ({ 50: 4.2, 235: 13.76, 394: 14.53, 620: 22 } as Record<number, number>)[rate]!
      : ({ 50: 1.11, 235: 1.19, 394: 1.22, 620: 1.26 } as Record<number, number>)[rate]!;
  return {
    serving,
    p99Ms: Number((serviceMs + queueMs).toFixed(2)),
    quietRatio,
    assumesAppends: writer === "S" ? (writers === 1 ? 1 : 2) : null,
  };
}
