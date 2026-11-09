// [EXP-P2B-R4] Why: dependent final aggregation and independent checksum readback share one heavy admission.
// Rejected: a positive index with missing retained fixtures or unverified current bytes.
import fs from "node:fs";
import { spawnSync } from "node:child_process";
const before = fs.readFileSync(import.meta.filename);
for (const [command, args] of [
  ["/usr/bin/python3", ["-I", "lab/experiments/EXP-P2B/round4/finalize.py"]],
  [
    "/usr/bin/shasum",
    [
      "-a",
      "256",
      "-c",
      ...fs
        .readdirSync("lab/experiments/EXP-P2B")
        .filter((n) => /^SHA256SUMS-round4-\d+\.txt$/.test(n))
        .sort()
        .map((n) => "lab/experiments/EXP-P2B/" + n),
    ],
  ],
]) {
  const child = spawnSync(command, args, { stdio: "inherit" });
  if (child.status !== 0) process.exit(child.status ?? 1);
}
if (!before.equals(fs.readFileSync(import.meta.filename)))
  throw Error("Finalization controller changed");
