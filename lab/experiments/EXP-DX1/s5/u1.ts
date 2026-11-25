// [DX-S5 third review] U1 of the Publish review (act10/REVIEW-3.md): a save's ordered identity block (orderedSaves)
// and the same process's other monotonic IDs in the same millisecond share one ID space, so a valid save can be refused
// "TRIPLEX_IDENTITY f/id". Driven here with the real SDK on this head against one gateway (s5/u1-run.sh): in one Node
// process, store A saves with orderedSaves and store B without (its row IDs come from the SDK's monotonic factory, as a
// Publish's, a frame's, a definition's or a setting's do), many pairs at once. Every outcome is classified; for each
// identity refusal the save is sent again as a caller would (a new transact of the same ops), and the colliding IDs are
// named. Times are diagnostic.
//   node u1.mjs <gateway url> <work dir> <pairs> <rows per save>
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { appendFileSync } from "node:fs";
import { core, Effect, openProduct, type ProductStore } from "../s2/product.ts";

const [url, work, pairsArg, rowsArg] = process.argv.slice(2);
assert(url && work, "usage: u1 <url> <work> <pairs> <rows>");
const pairs = Number(pairsArg ?? "20000"), rows = Number(rowsArg ?? "40");
const log = (tag: string, m: unknown) => { const line = `DX-S5R3_${tag} ${JSON.stringify(m)}`; console.log(line); appendFileSync(`${work}/driver.log`, line + "\n"); };
const scope = `s5r3-u1-${randomUUID().slice(0, 8)}`;
const A = await openProduct(url, scope, { orderedSaves: true, saveSizeRule: true });
const B = await openProduct(url, scope, {});
const classify = (cause: unknown) => {
  const text = JSON.stringify(cause) ?? String(cause);
  const code = text.match(/"code":"([A-Za-z]+)"/)?.[1];
  return code ? code : (text.match(/"_tag":"([A-Za-z]+Error)"/)?.[1] ?? text.slice(0, 120));
};
const ops = (who: string, i: number) =>
  Array.from({ length: rows }, (_, j) => ({ op: "assert", entityId: `acct/u1/subject/${who}${i}`, attribute: `:u/f${j}`,
    value: { type: "string", value: `${who}${i}/${j}` }, entityType: "subject", validFrom: 0 }));
const save = (store: ProductStore, o: any[]) => store.exit(Effect.flatMap(core.Triples, (s: any) => s.transact(o, {})));
const counts: Record<string, number> = {};
const refused: { who: string; i: number; code: string; again: string; message: string }[] = [];
let next = 0;
const started = Date.now();
async function worker() {
  while (next < pairs) {
    const i = next++;
    const [a, b] = await Promise.all([save(A, ops("a", i)), save(B, ops("b", i))]);
    for (const [who, exit, o] of [["a", a, ops("a", i)], ["b", b, ops("b", i)]] as const) {
      const k = exit._tag === "Success" ? "stored" : classify(exit.cause);
      counts[`${who}:${k}`] = (counts[`${who}:${k}`] ?? 0) + 1;
      if (exit._tag !== "Success") {
        const again = await save(who === "a" ? A : B, o);
        const text = JSON.stringify(exit.cause);
        refused.push({ who, i, code: k, again: again._tag === "Success" ? "stored" : classify(again.cause),
          message: (text.match(/"message":"([^"]{0,200})/)?.[1] ?? "").slice(0, 200) });
      }
    }
  }
}
await Promise.all(Array.from({ length: Number(process.env.U1_WORKERS ?? "16") }, worker));
log("DONE", { pairs, rows, seconds: (Date.now() - started) / 1000, counts, refused: refused.slice(0, 20), refusedTotal: refused.length });
process.exit(0);
