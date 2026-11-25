// [DX-S3] Gate (a) with the product path's options on: a copy of s2/bytes.ts whose runtime takes the options given in
// DX_S3_BYTES_OPTIONS (JSON, for example {"orderedSaves":true,"saveSizeRule":true}), with two- and four-owner saves
// added after S2's workload. Run with the S2 build and this branch's build (severalOwners absent, so S2's build and
// this one get the same options), and compare with s3/compare-bytes.py, which also masks the ordered block tokens
// (taken from the process clock, so they differ between runs).
// [DX-S2] Gate (a): with every new option off, the SDK's requests are byte-identical to the build before this branch.
// Runs one fixed product workload (saves of every kind, reads of every route) through a recording proxy in front of a
// fresh gateway, with a deterministic runtime (IDs and clock) and a deterministic randomUUID (operation and attempt
// IDs), and writes every request's method, path and exact body bytes. Run it once with the old build and once with
// this branch's build, each against a freshly started gateway, and compare the two files.
//   node --experimental-transform-types s2/bytes.ts <gateway url> <root holding packages/*/dist> <out.jsonl>
import { createHash } from "node:crypto";
import crypto from "node:crypto";
import { appendFileSync, writeFileSync } from "node:fs";
import http from "node:http";
import { syncBuiltinESMExports } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

const [target, root, out] = process.argv.slice(2);
if (!target || !root || !out) throw new Error("usage: bytes.ts <gateway url> <root> <out.jsonl>");
const extra = JSON.parse(process.env.DX_S3_BYTES_OPTIONS ?? "{}");
for (const name of ["TRIPLEX_DATOMIC_ORDERED_SAVES", "TRIPLEX_DATOMIC_SAVE_SIZE_RULE", "TRIPLEX_DATOMIC_SEVERAL_OWNERS"])
  if (process.env[name] !== undefined) throw new Error(`${name} must be unset for this gate`);
let uuid = 0;
crypto.randomUUID = () => {
  const hex = (++uuid).toString(16).padStart(32, "0");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20)}` as any;
};
syncBuiltinESMExports();
const dist = (pkg: string, file: string) => pathToFileURL(path.join(root, "packages", pkg, "dist", file)).href;
const core: any = await import(dist("core", "index.js"));
const runtimeApi: any = await import(dist("core", "runtime/index.js"));
const datomic: any = await import(dist("datomic", "index.js"));
const { Effect, ManagedRuntime } = await import("effect");

writeFileSync(out, "");
const upstream = new URL(target);
const proxy = http.createServer((req, res) => {
  const chunks: Buffer[] = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", () => {
    const body = Buffer.concat(chunks);
    appendFileSync(out, JSON.stringify({ method: req.method, url: req.url, sha256: createHash("sha256").update(body).digest("hex"), bytes: body.length, body: body.toString("utf8") }) + "\n");
    const forward = http.request({ host: upstream.hostname, port: upstream.port, method: req.method, path: req.url, headers: req.headers }, (answer) => {
      res.writeHead(answer.statusCode ?? 502, answer.headers);
      answer.pipe(res);
    });
    forward.on("error", (e) => { res.writeHead(502); res.end(String(e)); });
    forward.end(body);
  });
});
await new Promise<void>((resolve) => proxy.listen(0, "127.0.0.1", resolve));
const url = `http://127.0.0.1:${(proxy.address() as any).port}`;

const scope = runtimeApi.DatabaseScope.test("s3-bytes-gate");
const creator = new datomic.DatomicClient(url);
await creator.create(scope, "lean", true, 35_000);
creator.close();
const definition = datomic.makeDatomicRuntime({ url, layout: "lean", serverRecordTime: true, ...extra });
const layer = definition.layer({ scope, capabilities: runtimeApi.Capabilities.none, deterministic: { startTime: 1_750_000_000_000, seed: "s2-bytes" } });
const managed: any = (ManagedRuntime as any).make(layer);
const T = (f: (s: any) => any) => managed.runPromise(Effect.flatMap(core.Triples, f));
const str = (v: string) => ({ type: "string", value: v });
const ids = new Map<string, string>();
const keep = (r: any) => { for (const t of r.triples) ids.set(`${t.entityId} ${t.attribute}`, t.id); return r; };
const subject = "task/bytes-1", other = "task/bytes-2";
keep(await T((s) => s.transact(["a", "b", "c", "d", "e"].map((f) => ({ op: "assert", entityId: subject, attribute: `:task/${f}`, value: str(f), entityType: "Task" })), { commandId: "b-seed" })));
keep(await T((s) => s.transact([{ op: "assert", entityId: other, attribute: ":task/a", value: str("o") }], { commandId: "b-seed-2", actor: "gate" })));
keep(await T((s) => s.transact([{ op: "retract", id: ids.get(`${subject} :task/a`) }, { op: "assert", entityId: subject, attribute: ":task/a", value: str("a2") }], { commandId: "b-replace-1" })));
keep(await T((s) => s.transact(["b", "c", "d"].flatMap((f) => [{ op: "retract", id: ids.get(`${subject} :task/${f}`) }, { op: "assert", entityId: subject, attribute: `:task/${f}`, value: str(f + "2") }]), { commandId: "b-replace-3" })));
const live = (await T((s) => s.entity(subject))).map((t: any) => t.id);
keep(await T((s) => s.transact([{ op: "assert", entityId: subject, attribute: ":task/i", value: str("i") }], { commandId: "b-guarded", preconditions: [{ _tag: "EntityState", entityId: subject, tripleIds: live }] })));
keep(await T((s) => s.transact([{ op: "assert", entityId: subject, attribute: ":task/f", value: str("f") }], { commandId: "b-first" })));
keep(await T((s) => s.transact([{ op: "retract", id: ids.get(`${subject} :task/e`) }], { commandId: "b-retire" })));
keep(await T((s) => s.transact([{ op: "retract", id: ids.get(`${subject} :task/a`) }, { op: "assert", entityId: subject, attribute: ":task/a", value: str("a"), validFrom: 1_600_000_000_000, validTo: 1_750_000_000_000 }, { op: "assert", entityId: subject, attribute: ":task/a", value: str("a3"), validFrom: 1_750_000_000_000 }], { commandId: "b-correct" })));
keep(await T((s) => s.transact([{ op: "assert", entityId: subject, attribute: ":task/g", value: str("g") }, { op: "assert", entityId: other, attribute: ":task/g", value: str("g") }], { commandId: "b-two" })));
keep(await T((s) => s.transact([{ op: "assert", entityId: subject, attribute: ":task/h", value: str("h"), entityType: "Task" }], { commandId: "b-constraint", enforce: { constraints: [{ _tag: "Unique", v: 1, entityType: "Task", attribute: ":task/h" }] } })));
keep(await T((s) => s.transact([{ op: "assert", entityId: subject, attribute: ":task/j", value: str("j") }])));
await T((s) => s.transact([{ op: "assert", entityId: subject, attribute: ":task/k", value: { type: "ref", value: other } }], { commandId: "b-ref" }));
await T((s) => s.transact(Array.from({ length: 140 }, (_, i) => ({ op: "assert", entityId: subject, attribute: `:task/n${i}`, value: str("n" + i) })), { commandId: "b-wide" }));
// [DX-S3] Saves of two and four owners (a task, a profile, a second task and a document).
const profile = "profile/bytes-1", doc = "document/bytes-1";
keep(await T((s) => s.transact([profile, doc].map((e) => ({ op: "assert", entityId: e, attribute: ":p/a", value: str("p") })), { commandId: "b-owners-seed" })));
keep(await T((s) => s.transact([
  { op: "retract", id: ids.get(`${subject} :task/b`) }, { op: "assert", entityId: subject, attribute: ":task/b", value: str("b3") },
  { op: "retract", id: ids.get(`${profile} :p/a`) }, { op: "assert", entityId: profile, attribute: ":p/a", value: str("p2") },
], { commandId: "b-two-owners" })));
keep(await T((s) => s.transact([
  { op: "retract", id: ids.get(`${subject} :task/b`) }, { op: "assert", entityId: subject, attribute: ":task/b", value: str("b4") },
  { op: "retract", id: ids.get(`${profile} :p/a`) }, { op: "assert", entityId: profile, attribute: ":p/a", value: str("p3") },
  { op: "retract", id: ids.get(`${other} :task/a`) }, { op: "assert", entityId: other, attribute: ":task/a", value: str("o2") },
  { op: "retract", id: ids.get(`${doc} :p/a`) }, { op: "assert", entityId: doc, attribute: ":p/a", value: str("d2") },
], { commandId: "b-four-owners" })));
await T((s) => s.entity(subject));
await T((s) => s.history(subject));
await T((s) => s.reach(subject));
await T((s) => s.get(ids.get(`${subject} :task/b`)));
await T((s) => s.transactions({ after: 0, limit: 100 }));
await T((s) => s.transactionByCommand("b-replace-1"));
await T((s) => s.transactionsForEntity(subject, { limit: 10 }));
await managed.dispose();
proxy.close();
console.log("DX-S3_BYTES", JSON.stringify({ root, requests: (await import("node:fs")).readFileSync(out, "utf8").trim().split("\n").length }));
