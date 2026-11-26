// [DX-S5 fourth review] The admitted window of S6 13 (R3-1): real builds that do not know the account-ID setting open
// the database after the transition and save. Run by s5/stack5-run.sh on PostgreSQL, one database, five gateways:
//   G_on     (head, TX2_ACCOUNT_CLAIMS=1)            turns the setting on
//   G_head   (head)                                   this build's traffic: routed saves, and opens
//   G_prof   (a6d02225c, TX2_LOAD1_PROFILE=1)         an old build whose general writer differs (it rewrites :triplex/commit)
//   G_serial (a6d02225c, the serial options)          an old build whose one-owner writer differs (a new ident)
//   G_base   (23b7df344)                              an old build with this build's writer code
// Every save is the SDK's TriplesLive through one gateway; each is logged with its outcome and its claim's stored form.
// Times are diagnostic.
//   node window.mjs <G_on> <G_head> <G_prof> <G_serial> <G_base> <work dir> <seconds alone>
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { appendFileSync } from "node:fs";
import { core, datomic, Effect, openProduct, type ProductStore } from "../s2/product.ts";

const [onUrl, headUrl, profUrl, serialUrl, baseUrl, work, aloneArg] = process.argv.slice(2);
assert(onUrl && headUrl && profUrl && serialUrl && baseUrl && work, "usage: window <G_on> <G_head> <G_prof> <G_serial> <G_base> <work> <seconds>");
const alone = Number(aloneArg ?? "60");
const log = (tag: string, m: unknown) => { const line = `DX-S5R4_${tag} ${JSON.stringify(m)}`; console.log(line); appendFileSync(`${work}/driver.log`, line + "\n"); };
const scopeName = `s5r4-window-${randomUUID().slice(0, 8)}`;
const options = { resolutionTimeoutMs: 20_000, orderedSaves: true, saveSizeRule: true, severalOwners: true, creationSaves: true };
const direct = new datomic.DatomicClient(onUrl);

function classify(cause: unknown) {
  const text = JSON.stringify(cause) ?? String(cause);
  const code = text.match(/"code":"([A-Za-z]+)"/)?.[1];
  const message = [...text.matchAll(/"message":"([^"]{0,120})/g)].map((m) => m[1]).filter((m, i, a) => a.indexOf(m) === i).slice(0, 2).join(" | ");
  const tag = [...text.matchAll(/"_tag":"([A-Za-z]+)"/g)].map((m) => m[1]).filter((t) => t !== "Fail" && t !== "Cause");
  return code ? `WriteError:${code} (${message})` : `Error:${tag.join("/") || text.slice(0, 160)}`;
}
async function claimForms(db: string, commandId: string) {
  const plain = (await direct.request("POST", `/v1/db/${db}/claim`, { commandId })) as { txId: string | null };
  const scoped = (await direct.request("POST", `/v1/db/${db}/claim`, { commandId, account: "m1" })) as { txId: string | null; taken?: boolean };
  return { plain: plain.txId, forAccount: scoped.txId, taken: scoped.taken === true };
}
const opsOf = (label: string, kind: string, n: string) =>
  kind === "one-owner"
    ? [{ op: "assert", entityId: `acct/m1/subject/${label}`, attribute: `:t/${n}`, value: { type: "string", value: n }, entityType: "subject", validFrom: 0 }]
    : kind === "general"
      ? [0, 1, 2, 3, 4].map((j) => ({ op: "assert", entityId: `acct/m1/subject/${label}-${n}-g${j}`, attribute: ":t/x", value: { type: "string", value: n }, entityType: "subject", validFrom: 0 }))
      : [{ op: "assert", entityId: `acct/m1/enrolment/${label}-${n}`, attribute: ":e/subject", value: { type: "ref", value: `acct/m1/subject/${label}` }, entityType: "enrolment", validFrom: 0 }];
async function save(label: string, store: ProductStore, kind: string, step: string, command = `${label}-${kind}-${randomUUID().slice(0, 8)}`, quiet = false) {
  const started = performance.now();
  const exit = await store.exit(Effect.flatMap(core.Triples, (s: any) => s.transact(opsOf(label, kind, randomUUID().slice(0, 6)), { commandId: command })));
  const r = { step, build: label, kind, command, outcome: exit._tag === "Success" ? "stored" : classify(exit.cause), ms: Math.round(performance.now() - started),
    claim: quiet ? undefined : await claimForms(store.db, command) };
  if (!quiet) log("SAVE", r);
  return r;
}
async function many(label: string, store: ProductStore, kind: string, step: string, n: number) {
  const outcomes: Record<string, number> = {};
  const forms: Record<string, number> = {};
  for (let i = 0; i < n; i++) {
    const r = await save(label, store, kind, step, undefined, true);
    outcomes[r.outcome] = (outcomes[r.outcome] ?? 0) + 1;
    if (r.outcome === "stored") {
      const c = await claimForms(store.db, r.command);
      const form = c.plain ? "plain" : c.forAccount ? "scoped" : "none";
      forms[form] = (forms[form] ?? 0) + 1;
    }
  }
  const m = { step, build: label, kind, n, outcomes, storedForms: forms };
  log("MANY", m);
  return m;
}
async function open(label: string, url: string, claimAccount?: string) {
  const store = await openProduct(url, scopeName, { ...options, ...(claimAccount ? { claimAccount } : {}) });
  log("OPEN", { build: label, url, db: store.db });
  return store;
}

const head0 = await open("head", headUrl);
for (const kind of ["one-owner", "general", "creation"]) await save("head", head0, kind, "before");
const turned = await direct.request("POST", `/v1/db/${head0.db}/settings`, { accountIds: true });
log("SETTING", { turned });
const head = await open("head", headUrl, "m1");
const headSaves = async (step: string) => { for (const kind of ["one-owner", "general", "creation"]) await save("head", head, kind, step); };

// P1: an old build whose one-owner writer differs. Its open installs that writer under a new ident.
const serial = await open("serial", serialUrl);
await many("serial", serial, "one-owner", "serial: after its open", 10);
await headSaves("P1 head saves");
await many("serial", serial, "one-owner", "serial: after the head's routed saves", 10);
// Alone: no save and no open of this build for a while.
{
  const until = Date.now() + alone * 1000; let n = 0; const outcomes: Record<string, number> = {};
  while (Date.now() < until) { const r = await save("serial", serial, "one-owner", "alone", undefined, true); outcomes[r.outcome] = (outcomes[r.outcome] ?? 0) + 1; n++; }
  log("MANY", { step: `serial: alone for ${alone} s`, build: "serial", kind: "one-owner", n, outcomes });
}
const headReopen1 = await open("head", headUrl, "m1");
await many("serial", serial, "one-owner", "serial: after a head open", 10);

// P2: an old build whose general writer differs. Its open rewrites :triplex/commit (and installs its variant).
const prof = await open("prof", profUrl);
await many("prof", prof, "general", "prof: after its open", 10);
const base = await open("base", baseUrl);
await many("base", base, "general", "base: after the prof open", 5);
// A save of the old build in the window, under a command of account m1.
const windowCommand = `m1-window-${randomUUID().slice(0, 8)}`;
const windowSave = await save("prof", prof, "general", "prof: a save under m1's command, in the window", windowCommand);
await headSaves("P2 head saves");
await many("prof", prof, "general", "prof: after the head's routed saves", 10);
const prof2 = await open("prof", profUrl);
await many("prof", prof2, "general", "prof: after it opens again", 10);
await headSaves("P2 head saves again");
await many("prof", prof2, "general", "prof: after the head's routed saves again", 5);

// P3: what the window's save does to the account's own client.
const own = await head.exit(Effect.flatMap(core.Triples, (s: any) => s.transact(opsOf("head", "one-owner", "own"), { commandId: windowCommand })));
log("OWN", { case: "m1's own client saves the command the old build stored in the window", windowSave: windowSave.outcome,
  own: own._tag === "Success" ? "stored" : classify(own.cause), claim: await claimForms(head.db, windowCommand) });
log("DONE", { scope: scopeName, reopened: [!!headReopen1] });
process.exit(0);
