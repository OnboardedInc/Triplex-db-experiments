import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { offers, quantile, sha, type Offer } from "../field/schedule.ts";

const [input, output] = process.argv.slice(2);
assert(input && output);
const bytes = fs.readFileSync(input);
const { gapMs, baseMs } = JSON.parse(bytes.toString()) as { gapMs: number[]; baseMs: number[] };
assert.equal(gapMs.length, 1255);
assert.equal(baseMs.length, 3425);
const fixed = 2.4;
const medianGap = quantile(gapMs, 0.5);
const accountIds = Array.from({ length: 10 }, (_, i) => i);
const budgets = [5, 6.1, 7, 8, 9, 10, 12, 16, 24, 32, 64];
const seconds = 240;

type Tail = "short" | "saved";

function draw(e: Offer, salt: number) {
  const n =
    Math.imul(e.account + salt, 1664525) ^
    Math.imul(e.person + 101, 2246822519) ^
    Math.imul(e.ordinal + 123, 3266489917);
  return (Math.imul(n ^ (n >>> 14), 0x45d9f3b) ^ (n << 8)) >>> 0;
}

// [DX-W1] Why: price the same attested arrival tape under two native tail assumptions.
// Rejected: treating a nominal frame budget as a wall-clock interrupt on Datomic.
function replay(tape: Offer[], budget: number, tail: Tail, bulk: boolean) {
  const ready = accountIds.map(() => [] as Offer[]);
  const turns: number[] = [];
  const latency: number[] = [];
  const bulkFrames: number[] = [];
  const service: number[] = [];
  let cursor = 0;
  let time = 0;
  let doneInWindow = 0;
  let physical = 0;
  const vary = (e: Offer) =>
    Math.min(
      tail === "short" ? 1.25 : Infinity,
      0.65 * Math.max(0, gapMs[draw(e, 71) % gapMs.length]! - medianGap),
    );
  // Wire and prepared-op costs represent a 1-fact edit and the recorded 20% wider edits.
  const cost = (e: Offer) => (e.extra ? 3.65 : 2.6);
  while (cursor < tape.length || turns.length) {
    while (cursor < tape.length && tape[cursor]!.ms <= time) {
      const e = tape[cursor++]!;
      if (!ready[e.account]!.length) turns.push(e.account);
      ready[e.account]!.push(e);
    }
    if (!turns.length) {
      if (cursor === tape.length) break;
      if (bulk) {
        const end = time + budget;
        if (end <= seconds * 1000) bulkFrames.push(budget);
        time = end;
      } else time = tape[cursor]!.ms;
      continue;
    }
    const group: Offer[] = [];
    let estimate = fixed;
    while (turns.length && group.length < 8) {
      const a = turns[0]!,
        e = ready[a]![0]!;
      if (group.length && estimate + cost(e) > budget) break;
      turns.shift();
      ready[a]!.shift();
      group.push(e);
      estimate += cost(e);
      if (ready[a]!.length) turns.push(a);
    }
    assert(group.length && estimate <= budget + 1e-9, "a single supported edit must fit");
    const duration = estimate + group.reduce((n, e) => n + vary(e), 0);
    service.push(duration);
    time += duration;
    physical++;
    if (time <= seconds * 1000) doneInWindow += group.length;
    for (const e of group)
      if (e.account === 9) {
        const outside = Math.max(0.55, baseMs[draw(e, 53) % baseMs.length]! - (fixed + cost(e)));
        latency.push(time - e.ms + outside);
      }
  }
  assert.equal(latency.length, tape.filter((e) => e.account === 9).length);
  // Price the same ordered mix with all saves already ready, so a small + small group is retained even when two wider edits cannot fit.
  let saturatedMs = 0,
    price = fixed,
    members = 0;
  for (const e of tape) {
    const next = cost(e);
    if (members === 8 || price + next > budget) {
      saturatedMs += price;
      price = fixed;
      members = 0;
    }
    price += next;
    saturatedMs += vary(e);
    members++;
  }
  saturatedMs += price;
  return {
    quietCount: latency.length,
    quietP99Ms: quantile(latency, 0.99),
    physical,
    inWindowPerSecond: doneInWindow / seconds,
    drainMs: Math.max(0, time - seconds * 1000),
    cycleP99Ms: quantile(service, 0.99),
    bulkFrames: bulkFrames.length,
    saturationPerSecond: (1000 * tape.length) / saturatedMs,
  };
}

const quiet = offers(3.5, seconds, [9]);
const cells = [];
for (const rate of [50, 100, 235]) {
  const schedule = [...quiet, ...offers((rate - 3.5) / 9, seconds, accountIds.slice(0, 9))].sort(
    (a, b) => a.ms - b.ms || a.account - b.account,
  );
  for (const budget of budgets) {
    // 6.05 ms prices the widest indivisible supported edit.
    if (budget < fixed + 3.65) continue;
    for (const tail of ["short", "saved"] as const) {
      const baseline = replay(quiet, budget, tail, false);
      for (const bulk of [false, true]) {
        const trial = replay(schedule, budget, tail, bulk);
        cells.push({
          rate,
          tail,
          bulk,
          budget,
          baseline,
          ...trial,
          quietRatio: trial.quietP99Ms / baseline.quietP99Ms,
          tape: sha(schedule),
        });
      }
    }
  }
}
fs.writeFileSync(
  output,
  JSON.stringify({
    inputSha256: createHash("sha256").update(bytes).digest("hex"),
    assumption:
      "Fair live turns at 3.5/s quiet and nine neighbors. A ready bulk frame consumes the chosen budget. Short tails cap extra per save at 1.25ms. Saved gaps contribute 65% of their above-median work.",
    cells,
  }) + "\n",
  { flag: "wx" },
);
