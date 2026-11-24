// [DX-S1] Request bytes of one subject's save as the SDK client sends it, by size, against the 4 MiB request cap.
// A stand-in gateway on localhost only records each request's byte length; the client is the real DatomicClient on the
// lean layout with ordered row texts (the server writer's wire form), and the save is the lab's `command()` framing
// (business rows, one journal change per fact and per retired value, four journal rows), as the production tape sends.
// No Datomic, no Docker. Usage: node --no-warnings --experimental-transform-types lab/experiments/EXP-DX1/s1/request-size.ts
import assert from "node:assert/strict";
import { once } from "node:events";
import http from "node:http";
import { DatomicClient, orderedSaveIdentity, wideOrderedSaveIdentity } from "../../../../packages/datomic/dist/index.js";
import { command } from "../w1/group/workload.ts";

const cap = 4 * 1024 * 1024;
let last = 0;
const server = http.createServer(async (req, res) => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk);
  const bytes = Buffer.concat(chunks).length;
  if (req.url === "/v1/db/create") {
    res.end(JSON.stringify({ db: "s1-size", created: true, layout: "lean", orderedRowTexts: true, strictRecordClocks: true }));
    return;
  }
  last = bytes;
  res.writeHead(409).end('{"code":"CasConflict","message":"recorded"}');
});
server.listen(0, "localhost");
await once(server, "listening");
const address = server.address();
assert(address && typeof address !== "string");
const client = new DatomicClient(`http://localhost:${address.port}`, 20_000);
const { db } = await client.create("s1-size", "lean", true);

// A field value as the production-shaped tape writes it (57 characters), and a longer free-text answer (500).
const value = (n: number, len: number) => ("v" + n + "-").padEnd(len, "x");
type Row = Parameters<DatomicClient["transact"]>[1]["rows"][number];
function predecessor(e: string, a: string, i: number): Row {
  return {
    id: ("P" + String(i).padStart(25, "0")).slice(0, 26), entity_id: e, attribute: a, value_type: "string",
    value_string: value(i, 57), value_number: null, value_boolean: null, value_datetime: null, value_json: null,
    entity_type: null, valid_from: 0, valid_to: null, recorded_at: 1000, recorded_position: 5, schema_version: 1,
    tx_id: "_tx/earlier", retracted_at: null, retracted_position: null, retract_tx_id: null, created_by: null,
  } as unknown as Row;
}
async function bytesFor(facts: number, replacing: boolean, len: number) {
  const e = "acct/account-001/i9:00000001";
  const fs = Array.from({ length: facts }, (_, i) => ({ e, a: ":task/field-" + i, v: { type: "string" as const, value: value(i, len) } }));
  const old = replacing ? fs.map((f, i) => predecessor(e, f.a, i)) : [];
  const assertions = 2 * facts + old.length + 4;
  const identity = assertions <= 256 ? orderedSaveIdentity() : assertions <= 4096 ? wideOrderedSaveIdentity() : undefined;
  const input = { ...command("s1-" + facts + "-" + replacing + "-" + len, fs, old, true, false, identity), sourceK: 5, live: old.map((r) => r.id) };
  last = 0;
  try {
    await client.transact(db, input as never);
  } catch (error) {
    if ((error as { code?: string }).code === "InvalidValue" && last === 0) return { bytes: null, refused: "client: over 4 MiB" };
  }
  return { bytes: last, assertions, identity: identity ? (identity.capacity === 256 ? "one-byte block" : "wide block") : "general identity" };
}

const sizes = [1, 2, 3, 5, 10, 17, 50, 100, 128, 340, 1000];
const table = [];
for (const facts of sizes) {
  const r = await bytesFor(facts, true, 57);
  const f = await bytesFor(facts, false, 57);
  table.push({ facts, replacing: r, firstWrites: f });
}
// The largest save the client sends under the cap, for 57- and 500-character values, all replacing.
async function largest(len: number) {
  let lo = 1, hi = 64;
  while ((await bytesFor(hi, true, len)).bytes !== null) { lo = hi; hi *= 2; }
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if ((await bytesFor(mid, true, len)).bytes !== null) lo = mid; else hi = mid;
  }
  return { valueChars: len, largestFacts: lo, bytes: (await bytesFor(lo, true, len)).bytes, firstRefused: hi };
}
const limits = [await largest(57), await largest(500)];
console.log(JSON.stringify({ cap, perFactBytes57: (table.at(-1)!.replacing.bytes! - table[4]!.replacing.bytes!) / (1000 - 10), table, limits }, null, 2));
client.close();
server.closeAllConnections();
server.close();
