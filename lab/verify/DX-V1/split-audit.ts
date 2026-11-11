import fs from "node:fs";
import { createHash } from "node:crypto";
import { splitTarget } from "../../bench/lib/split-target.ts";
import { Rng, seedOf } from "../../bench/lib/rng.ts";

// [DX-V1] Why: replay both selectors over identical recorded command timing opportunities.
// Rejected: reporting this counterfactual replay as actual reader scheduling or a fresh benchmark.
const input =
  process.argv[2] ??
  "/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H4/tx2-dxh4-q7-ladder/input/ns-writes.jsonl";
const bytes = fs.readFileSync(input);
const rows = bytes
  .toString()
  .trim()
  .split("\n")
  .map((x) => JSON.parse(x))
  .filter((w) => w.stream === "background" && !w.resend && w.outcome === "committed")
  .sort((a, b) => a.scheduledAt - b.scheduledAt);
const origin = rows[0].scheduledAt - rows[0].offsetMs;
const end = Math.max(...rows.map((w) => w.finishedAt));
const result: any = {
  input,
  sha256: createHash("sha256").update(bytes).digest("hex"),
  commands: rows.length,
  method:
    "100 ms grid; on-time offer assumed at scheduledAt; pending retained until finishedAt; first query takes 1 ms; native commit is no later than publicationDurableAt; no historical read starts or actual selections are available",
  policies: {},
};
for (const policy of ["pending", "mixed"] as const) {
  const rng = new Rng(seedOf("DX-V1-identical-opportunities"));
  const stats: any = {
    opportunities: 0,
    noTarget: 0,
    offered: 0,
    future: 0,
    ackAlreadyBeforeStep1: 0,
    ackAfterStep1: 0,
    durableAlreadyBeforeStep1: 0,
    durableWitnessAfterStep1: 0,
    ackAfterStep1ButAlreadyDurable: 0,
    missingDurableWitness: 0,
    selectedCommands: 0,
    meanWaitToAckMs: 0,
  };
  const selected = new Set<number>();
  const pending = new Map<number, any[]>();
  let offered = 0,
    wait = 0;
  for (let t = origin; t <= end; t += 100) {
    while (offered < rows.length && rows[offered].scheduledAt <= t) {
      const w = rows[offered++];
      const list = pending.get(w.subject) ?? [];
      list.push(w);
      pending.set(w.subject, list);
    }
    for (const [subject, list] of pending) {
      const remaining = list.filter((w) => w.finishedAt > t);
      if (remaining.length) pending.set(subject, remaining);
      else pending.delete(subject);
    }
    const active = [...pending.values()]
      .map((list) => list.at(-1)!)
      .filter((w) => policy === "mixed" || w.ackPublishedAt > t);
    const soon = [];
    for (
      let k = offered;
      k < rows.length && rows[k].scheduledAt <= t + 250 && soon.length < 64;
      k++
    )
      soon.push(rows[k]);
    const targets = (ws: any[]) => ws.map((w) => ({ subject: w.subject, seq: w.seq }));
    const picked = splitTarget(targets(active), targets(soon), (n) => rng.int(n), policy);
    stats.opportunities++;
    if (picked.seq < 0) {
      stats.noTarget++;
      continue;
    }
    const w = active.find((w) => w.seq === picked.seq) ?? soon.find((w) => w.seq === picked.seq)!;
    selected.add(w.seq);
    if (w.scheduledAt <= t) stats.offered++;
    else stats.future++;
    const step1 = t + 1;
    if (w.ackPublishedAt <= step1) stats.ackAlreadyBeforeStep1++;
    else stats.ackAfterStep1++;
    if (typeof w.publicationDurableAt !== "number") stats.missingDurableWitness++;
    else if (w.publicationDurableAt <= step1) stats.durableAlreadyBeforeStep1++;
    else stats.durableWitnessAfterStep1++;
    if (w.ackPublishedAt > step1 && w.publicationDurableAt <= step1)
      stats.ackAfterStep1ButAlreadyDurable++;
    wait += Math.max(0, w.ackPublishedAt - step1);
  }
  stats.selectedCommands = selected.size;
  stats.meanWaitToAckMs = wait / (stats.opportunities - stats.noTarget);
  result.policies[policy] = stats;
}
// [DX-V1] Why: an intervening ACK need not imply that a write or feed delta intervened.
// Rejected: counting future ACKs as proof of native publication after the first local read.
result.explicitCounterexample = {
  timeline: {
    offer: 0,
    nativeCommit: 1,
    feedApplied: 2,
    splitAssignment: 3,
    firstReadEnd: 4,
    ackPublished: 5,
    secondRead: 6,
  },
  pendingTarget: splitTarget(
    [{ subject: 0, seq: 1 }],
    [{ subject: 1, seq: 2 }],
    (n) => 1 % n,
    "pending",
  ),
  mixedTargetWithSameDraw: splitTarget(
    [{ subject: 0, seq: 1 }],
    [{ subject: 1, seq: 2 }],
    (n) => 1 % n,
    "mixed",
  ),
  implication:
    "pending reports split=2 at reader-worker.ts:173, although both complete local reads follow the native commit and feed application; mixed can choose the future command instead",
};
console.log(JSON.stringify(result, null, 2));
