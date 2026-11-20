// [DX-BM1] Why: the one-rung launcher still uses INT1's full producer-side checker.
// Rejected: adding the unrequested second seed or treating trial exit zero as a capacity result.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const [out, stackPath, source, sizeText] = process.argv.slice(2);
const size = Number(sizeText);
assert([1_000, 1_000_000].includes(size));
const { cases, verifyCase } = await import(pathToFileURL(path.resolve(
  "lab/experiments/EXP-DX1/int1/bench-cases.ts")).href);
const stack = JSON.parse(fs.readFileSync(stackPath));
const full = cases.find(({ key }) => key === "thin-1m");
assert(full && full.size === 1_000_000);
const spec = size === full.size ? full : { ...full, key: "bm1-thin-preflight", size };
const result = await verifyCase(out, spec, source, stack.prefix, stack, {
  sender: "3", readers: "5,6,7,9,10,11",
}, "plain");
// [DX-BM1] Why: verifyCase writes and returns the versioned summary inside its account envelope.
// Rejected: letting the large run start after hashing a receipt with different top-level fields.
const written = fs.readFileSync(path.join(out, "rung-summary.json"), "utf8");
assert.equal(JSON.stringify(result.summary, null, 2) + "\n", written);
process.stdout.write(written);
