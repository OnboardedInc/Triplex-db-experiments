import { expect, it } from "vitest";
import { Worker, MessageChannel } from "node:worker_threads";
import { Replica, packEntity } from "../../../../packages/datomic/dist/index.js";
import { runtimeWorkerEnvironment } from "../../../bench/lib/w0-runtime.ts";
import { assertBaselineHeadroom } from "../../../bench/lib/w0-replica-live.ts";
import { W0 } from "../../../bench/lib/w0-world.ts";

it("reader worker follows ordered packed cuts and walks only the requested subject", async () => {
  const subject = W0.placementId(0);
  const row = {
    id: "a",
    entityId: subject,
    attribute: "x",
    value: { type: "string" as const, value: "first" },
    position: 1,
    validFrom: 0,
  };
  const first = packEntity(1, [row]);
  const second = packEntity(2, [{ ...row, id: "b", position: 2 }]);
  const source = {
    head: async () => 1,
    page: async (): Promise<never> => {
      throw Error("network forbidden");
    },
    feed: async (): Promise<never> => {
      throw Error("network forbidden");
    },
  };
  const replica = Replica.fromImage(source, {
    position: 1,
    validAt: 0,
    entities: [[subject, first]],
  });
  const channel = new MessageChannel();
  const worker = new Worker(new URL("../../../bench/lib/w0-runtime-worker.ts", import.meta.url), {
    execArgv: ["--experimental-strip-types"],
    workerData: {
      role: "reader",
      port: channel.port2,
      N: 1,
      seed: "fresh-runtime-fixture",
      worker: 0,
      readers: 4,
      readerOffset: 0,
    },
    transferList: [channel.port2],
  });
  const reads: any[] = [];
  const stopped = new Promise<any>((resolve, reject) => {
    worker.on("error", reject);
    worker.on("message", (message) => {
      if (message.type === "reads") reads.push(...message.records);
      if (message.type === "failure") reject(Error(message.error));
      if (message.type === "ready") {
        channel.port1.postMessage({
          type: "delta",
          update: { position: 2, reset: false, valid: true, changes: [[subject, first, second]] },
        });
        setTimeout(() => worker.postMessage({ type: "stop" }), 50);
      }
      if (message.type === "stopped") resolve(message);
    });
  });
  channel.port1.postMessage({ type: "image", image: (await replica.snapshotAt(1)).sharedImage() });
  try {
    const result = await stopped;
    expect(result.position).toBe(2);
    expect(reads.some((read) => read.position === 2)).toBe(true);
    expect(reads.every((read) => read.subject === subject && read.rows === 1 && read.ms >= 0)).toBe(
      true,
    );
    expect(result.metrics.measuredElu.utilization).toBeGreaterThan(0);
  } finally {
    await worker.terminate();
    channel.port1.close();
  }
}, 15000);

it("binds writer/follower composition routing to the declared write endpoint without changing reader routing", () => {
  const writer = "http://bound-write:8080";
  for (const role of ["writer", "follower"]) {
    const env = runtimeWorkerEnvironment(role, writer);
    expect(env.DATOMIC_URL).toBe(writer);
    expect(env.DATOMIC_READ_URLS).toBe(writer);
    expect(() => runtimeWorkerEnvironment(role)).toThrow();
  }
  expect(runtimeWorkerEnvironment("reader").DATOMIC_READ_URLS).toBe(process.env.DATOMIC_READ_URLS);
});
it("requires complete finite baseline samples before activation admission", () => {
  const good = {
    readers: 256,
    read: { count: 1000 },
    commitService: { count: 10, p99: 20 },
    commit: { p99: 60 },
    offered: 10,
    acknowledged: 10,
    failures: 0,
    windowMs: 10000,
    pendingAtStop: 2,
  };
  expect(() => assertBaselineHeadroom(good)).not.toThrow();
  for (const bad of [
    { read: { count: 0 } },
    { commitService: { count: 0, p99: null } },
    { commit: { p99: NaN } },
    { acknowledged: 9 },
    { pendingAtStop: 33 },
    { windowMs: 0 },
  ])
    expect(() => assertBaselineHeadroom({ ...good, ...bad })).toThrow();
});
