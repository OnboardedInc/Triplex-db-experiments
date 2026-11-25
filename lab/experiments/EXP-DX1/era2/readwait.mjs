// [DX-ERA2 fifth pass] The read wait on the log's boundary (a read that finds a removal committed and not yet published
// publishes it first). Removals arrive on the write gateway at a fixed rate (each names a subject of its own account,
// so they never wait for each other's subjects); readers read a1 back to back on both gateways meanwhile. Every
// read's latency is recorded with the phase it ran in; the gateways' own log lines (triplex.removal-read-wait.v1)
// give the waits. Usage: node readwait.mjs W R DB RATE_PER_S SECONDS READERS OUT.json
import { writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

const [W, R, D, rateArg, secondsArg, readersArg, out] = process.argv.slice(2);
const rate = Number(rateArg), seconds = Number(secondsArg), readers = Number(readersArg);
const post = async (url, body) => {
  const t0 = performance.now();
  try {
    const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
                                 signal: AbortSignal.timeout(60000) });
    const text = await r.text();
    return { status: r.status, ms: performance.now() - t0, text };
  } catch (e) {
    return { status: 0, ms: performance.now() - t0, text: String(e) };
  }
};
const reads = [], removals = [];
let stop = false;
const reader = async (base, label) => {
  while (!stop) {
    const r = await post(`${base}/v1/db/${D}/read`, { entityIds: ["acct/a/one"] });
    reads.push({ gateway: label, ms: r.ms, status: r.status, at: Date.now() });
  }
};
const loops = [];
for (let i = 0; i < readers; i++) loops.push(reader(i % 2 === 0 ? R : W, i % 2 === 0 ? "read" : "write"));
const started = Date.now();
const pendingRemovals = [];
for (let i = 0; i < rate * seconds; i++) {
  const due = started + (i * 1000) / rate;
  const wait = due - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  pendingRemovals.push(
    post(`${W}/v2/db/${D}/erase`, { commandId: `rw-${randomUUID()}`, selectors: [{ entityId: `acct/rw${i}/one`, attribute: ":v" }] })
      .then((r) => removals.push({ ms: r.ms, status: r.status })),
  );
}
await Promise.all(pendingRemovals);
stop = true;
await Promise.all(loops);
const q = (xs, p) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b); return Math.round(s[Math.min(s.length - 1, Math.floor(p * s.length))] * 10) / 10; };
const dist = (xs) => ({ n: xs.length, p50: q(xs, 0.5), p90: q(xs, 0.9), p99: q(xs, 0.99), max: q(xs, 1) });
const summary = {
  rate, seconds, readers,
  reads: Object.fromEntries(["read", "write"].map((g) => [g, dist(reads.filter((r) => r.gateway === g && r.status === 200).map((r) => r.ms))])),
  readStatuses: reads.reduce((m, r) => ({ ...m, [r.status]: (m[r.status] ?? 0) + 1 }), {}),
  removals: { ...dist(removals.filter((r) => r.status === 200).map((r) => r.ms)),
              statuses: removals.reduce((m, r) => ({ ...m, [r.status]: (m[r.status] ?? 0) + 1 }), {}) },
};
writeFileSync(out, JSON.stringify(summary, null, 1));
console.log("ERA2_READWAIT", JSON.stringify(summary));
