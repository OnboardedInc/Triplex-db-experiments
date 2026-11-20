import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { offers, quantile, rates, sha, type Offer } from "./schedule.ts";
const [input, output] = process.argv.slice(2);
assert(input && output);
const bytes = fs.readFileSync(input),
  source = JSON.parse(bytes.toString()) as { attempt: string; gapMs: number[]; baseMs: number[] };
assert.equal(source.gapMs.length, 1255);
assert.equal(source.baseMs.length, 3425);
type Mode = "individual" | "subject" | "all";
type Variance = "flat" | "capped" | "full";
const cap = quantile(source.gapMs, 0.99),
  mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const gaps = { flat: [0], capped: source.gapMs.map((n) => Math.min(n, cap)), full: source.gapMs };
const means = { flat: 0, capped: mean(gaps.capped), full: mean(gaps.full) };
const owners = Array.from({ length: 10 }, (_, i) => i);
function draw(e: Offer, salt: number) {
  let x =
    Math.imul(e.account + 113, salt) ^
    Math.imul(e.person + 127, 2246822519) ^
    Math.imul(e.ordinal + 541, 3266489917);
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  return (x ^ (x >>> 16)) >>> 0;
}
function simulate(trace: Offer[], mode: Mode, soloRate: number, variance: Variance) {
  const cycle = 1000 / soloRate,
    fixed = 0.339 * cycle,
    gate: Offer[][] = owners.map(() => []),
    sender: Offer[][] = owners.map(() => []),
    active: number[] = [],
    waiting: number[] = [];
  const returned: number[] = [],
    quiet: number[] = [];
  let now = 0,
    cursor = 0,
    native = 0,
    same = 0;
  const outstanding = owners.map(() => 0),
    stamp = new Map<Offer, number>();
  let arrival = 0;
  const admit = (e: Offer) => {
    stamp.set(e, arrival++);
    if (!gate[e.account]!.length) active.push(e.account);
    gate[e.account]!.push(e);
    outstanding[e.account]++;
  };
  const receive = (e: Offer) => {
    if (outstanding[e.account]! < 12) admit(e);
    else sender[e.account]!.push(e);
  };
  const service = (e: Offer) =>
    cycle + gaps[variance][draw(e, 2747636419) % gaps[variance].length]! - means[variance];
  while (cursor < trace.length || active.length) {
    if (!active.length) now = Math.max(now, trace[cursor]!.ms);
    while (cursor < trace.length && trace[cursor]!.ms <= now) receive(trace[cursor++]!);
    const batch: Offer[] = [];
    while (active.length && batch.length < (mode === "individual" ? 1 : 8)) {
      const a =
        mode === "subject" && batch.length
          ? batch[0]!.account
          : mode === "individual"
            ? active.reduce((a, b) => (stamp.get(gate[a]![0]!)! < stamp.get(gate[b]![0]!)! ? a : b))
            : active[0]!;
      if (!gate[a]!.length) break;
      const q = gate[a]!,
        i =
          mode === "subject" && batch.length
            ? q.findIndex((e) => e.person === batch[0]!.person)
            : 0;
      if (i < 0) break;
      const e = q.splice(i, 1)[0]!;
      batch.push(e);
      stamp.delete(e);
      active.splice(active.indexOf(a), 1);
      if (q.length) active.push(a);
    }
    assert(batch.length);
    const spent = batch.reduce((v, e) => v + service(e), 0) - (batch.length - 1) * fixed;
    assert(spent > 0);
    now += spent;
    native++;
    same += batch.length - new Set(batch.map((e) => e.account + "/" + e.person)).size;
    while (cursor < trace.length && trace[cursor]!.ms <= now) receive(trace[cursor++]!);
    for (const e of batch) {
      const ack =
        now -
        e.ms +
        Math.max(0, source.baseMs[draw(e, 668265263) % source.baseMs.length]! - service(e));
      returned.push(ack);
      if (e.account === 9) quiet.push(ack);
      outstanding[e.account]--;
      waiting.push(e.account);
    }
    for (const a of waiting) {
      while (outstanding[a]! < 12 && sender[a]!.length) admit(sender[a]!.shift()!);
    }
    waiting.length = 0;
  }
  assert.equal(returned.length, trace.length);
  return {
    offered: trace.length,
    native,
    same,
    p99: quantile(returned, 0.99),
    sentinelP99: quantile(quiet, 0.99),
    drainMs: Math.max(0, now - 60000),
  };
}
const cells = [];
for (const rate of [...rates, 4.9])
  for (const gap of [1, 3, 8])
    for (const capacity of [150, 175, 200])
      for (const variation of ["flat", "capped", "full"] as const) {
        const trace = offers(rate, 60, owners, gap),
          alone = trace.filter((e) => e.account === 9);
        for (const mode of ["individual", "subject", "all"] as const) {
          const a = simulate(alone, mode, capacity, variation),
            r = simulate(trace, mode, capacity, variation);
          cells.push({
            rate,
            gap,
            capacity,
            variation,
            mode,
            trace: sha(trace),
            alone: a,
            loaded: r,
            ratio: r.sentinelP99 / a.sentinelP99,
          });
        }
      }
const operating = [];
for (const variation of ["flat", "capped", "full"] as const)
  for (let total = 10; total <= 300; total += 10) {
    const quiet = offers(3.5, 300, [9]),
      neighbours = offers((total - 3.5) / 9, 300, owners.slice(0, 9));
    const trace = [...quiet, ...neighbours].sort((a, b) => a.ms - b.ms);
    const a = simulate(quiet, "all", 175, variation),
      r = simulate(trace, "all", 175, variation);
    operating.push({
      totalPerSecond: total,
      variation,
      quietCount: quiet.length,
      quietRatio: r.sentinelP99 / a.sentinelP99,
    });
  }
// [DX-W1] Why: even granting the sentinel the very next turn leaves the residual of a native batch already running.
// Rejected: adding independent p99s or calling an aggregate-rate capacity estimate an isolation guarantee.
const baseline = quantile(source.baseMs, 0.99);
const residual = [5.714, 20, 32, 100].map((length) => {
  let lo = baseline,
    hi = baseline + length;
  for (let n = 0; n < 52; n++) {
    const x = (lo + hi) / 2,
      cdf = mean(source.baseMs.map((b) => Math.min(1, Math.max(0, (x - b) / length))));
    if (cdf >= 0.99) hi = x;
    else lo = x;
  }
  return { length, alone: baseline, p99: hi, ratio: hi / baseline };
});
fs.writeFileSync(
  output,
  JSON.stringify({
    input: createHash("sha256").update(bytes).digest("hex"),
    attempt: source.attempt,
    assumption:
      "12 admitted per account; 1/3/8 second sessions, 19 fields/subtask and 415 saves/person; 33.9% shareable native spacing; all queued offers drain",
    cells,
    operating,
    residual,
  }) + "\n",
  { flag: "wx" },
);
