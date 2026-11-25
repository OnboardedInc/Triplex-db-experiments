// [DX-S5 second review] The fence against a delayed original, with the real SDK, on the PostgreSQL stack
// (s5/stack2-run.sh): one gateway with TX2_ACCOUNT_CLAIMS=1 (G_on) and one without (G_off), as during a rolling start
// of the option. Each case opens TriplesLive (claimAccount "m1") through a proxy that sends the save (transact) to one
// gateway and every other request (lookup, fence, reads) to the other, then asks the stack runner to pause the
// transactor (SIGSTOP) or kill it (SIGKILL, then restart) while one save of one new fact is in flight. The SDK sees an
// unknown outcome, looks the operation up and fences it. Afterwards the log is read: one reported save must be exactly
// one stored transaction and one stored fact. Times are diagnostic.
//   node mixed-fleet.mjs <G_on url> <G_off url> <work dir> <random rounds>
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { appendFileSync, existsSync, writeFileSync } from "node:fs";
import http from "node:http";
import { core, datomic, Effect, openProduct, type ProductStore } from "../s2/product.ts";

const [onUrl, offUrl, work, roundsArg] = process.argv.slice(2);
assert(onUrl && offUrl && work, "usage: mixed-fleet <G_on> <G_off> <work> [rounds]");
const rounds = Number(roundsArg ?? "0");
const log = (tag: string, m: unknown) => { const line = `DX-S5R2_${tag} ${JSON.stringify(m)}`; console.log(line); appendFileSync(`${work}/driver.log`, line + "\n"); };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// The stack runner performs transactor actions (stop, cont, kill-restart) on request and acknowledges each.
let requests = 0;
async function ask(action: "stop" | "cont" | "kill") {
  const n = ++requests;
  writeFileSync(`${work}/req-${n}`, action + "\n");
  for (let i = 0; !existsSync(`${work}/ack-${n}`); i++) { if (i > 2400) throw new Error(`runner never acknowledged ${action}`); await sleep(50); }
}

// A proxy that sends POST .../transact to one gateway and everything else to another.
async function route(saveTo: string, restTo: string): Promise<string> {
  const server = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const t = new URL(req.method === "POST" && /\/transact$/.test(req.url ?? "") ? saveTo : restTo);
      const out = http.request({ host: t.hostname, port: t.port, method: req.method, path: req.url, headers: req.headers }, (answer) => {
        const back: Buffer[] = [];
        answer.on("data", (c) => back.push(c));
        answer.on("end", () => { res.writeHead(answer.statusCode ?? 502, answer.headers); res.end(Buffer.concat(back)); });
        answer.on("error", () => req.socket.destroy());
      });
      out.on("error", () => req.socket.destroy());
      out.end(Buffer.concat(chunks));
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
  return `http://127.0.0.1:${(server.address() as any).port}`;
}

const direct = new datomic.DatomicClient(onUrl);
async function commits(db: string) {
  const out: { positions: string[]; commandIds: string[]; txIds: string[] }[] = [];
  let skipped = 0;
  for (let from = "0"; ;) {
    const page = await direct.log(db, from, 1000);
    for (const row of page.rows) { if (row.kind !== "commit") { skipped++; continue; } out.push(row.transaction as any); }
    if (page.rows.length === 0 || page.nextT === from) break;
    from = page.nextT;
  }
  return { commits: out.length, skipped, txIds: out.map((t) => t.txIds[0]!) };
}
async function liveFacts(db: string, owner: string, attribute: string) {
  const rows = await direct.rows(db, { entityIds: [owner] });
  return rows.filter((r: any) => r.retracted_at === null && r.attribute === attribute).length;
}
const classify = (cause: unknown) => {
  const text = JSON.stringify(cause) ?? String(cause);
  if (/TransactionOutcomeUnknown/.test(text)) return "TransactionOutcomeUnknown";
  if (/"notApplied":true/.test(text)) return "OperationNotApplied";
  const code = text.match(/"code":"([A-Za-z]+)"/)?.[1];
  if (code) return `WriteError:${code}`;
  // A typed error from the core (for example the command already committed), named by its tag and transaction.
  const tag = [...text.matchAll(/"_tag":"([A-Za-z]+)"/g)].map((m) => m[1]).filter((t) => t !== "Fail" && t !== "Cause");
  const tx = text.match(/"transactionId":"([^"]+)"/)?.[1];
  return `Error:${tag.join("/") || text.slice(0, 160)}${tx ? ` transactionId=${tx}` : ""}`;
};

type Case = { label: string; saveTo: string; restTo: string; fault: "stop" | "kill"; command: boolean; holdMs: number };
async function runCase(c: Case, index: number) {
  const url = await route(c.saveTo, c.restTo);
  const store: ProductStore = await openProduct(url, `s5r2-mixed-${index}-${randomUUID().slice(0, 8)}`,
    { claimAccount: "m1", resolutionTimeoutMs: 60_000, orderedSaves: true, saveSizeRule: true, severalOwners: true, creationSaves: true });
  const S = "acct/m1/subject/s";
  const transact = (ops: any[], meta: Record<string, unknown>) => store.exit(Effect.flatMap(core.Triples, (s: any) => s.transact(ops, meta)));
  const seed = await transact([{ op: "assert", entityId: S, attribute: ":m/seed", value: { type: "string", value: "seed" }, entityType: "subject", validFrom: 0 }], {});
  assert.equal(seed._tag, "Success", "seed save");
  const before = await commits(store.db);
  const note = { op: "assert", entityId: S, attribute: ":m/note", value: { type: "string", value: `one note ${index}` }, entityType: "subject", validFrom: 0 };
  // The transactor is paused first so the save is in flight when the fault lands: resumed after holdMs (stop), or
  // killed with SIGKILL while paused and restarted (kill).
  await ask("stop");
  const started = performance.now();
  const pending = transact([note], c.command ? { commandId: `note-${index}-${randomUUID()}` } : {});
  await sleep(c.fault === "stop" ? c.holdMs : Math.round(c.holdMs / 2));
  await ask(c.fault === "stop" ? "cont" : "kill");
  const exit = await pending;
  const ms = Math.round(performance.now() - started);
  await sleep(1500);
  const after = await commits(store.db);
  const notes = await liveFacts(store.db, S, ":m/note");
  const reported = exit._tag === "Success" ? "stored" : classify(exit.cause);
  const reportedTx = exit._tag === "Success" ? exit.value.txId : reported.match(/transactionId=(\S+)/)?.[1];
  const storedTransactions = after.commits - before.commits;
  const r = { case: c.label, fault: c.fault, holdMs: c.holdMs, command: c.command, reported, reportedTx, storedTx: after.txIds.slice(before.commits), ms,
    storedTransactionsForOneSave: storedTransactions, liveNotes: notes, fencesInLog: after.skipped - before.skipped,
    // Exact: one stored transaction and one fact for a save reported stored (with its receipt), none for one reported
    // not stored; a command already committed is exact when it names the one stored transaction.
    exact: reported === "stored" ? storedTransactions === 1 && notes === 1 && reportedTx === after.txIds[after.txIds.length - 1]
      : reportedTx ? storedTransactions === 1 && notes === 1 && reportedTx === after.txIds[after.txIds.length - 1]
      : storedTransactions === 0 && notes === 0 };
  log("CASE", r);
  await store.close();
  return r;
}

const fixed: Case[] = [
  { label: "save on G_off (plain), lookup and fence on G_on (scoped)", saveTo: offUrl, restTo: onUrl, fault: "stop", command: false, holdMs: 8000 },
  { label: "save on G_on (scoped), lookup and fence on G_off (plain)", saveTo: onUrl, restTo: offUrl, fault: "stop", command: false, holdMs: 8000 },
  { label: "save on G_off, lookup and fence on G_on, with a command ID", saveTo: offUrl, restTo: onUrl, fault: "stop", command: true, holdMs: 8000 },
  { label: "control: everything on G_on", saveTo: onUrl, restTo: onUrl, fault: "stop", command: false, holdMs: 8000 },
  { label: "control: everything on G_off", saveTo: offUrl, restTo: offUrl, fault: "stop", command: false, holdMs: 8000 },
];
const results = [];
for (const [i, c] of fixed.entries()) results.push(await runCase(c, i));
// Random rounds on a uniform fleet (no mismatch): pause or kill, with and without a command, each gateway pairing.
const uniform = [[onUrl, onUrl], [offUrl, offUrl]] as const;
for (let i = 0; i < rounds; i++) {
  const [saveTo, restTo] = uniform[i % 2]!;
  const fault = (Math.floor(i / 2) % 2 === 0 ? "stop" : "kill") as "stop" | "kill";
  results.push(await runCase({ label: `uniform ${saveTo === onUrl ? "G_on" : "G_off"} ${fault}`, saveTo, restTo, fault,
    command: i % 3 === 0, holdMs: 5200 + (i % 5) * 900 }, 100 + i));
}
const byLabel: Record<string, { cases: number; exact: number; reported: Record<string, number> }> = {};
for (const r of results) {
  const e = (byLabel[r.case] ??= { cases: 0, exact: 0, reported: {} });
  e.cases++; if (r.exact) e.exact++; e.reported[r.reported] = (e.reported[r.reported] ?? 0) + 1;
}
log("DONE", { cases: results.length, exact: results.filter((r) => r.exact).length, byLabel });
process.exit(0);
