// [DX-SRV3-fix1] The smallest run of the scorecard's failing shape (1 billion, cell p6-50-loaded): one subject's tape S
// save through the product's path (the card's productSaver: orderedSaves and the save-size rule), first a seed of F
// facts, then the same F attributes again retiring the F values (more than 256 assertions, so the SDK gives it a wide
// block), on one in-memory write gateway with the run's writer options (wide writer, subject hints, general prefetch).
// Each save is read the card's way: its block token from what the SDK sent (the old reader, `one ?? wide`, and
// v01/block-token.ts), its receipt and stage from the answer, its journal row from /transactions, and then the card's
// own checkSavedIdentity. With the old reader the wide save is marked the general identity and the card's assertion at
// adopted.ts (the generalIdentity branch) fails as it did on the server; with block-token.ts it passes.
//   node --no-warnings --experimental-transform-types lab/experiments/EXP-DX1/v01/srv3-fix1-repro.ts <gateway url> <out.json> [facts]
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { DatomicClient } from "../../../../packages/datomic/dist/index.js";
import { productSaver } from "../s2/product.ts";
import { decodeFeed } from "../scale1/decision/observer.ts";
import { expectedJournal } from "../scale1/decision/writes.ts";
import { blockToken } from "./block-token.ts";
import { checkSavedIdentity } from "./adopted.ts";

const [url, outFile, factsArg] = process.argv.slice(2);
assert(url && outFile, "usage: srv3-fix1-repro.ts <gateway url> <out.json> [facts]");
const F = Number(factsArg ?? "80");
process.env.TX2_SUBJECT_WIDE = "1";
const run = Math.random().toString(36).slice(2, 10);
const products = await productSaver([url], `srv3-fix1-${run}`, { orderedSaves: true, saveSizeRule: true, groupAccount: "m1", writeClass: "live" });
const store = products.stores[0]!;
const db = store.db;
const client = new DatomicClient(url, 35000);
const entity = "acct/m1/subject/s";
const options = await client.request<any>("GET", "/v1/db/" + db + "/write-options");

// The card's reader before the fix (scale1/decision/writes.ts adopt, fea80dd73).
const oldReader = (sent: { claims: { txId: string }[]; newIds: string[] }) => {
  const tx = sent.claims[0]?.txId ?? "";
  const token = /^_tx\/([0-7][0-9A-HJKMNP-TV-Z]{23})00$/.exec(tx)?.[1] ?? /^_tx\/([0-7][0-9A-HJKMNP-TV-Z]{22})W00$/.exec(tx)?.[1];
  const ids = [...sent.newIds].sort(), digits = token?.length === 24 ? 2 : 3;
  return token && ids.every((id, i) => id === token + i.toString(16).toUpperCase().padStart(digits, "0")) ? token : undefined;
};

let after = 0;
async function journalRow(position: number) {
  for (;;) {
    const { transactions } = await client.request<{ transactions: any[] }>("POST", "/v2/db/" + db + "/transactions", { after, limit: 100, waitMs: 250 });
    for (const tx of transactions) {
      after = tx[1];
      if (tx[1] === position) return decodeFeed(db, tx, Date.now(), true);
    }
  }
}

const results: Record<string, unknown>[] = [];
let prior: { id: string; attribute: string }[] = [];
for (const [label, retire] of [["seed (first write, retires nothing)", false], ["the same fields again (retires each)", true]] as const) {
  const facts = Array.from({ length: F }, (_, i) => ({ e: entity, a: `:t/f${i}`, v: { type: "string", value: `${label} ${i}` } }));
  const old = retire ? prior : [];
  const cmd = `srv3-fix1-${run}-${results.length}`;
  const { input, ack } = await products.save(0, entity, facts as never, old, cmd);
  prior = input.rows.filter((r: any) => r.entity_type !== "_Transaction" && input.newIds.includes(r.id)).map((r: any) => ({ id: r.id, attribute: r.attribute }));
  const position = Number(ack.position.v), clock = ack.recordedAt.v;
  const { operationId: _o, position: _p, t: _t, recordedAt: _c, ...stage } = ack;
  const row = await journalRow(position);
  const save = (marking: { orderedToken?: string; generalIdentity?: boolean }) => ({
    status: "acked", saveKey: "k", product: true, facts: F, retired: old.length, db, id: cmd, ...marking,
    receipt: { p: position, t: ack.t.v, clock, tx: input.claims[0].txId, digest: expectedJournal({ input, entity }, clock) }, stage,
  });
  const verdict = (s: unknown) => {
    try { checkSavedIdentity(s as never, row as never, "per-person-ordered", options.subjectFunction); return "passes"; }
    catch (e) { return `fails: ${String((e as Error).message).split("\n").slice(0, 3).join(" ").slice(0, 220)}`; }
  };
  const oldToken = oldReader(input), block = blockToken(input.claims[0].txId, input.newIds);
  const r = {
    save: label, facts: F, retired: old.length, newIds: input.newIds.length, txId: input.claims[0].txId,
    sdkRoute: products.routes(), writer: stage.subjectSave ?? "general", subjectOrderedIds: stage.subjectOrderedIds === true,
    oldReader: oldToken ? "ordered" : "general identity", newReader: block ? block.kind : "general identity",
    cardCheckWithOldReader: verdict(save(oldToken ? { orderedToken: oldToken } : { generalIdentity: true })),
    cardCheckWithNewReader: verdict(save(block ? { orderedToken: block.token } : { generalIdentity: true })),
  };
  console.log("SRV3_FIX1_SAVE " + JSON.stringify(r));
  results.push(r);
}
writeFileSync(outFile, JSON.stringify({ url, db, options: { subjectWide: options.subjectWide, hints: options.options?.subjectHints,
  generalPrefetch: options.options?.generalPrefetch, subjectFunction: options.subjectFunction }, results }, null, 2));
await products.close();
client.close();
const ok = results.every((r) => r.cardCheckWithNewReader === "passes");
console.log("SRV3_FIX1_DONE " + JSON.stringify({ newReaderPasses: ok, oldReaderFailsOnTheWideSave: String(results[1]!.cardCheckWithOldReader).startsWith("fails") }));
process.exit(ok ? 0 : 1);
