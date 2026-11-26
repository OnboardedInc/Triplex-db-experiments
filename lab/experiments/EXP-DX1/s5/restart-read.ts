// [DX-S5 fifth review] What a read through another gateway sees after a transactor restart (the mixed stack's
// `uniform G_off kill` case, S6 14.3). Run by s5/stack7-run.sh on PostgreSQL: two gateways of this build (A and B). Each
// case saves one new fact through A with the SDK while the transactor is paused, then has the runner kill and restart
// the transactor; when the SDK answers "stored", reads through B at fixed delays after the answer:
//   atLeast  rows with atLeastPosition = the save's receipt position (basisWaitMs 2000): the contract read (at_least.clj)
//   plain    rows without a position (the mixed stack's reads)
//   log      the log route (the mixed stack's transaction count)
// A row read that asks for at least the receipt and answers without the save would be a save reported stored and absent;
// AtLeastTimeout is the contract's refusal. Times are diagnostic.
//   node restart-read.mjs <A url> <B url> <work dir> <cases>
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { appendFileSync, existsSync, writeFileSync } from "node:fs";
import { core, datomic, Effect, openProduct } from "../s2/product.ts";

const [aUrl, bUrl, work, casesArg] = process.argv.slice(2);
assert(aUrl && bUrl && work, "usage: restart-read <A> <B> <work> [cases]");
const cases = Number(casesArg ?? "6");
const log = (tag: string, m: unknown) => { const line = `DX-S5R5_${tag} ${JSON.stringify(m)}`; console.log(line); appendFileSync(`${work}/driver.log`, line + "\n"); };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let requests = 0;
async function ask(action: "stop" | "cont" | "kill") {
  const n = ++requests;
  writeFileSync(`${work}/req-${n}`, action + "\n");
  for (let i = 0; !existsSync(`${work}/ack-${n}`); i++) { if (i > 2400) throw new Error(`runner never acknowledged ${action}`); await sleep(50); }
}
const B = new datomic.DatomicClient(bUrl);
const code = (e: unknown) => (JSON.stringify(e) ?? String(e)).match(/"code":"([A-Za-z]+)"/)?.[1] ?? String(e).slice(0, 80);
async function look(db: string, S: string, value: string, position: number, txId: string) {
  const has = (rows: readonly any[]) => rows.some((r: any) => r.retracted_at === null && r.attribute === ":m/note" && r.value_string === value);
  const started = performance.now();
  let atLeast: string;
  try { atLeast = has(await B.rows(db, { entityIds: [S], atLeastPosition: position, basisWaitMs: 2000 })) ? "has the save" : "ANSWERED WITHOUT THE SAVE"; }
  catch (e) { atLeast = `refused ${code(e)}`; }
  const atLeastMs = Math.round(performance.now() - started);
  let plain: string;
  try { plain = has(await B.rows(db, { entityIds: [S] })) ? "has" : "not yet"; } catch (e) { plain = `refused ${code(e)}`; }
  let inLog = "not yet";
  try {
    for (let from = "0"; ;) {
      const page = await B.log(db, from, 1000);
      if (page.rows.some((row: any) => row.kind === "commit" && (row.transaction as any)?.txIds?.includes(txId))) { inLog = "has"; break; }
      if (page.rows.length === 0 || page.nextT === from) break;
      from = page.nextT;
    }
  } catch (e) { inLog = `refused ${code(e)}`; }
  return { atLeast, atLeastMs, plain, log: inLog };
}

const delays = [0, 500, 1000, 1500, 2000, 3000, 5000, 10000, 20000];
let violations = 0, storedCases = 0;
for (let i = 0; i < cases; i++) {
  const store = await openProduct(aUrl, `s5r5-restart-${i}-${randomUUID().slice(0, 8)}`,
    { claimAccount: "m1", resolutionTimeoutMs: 60_000, orderedSaves: true, saveSizeRule: true, severalOwners: true, creationSaves: true });
  const S = "acct/m1/subject/s";
  const transact = (ops: any[], meta: Record<string, unknown>) => store.exit(Effect.flatMap(core.Triples, (s: any) => s.transact(ops, meta)));
  const seed = await transact([{ op: "assert", entityId: S, attribute: ":m/seed", value: { type: "string", value: "seed" }, entityType: "subject", validFrom: 0 }], {});
  assert.equal(seed._tag, "Success", "seed save");
  const value = `one note ${i} ${randomUUID().slice(0, 6)}`;
  await ask("stop");
  const pending = transact([{ op: "assert", entityId: S, attribute: ":m/note", value: { type: "string", value }, entityType: "subject", validFrom: 0 }],
    { commandId: `note-${i}-${randomUUID()}` });
  await sleep(300 + 100 * i);
  await ask("kill");
  const exit = await pending;
  const answeredAt = performance.now();
  if (exit._tag !== "Success") { log("CASE", { case: i, reported: code(exit.cause) }); await store.close(); continue; }
  storedCases++;
  const position = Number((exit.value as any).position);
  const txId = String((exit.value as any).txId);
  const reads: any[] = [];
  for (const d of delays) {
    const wait = answeredAt + d - performance.now();
    if (wait > 0) await sleep(wait);
    const r = await look(store.db, S, value, position, txId);
    reads.push({ afterMs: d, ...r });
    if (r.atLeast === "ANSWERED WITHOUT THE SAVE") violations++;
  }
  const first = (k: string, v: string) => reads.find((r) => r[k] === v)?.afterMs ?? null;
  log("CASE", { case: i, reported: "stored", position, txId, firstAtLeastHas: first("atLeast", "has the save"), firstPlainHas: first("plain", "has"),
    firstLogHas: first("log", "has"), reads });
  await store.close();
}
log("DONE", { cases, storedCases, atLeastAnsweredWithoutTheSave: violations });
process.exit(0);
