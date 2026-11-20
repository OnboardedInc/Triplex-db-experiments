import assert from "node:assert/strict";
import { offers, sha, type Offer } from "../w1/field/schedule.ts";

export const seconds = 144;
export const fairSeconds = 60;
export const rates = [50, 235, 394, 620] as const;
export const widths = [1, 2, 4] as const;
export type Arm = {
  id: string;
  writers: number;
  writer: "K" | "S";
  reverse: boolean;
  credits?: 0 | 1;
  numericOwner?: boolean;
};
export const arms: Arm[] = widths.flatMap((writers) =>
  (["K", "S", "S", "K"] as const).map((writer, repeat) => ({
    id: `${writers}-${repeat}-${writer}`,
    writers,
    writer,
    reverse: repeat % 2 === 1,
  })),
);
// [DX-PREP1] Why: two peers match the four-peer capacity forecast with half the processes.
// Rejected: picking a width after seeing the original measured rows.
export const fairArms: Arm[] = [
  { id: "1-off-S", writers: 1, writer: "S", reverse: false, credits: 0 },
  { id: "1-on-S", writers: 1, writer: "S", reverse: false, credits: 1 },
  { id: "2-on-S", writers: 2, writer: "S", reverse: true, credits: 1 },
  { id: "2-off-S", writers: 2, writer: "S", reverse: true, credits: 0 },
];
export const ownerArms: Arm[] = [
  { id: "1-group-K", writers: 1, writer: "K", reverse: false, numericOwner: false },
  { id: "1-old-S", writers: 1, writer: "S", reverse: false, numericOwner: false },
  { id: "1-fixed-S", writers: 1, writer: "S", reverse: false, numericOwner: true },
];
const shortened = (arm: Arm) => arm.credits !== undefined || arm.numericOwner !== undefined;
export const operation = (label: string, ordinal: number) => `${label}-${ordinal}`;

function newCells(arm: Arm, duration: number) {
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

export function cells(arm: Arm, duration = shortened(arm) ? fairSeconds : seconds) {
  if (!shortened(arm)) return newCells(arm, duration);
  return newCells(arm, seconds)
    .filter(({ rate }) => rate === 235 || rate === 394)
    .map((cell) => {
      const alone = cell.label.endsWith("-alone");
      const quietCount = Math.round(3.5 * duration);
      const remaining = alone ? 0 : cell.rate * duration - quietCount;
      // [DX-PREP1] Why: every shortened arm must edit predecessors from the existing sealed population.
      // Rejected: drawing new random subject lanes at a different duration.
      const tape = Array.from({ length: alone ? 1 : 10 }, (_, account) => {
        const count =
          account === 0 ? quietCount : Math.floor(remaining / 9) + Number(account <= remaining % 9);
        const prefix = cell.tape.filter((o) => o.account === account).slice(0, count);
        assert.equal(prefix.length, count);
        const divisor = Math.max(1, (prefix.at(-1)?.ms ?? 0) / (duration * 1000 - 1));
        return prefix.map((o) => ({ ...o, ms: o.ms / divisor }));
      })
        .flat()
        .sort((a, b) => a.ms - b.ms || a.account - b.account || a.person - b.person);
      assert.equal(tape.length, alone ? quietCount : cell.rate * duration);
      return { ...cell, duration, tape, tapeSha: sha(tape) };
    });
}

export function fairPrediction(arm: Arm, rate: number, quietOnly: boolean) {
  const capacity = arm.credits ? 125 : arm.writers === 1 ? 383 : 697;
  const quietP99Ms = quietOnly
    ? 8.8
    : arm.credits
      ? rate === 235
        ? 22
        : 25
      : rate === 235
        ? 10.47
        : 10.74;
  return {
    serving: quietOnly ? 3.5 : Math.min(capacity, rate),
    savesPerAppend: quietOnly || arm.credits || arm.writers === 1 ? 1 : 2,
    p99Ms: quietOnly ? 8.8 : rate > capacity ? null : rate === 235 ? 27.48 : 28,
    quietP99Ms,
    quietRatio: Number((quietP99Ms / 8.8).toFixed(2)),
  };
}

export function ownerPrediction(arm: Arm, rate: number, quietOnly: boolean) {
  const first = rate === 235;
  const solo = arm.writer === "K" ? (first ? 119 : 37) : first ? 63 : 17;
  const serving =
    arm.writer === "K"
      ? first
        ? 180
        : 182
      : arm.numericOwner
        ? first
          ? 146
          : 115
        : first
          ? 141
          : 111;
  const quietP99Ms = quietOnly
    ? solo
    : arm.writer === "K"
      ? first
        ? 341
        : 294
      : arm.numericOwner
        ? first
          ? 1120
          : 1430
        : first
          ? 1169
          : 1474;
  return {
    serving: quietOnly ? 3.5 : serving,
    p99Ms: quietOnly ? solo : null,
    quietP99Ms,
    quietRatio: quietP99Ms / solo,
  };
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
