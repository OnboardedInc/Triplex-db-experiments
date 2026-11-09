// [EXP-P4N-R2] Why (review F2): recomputes the verdict of a retained P2 attempt from its raw per-round matched latencies alone and compares it with
// the verdict file written by the run, so a reviewer needs nothing but the evidence directory. usage: tsx p2-recompute.ts <attempt dir>
import fs from "node:fs";
import path from "node:path";
import { p2Verdict, type P2Round } from "./p2verdict.ts";
const dir = process.argv[2];
if (!dir) throw Error("usage: p2-recompute.ts <attempt dir>");
const rounds: P2Round[] = fs
  .readdirSync(path.join(dir, "p2raw"))
  .filter((f) => /^round-\d+\.json$/.test(f))
  .sort()
  .map((f) => JSON.parse(fs.readFileSync(path.join(dir, "p2raw", f), "utf8")));
const again = p2Verdict(rounds);
const stored = JSON.parse(fs.readFileSync(path.join(dir, "p2-verdict.json"), "utf8"));
const same = JSON.stringify(again) === JSON.stringify(stored.result);
console.log(
  JSON.stringify({ rounds: rounds.length, verdict: again.verdict, identicalToStored: same }),
);
process.exitCode = same ? 0 : 1;
