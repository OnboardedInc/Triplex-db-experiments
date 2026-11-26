// [DX-S6b fourth pass] What the third review left untested on the PostgreSQL stack (s6/stack4-run.sh), with real builds:
//   G1, G2  head, TX2_ACCOUNT_CLAIMS=1 (two permitted gateways)        G_s6a  a6d02225c with TX2_GROUP_COMMIT=1
//   G_base  23b7df344                                                   G_own  head with the covering-owner options
// Cases (each on its own scope):
//   A. both permitted gateways turn the setting on at once while the old build's group commits are in flight: no
//      old-build save commits after the transition (its receipt's t against the transition's t), every one after it is
//      refused, the setting is on once, the head's saves naming an account are stored scoped;
//   B. the transactor is killed (SIGKILL) during the transition's own transaction, at three delays: after the restart
//      the database is consistent (setting on exactly when the old build is refused), and turning it on again works;
//   C. covering-owner saves under the setting (G_own);
//   D. sealed protected values under the setting (G1, wrapping key set).
// A database restored from a backup taken before the transition is not run (section 13.6).
//   node transition4.mjs <G1> <G2> <G_s6a> <G_base> <G_own> <work dir>
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { appendFileSync, existsSync, rmSync } from "node:fs";
import { core, datomic, Effect, openProduct, type ProductStore } from "../s2/product.ts";

const [g1, g2, s6aUrl, baseUrl, ownUrl, work] = process.argv.slice(2);
assert(g1 && g2 && s6aUrl && baseUrl && ownUrl && work, "usage: transition4 <G1> <G2> <G_s6a> <G_base> <G_own> <work>");
const log = (tag: string, m: unknown) => { const line = `DX-S6T_${tag} ${JSON.stringify(m)}`; console.log(line); appendFileSync(`${work}/driver.log`, line + "\n"); };
const options = { resolutionTimeoutMs: 20_000, orderedSaves: true, saveSizeRule: true, severalOwners: true, creationSaves: true };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const verdicts: Record<string, boolean> = {};

function classify(cause: unknown) {
  const text = JSON.stringify(cause) ?? String(cause);
  const code = text.match(/"code":"([A-Za-z]+)"/)?.[1];
  return code ? `WriteError:${code}` : `Error:${text.slice(0, 160)}`;
}
async function transact(store: ProductStore, ops: any[], commandId: string) {
  const exit = await store.exit(Effect.flatMap(core.Triples, (s: any) => s.transact(ops, { commandId })));
  return exit._tag === "Success" ? "stored" : classify(exit.cause);
}
const fact = (entityId: string, attribute: string, value: string) => ({ op: "assert", entityId, attribute, value: { type: "string", value }, entityType: "subject", validFrom: 0 });
async function settings(url: string, db: string) {
  const client = new datomic.DatomicClient(url);
  try { return { ok: true, body: await client.request("POST", `/v1/db/${db}/settings`, { accountIds: true }) }; }
  catch (e: any) { return { ok: false, error: `${e?.status ?? ""} ${e?.code ?? String(e).slice(0, 120)}` }; }
  finally { client.close(); }
}
async function claimForms(url: string, db: string, commandId: string, account: string) {
  const client = new datomic.DatomicClient(url);
  try {
    const plain = (await client.request("POST", `/v1/db/${db}/claim`, { commandId })) as { txId: string | null };
    const scoped = (await client.request("POST", `/v1/db/${db}/claim`, { commandId, account })) as { txId: string | null };
    return { plain: plain.txId, scoped: scoped.txId };
  } finally { client.close(); }
}
const t = (ack: any) => (ack?.t?.v !== undefined ? Number(ack.t.v) : undefined);

// ---------------------------------------------------------------- A
{
  const scope = `s6t-a-${randomUUID().slice(0, 8)}`;
  const old = await openProduct(s6aUrl, scope, options);
  await transact(old, [fact("acct/q1/subject/seed", ":t/x", "seed")], `seed-${randomUUID()}`);
  let stop = false;
  const workers = Array.from({ length: 6 }, (_, w) => (async () => {
    let i = 0;
    while (!stop) await transact(old, [fact(`acct/q1/subject/w${w}-${i}`, ":t/x", String(i++))], `old-${w}-${i}-${randomUUID().slice(0, 6)}`);
  })());
  await sleep(1500);
  const [a1, a2] = await Promise.all([settings(g1, old.db), settings(g2, old.db)]);
  const transitionT = Number((a1.ok ? (a1.body as any).t : undefined) ?? (a2.ok ? (a2.body as any).t : NaN));
  await sleep(2500);
  stop = true; await Promise.all(workers);
  const entries = old.wire.filter((w) => !String(w.input.operationId ?? "").startsWith("x"));
  const committed = entries.filter((w) => w.ack && t(w.ack) !== undefined).map((w) => t(w.ack)!);
  const after = committed.filter((x) => x > transitionT);
  const refused = entries.filter((w) => w.error).map((w) => `${w.error!.status} ${w.error!.code}`);
  const head = await openProduct(g1, scope, { ...options, claimAccount: "q1" });
  const cmd = `head-${randomUUID().slice(0, 8)}`;
  const headSave = await transact(head, [fact("acct/q1/subject/head", ":t/x", "h")], cmd);
  const forms = await claimForms(g1, head.db, cmd, "q1");
  const r = { case: "A: two gateways turn it on at once, an old build's group commits in flight", answers: [a1, a2], transitionT,
    oldSaves: entries.length, oldCommitted: committed.length, oldCommittedAfterTheTransition: after.length,
    oldRefused: refused.reduce((m: Record<string, number>, k) => ((m[k] = (m[k] ?? 0) + 1), m), {}), headSave, claimForms: forms };
  log("CASE", r);
  verdicts.A = a1.ok && a2.ok && Number.isFinite(transitionT) && after.length === 0 && committed.length > 0 && refused.length > 0
    && headSave === "stored" && !forms.plain && !!forms.scoped;
  await head.close(); await old.close();
}

// ---------------------------------------------------------------- B
for (const delay of [0, 25, 80]) {
  const scope = `s6t-b-${delay}-${randomUUID().slice(0, 8)}`;
  const base = await openProduct(baseUrl, scope, options);
  await transact(base, [fact("acct/q2/subject/seed", ":t/x", "seed")], `seed-${randomUUID()}`);
  rmSync(`${work}/killed`, { force: true });
  const turning = settings(g1, base.db);
  await sleep(delay);
  appendFileSync(`${work}/kill`, "");
  const answer = await turning;
  for (let i = 0; i < 600 && !existsSync(`${work}/killed`); i++) await sleep(200);
  await sleep(3000);
  // Consistency after the restart: the old build is refused exactly when the setting is on.
  let oldSave = "";
  for (let i = 0; i < 20; i++) { oldSave = await transact(base, [fact("acct/q2/subject/after", ":t/x", String(i))], `old-after-${randomUUID().slice(0, 8)}`); if (!/Unavailable|Transport|socket|ECONN|OutcomeUnknown|NotApplied/.test(oldSave)) break; await sleep(1000); }
  const head = await openProduct(g2, scope, { ...options, claimAccount: "q2" });
  const cmd = `probe-${randomUUID().slice(0, 8)}`;
  const probe = await transact(head, [fact("acct/q2/subject/probe", ":t/x", "p")], cmd);
  const forms = await claimForms(g2, head.db, cmd, "q2");
  // g2 is permitted: its save naming q2 turned the setting on if it was off. So afterwards it is on in every case;
  // before that save, the old build's answer says which state the kill left.
  const again = await settings(g1, base.db);
  const oldAfterAgain = await transact(base, [fact("acct/q2/subject/after2", ":t/x", "x")], `old-after2-${randomUUID().slice(0, 8)}`);
  const r = { case: "B: the transactor killed during the transition's transaction", delayMs: delay, answer,
    oldBuildAfterRestart: oldSave, headProbe: probe, claimForms: forms, turnOnAgain: again, oldBuildAtTheEnd: oldAfterAgain };
  log("CASE", r);
  verdicts[`B${delay}`] = probe === "stored" && !!forms.scoped && !forms.plain && again.ok && oldAfterAgain !== "stored";
  await head.close(); await base.close();
}

// ---------------------------------------------------------------- C
{
  const scope = `s6t-c-${randomUUID().slice(0, 8)}`;
  const store = await openProduct(ownUrl, scope, { ...options, claimAccount: "q3" });
  const results: string[] = [];
  for (let i = 0; i < 6; i++) results.push(await transact(store, [fact("acct/q3/subject/own", `:t/f${i % 3}`, String(i))], `own-${i}-${randomUUID().slice(0, 6)}`));
  const cmd = `own-check-${randomUUID().slice(0, 8)}`;
  const last = await transact(store, [fact("acct/q3/subject/own2", ":t/x", "y")], cmd);
  const forms = await claimForms(ownUrl, store.db, cmd, "q3");
  log("CASE", { case: "C: covering-owner saves under the setting", saves: results, last, claimForms: forms });
  verdicts.C = results.every((x) => x === "stored") && last === "stored" && !!forms.scoped && !forms.plain;
  await store.close();
}

// ---------------------------------------------------------------- D
{
  const scope = `s6t-d-${randomUUID().slice(0, 8)}`;
  const store = await openProduct(g1, scope, { ...options, claimAccount: "q4" });
  const direct = new datomic.DatomicClient(g1);
  const declared = await direct.declareProtection(store.db, [":p/secret"], true).then(() => "declared", (e: any) => `failed ${e?.code ?? e}`);
  const cmd = `sealed-${randomUUID().slice(0, 8)}`;
  const saved = await transact(store, [{ op: "assert", entityId: "acct/q4/subject/s", attribute: ":p/secret", value: { type: "string", value: "sealed value" }, entityType: "subject", validFrom: 0 }], cmd);
  const rows = await direct.rows(store.db, { entityIds: ["acct/q4/subject/s"] }).catch((e: any) => [{ error: String(e?.code ?? e) }]);
  const value = (rows as any[]).find((x) => x.attribute === ":p/secret");
  const forms = await claimForms(g1, store.db, cmd, "q4");
  log("CASE", { case: "D: sealed protected values under the setting", declared, saved, readBack: value?.value_string ?? value?.value ?? value, claimForms: forms });
  verdicts.D = declared === "declared" && saved === "stored" && (value?.value_string ?? value?.value) === "sealed value" && !!forms.scoped && !forms.plain;
  direct.close(); await store.close();
}

log("DONE", verdicts);
process.exit(Object.values(verdicts).every(Boolean) ? 0 : 1);
