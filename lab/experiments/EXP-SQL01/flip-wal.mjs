// @ts-nocheck -- [CX-A01-040] Why: integration adds this runtime protocol or command fixture to checkJs; dynamic JSON/message fields lack static record types. Binding errors remain checked by lab/bin/checkjs.mjs. Rejected: excluding current executable code.
// [EXP-SQL01] Why: reproduce R25's silent SQLite WAL truncation, then require the independent ACKED check.
// Rejected: integrity_check alone (R25 recovered a valid but incomplete prefix).
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
const dir = path.resolve("runs/broker/EXP-SQL01/flip-" + randomUUID());
const child = spawn(
  process.execPath,
  ["--import", "tsx", "lab/experiments/EXP-SQL01/kill-writer.ts", dir, "flip"],
  { stdio: ["ignore", "pipe", "pipe"] },
);
let buf = "",
  err = "",
  acked = [];
child.stderr.on("data", (b) => (err += b));
child.stdout.on("data", (b) => {
  buf += b;
  let i;
  while ((i = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, i);
    buf = buf.slice(i + 1);
    try {
      const x = JSON.parse(line);
      if (x.event === "acked") {
        acked.push(x.lsn);
        if (acked.length === 100) child.kill("SIGKILL");
      }
    } catch {}
  }
});
const timer = setTimeout(() => child.kill("SIGKILL"), 30000);
const exit = await new Promise((r) => child.once("exit", (code, signal) => r({ code, signal })));
clearTimeout(timer);
if (acked.length < 100) throw Error("Writer failed " + err);
const wal = path.join(dir, "broker.db-wal"),
  bytes = fs.readFileSync(wal),
  offset = Math.floor(bytes.length * 0.3);
bytes[offset] ^= 255;
fs.writeFileSync(wal, bytes);
const recovered = spawn(
  process.execPath,
  ["--import", "tsx", "lab/experiments/EXP-SQL01/kill-writer.ts", dir, "verify"],
  { stdio: ["ignore", "pipe", "pipe"] },
);
let stdout = "",
  stderr = "";
recovered.stdout.on("data", (b) => (stdout += b));
recovered.stderr.on("data", (b) => (stderr += b));
const recoveryExit = await new Promise((r) =>
  recovered.once("exit", (code, signal) => r({ code, signal })),
);
const refused = recoveryExit.code !== 0 && /ACKED|corrupt|malformed|chain/i.test(stderr);
const result = {
  dir,
  exit,
  acked,
  walBytes: bytes.length,
  offset,
  recoveryExit,
  stdout,
  stderr,
  refused,
};
fs.writeFileSync(
  "lab/experiments/EXP-SQL01/evidence/flip-wal.json",
  JSON.stringify(result, null, 2),
);
console.log(JSON.stringify(result));
if (!refused) process.exitCode = 1;
