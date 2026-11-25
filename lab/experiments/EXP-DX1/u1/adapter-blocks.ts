// [DX-INT5, for the U1 fix cc5656aa2] Adapter level: the SDK's own `saveIdentity` blocks (ordered saves on, the product
// path on the one branch; the fix's base had no such path) never contain an ID the process makes later. Every save goes
// through the Datomic adapter with `orderedSaves` (one-byte and wide blocks) to an in-memory gateway with the per-subject
// writer. The clock is held in one millisecond for the whole run (the U1 collision needs a block and a later ID in the
// same millisecond); after each save the process makes many IDs from the allocator instance the adapter uses. Checked:
// every ordered save carries a block; no later `generateId` or `generateTransactionId`, and no ID the SDK itself sends in
// a later request (other than that request's own block), starts with an earlier block's token; tokens increase.
//   node --no-warnings --experimental-transform-types u1/adapter-blocks.ts <subject gateway url> <out.json>
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { openProduct } from "../s2/product.ts";

const [url, outFile] = process.argv.slice(2);
assert(url && outFile, "usage: adapter-blocks.ts <subject gateway url> <out.json>");
const here = path.dirname(new URL(import.meta.url).pathname);
// The allocator instance the adapter's ordered save identity uses (resolved as packages/datomic resolves the SDK).
const fromDatomic = createRequire(path.join(here, "../../../../packages/datomic/package.json"));
const ids: { generateId: () => string; generateTransactionId: () => string } =
  await import(pathToFileURL(fromDatomic.resolve("@triplex-build/triplex/internal")).href);

const run = Math.random().toString(36).slice(2, 10);
const store = await openProduct(url, `u1-adapter-${run}`, { orderedSaves: true, saveSizeRule: true });
const str = (v: string) => ({ type: "string", value: v });
const tokenOf = (txId: unknown) => {
  const m = typeof txId === "string" ? /^_tx\/([0-9A-HJKMNP-TV-Z]{24})00$|^_tx\/([0-9A-HJKMNP-TV-Z]{23})W00$/.exec(txId) : null;
  return m ? (m[1] ?? m[2]) : undefined;
};
const idPattern = /\b[0-7][0-9A-HJKMNP-TV-Z]{25}\b/g;

const realNow = Date.now;
const frozen = realNow.call(Date);
Date.now = () => frozen;
const blocks: { token: string; at: number; width: number }[] = [];
const later: { id: string; after: number; kind: string }[] = [];
let saves = 0;
try {
  for (let i = 0; i < 120; i++) {
    const subject = `acct/u1/pl:${String(i).padStart(8, "0")}`;
    // Most saves: a few facts (one-byte block). Every fifth: 128 facts, the per-subject bound (SUBJECT_SAVE_FACTS), whose
    // facts and journal rows (128 + 132) do not fit 256, so it takes a wide block. (A first version sent 300 facts: over
    // the bound, so the adapter gave those saves no block at all and the check counted 96 blocks for 120 saves.)
    const n = i % 5 === 4 ? 128 : 3 + (i % 4);
    const ops = Array.from({ length: n }, (_, k) => ({ op: "assert", entityId: subject, attribute: `:task/f${k}`, value: str(`v${i}.${k}`), entityType: "Task" }));
    const wireBefore = store.wire.length;
    await store.transact(ops, { commandId: `u1-adapter-${run}-${i}` });
    saves++;
    for (const w of store.wire.slice(wireBefore)) {
      const text = JSON.stringify(w.input);
      // The block's transaction ID (_tx/<24>00 or _tx/<23>W00) appears in the request's claims and rows.
      const token = tokenOf((/_tx\/(?:[0-9A-HJKMNP-TV-Z]{24}00|[0-9A-HJKMNP-TV-Z]{23}W00)/.exec(text) ?? [])[0]);
      const own = token ?? "\u0000";
      if (token) blocks.push({ token, at: blocks.length, width: token.length === 24 ? 256 : 4096 });
      for (const id of text.match(idPattern) ?? []) if (!id.startsWith(own)) later.push({ id, after: blocks.length, kind: "sdk-wire" });
    }
    for (let k = 0; k < 300; k++) {
      later.push({ id: ids.generateId(), after: blocks.length, kind: "generateId" });
      later.push({ id: ids.generateTransactionId().replace(/^_tx\//, ""), after: blocks.length, kind: "generateTransactionId" });
    }
  }
} finally {
  Date.now = realNow;
}
await store.close();

// A later ID (made after block j was reserved) must not start with block j's token.
let inside = 0;
const examples: unknown[] = [];
for (const x of later)
  for (let j = 0; j < x.after; j++)
    if (x.id.startsWith(blocks[j]!.token)) { inside++; if (examples.length < 5) examples.push({ id: x.id, kind: x.kind, block: blocks[j]!.token }); }
const increasing = blocks.every((b, i) => i === 0 || b.token.slice(0, 23) > blocks[i - 1]!.token.slice(0, 23) || b.token > blocks[i - 1]!.token);
const result = {
  saves, blocks: blocks.length, oneByte: blocks.filter((b) => b.width === 256).length, wide: blocks.filter((b) => b.width === 4096).length,
  laterIds: later.length, byKind: later.reduce((m: Record<string, number>, x) => ((m[x.kind] = (m[x.kind] ?? 0) + 1), m), {}),
  insideAnEarlierBlock: inside, examples, tokensIncreasing: increasing, clockHeldAt: frozen,
};
writeFileSync(outFile, JSON.stringify(result, null, 2));
console.log("U1_ADAPTER " + JSON.stringify(result));
assert(blocks.length === saves, `every ordered save carries a block (${blocks.length} of ${saves})`);
assert(result.wide > 0 && result.oneByte > 0, "both block widths exercised");
assert.equal(inside, 0, "no later ID inside an earlier block");
assert(increasing, "block tokens increase");
console.log("U1_ADAPTER PASS");
