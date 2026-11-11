import { decodeRowText, encodeRowText } from "../../../../packages/datomic/dist/rowText.js";
import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import { gunzipSync } from "node:zlib";
import { timedReplicaSource, type DatomicClient } from "../../../../packages/datomic/dist/index.js";

// [DX-R3] Why: use the original recorded journal bytes to prove inline clocks need no extra journal/page RPC.
// Rejected: clocks supplied by ACK metadata rather than validated feed content.
test("inline source admits original journal clocks and rejects a bad page without publishing them", async () => {
  const dir = process.env.DX_R3_PAGES ?? "/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-R1/tx2-dxr1-1000-d/pages";
  const request = fs.readdirSync(dir).filter(n => /^request-\d+\.json$/.test(n)).map(n => ({ n, body: JSON.parse(fs.readFileSync(`${dir}/${n}`, "utf8")) })).find(r => r.body.after !== undefined)!;
  assert(request);
  const n = request.n.match(/\d+/)![0];
  const page = JSON.parse(gunzipSync(fs.readFileSync(`${dir}/response-${n}.json.gz`)).toString());
  assert(page.transactions.length > 0);
  for (const tx of page.transactions) tx[3] = { position: tx[1], t: "recorded", entities: [], closures: [], reset: false };
  let calls = 0;
  const client = { async request(_m: string, route: string, body: any) {
    calls++;
    assert(route.endsWith("/transactions"));
    assert.equal(body.replicaRows, true);
    assert.equal(body.validAt, 123);
    assert.equal(body.limit, 16);
    return page;
  } } as unknown as DatomicClient;
  const timed = timedReplicaSource(client, "recorded", async () => page.head, 123);
  const result = await timed.source.feed(request.body.after, 1000, 0);
  assert.equal(calls, 1);
  assert.equal(result.transactions.length, page.transactions.length);
  assert.equal(timed.times.size, page.transactions.length);
  assert([...timed.times.values()].every(Number.isFinite));
  const badClock = structuredClone(page);
  badClock.transactions[0][2] = badClock.transactions[0][2].map((text: string) => {
    const row = decodeRowText(text);
    return row.attribute === ":_tx/instant" ? encodeRowText({ ...row, recorded_at: row.recorded_at + 1 }) : text;
  });
  const badClockClient = { async request() { return badClock; } } as unknown as DatomicClient;
  const untrustedClock = timedReplicaSource(badClockClient, "recorded", async () => badClock.head, 123);
  await untrustedClock.source.feed(request.body.after, 1000, 0);
  assert(Number.isNaN(untrustedClock.times.get(badClock.transactions[0][1])), "stored record clock must match the admitted instant");
  page.transactions[0][1]++;
  const rejected = timedReplicaSource(client, "recorded", async () => page.head, 123);
  await assert.rejects(rejected.source.feed(request.body.after, 1000, 0), /position mismatch/);
  assert.equal(rejected.times.size, 0);
});
