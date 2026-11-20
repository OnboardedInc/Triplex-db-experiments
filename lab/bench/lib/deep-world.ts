import { createHash } from "node:crypto";
import { hash2 } from "./rng.ts";
import {
  ids,
  hopOf,
  seedAddress,
  SEED_VALID_FROM,
  versioned,
  type Bucket,
  type Fact,
  type Hop,
  type Value,
} from "./world.ts";

export const DEEP_RUNGS = { "deep-10k": 10_000, "deep-100k": 100_000 } as const;
export const DEEP_PROFILE = "deep/1";
export const integer = (n: number): Value => ({ type: "integer", value: String(n) });
export const string = (s: string): Value => ({ type: "string", value: s });
const ref = (id: string): Value => ({ type: "ref", value: id });
const fact = (e: string, a: string, v: Value): Fact => ({ e, a, v });
const distributed = (index: number, numerator: number, denominator: number) =>
  Math.floor(((index + 1) * numerator) / denominator) -
  Math.floor((index * numerator) / denominator);
export const deepPlacements = (i: number) => distributed(i, 18, 10);
const customCount = (i: number) => distributed(i, 66, 10);
const fileCount = (i: number) => distributed(i, 14, 10);

// [DX-SCALE1] Why: 2,000-person blocks preserve the measured mean while supplying real small, medium and large pulls in every hop class. Rejected: padding each world with unused shared facts (distorts storage per person).
const tasksByClass = [4, 5, 10, 11, 34] as const;
const taskClass = (i: number) => {
  const cohort = Math.floor(i / 20) % 100;
  return cohort < 10 ? 0 : cohort < 90 ? 1 : cohort < 93 ? 2 : cohort < 99 ? 3 : 4;
};
const taskOffsets = [0];
for (let i = 0; i < 2000; i++) taskOffsets.push(taskOffsets[i]! + tasksByClass[taskClass(i)]);
export const deepTasks = (i: number) => tasksByClass[taskClass(i)];
export const taskSerial = (i: number, t: number) =>
  Math.floor(i / 2000) * 11400 + taskOffsets[i % 2000]! + t;
export const fieldCount = (serial: number) => distributed(serial, 133, 10);
export const stepCount = (serial: number) => distributed(serial, 55, 10);
export const seedClosed = (serial: number) => (serial * 17) % 50 < 31;
export const saveLimit = (serial: number) => 6 + (hash2(`deep-limit:${serial}`)[0] % 32);
export const seedSaves = (serial: number) =>
  seedClosed(serial)
    ? saveLimit(serial)
    : hash2(`deep-saves:${serial}`)[0] % Math.max(1, saveLimit(serial) - stepCount(serial));
export const seedStepsDone = (serial: number) =>
  seedClosed(serial)
    ? stepCount(serial)
    : Math.floor((seedSaves(serial) * stepCount(serial)) / saveLimit(serial));
export const taskId = (i: number, t: number) => (t === 0 ? ids.i9(i) : `${ids.i9(i)}:t${t}`);
export const stepId = (i: number, t: number, s: number) => `${ids.section(i, t)}:${s}`;
export const placementId = (i: number, p: number) => `${ids.placement(i)}:p${p}`;
export const fieldValue = (i: number, t: number, f: number, revision: number): Value => {
  const input = `deep-field/${i}/${t}/${f}/${revision}`;
  return string(createHash("sha256").update(input).digest("hex").slice(0, 57));
};
export function deepTaskFacts(i: number, t: number, serial: number, fresh = false): Fact[] {
  const task = taskId(i, t),
    steps = stepCount(serial);
  const rows = [
    fact(placementId(i, t % deepPlacements(i)), ":placement/task", ref(task)),
    fact(task, ":task/progress", integer(fresh ? 0 : seedSaves(serial))),
  ];
  if (!fresh && seedClosed(serial)) rows.push(fact(task, ":task/status", string("complete")));
  for (let f = 0; f < fieldCount(serial); f++)
    rows.push(fact(task, `:task/field-${f}`, fieldValue(i, t, f, 0)));
  for (let s = 0; s < steps; s++) {
    const nested = s > 0 && s < hopOf(i) - 2;
    rows.push(
      fact(
        nested ? stepId(i, t, s - 1) : task,
        nested ? ":subtask/next" : ":task/subtask",
        ref(stepId(i, t, s)),
      ),
    );
    if (!fresh && s < seedStepsDone(serial))
      rows.push(
        fact(stepId(i, t, s), ":subtask/completedAt", { type: "datetime", value: SEED_VALID_FROM }),
      );
  }
  return rows;
}
export function deepOwnFacts(i: number): Fact[] {
  const root = ids.placement(i),
    profile = ids.worker(i);
  const rows = [
    fact(root, ":person/profile", ref(profile)),
    fact(root, ":placement/stamp", integer(0)),
    fact(profile, ":worker/address", string(seedAddress(i))),
    ...versioned(i, 0),
  ];
  for (let p = 0; p < deepPlacements(i); p++)
    rows.push(fact(root, ":person/placement", ref(placementId(i, p))));
  const custom: [string, Value][] = [
    ["start", string(`2026-11-${String(1 + (i % 10)).padStart(2, "0")}`)],
    ["pay-cents", integer(1400 + (i % 700))],
    ["weekly-minutes", integer(2000 + (i % 900))],
    ["state-floor", integer(1500)],
    ["local-floor", integer(1500 + (i % 500))],
    ["background", string(["clear", "pending", "consider"][i % 3]!)],
    ["category", string(`class-${i % 7}`)],
  ];
  for (let k = 0; k < customCount(i); k++) {
    const [a, v] = custom[k]!;
    rows.push(fact(profile, `:person/custom-${a}`, v));
  }
  for (let f = 0; f < fileCount(i); f++) {
    const file = ids.document(i, 0, f);
    rows.push(
      fact(profile, ":person/file", ref(file)),
      fact(file, ":file/expiresOn", string(`202${i % 2 ? 7 : 6}-${i % 2 ? "03" : "12"}-01`)),
    );
  }
  for (let t = 0; t < deepTasks(i); t++) rows.push(...deepTaskFacts(i, t, taskSerial(i, t)));
  return rows;
}

// [DX-SCALE1] Why: seeding is checked against arithmetic independent of the emitted rows, including the logical subtasks represented by pending references. Rejected: counting the generator's output as the expected answer.
export function deepShape(i: number) {
  const tasks = deepTasks(i),
    placements = deepPlacements(i),
    files = fileCount(i),
    customValues = customCount(i);
  let fieldValues = 0,
    subtasks = 0,
    completedSteps = 0,
    closedTasks = 0;
  for (let t = 0; t < tasks; t++) {
    const n = taskSerial(i, t);
    fieldValues += fieldCount(n);
    subtasks += stepCount(n);
    completedSteps += seedStepsDone(n);
    closedTasks += Number(seedClosed(n));
  }
  const facts =
    5 +
    placements +
    2 * files +
    customValues +
    2 * tasks +
    closedTasks +
    fieldValues +
    subtasks +
    completedSteps;
  return {
    facts,
    placements,
    tasks,
    closedTasks,
    subtasks,
    fieldValues,
    completedSteps,
    customValues,
    files,
  };
}
export function deepPopulation(subjects: number) {
  const totals = {
    facts: 0,
    placements: 0,
    tasks: 0,
    closedTasks: 0,
    subtasks: 0,
    fieldValues: 0,
    completedSteps: 0,
    customValues: 0,
    files: 0,
  };
  let min = Infinity,
    max = 0;
  for (let i = 0; i < subjects; i++) {
    const shape = deepShape(i);
    for (const key of Object.keys(totals) as (keyof typeof totals)[]) totals[key] += shape[key];
    min = Math.min(min, shape.facts);
    max = Math.max(max, shape.facts);
  }
  return {
    subjects,
    accounts: 1,
    ...totals,
    ownFacts: totals.facts,
    sharedFacts: 0,
    seedAssertions: totals.facts,
    liveFactsAtSeedEnd: totals.facts,
    worldFacts: { min: subjects ? min : 0, max, mean: subjects ? totals.facts / subjects : 0 },
  };
}
export function deepCells(subjects: number) {
  const cells = new Map<string, number[]>();
  const sizes = new Uint16Array(subjects);
  for (let i = 0; i < subjects; i++) {
    sizes[i] = deepShape(i).facts;
    const key = `${sizes[i]! <= 200 ? "small" : sizes[i]! <= 800 ? "medium" : "large"}/${hopOf(i)}`;
    const list = cells.get(key) ?? [];
    list.push(i);
    cells.set(key, list);
  }
  return {
    sizes,
    pick(bucket: Bucket, hop: Hop, u: number) {
      const list = cells.get(`${bucket}/${hop}`);
      return list?.[Math.floor(u * list.length)] ?? null;
    },
  };
}
