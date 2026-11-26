// [DX-SRV3-fix1] The card's reading of a product save's ordered block (v01/block-token.ts), with blocks the SDK itself
// allocates, and the card's identity check on a wide block taken by the per-subject writer (the scorecard's cell
// p6-50-loaded at 1 billion).
import assert from "node:assert/strict";
import { test } from "node:test";
import { orderedSaveIdentity, wideOrderedSaveIdentity } from "../../../../packages/datomic/dist/index.js";
import { blockToken } from "./block-token.ts";
import { checkSavedIdentity } from "./adopted.ts";

const ids = (identity: { assertionId: (i: number) => string }, n: number) => Array.from({ length: n }, (_, i) => identity.assertionId(i));

test("a one-byte block is read as one-byte, whatever its token's last character", () => {
  for (let k = 0; k < 200; k++) {
    const b = orderedSaveIdentity();
    assert.deepEqual(blockToken(b.transactionId, ids(b, 1 + (k % 256))), { token: b.token, kind: "one-byte" });
  }
  // A one-byte token may end in W: its journal ID then also ends in W00; its IDs still say one-byte.
  const w = orderedSaveIdentity("0123456789ABCDEFGHJKMNPW");
  assert.equal(w.transactionId, "_tx/0123456789ABCDEFGHJKMNPW00");
  assert.deepEqual(blockToken(w.transactionId, ids(w, 12)), { token: w.token, kind: "one-byte" });
});

test("a wide block is read as wide (before the fix it was read as a one-byte token ending in W, then as no block)", () => {
  for (let k = 0; k < 200; k++) {
    const b = wideOrderedSaveIdentity();
    const n = 257 + (k * 37) % 3800;
    assert.deepEqual(blockToken(b.transactionId, ids(b, n)), { token: b.token, kind: "wide" });
    // A wide block used for a small save (the SDK gives one to a creation over a per-subject bound) is wide too.
    assert.deepEqual(blockToken(b.transactionId, ids(b, 5)), { token: b.token, kind: "wide" });
  }
  const b = wideOrderedSaveIdentity("0123456789ABCDEFGHJKMNP");
  const old = /^_tx\/([0-7][0-9A-HJKMNP-TV-Z]{23})00$/.exec(b.transactionId)?.[1];
  assert.equal(old, "0123456789ABCDEFGHJKMNPW", "the one-byte pattern also matches a wide journal ID");
});

test("runtime IDs, a partial block, a shuffled or gapped run, and no IDs are no block", () => {
  const b = orderedSaveIdentity(), w = wideOrderedSaveIdentity();
  assert.equal(blockToken(b.transactionId, []), undefined);
  assert.equal(blockToken(b.transactionId, ids(b, 3).slice(1)), undefined);
  assert.equal(blockToken(w.transactionId, [w.assertionId(0), w.assertionId(2)]), undefined);
  assert.equal(blockToken("_tx/01KZZZZZZZZZZZZZZZZZZZZZZZ", ["01KZZZZZZZZZZZZZZZZZZZZZZA"]), undefined);
  assert.equal(blockToken(undefined, ids(b, 2)), undefined);
  // Order of the request's IDs does not matter (the card sorts them, as the gateway reads them in order).
  assert.deepEqual(blockToken(w.transactionId, ids(w, 300).reverse()), { token: w.token, kind: "wide" });
});

test("the card checks a wide block taken by the per-subject writer exactly (the p6-50-loaded save)", () => {
  const w = wideOrderedSaveIdentity();
  const facts = 80, retired = 80, journal = 3 + 1 + facts + retired;
  const save = {
    status: "acked", saveKey: "k", product: true, facts, retired, db: "s2-x", id: "save-1",
    orderedToken: blockToken(w.transactionId, ids(w, facts + journal))!.token,
    receipt: { tx: w.transactionId, p: 7, clock: 1.5, digest: "d" },
    stage: { subjectSave: ":triplex.subject/v-0123456789abcdef01234567", subjectOrderedIds: true },
  } as never;
  const row = { db: "s2-x", id: "save-1", tx: w.transactionId, position: 7, clock: 1.5, digest: "d",
    journalIds: Array.from({ length: journal }, (_, i) => w.assertionId(facts + i)) } as never;
  const wide = process.env.TX2_SUBJECT_WIDE;
  process.env.TX2_SUBJECT_WIDE = "1";
  try {
    checkSavedIdentity(save, row, "per-person-ordered", ":triplex.subject/v-0123456789abcdef01234567");
    // The journal is checked against the block: one wrong journal ID fails.
    const bad = { ...(row as object), journalIds: [...(row as { journalIds: string[] }).journalIds.slice(1), "x"] } as never;
    assert.throws(() => checkSavedIdentity(save, bad, "per-person-ordered", ":triplex.subject/v-0123456789abcdef01234567"));
    // An unknown per-subject function fails.
    assert.throws(() => checkSavedIdentity(save, row, "per-person-ordered", ":triplex.subject/v-other"), /unknown per-subject function/);
  } finally {
    if (wide === undefined) delete process.env.TX2_SUBJECT_WIDE; else process.env.TX2_SUBJECT_WIDE = wide;
  }
});

test("the writer split counts a wide-block save as eligible and taken, and prints the wide blocks", async () => {
  const { checkWriterSplit } = await import("./adopted.ts");
  const { writerSplitText } = await import("./writer-split-text.ts");
  const wide = process.env.TX2_SUBJECT_WIDE;
  process.env.TX2_SUBJECT_WIDE = "1";
  try {
    const s = (block: "wide" | "one-byte") => ({ status: "acked", saveKey: "k", facts: 80, retired: 80, orderedBlock: block,
      stage: { subjectSave: "f", subjectOrderedIds: true } }) as never;
    const x = checkWriterSplit([s("wide"), s("wide"), s("one-byte")], "per-person-ordered", { subjectSave: true });
    assert.deepEqual([x.keyed, x.eligible, x.taken, x.keyedGeneral, x.wideBlocks], [3, 3, 3, 0, 2]);
    assert.match(writerSplitText(x), /3 eligible of 3 keyed, 3 taken; 0 keyed saves went to the general writer; 2 keyed saves carried a wide block/);
  } finally {
    if (wide === undefined) delete process.env.TX2_SUBJECT_WIDE; else process.env.TX2_SUBJECT_WIDE = wide;
  }
});
