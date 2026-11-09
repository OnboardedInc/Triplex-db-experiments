import fs from "node:fs";
import { createHash } from "node:crypto";
import { openComposition } from "../../bench/lib/composition.ts";
import {
  ownFacts,
  sharedFacts,
  accountOfSubject,
  accountsFor,
  ids,
  memberOf,
  SEED_VALID_FROM,
  worldFactsOf,
} from "../../bench/lib/world.ts";
import { chooseHistorySample } from "../../bench/lib/samples.ts";
const [manifestPath, output] = process.argv.slice(2);
if (!manifestPath || !output || fs.existsSync(output)) throw Error("new output required");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")).seedManifest;
process.env["QLEVER_URL"] = "http://127.0.0.1:7071";
const comp = await openComposition("public", "qlever", manifest.scope);
const subjects = chooseHistorySample(
  manifest.subjects,
  20,
  "QG1-p4-v1",
  accountsFor(manifest.subjects),
);
const observations: any[] = [];
// [EXP-QG1] Why: public BFS pulls, pinned by position, check full member bytes against
// the same seeded world. Rejected: timing an empty query as a P4 pull or calling this
// small same-generator sample an independent oracle/100k-subject acceptance gate.
try {
  for (const i of subjects) {
    const expected = [
      ...ownFacts(i, accountsFor(manifest.subjects)),
      ...sharedFacts(accountOfSubject(i, accountsFor(manifest.subjects))),
    ]
      .map((f) => memberOf(f.e, f.a, f.v))
      .sort();
    const t = performance.now();
    const actual = await comp.pull(ids.placement(i), {
      recordedPosition: manifest.result.lastPosition,
      validAt: SEED_VALID_FROM,
    } as any);
    const ms = performance.now() - t;
    const members = actual.triples.map((f) => memberOf(f.entityId, f.attribute, f.value)).sort();
    observations.push({
      subject: i,
      ms,
      expectedCount: worldFactsOf(i, accountsFor(manifest.subjects)),
      actualCount: members.length,
      contentEqual: JSON.stringify(expected) === JSON.stringify(members),
      expectedSha256: createHash("sha256").update(JSON.stringify(expected)).digest("hex"),
      actualSha256: createHash("sha256").update(JSON.stringify(members)).digest("hex"),
      depth: actual.depth,
    });
  }
} finally {
  await comp.close();
}
const times = observations.map((x) => x.ms).sort((a, b) => a - b);
fs.writeFileSync(
  output,
  JSON.stringify(
    {
      qleverConnectionMode: process.env.TRIPLEX_QLEVER_CONNECTION_MODE ?? "keep-alive",
      subjects: manifest.subjects,
      basis: { recordedPosition: manifest.result.lastPosition, validAt: SEED_VALID_FROM },
      sample: observations,
      summary: {
        n: times.length,
        p50: times[Math.ceil(times.length * 0.5) - 1],
        p99: times[Math.ceil(times.length * 0.99) - 1],
      },
      verdict: "DIAGNOSTIC: 20 same-generator checks, not independent P4 qualification",
    },
    null,
    2,
  ),
);
if (observations.some((x) => !x.contentEqual)) process.exitCode = 1;
