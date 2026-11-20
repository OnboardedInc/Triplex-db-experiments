import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { once } from "node:events";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { performance } from "node:perf_hooks";
import path from "node:path";
import { test } from "node:test";
import { setTimeout as sleep } from "node:timers/promises";
import { pathToFileURL } from "node:url";
import { Worker, parentPort, workerData } from "node:worker_threads";
import { Option } from "effect";
import { observe } from "../lib/observe.ts";
import type { PullResult } from "../lib/composition.ts";

const old = { recordedAt: 100, validAt: 200 };
const recent = { recordedAt: 200, validAt: 200 };
const oldRoot = "history";
const localRoot = "current";
const durationMs = 700;
const seats = 20;

if (workerData?.rd1Gateway === true) {
  const response = Buffer.from(workerData.response as string);
  const server = createServer(async (request, reply) => {
    try {
      const chunks: Buffer[] = [];
      for await (const chunk of request) chunks.push(chunk);
      const body = JSON.parse(Buffer.concat(chunks).toString());
      assert(request.url?.endsWith("/reach") && body.root === oldRoot);
      assert.deepEqual(body.basis, old);
      reply.writeHead(200, { "Content-Length": response.length });
      reply.end(response);
    } catch {
      reply.writeHead(422).end("{}");
    }
  });
  server.listen(0, "localhost");
  await once(server, "listening");
  const address = server.address();
  assert(address && typeof address !== "string");
  const host = address.family === "IPv6" ? `[${address.address}]` : address.address;
  parentPort!.postMessage(`http://${host}:${address.port}`);
} else {
  test(
    "local readers retain 90% of their rate with one seat decoding historical rows",
    { timeout: 20_000 },
    async (t) => {
      const tree = process.env.DX_RD1_RATE_SOURCE;
      const repo = tree ?? path.resolve(import.meta.dirname, "../../..");
      const load = (file: string) => import(pathToFileURL(path.join(repo, file)).href);
      const { ReplicaReader } = await load("lab/bench/lib/replica-reads.ts");
      const { ReaderTurn } = await load("lab/bench/lib/reader-turn.ts");
      const { DatomicClient, packEntity } = await load("packages/datomic/dist/index.js");
      const isolated = tree ? undefined : await import("../lib/historical-fallback.ts");
      const values = Array.from({ length: 4096 }, (_, i) => `${i}-${"v".repeat(256)}`);
      // [DX-RD1] Why: give both paths the same expensive, exact inline body and keep the fixture server off the reader loop.
      // Rejected: sleeping only in the old implementation or pausing the local seats while a miss is outstanding.
      const response = JSON.stringify({
        position: 1,
        t: "42",
        reset: false,
        closures: [[oldRoot, [oldRoot]]],
        entities: [
          [
            oldRoot,
            1,
            values.map((value, i) => [
              "0000000000000001",
              `row-${i}`,
              oldRoot,
              ":rd1/value",
              "string",
              value,
              null,
              null,
              null,
              null,
              100,
              0,
              null,
              null,
              null,
              1,
              null,
            ]),
          ],
        ],
      });
      const expectation = observe({
        triples: values.map((value, i) => ({
          id: `row-${i}`,
          entityId: oldRoot,
          attribute: ":rd1/value",
          value: { type: "string", value },
          recordedAt: 100,
          validFrom: 0,
          schemaVersion: Option.some(1),
          validTo: Option.none(),
          createdBy: Option.none(),
          entityType: Option.none(),
          txId: Option.none(),
          retractedAt: Option.none(),
          retractTxId: Option.none(),
        })),
      });
      const localExpectation = observe({
        triples: [
          {
            id: "recent",
            entityId: localRoot,
            attribute: ":rd1/value",
            value: { type: "string", value: "present" },
            recordedAt: 200,
            validFrom: 0,
            schemaVersion: Option.none(),
            validTo: Option.none(),
            createdBy: Option.none(),
            entityType: Option.none(),
            txId: Option.none(),
            retractedAt: Option.none(),
            retractTxId: Option.none(),
          },
        ],
      });
      const server = new Worker(import.meta.filename, {
        workerData: { rd1Gateway: true, response },
      });
      try {
        const [endpoint] = (await once(server, "message")) as [string];
        const arm = async (mixed: boolean) => {
          const reader = new ReplicaReader(0),
            turn = new ReaderTurn();
          const packed = packEntity(2, [
            {
              id: "recent",
              entityId: localRoot,
              position: 2,
              attribute: ":rd1/value",
              value: { type: "string", value: "present" },
              validFrom: 0,
              publicMetadata: {
                recordedAt: 200,
                createdBy: null,
                entityType: null,
                schemaVersion: null,
                txId: null,
              },
            },
          ]);
          reader.install({
            floor: 2,
            position: 2,
            valid: true,
            entities: [[localRoot, 2, packed]],
            history: [],
            times: [[200, 2]],
            clockEnds: [[200, 2]],
            timeSafe: true,
            strictRecordClocks: true,
          });
          const lane =
            mixed && isolated
              ? new isolated.HistoricalFallbackThread({
                  mode: "lane",
                  active: 1,
                  endpoint,
                  scope: "rd1-test",
                })
              : undefined;
          const port = lane && new isolated!.HistoricalFallbackPort(lane.connect());
          const direct = mixed && !isolated ? new DatomicClient(endpoint) : undefined;
          try {
            if (lane) assert.equal((await lane.snapshot()).requested, 0);
            let hits = 0,
              misses = 0;
            const until = performance.now() + durationMs;
            const local = async () => {
              while (performance.now() < until) {
                await turn.enter();
                const found = await reader.pullAt(
                  localRoot,
                  recent,
                  () => assert.fail("Current cut went to the gateway"),
                  undefined,
                  true,
                );
                assert.equal(found.route, "replica");
                assert.deepEqual(observe(found), localExpectation);
                if (performance.now() < until) hits++;
                await sleep(3);
              }
            };
            const history = async () => {
              while (performance.now() < until) {
                const found = await reader.pullAt(oldRoot, old, async (): Promise<PullResult> => {
                  if (port) {
                    const world = await port.pull(oldRoot, old);
                    assert(world);
                    return isolated!.historicalResult(world, false);
                  }
                  const world = await direct.readDemandWorld("rd1-test", oldRoot, old);
                  assert(world);
                  return {
                    triples: world.triples,
                    route: "source",
                    depth: world.hops - 1,
                    entities: world.entities,
                    roundTrips: world.requests,
                    language: "reach",
                    waitedMs: 0,
                  };
                });
                assert.equal(found.route, "fallback");
                assert.deepEqual(observe(found), expectation);
                misses++;
                await sleep(35);
              }
            };
            await Promise.all([
              ...Array.from({ length: seats - 1 }, local),
              ...(mixed ? [history()] : []),
            ]);
            if (mixed) assert(misses > 0, "The historical seat never completed a slow read");
            return { hits, misses };
          } finally {
            port?.close();
            direct?.close();
            await lane?.close();
          }
        };
        const baseline = await arm(false),
          loadA = await arm(true),
          loadB = await arm(true),
          baselineB = await arm(false);
        const ratio = (loadA.hits + loadB.hits) / (baseline.hits + baselineB.hits);
        const sha = (bytes: string | Buffer) => createHash("sha256").update(bytes).digest("hex");
        t.diagnostic(
          JSON.stringify({
            seats,
            durationMs,
            mode: tree ? "before" : "isolated",
            fixtureSha256: sha(response),
            replicaSha256: sha(readFileSync(path.join(repo, "lab/bench/lib/replica-reads.ts"))),
            clientSha256: sha(
              readFileSync(path.join(repo, "packages/datomic/dist/DatomicClient.js")),
            ),
            baseline,
            loadA,
            loadB,
            baselineB,
            ratio,
          }),
        );
        assert(
          ratio >= 0.9,
          `Local reads completed at ${(ratio * 100).toFixed(1)}% of their matched baseline`,
        );
      } finally {
        await server.terminate();
      }
    },
  );
}
