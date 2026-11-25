// [DX-S5 third review] The account-ID setting's transition on the PostgreSQL stack (s5/stack3-run.sh), with real
// builds side by side on one database:
//   G_new  (head, TX2_ACCOUNT_CLAIMS=1)   turns the setting on
//   G_prof (head, TX2_LOAD1_PROFILE=1)     the same build under an option that changes the general writer's code hash
//   G_s6a  (a6d02225c, the save line before the setting; same writer code as the head)
//   G_base (23b7df344, the base; its one-owner writer code differs)
// Each store is the SDK's TriplesLive opened through one gateway (opening runs create-scope! there, which installs that
// build's writer functions). Steps: open G_s6a's store; seed; turn the setting on; save through every build; open
// G_base's store after the transition; reopen through G_prof; save through every build again. Each save is logged
// with what the store holds afterwards. Times are diagnostic.
//   node transition.mjs <G_new> <G_prof> <G_s6a> <G_base> <work dir>
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { appendFileSync, existsSync } from "node:fs";
import { core, datomic, Effect, openProduct, type ProductStore } from "../s2/product.ts";

const [newUrl, profUrl, s6aUrl, baseUrl, work] = process.argv.slice(2);
assert(newUrl && profUrl && s6aUrl && baseUrl && work, "usage: transition <G_new> <G_prof> <G_s6a> <G_base> <work>");
const log = (tag: string, m: unknown) => { const line = `DX-S5R3_${tag} ${JSON.stringify(m)}`; console.log(line); appendFileSync(`${work}/driver.log`, line + "\n"); };
const scopeName = `s5r3-transition-${randomUUID().slice(0, 8)}`;
const options = { resolutionTimeoutMs: 20_000, orderedSaves: true, saveSizeRule: true, severalOwners: true, creationSaves: true };
const direct = new datomic.DatomicClient(newUrl);

function classify(cause: unknown) {
  const text = JSON.stringify(cause) ?? String(cause);
  const code = text.match(/"code":"([A-Za-z]+)"/)?.[1];
  const message = [...text.matchAll(/"message":"([^"]{0,160})/g)].map((m) => m[1]).filter((m, i, a) => a.indexOf(m) === i).slice(0, 3).join(" | ");
  if (code) return `WriteError:${code} (${message})`;
  const tag = [...text.matchAll(/"_tag":"([A-Za-z]+)"/g)].map((m) => m[1]).filter((t) => t !== "Fail" && t !== "Cause");
  return `Error:${tag.join("/") || text.slice(0, 200)}`;
}
async function claimForms(db: string, commandId: string) {
  // The plain form is found by a lookup naming no account; the scoped one by a lookup naming the account.
  const plain = (await direct.request("POST", `/v1/db/${db}/claim`, { commandId })) as { txId: string | null };
  const scoped = (await direct.request("POST", `/v1/db/${db}/claim`, { commandId, account: "m1" })) as { txId: string | null; taken?: boolean };
  return { plain: plain.txId, forAccount: scoped.txId, taken: scoped.taken === true };
}
async function save(label: string, store: ProductStore, kind: "one-owner" | "general" | "creation", step: string) {
  const command = `${label}-${kind}-${randomUUID().slice(0, 8)}`;
  const S = `acct/m1/subject/${label}`;
  const ops = kind === "one-owner"
    ? [{ op: "assert", entityId: S, attribute: `:t/${step}`, value: { type: "string", value: step }, entityType: "subject", validFrom: 0 }]
    : kind === "general"
      ? [0, 1, 2, 3, 4].map((j) => ({ op: "assert", entityId: `acct/m1/subject/${label}-g${j}`, attribute: `:t/${step}`, value: { type: "string", value: step }, entityType: "subject", validFrom: 0 }))
      : [{ op: "assert", entityId: `acct/m1/enrolment/${label}-${step}`, attribute: ":e/subject", value: { type: "ref", value: S }, entityType: "enrolment", validFrom: 0 }];
  const started = performance.now();
  const exit = await store.exit(Effect.flatMap(core.Triples, (s: any) => s.transact(ops, { commandId: command })));
  const ms = Math.round(performance.now() - started);
  const r = { step, build: label, kind, outcome: exit._tag === "Success" ? "stored" : classify(exit.cause), ms,
    claim: await claimForms(store.db, command) };
  log("SAVE", r);
  return r;
}
async function open(label: string, url: string, claimAccount?: string) {
  const store = await openProduct(url, scopeName, { ...options, ...(claimAccount ? { claimAccount } : {}) });
  log("OPEN", { build: label, url, db: store.db });
  return store;
}

const results: any[] = [];
// Before the setting, the head's saves name no account: a save naming one, on a process permitted to turn the setting
// on, turns it on (account_claims.clj stored-ids), and the "before" step would not be before.
const newPlain = await open("new", newUrl);
const s6aStore = await open("s6a", s6aUrl);
for (const [label, store] of [["new", newPlain], ["s6a", s6aStore]] as const)
  for (const kind of ["one-owner", "general", "creation"] as const) results.push(await save(label, store, kind, "before"));
const turned = await direct.request("POST", `/v1/db/${newPlain.db}/settings`, { accountIds: true });
log("SETTING", { turned });
const newStore = await open("new", newUrl, "m1");
// Account authority through the SDK: a second client names account m1 itself (claimAccount "m1"; nothing ties the
// account to the caller) and saves first under the command ID m1's own client then uses.
{
  const taken = `m1-publish-${randomUUID().slice(0, 8)}`;
  const intruder = await open("names-m1", newUrl, "m1");
  const one = (entityId: string, value: string) => [{ op: "assert", entityId, attribute: ":t/x", value: { type: "string", value }, entityType: "subject", validFrom: 0 }];
  const plant = await intruder.exit(Effect.flatMap(core.Triples, (s: any) => s.transact(one("acct/m1/subject/planted", "planted"), { commandId: taken })));
  const own = await newStore.exit(Effect.flatMap(core.Triples, (s: any) => s.transact(one("acct/m1/subject/own", "own"), { commandId: taken })));
  const show = (e: any) => e._tag === "Success" ? { stored: JSON.stringify(e.value)?.slice(0, 200) } : classify(e.cause);
  log("AUTHORITY", { case: "another client names account m1 and saves first under m1's command ID", plant: show(plant), own: show(own),
    claim: await claimForms(newStore.db, taken) });
}
for (const [label, store] of [["new", newStore], ["s6a", s6aStore]] as const)
  for (const kind of ["one-owner", "general", "creation"] as const) results.push(await save(label, store, kind, "after"));
// The base build opens the database only now: its writer functions are installed after the transition.
let baseStore: ProductStore | undefined;
try { baseStore = await open("base", baseUrl); } catch (e) { log("OPEN_FAILED", { build: "base", error: String(e) }); }
if (baseStore) for (const kind of ["one-owner", "general", "creation"] as const) results.push(await save("base", baseStore, kind, "after-base-open"));
// The head under another option opens the database: create-scope! compares the general writer's hash.
const profStore = await open("prof", profUrl);
for (const [label, store] of [["new", newStore], ["s6a", s6aStore], ["prof", profStore], ...(baseStore ? [["base", baseStore]] : [])] as [string, ProductStore][])
  for (const kind of ["one-owner", "general", "creation"] as const) results.push(await save(label, store, kind, "after-reopen"));
// The transactor restarts (stack3-run.sh's watcher): a running transactor may hold the function body it last ran under
// an ident; a restarted one reads the body the database holds now.
appendFileSync(`${work}/restart`, "");
for (let i = 0; i < 600 && !existsSync(`${work}/restarted`); i++) await new Promise((r) => setTimeout(r, 200));
log("RESTARTED", { restarted: existsSync(`${work}/restarted`) });
for (const [label, store] of [["new", newStore], ["s6a", s6aStore], ["prof", profStore], ...(baseStore ? [["base", baseStore]] : [])] as [string, ProductStore][])
  for (const kind of ["one-owner", "general", "creation"] as const) {
    let r = await save(label, store, kind, "after-restart");
    // The first save after a restart can meet the peer's reconnect; one more try, recorded as its own row.
    if (r.outcome !== "stored" && !r.outcome.startsWith("WriteError:CasConflict")) results.push(r), r = await save(label, store, kind, "after-restart-again");
    results.push(r);
  }
const storedAfterTheSetting = results.filter((r) => r.step !== "before" && r.outcome === "stored" && r.build !== "new" && r.build !== "prof");
log("DONE", { saves: results.length, storedByABuildThatDoesNotKnowTheSetting: storedAfterTheSetting.map((r) => `${r.build} ${r.kind} ${r.step}`),
  plainClaimsAfterTheSetting: results.filter((r) => r.step !== "before" && r.claim.plain).map((r) => `${r.build} ${r.kind} ${r.step}`) });
process.exit(0);
