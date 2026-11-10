import fs from "node:fs";
import readline from "node:readline";
import { createHash } from "node:crypto";
// [DX-H6] Why: distinguish a complete ordered ACK journal from an incomplete G0 fingerprint after a deadline.
// Rejected: treating progress text, ACK order or a journal hash as world/coverage acceptance.
const root = "/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H6";
const attempt = root + "/tx2-dxh6-seed10000";
if (!fs.existsSync(attempt + "/exit.json"))
  throw Error("attempt must have settled before journal analysis");
const file = attempt + "/driver/seed.ndjson";
const input = fs.createReadStream(file);
const hash = createHash("sha256");
input.on("data", (chunk) => hash.update(chunk));
let commands = 0;
const mismatches = [];
for await (const line of readline.createInterface({ input, crlfDelay: Infinity })) {
  if (!line) throw Error("empty journal line");
  const row = JSON.parse(line);
  commands++;
  if (row.commandId !== "p5:seed:" + commands || row.receipt?.position !== commands) {
    mismatches.push({ line: commands, commandId: row.commandId, position: row.receipt?.position });
  }
}
const observed = {
  classification: "ACK-JOURNAL-OBSERVATION-NOT-G0-OR-FINGERPRINT",
  attemptExit: JSON.parse(fs.readFileSync(attempt + "/exit.json", "utf8")),
  sourceSha256: createHash("sha256")
    .update(fs.readFileSync(import.meta.filename))
    .digest("hex"),
  input: { file, bytes: fs.statSync(file).size, sha256: hash.digest("hex") },
  commands,
  expectedCommands: 434768,
  mismatches,
  limitations:
    "Checks logged command identities and ACK positions only; no independent stored-world/count/fingerprint qualification.",
};
fs.writeFileSync(
  root + "/seed10000-journal-observation.json",
  JSON.stringify(observed, null, 2) + "\n",
);
console.log(JSON.stringify(observed));
