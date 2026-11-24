// [DX-INT3] Driver of int3/reach-gate.sh: seed subjects with references, then send every subject pull (/reach and
// /reach-many, row pages and gzip pages, pinned at an old cut and at the head) to the stack's read gateway, to the
// baseline's gateway source, to this source with the waiting-read bound on, and to a negative control, all on one
// transactor and storage at the same cut, and compare the answers. Pass: the three equal in every request, every answer
// is a JSON object holding the requested roots, and the control differs in every request (the gate can see the fault).
// Usage: reach-gate.ts OUT WRITE_URL READ_URL BASE_URL BOUND_URL CONTROL_URL
// Rejected: judging by status codes alone (the W3 fault answered 200 with a Boolean body on some routes).
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";
import { openTriples, core, runtimeApi } from "../../../bench/lib/triplex.ts";

const [out, write, read, base, bound, control] = process.argv.slice(2);
assert(out && write && read && base && bound && control, "usage: reach-gate.ts OUT WRITE READ BASE BOUND CONTROL");
const api: any = await import("../../../../packages/datomic/dist/index.js");
const gateways = { head: read, base, bound, control } as const;
type Name = keyof typeof gateways;
const scope = "int3-reach-" + randomUUID().slice(0, 8);
process.env.DATOMIC_URL = write;
const writer = await openTriples("datomic", scope);
const scopeKey = String(runtimeApi.DatabaseScope.test(scope));
const client = new api.DatomicClient(write);
const db = (await client.create(scopeKey, "legacy", true)).db as string;
const E = (id: string) => core.EntityId.make(id);
const subjects = 24, versions = 3;
const roots = Array.from({ length: subjects }, (_, i) => `int3/pl:${String(i).padStart(8, "0")}`);
const cuts: number[] = [];
// Each subject: a root with a status and two references (a profile and a task, each with fields); later versions
// replace the root's status and one task field, so old and new cuts differ.
for (let v = 0; v < versions; v++) {
  for (let i = 0; i < subjects; i += 6) {
    const ops: any[] = [];
    for (const [k, root] of roots.slice(i, i + 6).entries()) {
      const n = String(i + k).padStart(8, "0");
      ops.push({ op: "assert", entityId: E(root), entityType: "INT3Root", attribute: ":placement/status", value: { type: "string", value: `v${v}-${n}` } });
      if (v === 0) {
        ops.push({ op: "assert", entityId: E(root), entityType: "INT3Root", attribute: ":person/profile", value: { type: "ref", value: E(`int3/wk:${n}`) } });
        ops.push({ op: "assert", entityId: E(root), entityType: "INT3Root", attribute: ":person/placement", value: { type: "ref", value: E(`int3/i9:${n}`) } });
        ops.push({ op: "assert", entityId: E(`int3/wk:${n}`), entityType: "INT3Profile", attribute: ":profile/name", value: { type: "string", value: `name ${n}` } });
      }
      ops.push({ op: "assert", entityId: E(`int3/i9:${n}`), entityType: "INT3Task", attribute: ":task/field-0", value: { type: "string", value: `task ${v} ${n}` } });
    }
    const receipt: any = await writer.run(writer.triples.transact(ops));
    cuts.push(receipt.position as number);
  }
}
const post = async (url: string, route: string, body: unknown) => {
  const r = await fetch(`${url}/v2/db/${db}/${route}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const text = await r.text();
  let parsed: unknown = text;
  try { parsed = JSON.parse(text); } catch { /* kept as text */ }
  return { status: r.status, body: parsed };
};
// Every gateway must hold the newest cut before the pinned pulls (each one waits for a pin itself; this keeps it short).
const head = cuts.at(-1)!;
for (const [name, url] of Object.entries(gateways)) {
  // The copies start after the stack (a toy JVM takes up to about a minute); wait for each to answer at the head.
  let last: unknown = null;
  for (let i = 0; ; i++) {
    const b = await fetch(`${url}/v1/db/${db}/basis`).then(async (r) => ({ status: r.status, body: await r.text() })).catch((e) => ({ error: String(e) })) as any;
    last = b;
    const position = (() => { try { return Number(JSON.parse(b.body).position?.v); } catch { return NaN; } })();
    if (b.status === 200 && position >= head) break;
    assert(i < 1200, name + " gateway never reached the head " + head + ": " + JSON.stringify(last).slice(0, 300));
    await sleep(100);
  }
}
const validAt = Date.now();
const pins = [cuts[Math.floor(subjects / 6) - 1]!, head]; // after the first version, and the head
const requests: { route: string; body: Record<string, unknown> }[] = [];
for (const pin of pins) {
  const basis = { recordedPosition: pin, validAt };
  for (const root of roots.slice(0, 8)) requests.push({ route: "reach", body: { root, basis, full: true } });
  requests.push({ route: "reach-many", body: { roots: roots.slice(0, 12), basis, full: true } });
  requests.push({ route: "reach-many", body: { roots, basis, full: true, rowPage: true } });
  requests.push({ route: "reach-many", body: { roots: roots.slice(6, 18), basis, full: true, rowPage: true, gzipRows: true } });
}
// The gzip row page is a JSON string of base64; compare it decoded.
const comparable = (b: unknown) => b;
const results: any[] = [];
let equal = 0, controlDiffers = 0, objects = 0;
for (const [n, req] of requests.entries()) {
  const session = `int3-${n}`;
  const answers = {} as Record<Name, { status: number; body: unknown }>;
  for (const name of Object.keys(gateways) as Name[]) answers[name] = await post(gateways[name], req.route, { ...req.body, session });
  const key = (name: Name) => JSON.stringify([answers[name].status, comparable(answers[name].body)]);
  const same = key("head") === key("base") && key("bound") === key("base");
  const isObject = answers.head.status === 200 && typeof answers.head.body === "object" && answers.head.body !== null;
  const differs = key("control") !== key("base");
  if (same) equal++;
  if (isObject) objects++;
  if (differs) controlDiffers++;
  results.push({ n, route: req.route, roots: req.body.root ? 1 : (req.body.roots as string[]).length,
    pin: (req.body.basis as any).recordedPosition, rowPage: !!req.body.rowPage, gzipRows: !!req.body.gzipRows,
    status: Object.fromEntries((Object.keys(gateways) as Name[]).map((x) => [x, answers[x].status])),
    bytes: Object.fromEntries((Object.keys(gateways) as Name[]).map((x) => [x, JSON.stringify(answers[x].body).length])),
    equal: same, headIsObject: isObject, controlDiffers: differs,
    ...(same ? {} : { head: answers.head.body, base: answers.base.body, bound: answers.bound.body }),
    ...(n === 0 ? { headKeys: isObject ? Object.keys(answers.head.body as object) : null, control: answers.control.body } : {}) });
}
const threads = await fetch(bound + "/v2/admin/threads").then((r) => r.json()).catch(() => null) as any;
const summary = { scope, db, cuts: cuts.length, pins, requests: requests.length, equal, headObjects: objects, controlDiffers,
  boundGateway: threads && { readWaitLimit: threads.readWaitLimit, readsRefusedBusy: threads.readsRefusedBusy, readsAdmitted: threads.readsAdmitted },
  passed: equal === requests.length && objects === requests.length && controlDiffers === requests.length && threads?.readWaitLimit === 4 };
fs.writeFileSync(path.join(out, "reach-gate.json"), JSON.stringify({ summary, results }, null, 2) + "\n");
console.log("INT3_REACH_GATE " + JSON.stringify(summary));
client.close();
await writer.close();
process.exit(summary.passed ? 0 : 1);
