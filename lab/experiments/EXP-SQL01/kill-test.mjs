// [EXP-SQL01] Why: parent records each ACK before SIGKILL and checks every one after real recovery.
// Rejected: trusting the writer's final counters (they disappear with the process).
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
const root = path.resolve("runs/broker/EXP-SQL01/kill-" + randomUUID());
const acked = new Set(),
  rounds = [];
for (let round = 0; round < 81; round++) {
  const child = spawn(
    process.execPath,
    [
      "--import",
      "tsx",
      "lab/experiments/EXP-SQL01/kill-writer.ts",
      root,
      ...(round === 80 ? ["verify"] : []),
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  const lines = [];
  let text = "",
    err = "",
    recovered,
    killAt = 3 + (round % 7),
    newAcks = 0,
    killed = false;
  child.stderr.on("data", (b) => (err += b));
  const timer = setTimeout(() => child.kill("SIGKILL"), 30000);
  child.stdout.on("data", (b) => {
    text += b;
    let i;
    while ((i = text.indexOf("\n")) >= 0) {
      const line = text.slice(0, i);
      text = text.slice(i + 1);
      let x;
      try {
        x = JSON.parse(line);
      } catch {
        continue;
      }
      lines.push(x);
      if (x.event === "recovered") {
        const present = new Set(x.lsns);
        const lost = [...acked].filter((v) => !present.has(v));
        recovered = { priorAcks: acked.size, lost };
        if (round === 80) killed = true;
      }
      if (x.event === "acked") {
        acked.add(x.lsn);
        if (++newAcks === killAt && round < 80) {
          child.kill("SIGKILL");
          killed = true;
        }
      }
    }
  });
  const exit = await new Promise((r) => child.on("exit", (code, signal) => r({ code, signal })));
  clearTimeout(timer);
  rounds.push({ round, ...recovered, newAcks, killed, exit, stderr: err, events: lines });
  fs.mkdirSync("lab/experiments/EXP-SQL01/evidence", { recursive: true });
  fs.writeFileSync(
    process.env.SQL01_KILL_OUT ?? "lab/experiments/EXP-SQL01/evidence/kill80-final.json",
    JSON.stringify({ root, kills: Math.min(round + 1, 80), acked: acked.size, rounds }, null, 2),
  );
  if (!recovered || recovered.lost.length || !killed)
    throw Error("Recovery failed round " + round + " " + err);
}
console.log(
  JSON.stringify({
    kills: 80,
    acknowledged: acked.size,
    lost: rounds.reduce((a, r) => a + r.lost.length, 0),
    root,
  }),
);
