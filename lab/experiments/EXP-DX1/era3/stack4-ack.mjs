// [DX-ERA3, fourth review] stack3-ack.mjs, and the cached Reach session followed as its client sees it: an entity sent
// inline replaces the client's copy, a hit ([id, rev] only) tells it to keep its copy; a session read counts as
// answering the value when the client holds the value after it. Otherwise as before: for each of N
// subjects, a Reach session on the READ gateway caches the subject at a pin before its removal; during the removal
// (sent to the WRITE gateway) and for 400 ms after its acknowledgement, the read gateway is read in a loop (a plain
// current read, a pinned read, the cached Reach session) and, alongside, a subject of another account is read and a
// plain save of another account is sent. A read that STARTED after the client received the acknowledgement must not
// answer the value (TARGETS section 7.1); the other account's reads and saves must not be refused.
//   node stack3-ack.mjs WRITE_URL READ_URL DB BODIES_DIR OUT N
import fs from "node:fs";
import path from "node:path";

const [W, R, db, bodies, out, nArg] = process.argv.slice(2);
const N = Number(nArg ?? 20);
const values = JSON.parse(fs.readFileSync(path.join(bodies, "values.json"), "utf8"));
const subjects = JSON.parse(fs.readFileSync(path.join(bodies, "subjects.json"), "utf8"));
const saveTemplate = fs.readFileSync(path.join(bodies, "save-b1-0.json"), "utf8");
let saves = 0;
const post = async (url, body) => {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: typeof body === "string" ? body : JSON.stringify(body) });
  const text = await res.text();
  let code = null;
  try { code = JSON.parse(text).code ?? null; } catch {}
  return { status: res.status, text, code };
};
const summary = { removals: 0, acknowledged: 0, readsAfterAck: 0, valueAfterAck: 0, valueBeforeAck: 0, violations: [],
  sessionHitsBeforeAck: 0, sessionHitsAfterAck: 0,
  replies: {}, msOfRefusals: {} };
const tallyReply = (route, r, ms) => {
  const k = `${route} ${r.status} ${r.code ?? ""}`.trim();
  summary.replies[k] = (summary.replies[k] ?? 0) + 1;
  if (r.status !== 200) (summary.msOfRefusals[k] ??= []).push(Math.round(ms));
};
for (let k = 0; k < N; k++) {
  const key = "r" + k, subject = subjects[key], value = values[key];
  const head = JSON.parse((await post(`${R}/v2/db/${db}/transactions`, { after: 0, limit: 1 })).text).head;
  const pin = Number(head);
  const session = "era3-ack3-" + k;
  const reach = () => post(`${R}/v2/db/${db}/reach`, { root: subject, basis: { recordedPosition: pin, validAt: 1e12 }, session, erasureRefs: true });
  const primed = await reach();
  if (!primed.text.includes(value)) summary.violations.push({ k, problem: "the session did not cache the value before the removal" });
  let ackAt = Infinity, stop = false, clientHolds = primed.text.includes(value);
  const reads = [];
  const routes = {
    current: () => post(`${R}/v1/db/${db}/read`, { entityIds: [subject] }),
    pinned: () => post(`${R}/v1/db/${db}/read`, { entityIds: [subject], basis: { recordedPosition: pin, validAt: 1e12 } }),
    session: reach,
    otherRead: () => post(`${R}/v1/db/${db}/read`, { entityIds: [subjects["c1"]] }),
    // the same length as "st2-sb-0": the row texts carry length prefixes
    otherSave: () => post(`${R}/v1/db/${db}/transact`, saveTemplate.replaceAll("st2-sb-0", "s4" + (saves++).toString(36).padStart(6, "0"))),
  };
  const loops = Object.entries(routes).map(async ([route, f]) => {
    while (!stop) {
      const startedAt = performance.now();
      const r = await f();
      const ms = performance.now() - startedAt;
      tallyReply(route, r, ms);
      // what the client holds after a session reply: an inline entity replaces its copy, a hit keeps its copy
      let hit = false, holds = null;
      if (route === "session") {
        try {
          const e = (JSON.parse(r.text).entities ?? []).find((x) => x[0] === subject);
          hit = Array.isArray(e) && e.length === 2;
          if (Array.isArray(e) && !hit) clientHolds = JSON.stringify(e).includes(value);
        } catch {}
        holds = clientHolds;
      }
      reads.push({ route, startedAt, has: route === "session" ? holds : r.text.includes(value), hit });
    }
  });
  await new Promise((r) => setTimeout(r, 30));
  summary.removals++;
  const removal = await post(`${W}/v2/db/${db}/erase`, { commandId: "era3-ack3-" + k, selectors: [{ entityId: subject, attribute: ":v" }] });
  tallyReply("removal", removal, 0);
  if (removal.status === 200) { ackAt = performance.now(); summary.acknowledged++; }
  await new Promise((r) => setTimeout(r, 400));
  stop = true;
  await Promise.all(loops);
  for (const x of reads) {
    if (!["current", "pinned", "session"].includes(x.route)) continue;
    const after = x.startedAt > ackAt;
    if (after) summary.readsAfterAck++;
    if (x.has && after) { summary.valueAfterAck++; summary.violations.push({ k, route: x.route, msAfterAck: x.startedAt - ackAt }); }
    if (x.has && !after) summary.valueBeforeAck++;
    if (x.hit) { if (after) summary.sessionHitsAfterAck++; else summary.sessionHitsBeforeAck++; }
  }
}
for (const k of Object.keys(summary.msOfRefusals)) {
  const v = summary.msOfRefusals[k].sort((a, b) => a - b);
  summary.msOfRefusals[k] = { count: v.length, max: v[v.length - 1] };
}
fs.writeFileSync(path.join(out, "ack4.json"), JSON.stringify(summary, null, 1));
console.log("ERA3_ACK4 " + JSON.stringify({ ...summary, violations: summary.violations.slice(0, 5), violationCount: summary.violations.length }));
