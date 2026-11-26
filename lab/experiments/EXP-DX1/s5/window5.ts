// [DX-S5 fifth review] The window that remains after the fifth pass (S6 14.1): an older build's writer under an ident
// the database did not hold works until this build's next save. Run by s5/stack6-run.sh on PostgreSQL, one database,
// five gateways (the same as s5/stack5-run.sh):
//   G_on     (head, TX2_ACCOUNT_CLAIMS=1)            turns the setting on
//   G_head   (head)                                   this build's traffic
//   G_prof   (a6d02225c, TX2_LOAD1_PROFILE=1)         an older build whose general writer differs (the hash bar)
//   G_serial (a6d02225c, the serial options)          an older build whose one-owner writer has a new ident
//   G_base   (23b7df344)                              an older build with this build's writer code
// P1 measures how long the serial build's saves commit: alone, after each kind of request of this build that is not a
// save, after a request that is not JSON, after a save refused at the account check, after this build's save, after
// the serial build opens again. P2 the profile build's open. P3 a command the serial build stored in the window, sent
// again by the account's own client through this build: committed once or twice. Times are diagnostic.
//   node window5.mjs <G_on> <G_head> <G_prof> <G_serial> <G_base> <work dir> <seconds alone>
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { appendFileSync } from "node:fs";
import { core, datomic, Effect, openProduct, type ProductStore } from "../s2/product.ts";

const [onUrl, headUrl, profUrl, serialUrl, baseUrl, work, aloneArg] = process.argv.slice(2);
assert(onUrl && headUrl && profUrl && serialUrl && baseUrl && work, "usage: window5 <G_on> <G_head> <G_prof> <G_serial> <G_base> <work> <seconds>");
const alone = Number(aloneArg ?? "30");
const log = (tag: string, m: unknown) => { const line = `DX-S5R5_${tag} ${JSON.stringify(m)}`; console.log(line); appendFileSync(`${work}/driver.log`, line + "\n"); };
const scopeName = `s5r5-window-${randomUUID().slice(0, 8)}`;
const options = { resolutionTimeoutMs: 20_000, orderedSaves: true, saveSizeRule: true, severalOwners: true, creationSaves: true };
const onClient = new datomic.DatomicClient(onUrl);
const headClient = new datomic.DatomicClient(headUrl);

function classify(cause: unknown) {
  const text = JSON.stringify(cause) ?? String(cause);
  const code = text.match(/"code":"([A-Za-z]+)"/)?.[1];
  const message = [...text.matchAll(/"message":"([^"]{0,140})/g)].map((m) => m[1]).filter((m, i, a) => a.indexOf(m) === i).slice(0, 2).join(" | ");
  const tag = [...text.matchAll(/"_tag":"([A-Za-z]+)"/g)].map((m) => m[1]).filter((t) => t !== "Fail" && t !== "Cause");
  return code ? `WriteError:${code} (${message})` : `Error:${tag.join("/") || text.slice(0, 200)}`;
}
// A claim's forms. The lookups carry no position, so they read the gateway's current view; each is read again for up
// to 3 s until the expected forms are there (a peer that has not caught up is not a finding here).
async function claimForms(db: string, commandId: string, want: (f: { plain: string | null; forAccount: string | null }) => boolean = (f) => !!(f.plain || f.forAccount)) {
  let f = { plain: null as string | null, forAccount: null as string | null, taken: false };
  for (let i = 0; i < 30; i++) {
    const plain = (await onClient.request("POST", `/v1/db/${db}/claim`, { commandId })) as { txId: string | null };
    const scoped = (await onClient.request("POST", `/v1/db/${db}/claim`, { commandId, account: "m1" })) as { txId: string | null; taken?: boolean };
    f = { plain: plain.txId, forAccount: scoped.txId, taken: scoped.taken === true };
    if (want(f)) break;
    await new Promise((r) => setTimeout(r, 100));
  }
  return f;
}
const opsOf = (label: string, n: string, account = "m1") =>
  [{ op: "assert", entityId: `acct/${account}/subject/${label}`, attribute: `:t/${n}`, value: { type: "string", value: n }, entityType: "subject", validFrom: 0 }];
async function save(label: string, store: ProductStore, step: string, command = `${label}-${randomUUID().slice(0, 8)}`, account = "m1") {
  const started = performance.now();
  const exit = await store.exit(Effect.flatMap(core.Triples, (s: any) => s.transact(opsOf(label, randomUUID().slice(0, 6), account), { commandId: command })));
  return { step, build: label, command, outcome: exit._tag === "Success" ? "stored" : classify(exit.cause),
    position: exit._tag === "Success" ? (exit.value as any).position : undefined, ms: Math.round(performance.now() - started) };
}
async function many(label: string, store: ProductStore, step: string, n: number) {
  const outcomes: Record<string, number> = {};
  for (let i = 0; i < n; i++) { const r = await save(label, store, step); outcomes[r.outcome] = (outcomes[r.outcome] ?? 0) + 1; }
  const m = { step, build: label, n, stored: outcomes["stored"] ?? 0, outcomes };
  log("MANY", m);
  return m;
}
async function open(label: string, url: string, claimAccount?: string) {
  const store = await openProduct(url, scopeName, { ...options, ...(claimAccount ? { claimAccount } : {}) });
  log("OPEN", { build: label, url, db: store.db });
  return store;
}
async function tryOpen(label: string, url: string) {
  try { return await open(label, url); } catch (e) { log("OPEN_REFUSED", { build: label, url, error: classify(e) }); return undefined; }
}
async function request(label: string, f: () => Promise<unknown>) {
  try { const r = await f(); log("REQUEST", { request: label, answer: JSON.stringify(r).slice(0, 160) }); }
  catch (e) { log("REQUEST", { request: label, answer: classify(e) }); }
}

const head0 = await open("head", headUrl);
await save("head", head0, "before");
const turned = await onClient.request("POST", `/v1/db/${head0.db}/settings`, { accountIds: true });
log("SETTING", { turned });
const head = await open("head", headUrl, "m1");
await save("head", head, "after the setting");
const db = head.db;

// P1: the serial build's open installs its one-owner writer under an ident the database did not hold.
const serial = await open("serial", serialUrl);
await many("serial", serial, "serial: after its open", 10);
// A command of account m1 stored by the serial build in its window (P3).
const windowCommand = `m1-window5-${randomUUID().slice(0, 8)}`;
const windowSave = await save("serial", serial, "serial: m1's command, in the window", windowCommand);
log("SAVE", { ...windowSave, claim: await claimForms(db, windowCommand) });
{
  const until = Date.now() + alone * 1000; let n = 0, stored = 0;
  while (Date.now() < until) { const r = await save("serial", serial, "alone"); n++; if (r.outcome === "stored") stored++; }
  log("MANY", { step: `serial: alone for ${alone} s (no request of this build)`, build: "serial", n, stored });
}
// Requests of this build that are not saves, each followed by the serial build's saves.
await request("a claim lookup", () => headClient.request("POST", `/v1/db/${db}/claim`, { commandId: "nothing", account: "m1" }));
await request("a row read", () => headClient.rows(db, { entityIds: ["acct/m1/subject/head"] }));
await request("a fence", () => headClient.request("POST", `/v1/db/${db}/fence`, { operationId: `fence5-${randomUUID()}` }));
await request("the settings route", () => onClient.request("POST", `/v1/db/${db}/settings`, { accountIds: true }));
await many("serial", serial, "serial: after this build's lookup, read, fence and settings", 10);
await request("a transact request that is not JSON", async () => {
  const r = await fetch(`${headUrl}/v1/db/${db}/transact`, { method: "POST", headers: { "content-type": "application/json" }, body: "this is not json" });
  return { status: r.status };
});
await many("serial", serial, "serial: after a transact request that is not JSON", 10);
const refused = await save("head", head, "a save naming m1 that writes another account's entity", undefined, "zz");
log("SAVE", refused);
await many("serial", serial, "serial: after this build's save refused at the account check", 10);
await save("head", head, "a save of this build");
await many("serial", serial, "serial: after this build's save", 10);
const serial2 = await open("serial", serialUrl);
await many("serial", serial2, "serial: after it opens again", 10);

// P2: the profile build's open (its install writes its general writer and its hash in one transaction).
const prof = await tryOpen("prof", profUrl);
if (prof) await many("prof", prof, "prof: after its open", 10);
const base = await tryOpen("base", baseUrl);
if (base) await many("base", base, "base: after the profile build", 5);

// P3: the account's own client sends the serial build's window command again through this build.
const again = await save("head", head, "m1's client sends the window's command again", windowCommand);
const forms = await claimForms(db, windowCommand, (f) => !!(f.plain && f.forAccount && f.plain !== f.forAccount));
log("TWICE", { case: "a command stored in the window, then sent again through this build", window: windowSave.outcome, again: again.outcome,
  claims: forms, committedTwice: windowSave.outcome === "stored" && again.outcome === "stored" && !!forms.plain && !!forms.forAccount && forms.plain !== forms.forAccount });
log("DONE", { scope: scopeName });
process.exit(0);
