import assert from "node:assert/strict";
import { offers, sha, type Offer } from "../w1/field/schedule.ts";

export const seconds = 144;
export const fairSeconds = 60;
export const ceilingSeconds = 90;
// [DX-PREP1] Why: the four measured windows span the five-minute checkpoint period.
// Rejected: a four-minute capture that could miss its first timed checkpoint entirely.
export const tailSeconds = 90;
export const rates = [50, 235, 394, 620] as const;
export const widths = [1, 2, 4] as const;
export type Arm = {
  id: string;
  writers: number;
  writer: "K" | "S";
  reverse: boolean;
  credits?: 0 | 1 | 6;
  numericOwner?: boolean;
  prefetch?: boolean;
  cacheGiB?: 2 | 16;
  orderedIds?: boolean;
  tail?: "control" | "wal" | "zgc" | "fair";
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
export const storageOrderedArm: Arm = {
  id: "1-ordered-S",
  writers: 1,
  writer: "S",
  reverse: false,
  numericOwner: true,
  prefetch: false,
  cacheGiB: 2,
  orderedIds: true,
};
export const storageArms: Arm[] = [
  ...ownerArms.map((arm): Arm => ({ ...arm, cacheGiB: 2, prefetch: false })),
  {
    id: "1-prefetch-S",
    writers: 1,
    writer: "S",
    reverse: false,
    numericOwner: true,
    prefetch: true,
    cacheGiB: 2,
  },
  {
    id: "1-cache-S",
    writers: 1,
    writer: "S",
    reverse: false,
    numericOwner: false,
    prefetch: false,
    cacheGiB: 16,
  },
  storageOrderedArm,
];
export const ceilingArm: Arm = { ...storageOrderedArm, id: "1-ceiling-S" };
export const tailArms: Arm[] = (["control", "wal", "zgc", "fair"] as const).map((tail) => ({
  ...storageOrderedArm,
  id: `1-tail-${tail}-S`,
  tail,
  credits: tail === "fair" ? 6 : 0,
}));

export function tailPrediction(arm: Arm, rate: number, solo: boolean) {
  assert(arm.tail && (rate === 235 || rate === 394));
  // [DX-PREP1] Why: price storage changes separately from pauses and admission.
  // Rejected: forecasting that ZGC or fair turns eliminate an append blocked on durable I/O.
  const estimates = {
    // Rows: quiet solo, quiet ratio, solo append p99/max, loaded append p99/max.
    control: [
      [74, 4.3, 61, 82, 4.7, 233],
      [34, 3.5, 4.4, 34, 2.8, 168],
    ],
    wal: [
      [30, 1.7, 14, 35, 2.5, 120],
      [24, 1.6, 3, 25, 1.8, 85],
    ],
    zgc: [
      [72, 4.1, 58, 80, 4.5, 225],
      [33, 3.2, 4.2, 32, 2.7, 158],
    ],
    fair: [
      [74, 3, 61, 82, 4.6, 230],
      [34, 2.7, 4.4, 34, 2.8, 160],
    ],
  } as const;
  const [quietSoloP99Ms, ratio, soloP99, soloMax, loadedP99, loadedMax] =
    estimates[arm.tail][rate === 235 ? 0 : 1];
  return {
    quietSoloP99Ms,
    quietP99Ratio: solo ? 1 : ratio,
    appendP99Ms: solo ? soloP99 : loadedP99,
    appendMaxMs: solo ? soloMax : loadedMax,
  };
}
const ceilingVariants = [
  [620, 0],
  [620, 6],
  [900, 6],
  [900, 0],
] as const;
export const widePeople = 1900;
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

export function cells(
  arm: Arm,
  duration = arm.id === ceilingArm.id
    ? ceilingSeconds
    : arm.tail
      ? tailSeconds
      : shortened(arm)
        ? fairSeconds
        : seconds,
): {
  label: string;
  rate: number;
  tape: Offer[];
  duration: number;
  tapeSha: string;
  credits?: 0 | 6;
}[] {
  if (arm.id === ceilingArm.id)
    return ceilingVariants.flatMap(([rate, credits], band) => {
      // [DX-PREP1] Why: visit the account's working set broadly and give each treatment its own person band.
      // Rejected: replaying one hot tape onto both sides or claiming to reproduce a day in 90 seconds.
      const choose = (stream: Offer[]) =>
        stream.map((o, i) => ({
          ...o,
          person: ((band * widePeople + (i % widePeople)) * 7919 + o.account * 1291) % 100_000,
          ordinal: (Math.floor(i / widePeople) + o.ordinal) % 415,
        }));
      const quiet = choose(offers(3.5, duration, [0]));
      const remaining = rate * duration - quiet.length;
      const neighbors = Array.from({ length: 9 }, (_, n) => {
        const count = Math.floor(remaining / 9) + Number(n < remaining % 9);
        return choose(offers(count / duration, duration, [n + 1]));
      }).flat();
      const loaded = [...quiet, ...neighbors].sort(
        (a, b) => a.ms - b.ms || a.account - b.account || a.person - b.person,
      );
      assert.equal(loaded.length, rate * duration);
      return [quiet, loaded].map((tape, i) => ({
        label: `r${rate}-${credits ? "on" : "off"}-${i ? "loaded" : "alone"}`,
        rate,
        tape,
        duration,
        tapeSha: sha(tape),
        credits,
      }));
    });
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

export function storagePrediction(arm: Arm, rate: number, quietOnly: boolean) {
  const index = Number(rate === 394);
  const old = ownerPrediction(arm, rate, quietOnly);
  if (arm.orderedIds) {
    // [DX-PREP1] Why: keep residual native redundancy, owner checks and the one-save append in the price.
    // Rejected: projecting the Mac's near-zero history reads as a zero-read serial point.
    const solo = rate === 235 ? 45 : 22;
    const quietP99Ms = quietOnly ? solo : rate === 235 ? 550 : 950;
    return {
      serving: quietOnly ? 3.5 : rate === 235 ? 225 : 205,
      savesPerAppend: 1,
      p99Ms: quietOnly ? solo : null,
      quietP99Ms,
      quietRatio: quietP99Ms / solo,
      sqlReadsPerSave: quietOnly ? 2.6 : rate === 235 ? 2 : 2.2,
      nativeApplyMsPerSave: quietOnly ? 2.6 : rate === 235 ? 2.2 : 3.7,
    };
  }
  // [DX-PREP1] Why: price only the reads that the lookup trace says are movable.
  // Rejected: treating a 16 GiB cache or an attached hint as proof of a storage-free apply.
  const treatment = arm.prefetch
    ? {
        delivery: [125, 100],
        solo: [73, 20],
        loaded: [1320, 1690],
        sql: [11.3, 10.3],
        compute: [7, 8.7],
      }
    : arm.cacheGiB === 16
      ? {
          delivery: [210, 185],
          solo: [35, 12],
          loaded: [700, 880],
          sql: [2.2, 2.2],
          compute: [2.1, 3.6],
        }
      : null;
  const solo = treatment?.solo[index] ?? ownerPrediction(arm, rate, true).quietP99Ms;
  const quietP99Ms = quietOnly ? solo : (treatment?.loaded[index] ?? old.quietP99Ms);
  return {
    serving: quietOnly ? 3.5 : (treatment?.delivery[index] ?? old.serving),
    savesPerAppend: quietOnly || arm.writer === "S" ? 1 : 8,
    p99Ms: quietOnly ? solo : null,
    quietP99Ms,
    quietRatio: quietP99Ms / solo,
    sqlReadsPerSave: quietOnly
      ? arm.writer === "K"
        ? 14
        : (treatment?.sql[index] ?? (arm.numericOwner ? 9 : 10))
      : (treatment?.sql[index] ??
        (arm.writer === "K" ? 0.05 : (index ? 10 : 11) - Number(!!arm.numericOwner) * 0.7)),
    nativeApplyMsPerSave: quietOnly
      ? arm.writer === "K"
        ? 12
        : (treatment?.compute[index] ?? (arm.numericOwner ? 6.3 : 6.9))
      : (treatment?.compute[index] ??
        (arm.writer === "K" ? 0.19 : (index ? 8.62 : 6.91) - Number(!!arm.numericOwner) * 0.5)),
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
