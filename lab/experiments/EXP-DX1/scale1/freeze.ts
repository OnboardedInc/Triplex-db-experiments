import { deepSources } from "../../../bench/lib/deep-profile.ts";
import { createHash } from "node:crypto";
import { deepOwnFacts, DEEP_RUNGS } from "../../../bench/lib/deep-world.ts";
import { deepSeed, makeDeepTrace } from "../../../bench/lib/deep-trace.ts";

// [DX-SCALE1] Why: freeze the entire population and each independent account's timed intent before measuring a store. Rejected: comparing a generator only to another execution of itself during admission.
if (process.argv.includes("--sources")) {
  console.log(JSON.stringify(deepSources(), null, 2));
  process.exit(0);
}
const hash = createHash("sha256");
const rungs = { ...DEEP_RUNGS };
for (let i = 0; i < rungs["deep-100k"]; i++) {
  hash.update(JSON.stringify(deepOwnFacts(i)) + "\n");
  if (i + 1 !== 40 && i + 1 !== rungs["deep-10k"] && i + 1 !== rungs["deep-100k"]) continue;
  const traces = Array.from(
    { length: i + 1 === 40 ? 2 : 10 },
    (_, account) => makeDeepTrace(deepSeed(account), i + 1, 7200).sha256,
  );
  console.log(JSON.stringify({ people: i + 1, population: hash.copy().digest("hex"), traces }));
}
