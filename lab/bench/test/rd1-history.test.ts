import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { serialize } from "node:v8";
import { test } from "node:test";
import { MessageChannel } from "node:worker_threads";
import {
  HistoricalFallbackPort,
  HistoricalFallbackThread,
  InstalledHistory,
  historicalResult,
  type HistoricalPayload,
} from "../lib/historical-fallback.ts";
import { ReplicaReader } from "../lib/replica-reads.ts";

const basis = { recordedAt: 100, validAt: 2 };
const payload: HistoricalPayload = {
  root: "root",
  recordedAt: basis.recordedAt,
  t: "42",
  from: 1,
  to: 3,
  result: { depth: 0, entities: 1, roundTrips: 1, route: "source", language: "reach", waitedMs: 0 },
  triples: serialize([
    {
      id: "value",
      entityId: "root",
      attribute: "signed",
      value: { type: "number", value: -0 },
      validTo: { _tag: "Some", value: 3 },
      txId: { _tag: "None" },
    },
  ]),
};

test("a fallback port refuses a reply from another requested cut", async () => {
  const { port1, port2 } = new MessageChannel();
  const input = new HistoricalFallbackPort(port1);
  port2.on("message", (m) =>
    port2.postMessage({
      id: m.id,
      world: { ...payload, root: m.root, recordedAt: m.basis.recordedAt - 1 },
    }),
  );
  try {
    await assert.rejects(input.pull("root", basis), /cut mismatch/);
  } finally {
    input.close();
    port2.close();
  }
});

test("installed history preserves exact payload, refuses another valid interval and clears on rebuild", async () => {
  const cache = new InstalledHistory(1_024);
  const reader = new ReplicaReader(0);
  const newer = {
    position: 2,
    recordTime: 200,
    clockEnd: 2,
    valid: true,
    reset: true,
    changes: [],
  };
  reader.index.apply(newer);
  reader.installedHistory = cache;
  assert(!reader.canInstallHistory(basis), "A non-strict clock cannot authorize installation");
  assert(reader.canInstallHistory({ recordedPosition: 1, validAt: 2 }));
  assert(!reader.canInstallHistory({ recordedPosition: 3, validAt: 2 }));
  reader.install({ ...reader.index.image(), strictRecordClocks: true });
  assert(reader.canInstallHistory(basis));
  assert(!reader.canInstallHistory({ recordedAt: 300, validAt: 2 }));
  assert.throws(() => cache.put("root", { recordedAt: 99, validAt: 2 }, payload), /cut mismatch/);
  cache.put("root", basis, payload);
  const miss = async () => historicalResult(payload, false);
  const hit = await reader.pullAt("root", basis, async () => {
    throw Error("Installed cut made an HTTP exchange");
  });
  assert.equal(hit.route, "replica");
  assert(Object.is(hit.triples[0]!.value.value, -0));
  assert.deepEqual(hit.triples[0]!.validTo.value, 3);
  assert.equal(cache.get("root", { ...basis, validAt: 3 }), undefined);
  assert.equal((await reader.pullAt("other", basis, miss)).route, "fallback");
  reader.apply({ ...newer, position: 3, clockEnd: 3, recordTime: 300 });
  assert.equal(cache.diagnostics.bytes, 0);
  assert.equal((await reader.pullAt("root", basis, miss)).route, "fallback");
});

test(
  "an outstanding historical exchange leaves an unrelated local read runnable",
  { timeout: 5_000 },
  async () => {
    const server = createServer();
    const incoming = once(server, "request") as Promise<[IncomingMessage, ServerResponse]>;
    server.listen(0, "localhost");
    await once(server, "listening");
    const address = server.address();
    assert(address && typeof address !== "string");
    const host = address.family === "IPv6" ? `[${address.address}]` : address.address;
    const lane = new HistoricalFallbackThread({
      mode: "lane",
      scope: "rd1-test",
      endpoint: `http://${host}:${address.port}`,
      active: 1,
    });
    const port = new HistoricalFallbackPort(lane.connect());
    try {
      assert.equal((await lane.snapshot()).requested, 0);
      const held = port.pull("remote", basis);
      const [request, response] = await Promise.race([
        incoming,
        held.then(() => assert.fail("Miss completed before its gateway replied")),
      ]);
      assert.match(request.url!, /\/reach$/);
      const chunks: Buffer[] = [];
      for await (const chunk of request) chunks.push(chunk);
      assert.deepEqual(JSON.parse(Buffer.concat(chunks).toString()).basis, basis);
      const reader = new ReplicaReader(0);
      reader.install({
        floor: 2,
        position: 2,
        valid: true,
        entities: [],
        history: [],
        times: [[200, 2]],
        timeSafe: true,
        strictRecordClocks: true,
      });
      reader.installedHistory = new InstalledHistory(1_024);
      reader.installedHistory.put("root", basis, payload);
      const local = await reader.pullAt("root", basis, async () =>
        assert.fail("Local hit went to the held gateway"),
      );
      assert(Object.is(local.triples[0]?.value.value, -0));
      assert.equal((await lane.snapshot()).active, 1);

      response.end(
        JSON.stringify({
          position: 1,
          t: "42",
          reset: false,
          entities: [["remote", 0, []]],
          closures: [["remote", ["remote"]]],
        }),
      );
      const world = await held;
      assert(world);
      assert.deepEqual(historicalResult(world, false).triples, []);
      const done = await lane.snapshot();
      assert.equal(done.replied, 1);
      assert.equal(done.wireExchanges, 1);
      assert.equal(done.active, 0);
    } finally {
      port.close();
      await lane.close();
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  },
);
