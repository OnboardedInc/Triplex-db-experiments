// [EXP-SQL01] Why: parent retains observed ACKs and cursors outside the killed process. Rejected: a surviving worker masquerading as a process crash.
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
const root = process.env.HS01_RESULT
  ? path.join(path.dirname(process.env.HS01_RESULT), "kill-store-" + randomUUID())
  : path.resolve("runs/HS01/kill-" + randomUUID());
const acks = new Map(),
  rounds = [],
  feedSeen = [],
  errors = [];
let cursor = null;
// [EXP-HS01-R3] Why: HS01_JOURNAL_RECORDS=1 adds a stop inside the append transaction right after a journal record row is written, and
// every operation carries a journal (see kill-child.ts). Rejected: a separate schedule file (the default schedule must stay as it was).
const records = process.env.HS01_JOURNAL_RECORDS === "1";
const modes = [
  "before-append",
  "inflight",
  "after-append",
  "after-sidecar",
  "acked",
  "purge",
  "dictionary-growth",
  ...(records ? ["record-write"] : []),
];
for (let cycle = 0; cycle <= 80; cycle++) {
  const mode = cycle === 80 ? "verify" : modes[cycle % modes.length];
  const child = spawn(
    process.execPath,
    [
      "--import",
      "tsx",
      "lab/verify/HS01/kill-child.ts",
      root,
      String(cycle),
      mode,
      JSON.stringify(cursor),
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  let pending = "",
    stderr = "",
    recovery,
    barrier,
    timedOut = false;
  const events = [];
  const timer = setTimeout(() => {
    timedOut = true;
    child.kill("SIGKILL");
  }, 30_000);
  child.stderr.on("data", (b) => (stderr += b));
  child.stdout.on("data", (b) => {
    pending += b;
    for (;;) {
      const nl = pending.indexOf("\n");
      if (nl < 0) break;
      const line = pending.slice(0, nl);
      pending = pending.slice(nl + 1);
      let x;
      try {
        x = JSON.parse(line);
      } catch {
        continue;
      }
      events.push(
        x.event === "recovered"
          ? { event: x.event, count: x.recovered.length, feedPositions: x.feedPositions }
          : x,
      );
      if (x.event === "recovered") {
        recovery = x;
        const recovered = new Map(x.recovered.map((r) => [r.op, r]));
        for (const [op, pos] of acks) {
          const r = recovered.get(op);
          // Same id recipe as kill-child.ts: the generator's integer-coded shape, one text id per op.
          const [, opCycle, opIndex] = op.split("-").map(Number);
          const expected = Array.from({ length: 10 }, (_, j) =>
            j % 10 === 9
              ? op + "/" + j
              : "K1LLHEAD" +
                (opCycle * 1_000_000 + opIndex * 100 + j)
                  .toString(36)
                  .toUpperCase()
                  .padStart(18, "0"),
          ).sort();
          // Records mode: the transaction's journal (4 headers, one changed entity, 9 or 10 changes) must read back whole, with the same ids.
          const base = opCycle * 1_000_000 + opIndex * 100,
            journal = Array.from(
              { length: 5 + (opIndex % 2 === 0 ? 9 : 10) },
              (_, k) => "K1LLHEAD" + (base + 9 + k).toString(36).toUpperCase().padStart(18, "0"),
            ).sort();
          if (
            !r ||
            r.receipt.positions[0] !== pos ||
            r.claim?.position !== pos ||
            !r.eligible ||
            JSON.stringify(r.rows) !== JSON.stringify(expected) ||
            (records && JSON.stringify(r.journal) !== JSON.stringify(journal))
          )
            errors.push({ cycle, op, pos, recovered: r });
        }
        cursor = x.cursor;
        feedSeen.push(...x.feedPositions);
      }
      if (x.event === "acked") acks.set(x.op, x.position);
      if (x.event === "barrier") {
        barrier = x.point;
        if (["inflight", "purge", "dictionary-growth", "record-write"].includes(mode))
          setTimeout(() => child.kill("SIGKILL"), Math.floor(cycle / 5) % 6);
        else child.kill("SIGKILL");
      }
    }
  });
  const result = await new Promise((resolve) =>
    child.on("close", (code, signal) => resolve({ code, signal })),
  );
  clearTimeout(timer);
  rounds.push({
    cycle,
    mode,
    result,
    timedOut,
    barrier,
    recovered: recovery?.recovered.length,
    stderr,
    events,
  });
  if (
    !recovery ||
    timedOut ||
    (cycle < 80 && (!barrier || result.signal !== "SIGKILL")) ||
    (cycle === 80 && result.code !== 0)
  )
    errors.push({ cycle, reason: "incomplete cycle", stderr, result });
  fs.writeFileSync(
    process.env.HS01_RESULT ?? "runs/HS01-kills.json",
    JSON.stringify(
      { root, acknowledged: acks.size, acks: [...acks], feedSeen, cursor, errors, rounds },
      null,
      2,
    ),
  );
  if (errors.length) throw Error("kill checks failed: " + JSON.stringify(errors.slice(0, 2)));
}
const duplicates = feedSeen.filter((v, i) => feedSeen.indexOf(v) !== i);
const missing = [...acks.values()].filter((p) => !feedSeen.includes(p));
if (duplicates.length || missing.length)
  throw Error("feed mismatch " + JSON.stringify({ duplicates, missing }));
console.log(
  JSON.stringify({
    kills: 80,
    acknowledged: acks.size,
    lost: errors.length,
    feedPositions: feedSeen.length,
    feedDuplicates: duplicates.length,
    feedMissing: missing.length,
    root,
    journalRecords: records,
  }),
);
