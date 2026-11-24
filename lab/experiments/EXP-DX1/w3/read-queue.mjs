// [DX-W3] Toy reproduction: a flood of slow reads that park waiting for the one read permit holds the gateway's web
// threads, so a feed poll, a health check and a current pull wait to be served at all. Run once with no bound and
// once with TX2_READ_WAIT_LIMIT. Plain fetch, no SDK: the flood retries a "ReadBusy" answer after its suggested delay,
// as the SDK does. Usage: node read-queue.mjs URL DB_JSON ARM OUT_JSON. Times are diagnostic; the comparison is the
// result (seconds against milliseconds).
import { readFileSync, writeFileSync } from "node:fs";

const [url, dbFile, arm, outFile] = process.argv.slice(2);
const { db, subjects } = JSON.parse(readFileSync(dbFile, "utf8"));
const floodSeconds = Number(process.env.W3_FLOOD_SECONDS ?? 8);
const floodClients = Number(process.env.W3_FLOOD_CLIENTS ?? 64);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const post = (path, body) => fetch(url + path, { method: "POST", headers: { "content-type": "application/json" },
  body: JSON.stringify(body) });

async function timed(f) {
  const t = performance.now();
  const r = await f();
  return { ms: performance.now() - t, status: r.status, body: await r.json() };
}
const pct = (xs, p) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : null; };
const shape = (xs) => ({ n: xs.length, p50: pct(xs, 0.5), p99: pct(xs, 0.99), max: xs.length ? Math.max(...xs) : null });

for (let i = 0; i < 240; i++) {
  try { if ((await fetch(url + "/health")).ok) break; } catch {}
  await sleep(500);
}
const basis = await (await fetch(`${url}/v1/db/${db}/basis`)).json();
const head = Number(basis.position.v);
// Every subject's rows, pinned at the head (as the ladder's pinned reads are): a slow read under the one permit.
const heavy = { entityIds: subjects, basis: { recordedPosition: head } };
const warm = await timed(() => post(`/v1/db/${db}/read`, heavy));
await post("/v2/admin/threads/reset", {});

let stop = false, floodOk = 0, floodBusy = 0, floodOther = 0;
const flood = Array.from({ length: floodClients }, async () => {
  while (!stop) {
    try {
      const r = await post(`/v1/db/${db}/read`, heavy);
      const body = await r.json();
      if (r.status === 200) floodOk++;
      else if (r.status === 503 && body.code === "ReadBusy") { floodBusy++; await sleep(body.retryAfterMs ?? 25); }
      else floodOther++;
    } catch { floodOther++; }
  }
});
await sleep(500);                                          // let the flood fill the queue first
const feed = [], health = [], current = [], currentBusyRetries = [];
const until = performance.now() + floodSeconds * 1000;
// Three independent probe loops, each one request at a time, 100 ms apart, for the flood's duration.
const probe = async (record, f) => { while (performance.now() < until) { record(await f()); await sleep(100); } };
await Promise.all([
  probe((ms) => feed.push(ms), async () => (await timed(() => post(`/v2/db/${db}/transactions`, { after: head - 1, limit: 1 }))).ms),
  probe((ms) => health.push(ms), async () => (await timed(() => fetch(url + "/health"))).ms),
  // a current pull of one subject, retried on "ReadBusy" as the SDK does
  probe((ms) => current.push(ms), async () => {
    const t = performance.now();
    let retries = 0;
    for (;;) {
      const r = await post(`/v1/db/${db}/read`, { entityIds: [subjects[0]] });
      const body = await r.json();
      if (r.status === 503 && body.code === "ReadBusy") { retries++; await sleep(body.retryAfterMs ?? 25); continue; }
      if (r.status !== 200) throw Error("current pull failed: " + JSON.stringify(body));
      break;
    }
    currentBusyRetries.push(retries);
    return performance.now() - t;
  }),
]);
const threadsDuring = await timed(() => fetch(url + "/v2/admin/threads"));
stop = true;
await Promise.all(flood);
const threads = await (await fetch(url + "/v2/admin/threads")).json();
const result = {
  arm, floodClients, floodSeconds, warmHeavyReadMs: warm.ms, heavyReadRows: warm.body.rows?.length,
  floodOk, floodBusy, floodOther,
  feedPollMs: shape(feed), healthMs: shape(health), currentPullMs: shape(current),
  currentPullBusyRetries: currentBusyRetries.reduce((a, b) => a + b, 0),
  threadsRouteMsDuringFlood: threadsDuring.ms, threadsDuringFlood: threadsDuring.body, threadsAfter: threads,
  timings: "diagnostic",
};
writeFileSync(outFile, JSON.stringify(result, null, 2) + "\n");
console.log("W3_READ_QUEUE " + JSON.stringify(result));
