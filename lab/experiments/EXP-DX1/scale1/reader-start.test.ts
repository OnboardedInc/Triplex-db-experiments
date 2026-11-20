import assert from "node:assert/strict";
import http from "node:http";
import { networkInterfaces } from "node:os";
import test from "node:test";
import { setTimeout as sleep } from "node:timers/promises";
import { DatomicTransportError, RecentReads } from "../../../../packages/datomic/dist/index.js";
import { ReplicaReadHost, boundedReplicaFeed } from "../../../bench/lib/replica-reads.ts";
import { resumesItem } from "./remote-sequence.ts";

test("six readers install the original cut before the first live poll", async () => {
  const loopback = Object.values(networkInterfaces()).flat().find(a => a?.internal && a.family === "IPv4")!.address;
  let polls = 0;
  const server = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks).toString());
    let value;
    if (req.url === "/v1/db/create") value = { db: "fixture", layout: "lean" };
    else if (req.url === "/v2/db/fixture/transactions") {
      assert.equal(body.after, 0);
      polls++;
      value = { head: 0, transactions: [] };
    } else {
      assert.equal(req.url, "/v2/db/fixture/reach-many");
      value = body.replicaCapability ? { supported: true, strictRecordClocks: true } : {
        t: "11", position: 0, reset: false,
        entities: body.roots.map((id: string) => [id, 0, []]),
        closures: body.roots.map((id: string) => [id, [id]]),
      };
    }
    res.end(JSON.stringify(value));
  });
  await new Promise<void>(resolve => server.listen(0, loopback, resolve));
  const address = server.address();
  assert(address && typeof address !== "string");
  let host: ReplicaReadHost | undefined;
  try {
    host = await ReplicaReadHost.open("bootstrap-fixture", ["root", "child"], { currentPosition: async () => 0 },
      { position: 0, instant: 0 }, "inline", 4096, "reader", `http://${loopback}:${address.port}`, "all", undefined, 0, true);
    for (let i = 0; i < 6; i++) {
      const installed = new RecentReads();
      installed.install(structuredClone(host.index.image()));
      assert(installed.valid && installed.position === 0);
      assert.deepEqual(installed.image().entities.map(row => row[0]).sort(), ["child", "root"]);
    }
    assert.throws(() => host!.followAfterImages(1));
    await sleep(25);
    assert.equal(polls, 0);
    host.followAfterImages(0);
    assert.throws(() => host!.followAfterImages(0));
    const until = Date.now() + 2000;
    while (!polls && Date.now() < until) await sleep(5);
    assert(polls > 0);
  } finally {
    await host?.close();
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});

test("a dropped read retries the identical bounded page once and preserves errors", async () => {
  const drop = new DatomicTransportError("socket hang up", { cause: Object.assign(new Error(), { code: "ECONNRESET" }) });
  const corrupt = new DatomicTransportError("Invalid gateway JSON");
  for (const [sequence, succeeds, attempts] of [
    [[drop, { head: 9 }], true, 2], [[drop, drop], false, 2], [[corrupt], false, 1],
  ] as const) {
    const calls: number[][] = [];
    const source = boundedReplicaFeed({ async feed(...args: [number, number, number]) {
      const response = sequence[calls.length];
      calls.push(args);
      if (response instanceof Error) throw response;
      return response;
    } }, true);
    if (succeeds) assert.deepEqual(await source.feed(9, 1000, 75), { head: 9 });
    else await assert.rejects(source.feed(9, 1000, 75), error => error === sequence.at(-1));
    assert.deepEqual(calls, Array.from({ length: attempts }, () => [9, 4, 75]));
  }
});

test("a changed reader must name its replacement zero and original failed attempt", () => {
  const failed = { item: 1, mode: "reader", tag: "old-reader", source: "old" };
  const zero = { item: 1, mode: "zero", tag: "new-zero", source: "new", retryOf: failed.tag };
  const reader = { ...failed, tag: "new-reader", source: zero.source, baseline: zero.tag, retryOf: failed.tag };
  assert(resumesItem(failed, zero, reader));
  assert(resumesItem(failed, reader));
  assert(!resumesItem(failed, zero));
  assert(!resumesItem(failed, zero, { ...reader, baseline: failed.tag }));
  assert(!resumesItem(failed, zero, { ...reader, source: failed.source }));
  assert(!resumesItem(failed, zero, { ...reader, retryOf: "another" }));
  assert(!resumesItem(failed, { ...zero, item: 2 }, reader));
});
