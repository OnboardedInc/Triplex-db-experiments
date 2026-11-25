// [DX-ACT10, third review] Where a duplicate assertion ID comes from: a save's ordered identity block and the SDK's
// monotonic IDs in one process. A save's ordered identity (`orderedSaveIdentity`, packages/datomic) takes the first 24
// characters of a monotonic ULID as its token and owns the 256 IDs `<token>00` to `<token>FF`. The same process's next
// monotonic ULIDs in the same millisecond (`generateId`, packages/core: a Publish's or a frame's row IDs and transaction
// ID, anything written through the TypeScript adapter) increment only the last characters, so they share that token and
// can be one of the save's own assertion IDs. Whichever of the two commits second is refused, "TRIPLEX_IDENTITY f/id".
// Run: node --experimental-strip-types --test lab/experiments/EXP-DX1/act10/identity.test.ts
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";
import { orderedSaveIdentity } from "../../../../packages/datomic/dist/index.js";

// The SDK's `generateId` as the save identity's own module resolves it (one monotonic factory per process).
const here = path.dirname(new URL(import.meta.url).pathname);
const fromDatomic = createRequire(path.join(here, "../../../../packages/datomic/package.json"));
const { generateId } = await import(pathToFileURL(fromDatomic.resolve("@triplex-build/triplex/internal")).href);

test("I1: the next SDK ID after a save's ordered identity falls inside the save's own block", () => {
  // Each pair starts on a fresh millisecond, as a save and a Publish of a held runner do (a save is sampled, then the
  // adapter's IDs are made in the same millisecond); back-to-back pairs inside one millisecond would advance the token.
  const n = 5000;
  let sharePrefix = 0, inBlock = 0, collides16 = 0, collides40 = 0;
  const examples: string[] = [];
  for (let i = 0; i < n; i++) {
    const t0 = Date.now();
    while (Date.now() === t0);
    const save = orderedSaveIdentity();
    const next = String(generateId()); // e.g. a Publish's row ID generated right after, in the same millisecond
    if (!next.startsWith(save.token)) continue;
    sharePrefix++;
    const tail = next.slice(24);
    if (!/^[0-9A-F]{2}$/.test(tail)) continue;
    inBlock++;
    const ordinal = parseInt(tail, 16);
    if (ordinal < 16) collides16++;
    if (ordinal < 40) {
      collides40++;
      if (examples.length < 3) examples.push(next + " = save " + save.token + " ordinal " + ordinal + " (" + save.assertionId(ordinal) + ")");
    }
  }
  console.log("[I1] " + JSON.stringify({ pairs: n, sharePrefix, insideTheBlock: inBlock, equalToAnAssertionIdOfA16RowSave: collides16,
    ofA40RowSave: collides40, examples }));
  assert(inBlock > 0 && collides40 > 0);
});

test("I2: the save's assertion ID and the later SDK ID are the same string (not only the same prefix)", () => {
  for (let i = 0; i < 200000; i++) {
    const save = orderedSaveIdentity();
    const next = String(generateId());
    const tail = next.slice(24);
    if (next.startsWith(save.token) && /^[0-9A-F]{2}$/.test(tail) && parseInt(tail, 16) < 8) {
      assert.equal(save.assertionId(parseInt(tail, 16)), next);
      console.log("[I2] " + JSON.stringify({ tries: i + 1, save: save.token, ordinal: parseInt(tail, 16), sdkId: next }));
      return;
    }
  }
  assert.fail("no collision in 200,000 pairs");
});
