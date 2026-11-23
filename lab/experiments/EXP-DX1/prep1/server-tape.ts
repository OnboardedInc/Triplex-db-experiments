import assert from "node:assert/strict";
import { rollingWidths, type Admission } from "./rolling-credits.ts";
import { cache32ArmIds, tx5ArmId } from "./rolling-launch.mjs";
import { offers, sha, type Offer } from "../w1/field/schedule.ts";

export const seconds = 144;
export const fairSeconds = 60;
export const ceilingSeconds = 90;
export const rollingSeconds = 300;
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
  cacheGiB?: 2 | 16 | 32;
  orderedIds?: boolean;
  tail?: "control" | "wal" | "zgc" | "fair" | "combined";
  scale?: "base" | "cache" | "wal-zgc";
  admission?: Admission;
  writeJvm?: "j25-zgc";
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
export const rollingArms: Arm[] = [
  { ...ceilingArm, cacheGiB: 16, id: "1-barrier6-S", admission: { mode: "barrier", credits: 6 } },
  ...rollingWidths.map((credits): Arm => ({
    ...ceilingArm, cacheGiB: 16, id: `1-rolling${credits}-S`, admission: { mode: "rolling", credits },
  })),
];
export const rollingTx5Arm: Arm = { ...rollingArms.find((arm) => arm.id === "1-rolling6-S")!, id: tx5ArmId };
export const rollingCache32Arms: Arm[] = cache32ArmIds.map((id) => ({ ...rollingTx5Arm, id, cacheGiB: 32 }));

export function freshArms(credits: number): Arm[] {
  assert(credits === 6 || credits === 12);
  const control = rollingArms.find((arm) => arm.id === `1-rolling${credits}-S`)!;
  const fresh = { ...control, id: `1-fresh${credits}-S`, admission: { ...control.admission!, freshFirst: true } };
  return [control, fresh, { ...fresh, id: `1-fresh-zgc${credits}-S`, writeJvm: "j25-zgc" }];
}

export function rollingPrediction(arm: Arm, rate: number, alone: boolean, nextCampaign = false) {
  assert(arm.admission);
  const band = [235, 394, 620].indexOf(rate);
  assert(band >= 0);
  // [DX-PREP1] Why: estimate saturated latency with backlog and the 30 s expiry, on the scheduled-offer clock.
  // Rejected: treating native service p99 as client p99 when offered load exceeds goodput.
  const forecasts: Record<string, number[][]> = {
    "1-barrier6-S": [
      [235, 235, 24, 1600, 12, 110, 18, 75],
      [351, 367, 16500, 30020, 23200, 30020, 15, 73],
      [340, 355, 29910, 30040, 29950, 30040, 17, 84],
    ],
    "1-rolling6-S": [
      [235, 235, 11, 95, 10, 64, 18, 36],
      [381, 388, 4500, 10400, 7000, 10400, 15, 36],
      [388, 402, 29920, 30035, 29960, 30035, 17, 43],
    ],
    "1-rolling8-S": [
      [235, 235, 10, 78, 10, 60, 18, 37],
      [391, 394, 150, 1900, 16, 350, 15, 39],
      [415, 427, 29900, 30035, 29950, 30035, 17, 46],
    ],
    "1-rolling12-S": [
      [235, 235, 10, 67, 10, 55, 18, 38],
      [394, 394, 18, 105, 16, 80, 15, 43],
      [447, 462, 29850, 30030, 29950, 30030, 17, 53],
    ],
    "1-rolling16-S": [
      [235, 235, 10, 70, 10, 55, 18, 39],
      [394, 394, 20, 125, 17, 90, 15, 49],
      [460, 475, 29800, 30035, 29940, 30035, 17, 66],
    ],
    [tx5ArmId]: [
      [],
      [394, 394, 22, 900, 9, 300, 21, 49],
      [478, 500, 29_700, 30_025, 29_820, 30_025, 15, 55],
    ],
    [cache32ArmIds[0]]: [[], [394, 394, 11, 280, 8, 90, 19, 47], [495, 515, 28_500, 30_025, 29_750, 30_025, 15, 50]],
    [cache32ArmIds[1]]: [[], [394, 394, 9, 170, 7, 60, 19, 43], [520, 540, 26_500, 30_025, 29_600, 30_025, 15, 48]],
  };
  // The reserved debt lane can leave a long tail in the original offer cohort.
  const fresh = arm.writeJvm
    ? [[235, 235, 5, 400, 5, 29, 21, 35], [393, 394, 9, 300, 8, 48, 18, 45], [468, 483, 21, 29_980, 20, 29_980, 14, 49]]
    : [[235, 235, 6, 1200, 5, 39, 30, 42], [392, 394, 10, 1300, 9, 85, 21, 53], [454, 480, 24, 29_990, 23, 29_990, 15, 57]];
  const rolling6Repeat = [
    [235, 235, 5, 2600, 5, 34, 30, 44],
    [392, 392, 640, 6000, 320, 5100, 21, 54],
    [454, 485, 29_730, 30_025, 29_820, 30_025, 15, 62],
  ];
  const forecast = (arm.admission.freshFirst ? fresh :
    nextCampaign && arm.id === "1-rolling6-S" ? rolling6Repeat : forecasts[arm.id])?.[band];
  assert(forecast);
  const [serving, secondHalfServing, p50, p99, secondP50, secondP99, quietSolo, quietLoaded] = forecast;
  return alone ? { serving: 3.5, secondHalfServing: 3.5, p50: 7, p99: quietSolo,
    secondP50: 7, secondP99: quietSolo, quietP99: quietSolo } :
    { serving, secondHalfServing, p50, p99, secondP50, secondP99, quietP99: quietLoaded };
}
export const scaleArms: Arm[] = (["base", "cache", "wal-zgc"] as const).map((scale) => ({
  ...storageOrderedArm,
  id: `1-scale-${scale}-S`,
  scale,
  cacheGiB: scale === "base" ? 2 : 16,
  credits: 6,
}));

export function scalePrediction(arm: Arm, rate: number, solo: boolean) {
  assert(arm.scale && (rate === 394 || rate === 620));
  // [DX-PREP1] Why: predict the loaded rate separately from the cold quiet path.
  // Rejected: carrying the small-seed zero-read or ratio forecast to 1,900-person neighbour bands.
  const estimates = {
    // Loaded delivery, quiet solo p99, loaded ratio, solo SQL reads/save, loaded SQL reads/save.
    base: [[277, 135, 1.40, 2.5, 1.55], [273, 155, 1.40, 2.5, 1.55]],
    cache: [[365, 91, 1.50, 1.5, 0.45], [405, 100, 1.50, 1.5, 0.58]],
    "wal-zgc": [[394, 21, 1.32, 1.5, 0.45], [440, 20, 1.68, 1.5, 0.58]],
  } as const;
  const [serving, quietSoloP99Ms, ratio, soloReads, loadedReads] = estimates[arm.scale][rate === 394 ? 0 : 1];
  return { serving: solo ? 3.5 : serving, quietSoloP99Ms, quietP99Ratio: solo ? 1 : ratio,
    sqlReadsPerSave: solo ? soloReads : loadedReads, maximumAwaitingReceipt: 6 };
}
export const tailArms: Arm[] = (["control", "wal", "zgc", "fair"] as const).map((tail) => ({
  ...storageOrderedArm,
  id: `1-tail-${tail}-S`,
  tail,
  credits: tail === "fair" ? 6 : 0,
}));
export const tailCombinedArm: Arm = {
  ...storageOrderedArm, id: "1-tail-combined-S", tail: "combined", credits: 6,
};

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
    combined: [
      [13, 1.54, 2, 14, 2.3, 32],
      [9, 1.89, 1.3, 12, 2.6, 42],
    ],
  } as const;
  const [quietSoloP99Ms, ratio, soloP99, soloMax, loadedP99, loadedMax] =
    estimates[arm.tail][rate === 235 ? 0 : 1];
  return {
    ...(arm.tail === "combined" ? { serving: solo ? 3.5 : rate, expired: 0 } : {}),
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
  duration = arm.admission ? rollingSeconds : arm.id === ceilingArm.id || arm.scale
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
  credits?: number;
}[] {
  if (arm.id === ceilingArm.id || arm.scale || arm.admission) {
    const variants = arm.admission
      ? [235, 394, 620].map((rate) => [rate, arm.admission!.credits] as const)
      : arm.scale ? ([[394, 6], [620, 6]] as const) : ceilingVariants;
    return variants.flatMap(([rate, credits], band) => {
      // [DX-PREP1] Why: keep the 394 and 620 person bands identical to the three-rate control.
      // Rejected: removing 235 before assigning the stable person bands.
      if ((arm.id === tx5ArmId || cache32ArmIds.includes(arm.id)) && rate === 235) return [];
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
        label: arm.admission ? `r${rate}-${i ? "loaded" : "alone"}` :
          `r${rate}-${credits ? "on" : "off"}-${i ? "loaded" : "alone"}`,
        rate,
        tape,
        duration,
        tapeSha: sha(tape),
        credits,
      }));
    });
  }
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
