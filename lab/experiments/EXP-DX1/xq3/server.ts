// [DX-XQ3] Server run for the ID list route on the sealed 1 billion database (see ID-LISTS.md section 6 for the
// command, its duration and the predictions written before any run). It reads a demo stack brought up with the route on
// (`DX_ID_LISTS=1` through demo/server-up.sh) and never writes.
//   node --no-warnings --experimental-transform-types lab/experiments/EXP-DX1/xq3/server.ts READY_FILE OUT [ACCOUNT]
// Per basis (head, then position 87,002): the read gateway is restarted (cold), every subject of the account is listed
// in pages of 1,000 (`pl:` with shape `pl:{8 digits}`), the same again warm, then every ID of the account in pages of
// 1,000 tallied by kind (the text before the first ':' after the account). Plain HTTP, no package build needed.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const [readyFile, out, account = "account-003"] = process.argv.slice(2);
assert(readyFile && out, "usage: server.ts READY_FILE OUT [ACCOUNT]");
assert(!fs.existsSync(out), "OUT must be new");
fs.mkdirSync(out, { recursive: true });
const ready = JSON.parse(fs.readFileSync(readyFile, "utf8"));
assert(ready.version === "triplex-demo-ready/1" && /^tx2-dx[a-z0-9-]+$/.test(ready.prefix));
const readUrl = `http://127.0.0.1:${ready.readPort}`;
const db: string = ready.database;
const OLD = 87002;
const log = (kind: string, data: object = {}) => {
  const line = JSON.stringify({ kind, at: new Date().toISOString(), ...data });
  console.log(line);
  fs.appendFileSync(path.join(out, "server.jsonl"), line + "\n");
};
const post = async (body: object) => {
  for (let attempt = 0; ; attempt++) {
    const t0 = performance.now();
    const res = await fetch(`${readUrl}/v2/db/${db}/ids`, { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" }, signal: AbortSignal.timeout(120_000) });
    const json: any = await res.json();
    if (res.status === 503 && json.code === "IndexBusy" && attempt < 40) { await new Promise((s) => setTimeout(s, 100)); continue; }
    assert(res.ok, `ids route ${res.status} ${JSON.stringify(json)}`);
    return { ...json, clientMs: performance.now() - t0, gatewayMicros: Number(res.headers.get("x-tx2-gateway-micros")) };
  }
};
const restartReader = async () => {
  execFileSync("docker", ["restart", `${ready.prefix}-gw-r`], { stdio: "ignore" });
  for (let i = 0; i < 300; i++) {
    try { if ((await fetch(`${readUrl}/health`, { signal: AbortSignal.timeout(2000) })).ok) break; } catch {}
    await new Promise((s) => setTimeout(s, 1000));
  }
  await fetch(`${readUrl}/v1/db/${db}/basis`); // the peer opens the database; not an ID list
};
const bounds = { entries: 100000, ms: 1000, segments: 4096 };
const walk = async (label: string, first: object, onPage: (page: any) => void) => {
  const t0 = performance.now();
  let page: any = await post(first), pages = 1;
  const stats = { examined: 0, segmentsLoaded: 0, scanMs: 0, gatewayMs: 0, maxPageMs: 0, pageMs: [] as number[] };
  const take = (p: any) => {
    stats.examined += p.examined; stats.segmentsLoaded += p.segmentsLoaded; stats.scanMs += p.scanMicros / 1000;
    stats.gatewayMs += p.gatewayMicros / 1000; stats.pageMs.push(Math.round(p.scanMicros / 10) / 100);
    onPage(p);
  };
  take(page);
  const position = page.position;
  while (page.next) {
    page = await post({ account, prefix: (first as any).prefix, ...((first as any).shape ? { shape: (first as any).shape } : {}), limit: 1000, bounds, cursor: page.next });
    assert.equal(page.position, position);
    pages++;
    take(page);
  }
  const sorted = [...stats.pageMs].sort((a, b) => a - b);
  const summary = { label, position, pages, examined: stats.examined, segmentsLoaded: stats.segmentsLoaded,
    scanMs: Math.round(stats.scanMs), gatewayMs: Math.round(stats.gatewayMs), clientMs: Math.round(performance.now() - t0),
    pageScanMs: { p50: sorted[Math.floor(sorted.length / 2)], p99: sorted[Math.ceil(sorted.length * 0.99) - 1], max: sorted.at(-1) },
    firstPageScanMs: stats.pageMs[0] };
  log("walk", summary);
  return summary;
};
for (const [where, basis] of [["head", undefined], ["old", { recordedPosition: OLD }]] as const) {
  await restartReader();
  for (const temperature of ["cold", "warm"]) {
    const subjects: string[] = [];
    await walk(`${where} ${temperature} subjects`, { account, prefix: "pl:", shape: "pl:{8 digits}", limit: 1000, bounds, ...(basis ? { basis } : {}) },
      (p) => subjects.push(...p.ids));
    // Exact checks that need no brute force at 1 billion: the seed's roster is pl:00000000 .. pl:00099999.
    assert.equal(subjects.length, 100000, `${where}: ${subjects.length} subjects`);
    assert(subjects.every((id, i) => id === `acct/${account}/pl:${String(i).padStart(8, "0")}`), `${where}: not the roster in order`);
    log("subjects-exact", { where, temperature, count: subjects.length });
  }
  const kinds: Record<string, number> = {};
  await walk(`${where} warm every ID by kind`, { account, prefix: "", limit: 1000, bounds, ...(basis ? { basis } : {}) }, (p) => {
    for (const id of p.ids) { const local = id.slice(`acct/${account}/`.length); const k = local.slice(0, local.indexOf(":") + 1) || local; kinds[k] = (kinds[k] ?? 0) + 1; }
  });
  log("kinds", { where, kinds });
}
log("done");
