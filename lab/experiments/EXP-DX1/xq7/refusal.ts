// [DX-XQ7] The question reader as a client sees it, on a toy stack where the main gateways refuse questions (gate.sh
// with SCRIPT refusal.ts sets DX_QUESTION_MAIN_REFUSES=1, the default of the option): the main reader and the writer
// answer an ID list or a sweep with 421 QuestionReaderRoute naming the question reader; the question reader answers
// reads by entity with 421 QuestionReaderOnly and still answers health and basis; an SDK client with the one option
// questionReaderUrl sends questions there and everything else to the main URL, and its answers equal the question
// reader's own. Counts are results.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Effect, Layer, ManagedRuntime } from "effect";

const REPO = path.resolve(import.meta.dirname, "../../../..");
const dist = (pkg: string, file: string) => pathToFileURL(path.join(REPO, "packages", pkg, "dist", file)).href;
const core: any = await import(dist("core", "index.js"));
const runtimeApi: any = await import(dist("core", "runtime/index.js"));
const datomic: any = await import(dist("datomic", "index.js"));
const [out, writeUrl, readUrl, questionUrl, prefix] = process.argv.slice(2);
assert(out && writeUrl && readUrl && questionUrl && prefix?.startsWith("tx2-dxxq7"));
fs.mkdirSync(out, { recursive: true });
const results: any[] = [];
const check = (ok: boolean, what: string, detail: object = {}) => {
  results.push({ ok, what, ...detail });
  console.log(JSON.stringify({ ok, what, ...detail }));
};
const scope = runtimeApi.DatabaseScope.test(`xq7-refusal-${process.pid}`);
const writer = new datomic.DatomicClient(writeUrl, 60_000);
const { db } = await writer.create(scope, "lean");
const rt = ManagedRuntime.make(runtimeApi.Runtime.define({
  name: "datomic",
  storage: Layer.succeed(runtimeApi.StorageAdapter, datomic.makeDatomicStorageAdapter(writer, scope, { layout: "lean", serverRecordTime: true })),
  queries: Layer.succeed(runtimeApi.QueryExecutor, datomic.makeDatomicQueryExecutor(writer, scope)),
}).layer({ scope, capabilities: runtimeApi.Capabilities.none })) as any;
const ops = Array.from({ length: 20 }, (_, i) => ({ op: "assert", entityId: `acct/account-003/pl:${String(i).padStart(8, "0")}`, entityType: "Subject",
  attribute: ":person/status", value: { type: "string", value: i % 2 ? "pending" : "complete" }, validFrom: 0 }));
const receipt = await rt.runPromise(Effect.flatMap(core.Triples, (t: any) => t.transact(ops, { actor: "xq7-refusal" })));
const P = receipt.position;
const raw = async (url: string, method: string, route: string, body?: object) => {
  const r = await fetch(url + route, { method, headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, body: await r.json().catch(() => null) };
};
const idsRequest = { account: "account-003", prefix: "pl:", limit: 100, basis: { recordedPosition: P } };
const sweepRequest = { account: "account-003", from: { prefix: "pl:" }, where: [{ attribute: ":person/status", op: "eq", value: { type: "string", value: "pending" } }],
  result: "count", basis: { recordedPosition: P, validAt: 1.8e12 } };
await new datomic.DatomicClient(questionUrl, 60_000).basis(db, { position: P, waitMs: 2000 });
for (const [name, url] of [["main reader", readUrl], ["writer", writeUrl]] as const)
  for (const [route, body] of [[`/v2/db/${db}/ids`, idsRequest], [`/v2/db/${db}/sweep`, sweepRequest], [`/v2/db/${db}/find`, {}]] as const) {
    const r = await raw(url, "POST", route, body);
    check(r.status === 421 && r.body?.code === "QuestionReaderRoute" && r.body?.questionReader === questionUrl, `${name} refuses ${route.split("/").at(-1)} and names the question reader`, r);
  }
const onQ = await raw(questionUrl, "POST", `/v1/db/${db}/read`, { entityIds: [ops[0]!.entityId], basis: { recordedPosition: P, validAt: 1.8e12 } });
check(onQ.status === 421 && onQ.body?.code === "QuestionReaderOnly", "the question reader refuses a read by entity", onQ);
const tx = await raw(questionUrl, "POST", `/v1/db/${db}/transact`, {});
check(tx.status === 421 && tx.body?.code === "QuestionReaderOnly", "the question reader refuses a save", tx);
check((await raw(questionUrl, "GET", `/v1/db/${db}/basis`)).status === 200, "the question reader answers basis");
check((await fetch(questionUrl + "/health")).status === 200, "the question reader answers health");
// The SDK: one option.
const client = new datomic.DatomicClient(readUrl, 60_000, undefined, { questionReaderUrl: questionUrl });
const direct = new datomic.DatomicClient(questionUrl, 60_000);
const strip = (x: any) => JSON.stringify({ ...x, scanMicros: 0, micros: 0, cpuMicros: 0, ioReads: 0, segmentsLoaded: 0, queue: 0, head: 0 });
const viaOption = await client.listIds(db, idsRequest);
check(viaOption.ids.length === 20 && strip(viaOption) === strip(await direct.listIds(db, idsRequest)), "SDK option: ID list served by the question reader", { ids: viaOption.ids.length });
const sweepViaOption = await datomic.sweepPage(client, db, sweepRequest);
check(sweepViaOption.count === 10 && strip(sweepViaOption) === strip(await datomic.sweepPage(direct, db, sweepRequest)), "SDK option: sweep served by the question reader", { count: sweepViaOption.count });
const rows = await client.rows(db, { entityIds: [ops[1]!.entityId], basis: { recordedPosition: P, validAt: 1.8e12 } });
check(rows.length === 1, "SDK option: reads by entity still go to the main reader");
const plain = new datomic.DatomicClient(readUrl, 60_000);
const refused = await plain.listIds(db, idsRequest).then(() => "accepted", (e: any) => e?.code);
check(refused === "QuestionReaderRoute", "a client without the option is told where questions are served", { refused });
const mainStats = await raw(readUrl, "GET", "/v2/admin/scan-stats");
check(mainStats.body?.questionReader?.refusedQuestion?.ids >= 1 && mainStats.body?.questionReader?.questionsAt === questionUrl, "the main reader counts its refusals", mainStats.body?.questionReader);
const qStats = await raw(questionUrl, "GET", "/v2/admin/scan-stats");
check(qStats.body?.questionReader?.questionReader === true && qStats.body?.questionReader?.served?.ids >= 2, "the question reader counts what it served", qStats.body?.questionReader);
fs.writeFileSync(path.join(out, "summary.json"), JSON.stringify({ db, P, results }, null, 2));
await rt.dispose();
await writer.delete(scope);
for (const c of [writer, client, direct, plain]) c.close();
const failed = results.filter((r) => !r.ok).length;
console.log(JSON.stringify({ kind: "PASS?", checks: results.length, failed }));
process.exitCode = failed ? 1 : 0;
