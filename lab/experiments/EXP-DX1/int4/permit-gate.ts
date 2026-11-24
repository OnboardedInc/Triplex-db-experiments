// [DX-INT4] Driver of int4/permit-gate.sh: seeds a lean toy through the write gateway, then sends the same reads to four
// read gateways on one transactor and storage (baseline source, this source, the source before the sweep merge with the
// read prefetch on, this source with the read prefetch on; all with two read permits and the waiting-read bound 2;
// TX2_SWEEP unset) and compares, phase by phase, what each admitted: read permits taken (readsAdmitted), refused
// (readsRefusedBusy), still waiting or held after the phase (readsWaiting, readPermitsFree), at-least requests and
// prefetch batches; and the answers themselves. Counts are exact; nothing here is timed.
// Usage: permit-gate.ts OUT WRITE_URL BASE_URL HEAD_URL PRE_PREFETCH_URL HEAD_PREFETCH_URL
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { DatomicClient } from "../../../../packages/datomic/dist/index.js";
import { deepOwnFacts } from "../../../bench/lib/deep-world.ts";
import { ids, SEED_VALID_FROM } from "../../../bench/lib/world.ts";
import { command } from "../w1/group/workload.ts";
import { scaleAccount } from "../prep1/ceiling-seed.ts";

const [out, writer, base, head, prePf, headPf] = process.argv.slice(2);
assert(out && writer && base && head && prePf && headPf, "usage: permit-gate.ts OUT WRITE BASE HEAD PRE_PF HEAD_PF");
const gateways = { base, head, prePf, headPf } as const;
type Name = keyof typeof gateways;
const people = 60;
const nonce = crypto.randomUUID();
const scope = JSON.stringify(["triplex-scope-v1", "test", "test", "dx-int4-permits-" + nonce, 0]);
const client = new DatomicClient(writer, 60_000);
const db = (await client.create(scope, "lean", true, 60_000)).db;
const prefix = "acct/" + scaleAccount(0) + "/";
type F = ReturnType<typeof deepOwnFacts>[number];
const rows: F[] = [];
for (let i = 0; i < people; i++)
  rows.push(...deepOwnFacts(i).map((f): F => ({ e: prefix + f.e, a: f.a, v: f.v.type === "ref" ? { type: "ref", value: prefix + f.v.value } : f.v })));
for (let k = 0; k < rows.length; k += 1500) await client.transact(db, command(`permits-seed-${nonce}-${k}`, rows.slice(k, k + 1500)) as any);
const headPos = Number((await client.request<any>("GET", "/v1/db/" + db + "/write-options")).position);
const validAt = SEED_VALID_FROM + 1;
const owners = Array.from({ length: people }, (_, i) => prefix + ids.i9(i));
const batch = (n: number) => Array.from({ length: 8 }, (_, j) => owners[(n * 8 + j) % people]!);
const post = async (url: string, route: string, body: unknown) => {
  const r = await fetch(url + route, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const text = await r.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch { /* text */ }
  return { status: r.status, json };
};
const get = (url: string, route: string) => fetch(url + route).then((r) => r.json()) as Promise<any>;
const counters = async (url: string) => {
  const t = await get(url, "/v2/admin/threads"), s = await get(url, "/v2/admin/scan-stats");
  return { admitted: t.readsAdmitted, refused: t.readsRefusedBusy, waiting: t.readsWaiting, free: t.readPermitsFree, permits: t.readPermits,
    limit: t.readWaitLimit, atLeast: s.atLeast?.requests ?? 0, prefetch: s.readPrefetch?.batches ?? null };
};
// Every copy must hold the seed before the phases (each waits for a pin itself; this keeps the first phase clean).
for (const url of Object.values(gateways))
  for (let i = 0; i < 600; i++) {
    const r = await post(url, `/v1/db/${db}/read`, { entityIds: [owners[0]], basis: { recordedPosition: headPos, validAt }, basisWaitMs: 2000 }).catch(() => null);
    if (r?.status === 200) break;
    assert(i < 599, "a gateway copy did not reach the seed");
    await sleep(200);
  }
const canon = (j: any) => JSON.stringify((j?.rows ?? []).map((r: any) => [r.id, r.entity_id, r.attribute, JSON.stringify(r.value_string), r.recorded_position]).sort());
type Phase = { name: string; send: (url: string, n: number) => Promise<{ status: number; json: any }>; n: number; concurrent?: boolean };
const phases: Phase[] = [
  { name: "pinned", n: 40, send: (u, n) => post(u, `/v1/db/${db}/read`, { entityIds: batch(n), basis: { recordedPosition: headPos, validAt } }) },
  { name: "current", n: 40, send: (u, n) => post(u, `/v1/db/${db}/read`, { entityIds: batch(n) }) },
  { name: "at-least", n: 40, send: (u, n) => post(u, `/v1/db/${db}/read`, { entityIds: batch(n), atLeastPosition: headPos, basisWaitMs: 2000 }) },
  { name: "burst", n: 24, concurrent: true, send: (u, n) => post(u, `/v1/db/${db}/read`, { entityIds: batch(n), basis: { recordedPosition: headPos, validAt } }) },
];
const result: Record<string, Record<Name, any>> = {};
const answers: Record<string, Record<Name, string[]>> = {};
for (const ph of phases) {
  result[ph.name] = {} as any;
  answers[ph.name] = {} as any;
  for (const [name, url] of Object.entries(gateways) as [Name, string][]) {
    const before = await counters(url);
    const sent = ph.concurrent
      ? await Promise.all(Array.from({ length: ph.n }, (_, n) => ph.send(url, n)))
      : await (async () => { const xs = []; for (let n = 0; n < ph.n; n++) xs.push(await ph.send(url, n)); return xs; })();
    await sleep(300);
    const after = await counters(url);
    const statuses: Record<string, number> = {};
    for (const r of sent) statuses[r.status + (r.json?.code ? " " + r.json.code : "")] = (statuses[r.status + (r.json?.code ? " " + r.json.code : "")] ?? 0) + 1;
    result[ph.name][name] = { statuses, admitted: after.admitted - before.admitted, refused: after.refused - before.refused,
      waitingAfter: after.waiting, freeAfter: after.free, permits: after.permits, limit: after.limit,
      atLeast: after.atLeast - before.atLeast, prefetch: after.prefetch === null ? null : after.prefetch - (before.prefetch ?? 0) };
    answers[ph.name][name] = sent.filter((r) => r.status === 200).map((r) => canon(r.json));
  }
}
const sweepOff = Object.fromEntries(await Promise.all((Object.entries(gateways) as [Name, string][]).map(async ([n, u]) => {
  const r = await post(u, `/v2/db/${db}/sweep`, { account: scaleAccount(0) });
  return [n, `${r.status} ${JSON.stringify(r.json)}`];
})));
const failures: string[] = [];
const need = (ok: boolean, what: string) => { if (!ok) failures.push(what); };
for (const ph of phases)
  for (const name of Object.keys(gateways) as Name[]) {
    const x = result[ph.name][name];
    need(x.waitingAfter === 0 && x.freeAfter === x.permits && x.permits === 2 && x.limit === 2, `${ph.name}/${name}: a permit held or waiting after the phase`);
    need(x.admitted + x.refused === ph.n, `${ph.name}/${name}: admitted + refused ${x.admitted + x.refused} for ${ph.n} reads`);
    if (!ph.concurrent) need(x.admitted === result[ph.name].base.admitted && x.refused === 0, `${ph.name}/${name}: permits taken ${x.admitted} against the baseline's ${result[ph.name].base.admitted}, or refused`);
    need(x.atLeast === (ph.name === "at-least" ? ph.n : 0), `${ph.name}/${name}: at-least requests ${x.atLeast}`);
    if (!ph.concurrent) need(JSON.stringify(answers[ph.name][name]) === JSON.stringify(answers[ph.name].base), `${ph.name}/${name}: answers differ from the baseline's`);
  }
for (const ph of phases.filter((p) => !p.concurrent)) {
  need(result[ph.name].head.prefetch === 0, `${ph.name}: prefetch ran on the copy without it`);
  need(result[ph.name].prePf.prefetch === ph.n && result[ph.name].headPf.prefetch === ph.n, `${ph.name}: prefetch batches ${result[ph.name].prePf.prefetch} / ${result[ph.name].headPf.prefetch}`);
}
for (const [n, v] of Object.entries(sweepOff)) need(v === '404 {"code":"NotFound"}', `sweep route on ${n}: ${v}`);
const summary = { gate: "int4-permits", db, head: headPos, people, result, sweepOff, failures, passed: failures.length === 0 };
writeFileSync(join(out, "permit-gate.json"), JSON.stringify(summary, null, 2) + "\n");
console.log("INT4_PERMIT_GATE " + JSON.stringify({ passed: summary.passed, failures, burst: Object.fromEntries((Object.keys(gateways) as Name[]).map((n) => [n, result.burst[n]])) }));
client.close();
process.exit(summary.passed ? 0 : 1);
