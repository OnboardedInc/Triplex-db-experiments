// [DX-ACT10, third review] Where a duplicate assertion ID comes from: a save's ordered identity block and the SDK's
// monotonic IDs in one process. A save's ordered identity (`orderedSaveIdentity`, packages/datomic) takes the first 24
// characters of a monotonic ULID as its token and owns the 256 IDs `<token>00` to `<token>FF`. The same process's next
// monotonic ULIDs in the same millisecond (`generateId`, packages/core: a Publish's or a frame's row IDs and transaction
// ID, anything written through the TypeScript adapter) increment only the last characters, so they share that token and
// can be one of the save's own assertion IDs. Whichever of the two commits second is refused, "TRIPLEX_IDENTITY f/id".
// [DX-ACT8, third review U1] Fixed: the token is reserved from the SDK's one allocator (`reserveIdPrefix`), so no ID the
// process issues before or after starts with it. I1 and I2 now assert that none does; I3 checks the allocator's rule
// over many interleaved reservations and IDs.
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
const { generateId, generateTransactionId } = await import(pathToFileURL(fromDatomic.resolve("@triplex-build/triplex/internal")).href);

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
  // [DX-ACT8] Was: the review's finding (some inside the block, some equal). Now none shares the token.
  assert.equal(sharePrefix, 0);
  assert.equal(inBlock, 0);
});

test("I2: the save's assertion ID and the later SDK ID are never the same string", () => {
  // [DX-ACT8] Was: the first collision, found within 200,000 back-to-back pairs (the review: after 11,505 and 66,301).
  let shared = 0;
  for (let i = 0; i < 200000; i++) {
    const save = orderedSaveIdentity();
    const next = String(generateId());
    if (next.startsWith(save.token)) shared++;
  }
  console.log("[I2] " + JSON.stringify({ pairs: 200000, nextIdSharingTheToken: shared }));
  assert.equal(shared, 0);
});

test("I3: interleaved reservations and IDs: no ID inside any block, blocks and IDs increasing", () => {
  const blocks: string[] = [], ids: string[] = [];
  let last = "";
  for (let i = 0; i < 100000; i++) {
    const k = i % 7;
    if (k === 0) blocks.push(orderedSaveIdentity().token);
    else if (k === 3) blocks.push(orderedSaveIdentity(undefined).token);
    const id = k === 5 ? String(generateTransactionId()).slice(4) : String(generateId());
    assert(id > last, "IDs increase");
    last = id;
    ids.push(id);
  }
  const tokens = new Set(blocks);
  assert.equal(tokens.size, blocks.length, "every block distinct");
  for (let i = 1; i < blocks.length; i++) assert(blocks[i]! > blocks[i - 1]!, "blocks increase");
  const inside = ids.filter((id) => tokens.has(id.slice(0, 24))).length;
  console.log("[I3] " + JSON.stringify({ blocks: blocks.length, ids: ids.length, idsInsideABlock: inside }));
  assert.equal(inside, 0);
});
