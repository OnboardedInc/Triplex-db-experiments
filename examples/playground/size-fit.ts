import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { minuteSaves } from "./bundle.ts";
import { personAt } from "./fixture.ts";
import { catalogs } from "./model.ts";
import { snapshotProfiles, type Shape } from "./snapshot.ts";

type Sample = {
  plan: Shape;
  timingClass: string;
  sourceHead: string;
  initialFacts: number;
  saves: number;
  downloadBytes: number;
  databaseBytes: number;
  replayMs: number;
  restoreMs: number;
  firstReadMs: number;
  restorePeaks: Record<string, number | null>;
};
type Metric = "downloadBytes" | "databaseBytes" | "replayMs" | "restoreMs";
type Data = Pick<Sample, "initialFacts" | "saves">;
const features = (s: Data) => [1, s.initialFacts / 10_000, s.saves / 1000];

function solve(matrix: number[][]) {
  for (let i = 0; i < matrix.length; i++) {
    let pivot = i;
    for (let j = i + 1; j < matrix.length; j++)
      if (Math.abs(matrix[j]![i]!) > Math.abs(matrix[pivot]![i]!)) pivot = j;
    [matrix[i], matrix[pivot]] = [matrix[pivot]!, matrix[i]!];
    const scale = matrix[i]![i]!;
    if (Math.abs(scale) < 1e-9) return undefined;
    matrix[i] = matrix[i]!.map((value) => value / scale);
    for (let j = 0; j < matrix.length; j++) {
      if (j === i) continue;
      const factor = matrix[j]![i]!;
      matrix[j] = matrix[j]!.map((value, k) => value - factor * matrix[i]![k]!);
    }
  }
  return matrix.map((row) => row.at(-1)!);
}

function fit(rows: Sample[], metric: Metric) {
  const x = rows.map(features);
  const y = rows.map((row) => row[metric]);
  let best: { coeffs: number[]; squaredError: number } | undefined;
  // [DX-PLAY1] Why: fixed, current-fact and save terms cannot shrink a larger snapshot.
  // Rejected: extrapolating negative least-squares coefficients from a small noisy ladder.
  for (let mask = 1; mask < 8; mask++) {
    const select = [0, 1, 2].filter((k) => mask & (1 << k));
    const matrix = select.map((l) => [
      ...select.map((r) => x.reduce((sum, row) => sum + row[l]! * row[r]!, 0)),
      x.reduce((sum, row, i) => sum + row[l]! * y[i]!, 0),
    ]);
    const solution = solve(matrix);
    if (solution === undefined || solution.some((value) => value < 0)) continue;
    const coeffs = [0, 0, 0];
    select.forEach((k, i) => {
      coeffs[k] = solution[i]!;
    });
    const squaredError = x.reduce((sum, row, i) => sum + (evaluate(coeffs, row) - y[i]!) ** 2, 0);
    if (!best || squaredError < best.squaredError) best = { coeffs, squaredError };
  }
  assert(best, "Could not fit a nonnegative model");
  return best.coeffs;
}

const evaluate = (coeffs: number[], row: number[]) =>
  coeffs.reduce((sum, value, i) => sum + value * row[i]!, 0);

const shapeData = (plan: Shape) => {
  let initialFacts = 0;
  for (const account of snapshotProfiles(plan)) {
    for (const subject of catalogs(account)) initialFacts += subject.facts.length;
    const cycle = Array.from({ length: Math.min(10, account.count) }, (_, n) => {
      const person = personAt(account, n);
      return (
        Object.keys(person.edits[0]!.changes).length +
        person.owned.reduce((n, subject) => n + subject.facts.length, 0)
      );
    });
    initialFacts +=
      Math.floor(account.count / cycle.length) * cycle.reduce((n, facts) => n + facts, 0);
    initialFacts += cycle.slice(0, account.count % cycle.length).reduce((n, facts) => n + facts, 0);
  }
  const daily = plan.daily === "real" ? fullDaily : plan.daily;
  return { initialFacts, saves: daily * 35 * 2 };
};

const fullDaily = Array.from({ length: 1440 }, (_, min) => minuteSaves(min)).reduce(
  (a, b) => a + b,
  0,
);
const proportional = (deep: number): Shape => ({
  deep,
  daily: Math.max(1, Math.round((deep / 100_000) * fullDaily)),
});

function forecast(samples: Sample[]) {
  assert(samples.length >= 3 && new Set(samples.map((row) => row.sourceHead)).size === 1);
  assert(
    samples.every(
      (row) =>
        row.timingClass === "laptop diagnostic" &&
        typeof row.plan === "object" &&
        (
          [
            "initialFacts",
            "saves",
            "downloadBytes",
            "databaseBytes",
            "replayMs",
            "restoreMs",
            "firstReadMs",
          ] as const
        ).every((key) => Number.isFinite(row[key]) && row[key] > 0) &&
        row.saves === shapeData(row.plan).saves &&
        row.initialFacts === shapeData(row.plan).initialFacts,
    ),
  );
  const metrics = ["downloadBytes", "databaseBytes", "replayMs", "restoreMs"] as const;
  const fits = Object.fromEntries(
    metrics.map((metric) => [
      metric,
      [
        fit(samples, metric),
        ...samples.map((_, i) =>
          fit(
            samples.filter((_, j) => j !== i),
            metric,
          ),
        ),
      ],
    ]),
  ) as Record<Metric, number[][]>;
  const ranges = (data: Data, metric: Metric) => {
    const [estimate, ...variants] = fits[metric].map((f) => evaluate(f, features(data)));
    // [DX-PLAY1] Why: leave-one-out sensitivity shows the uncertainty of the measured fit;
    // the multiplier leaves extra room for extrapolation far past the measured population.
    // Rejected: a statistical confidence interval that the small diagnostic sample cannot identify.
    return {
      estimate,
      low: Math.min(estimate!, ...variants) * 0.75,
      high: Math.max(estimate!, ...variants) * 1.25,
    };
  };
  let low = 1,
    high = 100_000;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (ranges(shapeData(proportional(mid)), "downloadBytes").high <= 5_000_000_000) low = mid;
    else high = mid - 1;
  }
  const choices: [string, Shape][] = [
    ["tier-a", proportional(low)],
    ["active", { deep: 100_000, daily: 1900 }],
    ["full", { deep: 100_000, daily: "real" }],
  ];
  return {
    fullDaily,
    fits,
    observedPeakBytes: Object.fromEntries(
      Object.keys(samples[0]!.restorePeaks).map((role) => [
        role,
        Math.max(...samples.map((row) => row.restorePeaks[role] ?? 0)),
      ]),
    ),
    cachedLocalBaseMs: samples.map((row) => row.firstReadMs - row.restoreMs),
    choices: choices.map(([tier, plan]) => {
      const data = shapeData(plan);
      return {
        tier,
        plan,
        ...data,
        ...Object.fromEntries(metrics.map((metric) => [metric, ranges(data, metric)])),
      };
    }),
  };
}

const samples = await Promise.all(
  process.argv.slice(2).map(async (path) => JSON.parse(await readFile(path, "utf8")) as Sample),
);
console.log(JSON.stringify(forecast(samples), null, 2));
