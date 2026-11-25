// [DX-ERA3, second review] The acknowledgement against a second read gateway: for each of N subjects, a Reach session on
// the READ gateway caches the subject at a pin before its removal; during the removal (sent to the WRITE gateway) and
// for 400 ms after its acknowledgement, the read gateway is read in a loop (a plain current read, a pinned read, and the
// cached Reach session at the pin), each read stamped with its start time. A read that STARTED after the client
// received the acknowledgement must not answer the value (TARGETS section 7.1: the boundary is the publication).
//   node stack2-ack.mjs WRITE_URL READ_URL DB BODIES_DIR OUT N
import fs from "node:fs";
import path from "node:path";

const [W, R, db, bodies, out, nArg] = process.argv.slice(2);
const N = Number(nArg ?? 20);
const values = JSON.parse(fs.readFileSync(path.join(bodies, "values.json"), "utf8"));
const subjects = JSON.parse(fs.readFileSync(path.join(bodies, "subjects.json"), "utf8"));
const post = async (url, body) => {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  return { status: res.status, text: await res.text() };
};
const summary = { removals: 0, acknowledged: 0, readsBeforeAck: 0, readsAfterAck: 0, valueBeforeAck: 0, valueAfterAck: 0,
  violations: [], perRoute: {} };
for (let k = 0; k < N; k++) {
  const key = "r" + k, subject = subjects[key], value = values[key];
  const head = JSON.parse((await post(`${R}/v2/db/${db}/transactions`, { after: 0, limit: 1 })).text).head;
  const pin = Number(head);
  const session = "era3-ack-" + k;
  const reach = () => post(`${R}/v2/db/${db}/reach`, { root: subject, basis: { recordedPosition: pin, validAt: 1e12 }, session, erasureRefs: true });
  const primed = await reach();
  if (!primed.text.includes(value)) summary.violations.push({ k, problem: "the session did not cache the value before the removal" });
  let ackAt = Infinity, stop = false;
  const reads = [];
  const routes = {
    current: () => post(`${R}/v1/db/${db}/read`, { entityIds: [subject] }),
    pinned: () => post(`${R}/v1/db/${db}/read`, { entityIds: [subject], basis: { recordedPosition: pin, validAt: 1e12 } }),
    session: reach,
  };
  const loops = Object.entries(routes).map(async ([route, f]) => {
    while (!stop) {
      const startedAt = performance.now();
      const r = await f();
      reads.push({ route, startedAt, status: r.status, has: r.text.includes(value) });
    }
  });
  await new Promise((r) => setTimeout(r, 30));
  summary.removals++;
  const removal = await post(`${W}/v2/db/${db}/erase`, { commandId: "era3-ack-" + k, selectors: [{ entityId: subject, attribute: ":v" }] });
  if (removal.status === 200) { ackAt = performance.now(); summary.acknowledged++; }
  await new Promise((r) => setTimeout(r, 400));
  stop = true;
  await Promise.all(loops);
  for (const x of reads) {
    const after = x.startedAt > ackAt;
    summary[after ? "readsAfterAck" : "readsBeforeAck"]++;
    const pr = (summary.perRoute[x.route] ??= { before: 0, after: 0, valueAfter: 0 });
    pr[after ? "after" : "before"]++;
    if (x.has && after) { summary.valueAfterAck++; pr.valueAfter++; summary.violations.push({ k, route: x.route, msAfterAck: x.startedAt - ackAt }); }
    if (x.has && !after) summary.valueBeforeAck++;
  }
}
fs.writeFileSync(path.join(out, "ack.json"), JSON.stringify(summary, null, 1));
console.log("ERA3_ACK " + JSON.stringify({ ...summary, violations: summary.violations.slice(0, 5), violationCount: summary.violations.length }));
